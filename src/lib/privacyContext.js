import { createContext, useContext } from 'react';

// Kept apart from PrivacyProvider.jsx for Vite's Fast Refresh (see
// checklistContext.js).
export const PrivacyContext = createContext(null);

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy must be called within a PrivacyProvider');
  }
  return ctx;
}
