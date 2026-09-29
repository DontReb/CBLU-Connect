// Placeholder data for the agent dashboard — mirrors what a real endpoint
// like GET /api/agent/sessions will eventually return, joining
// chat_sessions + chat_messages. Swap for a real fetch once that's wired up.

export const MOCK_AGENT = {
  fullName: 'Carlo Ramirez',
  email: 'carlo.ramirez@cblu.example',
  status: 'online', // online | offline | busy
};

// Exact wording of FALLBACK_REPLY in chatRules.js — once the chatbot
// actually escalates (a later step), this is the message that will trigger
// a new row here.
const BOT_FALLBACK =
  "I don't have a ready answer for that yet — let me connect you with a live agent who can help.";

export const MOCK_SESSIONS = [
  {
    id: 's1',
    clientName: 'Maria Santos',
    status: 'escalated', // bot | escalated | with_agent | closed
    messages: [
      {
        id: 1,
        senderType: 'client',
        content: 'Hi, I already have a savings account with you — can I add a joint owner without closing it?',
      },
      { id: 2, senderType: 'bot', content: BOT_FALLBACK },
    ],
  },
  {
    id: 's2',
    clientName: 'Ana Bautista',
    status: 'escalated',
    messages: [
      { id: 3, senderType: 'client', content: 'My signature specimen card got rejected twice, what am I doing wrong?' },
      { id: 4, senderType: 'bot', content: BOT_FALLBACK },
    ],
  },
  {
    id: 's3',
    clientName: 'Ramon Villanueva',
    status: 'with_agent',
    messages: [
      { id: 5, senderType: 'client', content: 'Can I use my UMID even though the address on it is outdated?' },
      { id: 6, senderType: 'bot', content: BOT_FALLBACK },
      {
        id: 7,
        senderType: 'agent',
        content:
          "Yes, that's fine for ID purposes — we just need your Proof of Billing to reflect your current address separately.",
      },
      { id: 8, senderType: 'client', content: "Got it, thank you! I'll upload proof of billing today." },
    ],
  },
  {
    id: 's4',
    clientName: 'Jerome dela Cruz',
    status: 'closed',
    messages: [
      {
        id: 9,
        senderType: 'client',
        content: 'Is there a minimum balance requirement to avoid the maintaining balance fee?',
      },
      { id: 10, senderType: 'bot', content: BOT_FALLBACK },
      {
        id: 11,
        senderType: 'agent',
        content: "For a regular savings account, you'll need to keep at least \u20b12,000 average daily balance to waive the fee.",
      },
      { id: 12, senderType: 'client', content: 'Perfect, thank you!' },
    ],
  },
];