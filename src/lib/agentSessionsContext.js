import { createContext, useContext } from 'react';

// Split from AgentSessionsProvider.jsx for the same reason as
// checklistContext.js and adminDataContext.js — a file exporting a
// component needs to export only components for Fast Refresh.
export const AgentSessionsContext = createContext(null);

export function useAgentSessions() {
  const ctx = useContext(AgentSessionsContext);
  if (!ctx) {
    throw new Error('useAgentSessions must be called within an AgentSessionsProvider');
  }
  return ctx;
}