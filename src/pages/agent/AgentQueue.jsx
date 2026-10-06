import { useState } from 'react';
import Button from '../../components/ui/Button';
import ChatMessageBubble from '../../components/ChatMessageBubble';
import { useAgentSessions } from '../../lib/agentSessionsContext';

const STATUS_META = {
  escalated: { label: 'Waiting', badge: 'bg-highlight/40 text-ink' },
  with_agent: { label: "You're chatting", badge: 'bg-accent-light/50 text-accent-dark' },
};

function SessionThread({ session, onSend, onClaim, onClose }) {
  const [draft, setDraft] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(session.id, text);
    setDraft('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-medium text-ink">{session.clientName}</h2>
          <p className="text-xs text-ink-soft">{STATUS_META[session.status]?.label}</p>
        </div>
        {session.status === 'with_agent' && (
          <Button type="button" variant="ghost" onClick={() => onClose(session.id)} className="px-4 py-2 text-sm">
            Close chat
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4">
        {session.messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
      </div>

      {session.status === 'escalated' ? (
        <div className="border-t border-line p-4">
          <Button type="button" onClick={() => onClaim(session.id)} className="w-full px-4 py-2.5 text-sm">
            Claim this chat
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-line p-4">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your reply…"
            aria-label="Your reply"
            className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm focus:border-accent focus:outline-none"
          />
          <Button type="submit" className="px-4 py-2.5 text-sm">
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

export default function AgentQueue() {
  const { sessions, claimSession, sendMessage, closeSession } = useAgentSessions();
  const queue = sessions.filter((session) => session.status === 'escalated' || session.status === 'with_agent');
  const [selectedId, setSelectedId] = useState(queue[0]?.id ?? null);
  // Falls back to null automatically once a session is closed and drops out
  // of `queue` — that naturally sends the view back to the empty state.
  const selected = queue.find((session) => session.id === selectedId) ?? null;

  // Height leaves room at the bottom of the screen for the site-wide chat
  // button, so it never sits on top of "Claim this chat" or the reply box.
  return (
    <div className="mx-auto flex h-[calc(100vh-12.5rem)] max-w-5xl overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <div
        className={`w-full flex-col border-line md:flex md:w-72 md:border-r ${
          selected ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="border-b border-line px-5 py-4">
          <h1 className="font-display text-lg font-medium text-ink">Queue</h1>
          <p className="text-xs text-ink-soft">
            {queue.length} active chat{queue.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 && <p className="px-5 py-6 text-sm text-ink-soft">No escalated chats right now.</p>}
          {queue.map((session) => {
            const lastMessage = session.messages[session.messages.length - 1];
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
                  <span className="font-medium text-ink">{session.clientName}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
                    {meta.label}
                  </span>
                </div>
                {lastMessage && <p className="mt-0.5 truncate text-xs text-ink-soft">{lastMessage.content}</p>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`flex-1 flex-col md:flex ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="border-b border-line px-5 py-3 text-left text-sm text-ink-soft md:hidden"
            >
              ← Back to queue
            </button>
            <SessionThread session={selected} onSend={sendMessage} onClaim={claimSession} onClose={closeSession} />
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