import { createContext, useContext } from 'react';

// Split from ChatProvider.jsx for the same reason as the other contexts in
// this folder — a file exporting a component needs to export only
// components for Fast Refresh.
export const ChatContext = createContext(null);

// { isOpen, openChat, closeChat, toggleChat } — lets any page (e.g. the
// homepage's "Ask a question" button) open the site-wide chatbot.
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be called within a ChatProvider');
  }
  return ctx;
}
