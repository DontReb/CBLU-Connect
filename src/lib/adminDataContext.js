import { createContext, useContext } from 'react';

// Split from AdminDataProvider.jsx for the same reason as checklistContext.js —
// a file exporting a component needs to export only components for Fast Refresh.
export const AdminDataContext = createContext(null);

export function useAdminData() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error('useAdminData must be called within an AdminDataProvider');
  }
  return ctx;
}