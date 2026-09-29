import { useState } from 'react';
import ChatMessageBubble from '../../components/ChatMessageBubble';
import { useAgentSessions } from '../../lib/agentSessionsContext';

export default function AgentClosedSessions() {
  const { sessions } = useAgentSessions();
  const closed = sessions.filter((session) => session.status === 'closed');
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Closed chats</h1>
      <p className="mt-1 text-sm text-ink-soft">Resolved conversations, for reference.</p>

      <div className="mt-6 space-y-3">
        {closed.length === 0 && <p className="text-sm text-ink-soft">No closed chats yet.</p>}
        {closed.map((session) => {
          const isOpen = expandedId === session.id;
          return (
            <div key={session.id} className="rounded-2xl border border-line bg-panel shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : session.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-medium text-ink">{session.clientName}</span>
                <span className="text-xs text-ink-soft">{isOpen ? 'Hide' : 'View'} transcript</span>
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2.5 border-t border-line px-5 py-4">
                  {session.messages.map((message) => (
                    <ChatMessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}