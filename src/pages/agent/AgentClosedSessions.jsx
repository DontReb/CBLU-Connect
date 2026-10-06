import { useEffect, useState } from 'react';
import ChatMessageBubble from '../../components/ChatMessageBubble';
import { chatRequest } from '../../lib/chatApi';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

// Loads one chat's messages when its transcript is opened.
function Transcript({ sessionId }) {
  const [messages, setMessages] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadTranscript() {
      try {
        const data = await chatRequest('session', { query: `&id=${sessionId}` });
        if (!ignore) setMessages(data.messages);
      } catch {
        if (!ignore) setFailed(true);
      }
    }

    loadTranscript();
    return () => {
      ignore = true;
    };
  }, [sessionId]);

  if (failed) return <p className="text-sm text-red-700">Couldn't load this transcript.</p>;
  if (!messages) return <p className="text-sm text-ink-soft">Loading transcript…</p>;
  return messages.map((message) => <ChatMessageBubble key={message.id} message={message} />);
}

export default function AgentClosedSessions() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadClosed() {
      try {
        const data = await chatRequest('closed');
        if (ignore) return;
        setSessions(data.sessions);
        setStatus('ready');
      } catch {
        if (!ignore) setStatus('error');
      }
    }

    loadClosed();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Closed chats</h1>
      <p className="mt-1 text-sm text-ink-soft">Chats you've handled that have ended, for reference.</p>

      <div className="mt-6 space-y-3">
        {status === 'loading' && <p className="text-sm text-ink-soft">Loading closed chats…</p>}
        {status === 'error' && (
          <p className="rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
            Couldn't load closed chats. Try refreshing the page.
          </p>
        )}
        {status === 'ready' && sessions.length === 0 && <p className="text-sm text-ink-soft">No closed chats yet.</p>}
        {sessions.map((session) => {
          const isOpen = expandedId === session.id;
          return (
            <div key={session.id} className="rounded-2xl border border-line bg-panel shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : session.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{session.clientName}</span>
                  <span className="block text-xs text-ink-soft">Ended {formatDateTime(session.closedAt)}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-soft">{isOpen ? 'Hide' : 'View'} transcript</span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2.5 border-t border-line px-5 py-4">
                  <Transcript sessionId={session.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
