import { useEffect, useRef, useState } from 'react';
import Button from '../../components/ui/Button';
import ChatMessageBubble from '../../components/ChatMessageBubble';
import { useAgentSessions } from '../../lib/agentSessionsContext';
import { chatRequest, mergeMessagesById } from '../../lib/chatApi';

const STATUS_META = {
  escalated: { label: 'Waiting', badge: 'bg-highlight/40 text-ink' },
  with_agent: { label: "You're chatting", badge: 'bg-accent-light/50 text-accent-dark' },
  closed: { label: 'Ended', badge: 'bg-line/60 text-ink-soft' },
};

// How often an open conversation checks for the client's new messages.
const THREAD_POLL_INTERVAL_MS = 3000;

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '';
}

function SessionThread({ sessionId, onBack }) {
  const { claimSession, sendMessage, closeSession } = useAgentSessions();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | unavailable
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  // Bumped by every action, so a check that started before the action
  // can't undo what the action just did (e.g. show "Waiting" after a claim).
  const actionSeqRef = useRef(0);

  useEffect(() => {
    let ignore = false;

    async function loadThread(isFirstLoad) {
      if (!isFirstLoad && document.visibilityState === 'hidden') return;
      const seqAtStart = actionSeqRef.current;
      try {
        const data = await chatRequest('session', { query: `&id=${sessionId}` });
        if (ignore || seqAtStart !== actionSeqRef.current) return;
        setSession(data.session);
        setMessages((prev) => mergeMessagesById(prev, data.messages));
        setLoadState('ready');
      } catch (err) {
        if (ignore) return;
        // 404 = another agent took it (or it's gone) — say so instead of spinning.
        if (err.status === 404) setLoadState('unavailable');
      }
    }

    loadThread(true);
    const timer = setInterval(() => loadThread(false), THREAD_POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [sessionId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function runAction(action) {
    setBusy(true);
    setError('');
    actionSeqRef.current += 1;
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleClaim() {
    runAction(async () => {
      const data = await claimSession(sessionId);
      setSession(data.session);
      setMessages((prev) => mergeMessagesById(prev, data.messages));
    });
  }

  function handleClose() {
    runAction(async () => {
      const data = await closeSession(sessionId);
      setSession(data.session);
      setMessages((prev) => mergeMessagesById(prev, data.messages));
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    runAction(async () => {
      const message = await sendMessage(sessionId, text);
      setMessages((prev) => mergeMessagesById(prev, [message]));
      setDraft('');
    });
  }

  if (loadState === 'loading') {
    return <div className="flex flex-1 items-center justify-center text-sm text-ink-soft">Loading chat…</div>;
  }

  if (loadState === 'unavailable') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-ink-soft">
        <p>This chat was taken by another agent or is no longer available.</p>
        <Button type="button" variant="ghost" onClick={onBack} className="px-4 py-2 text-sm">
          Back to queue
        </Button>
      </div>
    );
  }

  const meta = STATUS_META[session.status];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium text-ink">{session.clientName}</h2>
          <p className="text-xs text-ink-soft">
            {meta?.label}
            {session.escalatedAt && ` · asked for an agent at ${formatTime(session.escalatedAt)}`}
          </p>
        </div>
        {session.status === 'with_agent' && (
          <Button type="button" variant="ghost" onClick={handleClose} disabled={busy} className="shrink-0 px-4 py-2 text-sm">
            Close chat
          </Button>
        )}
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4" aria-live="polite">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <div className="border-t border-line p-4">
        {error && <p className="mb-2 text-sm text-red-700">{error}</p>}
        {session.status === 'escalated' && (
          <Button type="button" onClick={handleClaim} disabled={busy} className="w-full px-4 py-2.5 text-sm">
            {busy ? 'Claiming…' : 'Claim this chat'}
          </Button>
        )}
        {session.status === 'with_agent' && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Reply to ${session.clientName.split(' ')[0]}…`}
              aria-label="Your reply"
              maxLength={2000}
              className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
            />
            <Button type="submit" disabled={busy} className="px-4 py-2.5 text-sm">
              Send
            </Button>
          </form>
        )}
        {session.status === 'closed' && (
          <div className="flex items-center justify-between gap-3 text-sm text-ink-soft">
            <span>This chat has ended.</span>
            <Button type="button" variant="ghost" onClick={onBack} className="px-4 py-2 text-sm">
              Back to queue
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentQueue() {
  const { queue, queueStatus } = useAgentSessions();
  const [selectedId, setSelectedId] = useState(null);

  // Height leaves room at the bottom of the screen for the site-wide chat
  // button, so it never sits on top of "Claim this chat" or the reply box.
  return (
    <div className="mx-auto flex h-[calc(100vh-12.5rem)] max-w-5xl overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <div
        className={`w-full flex-col border-line md:flex md:w-72 md:border-r ${
          selectedId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="border-b border-line px-5 py-4">
          <h1 className="font-display text-lg font-medium text-ink">Queue</h1>
          <p className="text-xs text-ink-soft">
            {queueStatus === 'ready'
              ? `${queue.length} active chat${queue.length === 1 ? '' : 's'} · updates automatically`
              : 'Checking for chats…'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {queueStatus === 'error' && (
            <p className="px-5 py-6 text-sm text-red-700">Couldn't load the queue. Try refreshing the page.</p>
          )}
          {queueStatus === 'ready' && queue.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink-soft">
              No chats waiting. When a client asks for a live agent, it shows up here within a few seconds.
            </p>
          )}
          {queue.map((session) => {
            const meta = STATUS_META[session.status];
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => setSelectedId(session.id)}
                className={`block w-full border-b border-line px-5 py-3.5 text-left transition-colors hover:bg-ink/5 ${
                  selectedId === session.id ? 'bg-ink/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-ink">{session.clientName}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                {session.lastMessage && <p className="mt-0.5 truncate text-xs text-ink-soft">{session.lastMessage}</p>}
                <p className="mt-0.5 text-[11px] text-ink-soft/80">{formatTime(session.lastMessageAt)}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`min-w-0 flex-1 flex-col md:flex ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selectedId ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="border-b border-line px-5 py-3 text-left text-sm text-ink-soft md:hidden"
            >
              ← Back to queue
            </button>
            <SessionThread key={selectedId} sessionId={selectedId} onBack={() => setSelectedId(null)} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-ink-soft">
            Select a chat from the queue to view it.
          </div>
        )}
      </div>
    </div>
  );
}
