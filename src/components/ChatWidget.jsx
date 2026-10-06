import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { matchRule, wantsLiveAgent } from '../lib/chatRules';
import { chatRequest } from '../lib/chatApi';
import Button from './ui/Button';

// The site-wide chat. It starts as the rule-based CBLU assistant (answers
// come from chatRules.js, in the browser). When a logged-in client asks for
// a person, the conversation is handed to a live agent through api/chat.js:
// the agent sees the conversation so far, and both sides check for new
// messages every few seconds (Vercel's free plan can't keep a connection
// open, so the browser asks instead of being told).
//
// App.jsx remounts this component whenever the logged-in user changes, so
// one person's live chat is never left on screen for the next.

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

const POLL_INTERVAL_MS = 3000;
const WELCOME = { key: 'welcome', from: 'bot', text: "Hi, I'm the CBLU assistant. What can I help with?" };

let localKeyCounter = 0;
function localKey() {
  localKeyCounter += 1;
  return `local-${localKeyCounter}`;
}

// Server message → chat bubble. 'client' is shown as the visitor's own ('user').
function fromServer(message) {
  return {
    key: `m${message.id}`,
    id: message.id,
    from: message.senderType === 'client' ? 'user' : message.senderType,
    text: message.content,
    senderName: message.senderName,
  };
}

// Adds server messages we haven't shown yet. Matching by id means a slow
// or repeated check can never duplicate or remove a message.
function mergeServerMessages(prev, serverMessages) {
  const shown = new Set(prev.filter((m) => m.id != null).map((m) => m.id));
  const added = serverMessages.filter((m) => !shown.has(m.id)).map(fromServer);
  return added.length > 0 ? [...prev, ...added] : prev;
}

function toLiveChat(session) {
  return { id: session.id, status: session.status, agentName: session.agentName };
}

// Remembers the newest message id seen, so we can tell when a check brings
// in something new from the agent (for the unread dot).
function newestId(messages, fallback) {
  return messages.reduce((max, m) => Math.max(max, m.id ?? 0), fallback);
}

const ENDED_NOTICE = "This chat has ended. I'm the CBLU assistant again — ask me anything.";

