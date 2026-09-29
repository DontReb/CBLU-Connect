import { useCallback, useMemo, useRef, useState } from 'react';
import { AdminDataContext } from './adminDataContext';
import { MOCK_CHECKLIST_ITEMS, MOCK_REVIEWS } from './mockAdmin';

export default function AdminDataProvider({ children }) {
  const [checklistItems, setChecklistItems] = useState(MOCK_CHECKLIST_ITEMS);
  const [reviews, setReviews] = useState(MOCK_REVIEWS);
  const nextItemId = useRef(MOCK_CHECKLIST_ITEMS.length + 1);

  const addChecklistItem = useCallback((item) => {
    setChecklistItems((prev) => [...prev, { id: nextItemId.current++, ...item }]);
  }, []);

  // decision: { isValid, reviewerName } — sets the human-confirmed result
  // and stamps who reviewed it, same as document_validations.reviewed_by.
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
    () => ({ checklistItems, addChecklistItem, reviews, reviewDocument }),
    [checklistItems, addChecklistItem, reviews, reviewDocument]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}