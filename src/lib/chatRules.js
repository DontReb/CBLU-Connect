// Placeholder rule-based matching — mirrors the shape the real /api/chat
// endpoint will use once chatbot_rules is wired up in Postgres. Swap the
// body of matchRule() for a fetch('/api/chat', ...) call when that's built.

export const CHAT_RULES = [
  {
    keywords: ['open an account', 'open account', 'new account'],
    reply: 'You can open a checking or savings account online in about five minutes — no branch visit needed. Want the link to get started?',
  },
  {
    keywords: ['card', 'lost card', 'stolen', 'freeze'],
    reply: 'You can freeze your card instantly from the mobile app under Cards → Freeze. That stops new charges right away if it was lost or stolen.',
  },
  {
    keywords: ['loan', 'mortgage', 'interest rate', 'rate'],
    reply: 'Rates depend on the product and term you choose. I can pull up current rates, or connect you with an agent for a quote tailored to you.',
  },
  {
    keywords: ['branch', 'atm', 'location', 'near me'],
    reply: 'Tell me your city or zip code and I can point you to the nearest branch or fee-free ATM.',
  },
  {
    keywords: ['hour', 'open now', 'closing time'],
    reply: 'Most branches are open Monday–Friday, 9am–5pm, with select Saturday hours. Your local branch page has exact times.',
  },
];

const FALLBACK_REPLY =
  "I don't have a ready answer for that yet — let me connect you with a live agent who can help.";

export function matchRule(input) {
  const text = input.toLowerCase();
  const hit = CHAT_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );
  return hit ? hit.reply : FALLBACK_REPLY;
}