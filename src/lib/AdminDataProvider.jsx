import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminDataContext } from './adminDataContext';
import { MOCK_REVIEWS } from './mockAdmin';

export default function AdminDataProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [clientsStatus, setClientsStatus] = useState('loading'); // loading | ready | error

  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistStatus, setChecklistStatus] = useState('loading'); // loading | ready | error

  // Reviews are still mock data — wiring these to a real endpoint is a
  // separate, later step.
  const [reviews, setReviews] = useState(MOCK_REVIEWS);

  useEffect(() => {
    let ignore = false;

    async function loadClients() {
      try {
        const res = await fetch('/api/admin/clients', { credentials: 'include' });
        if (ignore) return;
        if (!res.ok) {
          setClientsStatus('error');
          return;
        }
        const data = await res.json();
        if (ignore) return;
        setClients(data.clients);
        setClientsStatus('ready');
      } catch {
        if (!ignore) setClientsStatus('error');
      }
    }

    async function loadChecklistItems() {
      try {
        const res = await fetch('/api/admin/checklist-items', { credentials: 'include' });
        if (ignore) return;
        if (!res.ok) {
          setChecklistStatus('error');
          return;
        }
        const data = await res.json();
        if (ignore) return;
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

  // Posts to the real endpoint and appends the DB-generated row (with its
  // real id) to local state — throws on failure so the form can show why.
  const addChecklistItem = useCallback(async (item) => {
    const res = await fetch('/api/admin/checklist-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to add checklist item');
    }
    setChecklistItems((prev) => [...prev, data.item]);
  }, []);

  // decision: { isValid, reviewerName } — sets the human-confirmed result
  // and stamps who reviewed it, same as document_validations.reviewed_by.
  // Still local-only for now — wiring this to a real endpoint is a
  // separate step (the document reviews queue).
  const reviewDocument = useCallback((reviewId, decision) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === reviewId
          ? { ...review, isValid: decision.isValid, reviewedBy: decision.reviewerName }
          : review
      )
    );
  }, []);

  const value = useMemo(
    () => ({
      clients,
      clientsStatus,
      checklistItems,
      checklistStatus,
      addChecklistItem,
      reviews,
      reviewDocument,
    }),
    [clients, clientsStatus, checklistItems, checklistStatus, addChecklistItem, reviews, reviewDocument]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}