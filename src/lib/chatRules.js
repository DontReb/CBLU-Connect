// Rule-based replies for the site-wide chatbot (ChatWidget.jsx, shown on
// every page — so replies shouldn't assume which page the visitor is on). Plain
// keyword matching, not AI: each rule lists words or phrases a visitor
// might type, and the FIRST rule with a match wins — so more specific
// rules sit above more general ones.
//
// Keywords match whole words only, so "hi" matches "hi there" but not
// "this" or "which". List plurals separately ("loan", "loans").
//
// The bot itself runs in the browser. A rule with `action: 'live-agent'`
// doesn't just reply — ChatWidget.jsx hands the conversation to a real
// agent through api/chat.js (logged-in clients only).

export const CHAT_RULES = [
  {
    keywords: ['agent', 'live agent', 'human', 'person', 'representative', 'staff', 'talk to someone', 'real person'],
    action: 'live-agent',
    reply: 'Sure — let me connect you with a live agent.',
  },
  {
    keywords: ['password', 'forgot', 'log in', 'login', 'sign in', 'signin', 'locked', "can't log in", 'cannot log in'],
    reply:
      'Log in from the Log In button on our homepage, using the email and password the bank gave you. Password reset through the portal isn\'t available yet — if you can\'t get in, please contact your branch to reset it.',
  },
  {
    keywords: ['interest', 'interest rate', 'rate', 'rates', 'fee', 'fees', 'charges'],
    reply:
      'Rates and fees depend on the product, loan amount and term, so please ask your nearest CBLU branch for current figures — they can give you an exact quote.',
  },
  {
    keywords: ['loan', 'loans', 'business loan', 'borrow', 'credit', 'capital', 'financing'],
    reply:
      'For a business loan, open Loan Application in your client dashboard (log in first if you haven\'t). You can fill in the form online, or upload a photo of the paper form you already filled out — we\'ll fill in your email, mobile number and TIN automatically, and you check the rest before saving.',
  },
  {
    keywords: ['open an account', 'open account', 'new account', 'savings account', 'savings', 'account opening', 'deposit'],
    reply:
      "To open a CBLU savings account, you'll need a valid government ID, a recent proof of billing, and a signed signature specimen card. Go to Documents in your client dashboard — it lists what you still need and checks each upload for you.",
  },
  {
    keywords: ['requirement', 'requirements', 'document', 'documents', 'checklist', 'id', 'valid id', 'upload', 'what do i need'],
    reply:
      "Requirements depend on what you're applying for. The Documents page in your client dashboard lists each one and tells you right away whether your upload was accepted or needs another try.",
  },
  {
    keywords: ['branch', 'branches', 'atm', 'atms', 'location', 'located', 'address', 'where are you', 'near me', 'contact', 'phone', 'call', 'hotline'],
    reply:
      'CBLU serves clients across La Union. You can find our branch on the map on our homepage — or visit or call your nearest branch for directions and contact details.',
  },
  {
    keywords: ['hours', 'open today', 'opening hours', 'closing time', 'what time', 'schedule', 'holiday'],
    reply:
      'Branch hours can change on holidays and vary by branch, so please check with your branch directly. Schedule changes are also posted under Announcements on your client dashboard.',
  },
  {
    keywords: ['announcement', 'announcements', 'news', 'update', 'updates'],
    reply:
      "Bank announcements show up on the Overview page of your client dashboard — that's where we post schedule changes and other updates.",
  },
  {
    keywords: ['what is cblu', 'cblu', 'cooperative bank', 'who are you', 'about'],
    reply:
      "I'm the assistant for Cooperative Bank of La Union's client portal. Here you can check your document requirements, upload them for an instant check, and fill in a business loan application online.",
  },
  {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'kamusta'],
    reply:
      'Hi there! I can help with opening a savings account, business loan applications, document requirements, or logging in. What would you like to know?',
  },
  {
    keywords: ['thanks', 'thank you', 'thank', 'salamat', 'ty'],
    reply: "You're welcome! Anything else I can help with?",
  },
];

const FALLBACK_REPLY =
  "Sorry, I don't have an answer for that yet. Try asking about opening a savings account, business loans, document requirements, or logging in — or tap \"Chat with a live agent\" below.";

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-word match: the keyword must not have a letter or digit right
// before or after it.
function containsKeyword(text, keyword) {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`).test(text);
}

function findRule(input) {
  const text = input.toLowerCase();
  return CHAT_RULES.find((rule) => rule.keywords.some((keyword) => containsKeyword(text, keyword)));
}

export function matchRule(input) {
  return findRule(input)?.reply ?? FALLBACK_REPLY;
}

// True when the message is asking for a person rather than the bot.
export function wantsLiveAgent(input) {
  return findRule(input)?.action === 'live-agent';
}
