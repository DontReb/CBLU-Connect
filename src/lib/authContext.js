import { createContext, useContext } from 'react';

// Split from AuthProvider.jsx for the same reason as the other contexts in
// this folder — a file exporting a component needs to export only
// components for Fast Refresh.
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be called within an AuthProvider');
  }
  return ctx;
}