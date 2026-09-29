import { useCallback, useMemo, useRef, useState } from 'react';
import { AgentSessionsContext } from './agentSessionsContext';
import { MOCK_SESSIONS } from './mockAgent';

function highestMessageId(sessions) {
  return sessions.reduce(
    (max, session) => Math.max(max, ...session.messages.map((message) => message.id)),
    0
  );
}

export default function AgentSessionsProvider({ children }) {
  const [sessions, setSessions] = useState(MOCK_SESSIONS);
  const nextMessageId = useRef(highestMessageId(MOCK_SESSIONS) + 1);

  // escalated -> with_agent, same transition as chat_sessions.agent_id
  // being set and status updated when an agent picks up a session.
  const claimSession = useCallback((sessionId) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, status: 'with_agent' } : session))
    );
  }, []);

  const sendMessage = useCallback((sessionId, content) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messages: [...session.messages, { id: nextMessageId.current++, senderType: 'agent', content }],
            }
          : session
      )
    );
  }, []);

  const closeSession = useCallback((sessionId) => {
    setSessions((prev) =>
      prev.map((session) => (session.id === sessionId ? { ...session, status: 'closed' } : session))
    );
  }, []);

  const value = useMemo(
    () => ({ sessions, claimSession, sendMessage, closeSession }),
    [sessions, claimSession, sendMessage, closeSession]
  );

  return <AgentSessionsContext.Provider value={value}>{children}</AgentSessionsContext.Provider>;
}