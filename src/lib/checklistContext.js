import { createContext, useContext } from 'react';

// The context object and hook live here, separate from ChecklistProvider.jsx —
// Vite's Fast Refresh only works reliably when a file exports components and
// nothing else, so the component and its supporting pieces are split up.
export const ChecklistContext = createContext(null);

export function useChecklist() {
  const ctx = useContext(ChecklistContext);
  if (!ctx) {
    throw new Error('useChecklist must be called within a ChecklistProvider');
  }
  return ctx;
}