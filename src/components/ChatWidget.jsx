import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { matchRule } from '../lib/chatRules';
import Button from './ui/Button';

// The panel scales and rises in from the toggle button, like it's popping
// out of it — and reverses the same way on close.
const PANEL_VARIANTS = {
  initial: { opacity: 0, scale: 0.9, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 12 },
};

const REDUCED_PANEL_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function ChatWidget({ isOpen, onClose, onToggle }) {
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi, I'm the CBLU assistant. What can I help with?" },
  ]);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const reply = matchRule(text);
    setMessages((prev) => [
      ...prev,
      { from: 'user', text },
      { from: 'bot', text: reply },
    ]);
    setDraft('');
  }

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className="flex size-[3.25rem] items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-ink/25 transition-transform hover:scale-105 hover:bg-accent-dark"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
          <path
            d="M4 5h16v11H8l-4 4V5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-panel"
            variants={shouldReduceMotion ? REDUCED_PANEL_VARIANTS : PANEL_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: shouldReduceMotion ? 0.12 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            role="dialog"
            aria-label="Chat with CBLU assistant"
            className="absolute bottom-16 right-0 flex w-80 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-ink/20"
          >
            <div className="flex items-center justify-between bg-ink px-4 py-3.5 text-sm font-semibold text-white">
              <span>CBLU Assistant</span>
              <button type="button" onClick={onClose} aria-label="Close chat" className="text-lg leading-none">
                ×
              </button>
            </div>
            <div ref={listRef} className="flex max-h-64 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.from === 'bot' ? 'self-start bg-paper' : 'self-end bg-ink text-white'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <p className="px-4 pb-2.5 text-xs text-ink-soft">
              Can't find an answer? We'll bring in a live agent.
            </p>
            <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your question…"
                aria-label="Your question"
                className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
              />
              <Button type="submit" variant="primary" className="px-4 py-2.5 text-sm">
                Send
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}