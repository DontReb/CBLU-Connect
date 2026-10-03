import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChecklistContext } from './checklistContext';

export default function ChecklistProvider({ children }) {
  const [checklist, setChecklist] = useState({ name: '', items: [] });
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
        setChecklist({ name: data.checklistName, items: data.items });
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

  // Uploads to the real OCR/validation endpoint. Sets the item to
  // "processing" immediately (optimistic), then updates it from the real
  // response — isValid/notes come straight from validateAgainstRules() on
  // the server. On failure, the item gets a distinct "error" status (a
  // request/server problem) rather than "invalid" (a document that was
  // checked and didn't pass), so the UI doesn't conflate the two.
  const uploadDocument = useCallback((itemId, file) => {
    setChecklist((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, status: 'processing', notes: undefined } : item
      ),
    }));

    const formData = new FormData();
    formData.append('checklistItemId', itemId);
    formData.append('document', file);

    return fetch('/api/documents/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }
        setChecklist((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: data.isValid ? 'valid' : 'invalid',
                  notes: data.notes,
                  fileName: file.name,
                }
              : item
          ),
        }));
        return data;
      })
      .catch((err) => {
        setChecklist((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? { ...item, status: 'error', notes: err.message || 'Upload failed — try again.' }
              : item
          ),
        }));
        throw err;
      });
  }, []);

  const value = useMemo(
    () => ({ checklist, status, uploadDocument }),
    [checklist, status, uploadDocument]
  );

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}