import { useCallback, useMemo, useState } from 'react';
import { ChatContext } from './chatContext';

// Holds whether the site-wide chatbot is open. Lives at the top of the app
// (App.jsx), so the chatbot shows on every page and keeps its conversation
// when the visitor moves between pages.
export default function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((open) => !open), []);

  const value = useMemo(
    () => ({ isOpen, openChat, closeChat, toggleChat }),
    [isOpen, openChat, closeChat, toggleChat]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