export default function ChatWidget({ isOpen, onClose, onToggle, user }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [draft, setDraft] = useState('');
  const [liveChat, setLiveChat] = useState(null); // { id, status, agentName } while talking to a person
  const [connecting, setConnecting] = useState(false);
  const [unread, setUnread] = useState(false);
  const listRef = useRef(null);
  const isOpenRef = useRef(isOpen);
  const newestIdRef = useRef(0);
  // Bumped by every action, so a check that started before the action
  // can't overwrite what the action just did.
  const actionSeqRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();
  const isClient = user?.role === 'client';
  const liveChatId = liveChat?.id ?? null;

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // After a page refresh, pick up a live chat the client already had open.
  useEffect(() => {
    if (!isClient) return undefined;
    let ignore = false;

    async function resumeOpenChat() {
      try {
        const data = await chatRequest('mine');
        if (ignore || !data.session) return;
        newestIdRef.current = newestId(data.messages, 0);
        setMessages([WELCOME, ...data.messages.map(fromServer)]);
        setLiveChat(toLiveChat(data.session));
      } catch {
        // Stay with the assistant — the client can still ask for an agent.
      }
    }

    resumeOpenChat();
    return () => {
      ignore = true;
    };
  }, [isClient]);

  // While a live chat is open, check for new messages every few seconds.
  useEffect(() => {
    if (!liveChatId) return undefined;
    let ignore = false;

    async function checkForUpdates() {
      if (document.visibilityState === 'hidden') return;
      const seqAtStart = actionSeqRef.current;
      try {
        const data = await chatRequest('session', { query: `&id=${liveChatId}` });
        if (ignore || seqAtStart !== actionSeqRef.current) return;

        const fromOthers = data.messages.filter((m) => m.id > newestIdRef.current && m.senderType !== 'client');
        newestIdRef.current = newestId(data.messages, newestIdRef.current);
        if (fromOthers.length > 0 && !isOpenRef.current) setUnread(true);
        if (isOpenRef.current) setUnread(false);

        setMessages((prev) => mergeServerMessages(prev, data.messages));
        if (data.session.status === 'closed') {
          setLiveChat(null);
          setMessages((prev) => [...prev, { key: localKey(), from: 'system', text: ENDED_NOTICE }]);
        } else {
          setLiveChat(toLiveChat(data.session));
        }
      } catch {
        // A missed check is fine — the next one is a few seconds away.
      }
    }

    const timer = setInterval(checkForUpdates, POLL_INTERVAL_MS);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [liveChatId]);

  function addLocal(from, text) {
    setMessages((prev) => [...prev, { key: localKey(), from, text }]);
  }

  async function startLiveChat(conversationSoFar) {
    if (!user) {
      addLocal('bot', 'To chat with a live agent, please log in to your client account first, then ask again here.');
      return;
    }
    if (!isClient) {
      addLocal('bot', "Live chat with an agent is for client accounts — you're logged in as staff.");
      return;
    }

    setConnecting(true);
    actionSeqRef.current += 1;
    try {
      const transcript = conversationSoFar
        .filter((m) => m.key !== 'welcome' && (m.from === 'user' || m.from === 'bot'))
        .map((m) => ({ from: m.from, text: m.text }));
      const data = await chatRequest('start', { method: 'POST', body: { transcript } });
      newestIdRef.current = newestId(data.messages, 0);
      setMessages([WELCOME, ...data.messages.map(fromServer)]);
      setLiveChat(toLiveChat(data.session));
    } catch {
      addLocal('bot', "Sorry — we couldn't reach a live agent right now. Please try again in a moment.");
    } finally {
      setConnecting(false);
    }
  }

  async function sendLiveMessage(text) {
    actionSeqRef.current += 1;
    const pendingKey = localKey();
    setMessages((prev) => [...prev, { key: pendingKey, from: 'user', text, pending: true }]);
    try {
      const data = await chatRequest('send', { method: 'POST', body: { sessionId: liveChatId, text } });
      const saved = fromServer(data.message);
      newestIdRef.current = Math.max(newestIdRef.current, saved.id);
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id)
          ? prev.filter((m) => m.key !== pendingKey)
          : prev.map((m) => (m.key === pendingKey ? saved : m))
      );
    } catch {
      setMessages((prev) => prev.map((m) => (m.key === pendingKey ? { ...m, pending: false, failed: true } : m)));
    }
  }

  async function handleEndChat() {
    const chatId = liveChatId;
    actionSeqRef.current += 1;
    setLiveChat(null);
    try {
      const data = await chatRequest('close', { method: 'POST', body: { sessionId: chatId } });
      setMessages((prev) => [...mergeServerMessages(prev, data.messages), { key: localKey(), from: 'system', text: ENDED_NOTICE }]);
    } catch {
      addLocal('system', ENDED_NOTICE);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || connecting) return;
    setDraft('');

    if (liveChatId) {
      sendLiveMessage(text);
      return;
    }

    const userMessage = { key: localKey(), from: 'user', text };
    if (wantsLiveAgent(text)) {
      setMessages((prev) => [...prev, userMessage]);
      startLiveChat([...messages, userMessage]);
      return;
    }
    setMessages((prev) => [...prev, userMessage, { key: localKey(), from: 'bot', text: matchRule(text) }]);
  }

  function handleToggle() {
    setUnread(false);
    onToggle();
  }

  const waitingForAgent = liveChat?.status === 'escalated';
  const agentName = liveChat?.agentName;
  const headerTitle = liveChatId ? 'Live chat' : 'CBLU Assistant';
  const headerSubtitle = liveChatId ? (waitingForAgent ? 'Waiting for an agent…' : `with ${agentName}`) : null;

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        className="relative flex size-[3.25rem] items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-ink/25 transition-transform hover:scale-105 hover:bg-accent-dark"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
          <path
            d="M4 5h16v11H8l-4 4V5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        {unread && !isOpen && (
          <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-white bg-highlight" aria-label="New message" />
        )}
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
            <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{headerTitle}</p>
                {headerSubtitle && <p className="truncate text-xs text-white/70">{headerSubtitle}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {liveChatId && (
                  <button
                    type="button"
                    onClick={handleEndChat}
                    className="rounded-full border border-white/30 px-2.5 py-1 text-xs hover:border-white"
                  >
                    End chat
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label="Close chat" className="text-lg leading-none">
                  ×
                </button>
              </div>
            </div>

            <div ref={listRef} className="flex max-h-72 flex-col gap-2.5 overflow-y-auto px-4 py-3.5" aria-live="polite">
              {messages.map((m) => {
                if (m.from === 'system') {
                  return (
                    <p key={m.key} className="self-center px-2 text-center text-xs text-ink-soft">
                      {m.text}
                    </p>
                  );
                }
                if (m.from === 'agent') {
                  return (
                    <div key={m.key} className="max-w-[88%] self-start rounded-2xl bg-accent-light/40 px-4 py-2.5 text-sm text-ink">
                      <span className="mb-0.5 block text-[11px] font-semibold text-accent-dark">
                        {m.senderName || 'CBLU agent'}
                      </span>
                      {m.text}
                    </div>
                  );
                }
                const fromUser = m.from === 'user';
                return (
                  <div
                    key={m.key}
                    className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${
                      fromUser ? 'self-end bg-ink text-white' : 'self-start bg-paper'
                    } ${m.pending ? 'opacity-60' : ''}`}
                  >
                    {m.text}
                    {m.failed && <span className="mt-1 block text-[11px] text-highlight">Not sent — try again</span>}
                  </div>
                );
              })}
            </div>

            <div className="px-4 pb-2.5 text-xs text-ink-soft">
              {connecting ? (
                <p>Connecting you to a live agent…</p>
              ) : liveChatId ? (
                <p>
                  {waitingForAgent
                    ? "You're in the queue — an agent will join shortly. You can keep typing."
                    : `You're chatting with ${agentName}.`}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => startLiveChat(messages)}
                  className="font-medium text-accent-dark hover:underline"
                >
                  Need a person? Chat with a live agent
                </button>
              )}
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={liveChatId ? 'Message the agent…' : 'Type your question…'}
                aria-label="Your question"
                maxLength={2000}
                className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
              />
              <Button type="submit" variant="primary" disabled={connecting} className="px-4 py-2.5 text-sm">
                Send
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
