import { useCallback, useEffect, useMemo, useState } from 'react';
import { AgentSessionsContext } from './agentSessionsContext';
import { chatRequest } from './chatApi';

// Real chat queue for the agent dashboard, from api/chat.js: chats waiting
// for an agent, plus the ones this agent is handling. Checked every few
// seconds so a client's new request shows up without refreshing.
const QUEUE_POLL_INTERVAL_MS = 4000;

export default function AgentSessionsProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const [queueStatus, setQueueStatus] = useState('loading'); // loading | ready | error
  // Bumping this re-runs the queue effect right away (after claim/close).
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadQueue(isFirstLoad) {
      if (!isFirstLoad && document.visibilityState === 'hidden') return;
      try {
        const data = await chatRequest('queue');
        if (ignore) return;
        setQueue(data.sessions);
        setQueueStatus('ready');
      } catch {
        if (!ignore) setQueueStatus((status) => (status === 'ready' ? status : 'error'));
      }
    }

    loadQueue(true);
    const timer = setInterval(() => loadQueue(false), QUEUE_POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [refreshCount]);

  const refreshQueue = useCallback(() => setRefreshCount((n) => n + 1), []);

  // Each returns the server's response, or throws an Error with a
  // readable message (e.g. "This chat was already taken by another agent").
  const claimSession = useCallback(
    async (sessionId) => {
      const data = await chatRequest('claim', { method: 'POST', body: { sessionId } });
      refreshQueue();
      return data;
    },
    [refreshQueue]
  );

  const sendMessage = useCallback(async (sessionId, text) => {
    const data = await chatRequest('send', { method: 'POST', body: { sessionId, text } });
    return data.message;
  }, []);

  const closeSession = useCallback(
    async (sessionId) => {
      const data = await chatRequest('close', { method: 'POST', body: { sessionId } });
      refreshQueue();
      return data;
    },
    [refreshQueue]
  );

  const value = useMemo(
    () => ({ queue, queueStatus, claimSession, sendMessage, closeSession, refreshQueue }),
    [queue, queueStatus, claimSession, sendMessage, closeSession, refreshQueue]
  );

  return <AgentSessionsContext.Provider value={value}>{children}</AgentSessionsContext.Provider>;
}
