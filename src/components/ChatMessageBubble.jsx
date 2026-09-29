// Mirrors the bubble styling in ChatWidget.jsx (bot: self-start bg-paper,
// user: self-end bg-ink text-white) so a transcript here looks like a
// continuation of the same conversation the client had with the widget.
export default function ChatMessageBubble({ message }) {
  if (message.senderType === 'bot') {
    return (
      <div className="max-w-[90%] self-center rounded-xl bg-paper px-3 py-1.5 text-center text-xs text-ink-soft">
        {message.content}
      </div>
    );
  }

  const isAgent = message.senderType === 'agent';
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
        isAgent ? 'self-end bg-ink text-white' : 'self-start bg-paper text-ink'
      }`}
    >
      {message.content}
    </div>
  );
}