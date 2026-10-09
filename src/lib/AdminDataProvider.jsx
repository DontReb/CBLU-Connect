import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDataContext } from './adminDataContext';

async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// Clients (with their application and requirements progress) and the
// requirements checklist, shared by the admin pages.
export default function AdminDataProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [clientsStatus, setClientsStatus] = useState('loading'); // loading | ready | error

  const [checklist, setChecklist] = useState(null); // { id, name, description }
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistStatus, setChecklistStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      try {
        const data = await requestJson('/api/admin/clients');
        if (ignore) return;
        setClients(data.clients);
        setClientsStatus('ready');
      } catch {
        if (!ignore) setClientsStatus('error');
      }
    }

    async function loadChecklistItems() {
      try {
        const data = await requestJson('/api/admin/checklist-items');
        if (ignore) return;
        setChecklist(data.checklist);
        setChecklistItems(data.items);
        setChecklistStatus('ready');
      } catch {
        if (!ignore) setChecklistStatus('error');
      }
    }

    loadClients();
    loadChecklistItems();
    return () => {
      ignore = true;
    };
  }, []);

  // Each of these throws on failure so the form calling it can show why.
  const addChecklistItem = useCallback(async (item) => {
    const data = await requestJson('/api/admin/checklist-items', { method: 'POST', body: JSON.stringify(item) });
    setChecklistItems((prev) => [...prev, data.item]);
  }, []);

  const updateChecklistItem = useCallback(async (id, item) => {
    const data = await requestJson(`/api/admin/checklist-items?id=${id}`, { method: 'PUT', body: JSON.stringify(item) });
    setChecklistItems((prev) => prev.map((existing) => (existing.id === id ? data.item : existing)));
  }, []);

  const deleteChecklistItem = useCallback(async (id) => {
    await requestJson(`/api/admin/checklist-items?id=${id}`, { method: 'DELETE' });
    setChecklistItems((prev) => prev.filter((existing) => existing.id !== id));
  }, []);

  // One client's ticked requirements, loaded when an admin opens their row.
  const loadClientDetail = useCallback(async (id) => {
    const data = await requestJson(`/api/admin/clients?id=${id}`);
    return data.client;
  }, []);

  const value = useMemo(
    () => ({
      clients,
      clientsStatus,
      checklist,
      checklistItems,
      checklistStatus,
      addChecklistItem,
      updateChecklistItem,
      deleteChecklistItem,
      loadClientDetail,
    }),
    [clients, clientsStatus, checklist, checklistItems, checklistStatus, addChecklistItem, updateChecklistItem, deleteChecklistItem, loadClientDetail]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}
