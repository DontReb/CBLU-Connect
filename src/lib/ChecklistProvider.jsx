import { useCallback, useMemo, useState } from 'react';
import { ChecklistContext } from './checklistContext';
import { MOCK_CHECKLIST } from './mockClient';

// Simulates what POST /api/documents/upload will eventually return — same
// shape (isValid, notes) as validateAgainstRules() in api/lib/validateDocument.js
// so swapping this for a real fetch later doesn't require rewriting the UI.
// An item that starts out "invalid" passes on its *second* attempt, so the
// demo shows both a first-time upload and a fix-and-resubmit working.
function simulateValidation(item, attemptNumber) {
  const passes = item.status !== 'invalid' || attemptNumber > 1;
  return passes
    ? { isValid: true, notes: 'All required terms were found in the document.' }
    : { isValid: false, notes: 'Missing expected terms: signature block' };
}

const UPLOAD_DELAY_MS = 1200;

export default function ChecklistProvider({ children }) {
  const [checklist, setChecklist] = useState(MOCK_CHECKLIST);
  const [, setAttempts] = useState({});

  const uploadDocument = useCallback(
    (itemId, file) =>
      new Promise((resolve) => {
        setChecklist((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? { ...item, status: 'processing', fileName: file.name, notes: undefined }
              : item
          ),
        }));

        setTimeout(() => {
          setAttempts((prevAttempts) => {
            const attemptNumber = (prevAttempts[itemId] || 0) + 1;

            setChecklist((prev) => ({
              ...prev,
              items: prev.items.map((item) => {
                if (item.id !== itemId) return item;
                const result = simulateValidation(item, attemptNumber);
                resolve(result);
                return {
                  ...item,
                  status: result.isValid ? 'valid' : 'invalid',
                  notes: result.notes,
                  fileName: file.name,
                };
              }),
            }));

            return { ...prevAttempts, [itemId]: attemptNumber };
          });
        }, UPLOAD_DELAY_MS);
      }),
    []
  );

  const value = useMemo(() => ({ checklist, uploadDocument }), [checklist, uploadDocument]);

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}