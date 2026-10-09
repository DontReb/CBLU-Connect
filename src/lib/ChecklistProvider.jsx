import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChecklistContext } from './checklistContext';

// The client's requirements checklist: documents to bring with the printed
// application. Ticking an item only records that the client has it —
// nothing is uploaded.
export default function ChecklistProvider({ children }) {
  const [checklist, setChecklist] = useState({ name: '', description: '', items: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let ignore = false;

    async function loadChecklist() {
      try {
        const res = await fetch('/api/client/checklist', { credentials: 'include' });
        if (ignore) return;
        if (!res.ok) {
          setStatus('error');
          return;
        }
        const data = await res.json();
        if (ignore) return;
        setChecklist({ name: data.checklistName, description: data.checklistDescription, items: data.items });
        setStatus('ready');
      } catch {
        if (!ignore) setStatus('error');
      }
    }

    loadChecklist();
    return () => {
      ignore = true;
    };
  }, []);

  // Ticks or unticks right away, then saves; puts it back if saving fails.
  const setItemChecked = useCallback(async (itemId, checked) => {
    const apply = (value) =>
      setChecklist((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === itemId ? { ...item, checked: value } : item)),
      }));

    apply(checked);
    try {
      const res = await fetch('/api/client/checklist', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked }),
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (err) {
      apply(!checked);
      throw err;
    }
  }, []);

  const value = useMemo(
    () => ({ checklist, status, setItemChecked }),
    [checklist, status, setItemChecked]
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}
