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
    keywords: ['print', 'printing', 'printed', 'pdf', 'download', 'hard copy'],
    reply:
      'When your loan application is filled in, press Print form on the Loan Application page. It prints CBLU\'s application form with your details, plus your requirements checklist as the last page. Sign it, attach a recent 2x2 ID picture, and bring it to the bank.',
  },
  {
    keywords: ['valid id', 'valid ids', 'id', 'ids', 'philsys', 'national id', 'passport', "driver's license", 'drivers license', 'license', 'scan', 'scanning'],
    reply:
      "On the Loan Application page you can fill in your details from a photo of one valid ID: a PhilSys National ID, a Driver's License or a Passport. We read your name, birth date, sex, citizenship, address and civil status from it — please check them before saving. Your photo is only read, never saved.",
  },
  {
    keywords: ['loan', 'loans', 'business loan', 'salary loan', 'borrow', 'credit', 'capital', 'financing', 'apply'],
    reply:
      "To apply for a loan, log in and open Loan Application in your client dashboard. Upload a photo of a valid ID and we'll fill in your personal details, then complete the rest of the form. Print it, sign it, and bring it to the bank with the documents on your Requirements page.",
  },
  {
    keywords: ['open an account', 'open account', 'new account', 'savings account', 'savings', 'account opening', 'deposit'],
    reply:
      'To open a savings account, please visit your nearest CBLU branch with a valid government ID. This portal is for loan applications: you can fill in the form online, print it, and check what documents to bring.',
  },
  {
    keywords: ['requirement', 'requirements', 'document', 'documents', 'checklist', 'what do i need', 'what to bring'],
    reply:
      "The Requirements page in your client dashboard lists the documents to bring with your loan application. Tick each one you already have — it's only a checklist, nothing is uploaded — and the list prints with your application form.",
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
      "I'm the assistant for Cooperative Bank of La Union's client portal. Here you can fill in a loan application from a photo of your ID, print it, and keep track of the documents you need to bring.",
  },
  {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'kamusta'],
    reply:
      'Hi there! I can help with loan applications, which IDs you can use, requirements, printing your form, or logging in. What would you like to know?',
  },
  {
    keywords: ['thanks', 'thank you', 'thank', 'salamat', 'ty'],
    reply: "You're welcome! Anything else I can help with?",
  },
];

const FALLBACK_REPLY =
  "Sorry, I don't have an answer for that yet. Try asking about loan applications, valid IDs, requirements, printing your form, or logging in — or tap \"Chat with a live agent\" below.";

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
