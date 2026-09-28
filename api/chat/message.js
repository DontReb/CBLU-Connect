import { pool } from '../lib/db.js';
import { getSession } from '../_lib/auth.js';

function findMatch(text, rules) {
  const normalized = text.toLowerCase();
  return rules.find((rule) =>
    rule.trigger_keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()))
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, sessionId } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const rulesResult = await pool.query(
      `SELECT id, trigger_keywords, response_text, priority
       FROM chatbot_rules
       WHERE is_active = TRUE
       ORDER BY priority DESC, id ASC`
    );
    const match = findMatch(message.trim(), rulesResult.rows);
    const session = getSession(req);

    let chatSessionId = null;
    if (session?.role === 'client') {
      if (sessionId) {
        const owned = await pool.query(
          'SELECT id FROM chat_sessions WHERE id = $1 AND client_id = $2',
          [sessionId, session.sub]
        );
        if (owned.rowCount) chatSessionId = sessionId;
      }
      if (!chatSessionId) {
        const created = await pool.query(
          'INSERT INTO chat_sessions (client_id, status) VALUES ($1, $2) RETURNING id',
          [session.sub, match ? 'bot' : 'escalated']
        );
        chatSessionId = created.rows[0].id;
      }

      const reply = match?.response_text ||
        "I don't have a ready answer for that yet. I've marked this conversation for a live agent to review.";

      await pool.query(
        `INSERT INTO chat_messages (session_id, sender_type, sender_id, content)
         VALUES ($1, 'client', $2, $3)`,
        [chatSessionId, session.sub, message.trim()]
      );
      await pool.query(
        `INSERT INTO chat_messages (session_id, sender_type, matched_rule_id, content)
         VALUES ($1, 'bot', $2, $3)`,
        [chatSessionId, match?.id || null, reply]
      );
      if (!match) {
        await pool.query(
          "UPDATE chat_sessions SET status = 'escalated', escalated_at = COALESCE(escalated_at, now()) WHERE id = $1",
          [chatSessionId]
        );
      }

      return res.status(200).json({ reply, matchedRule: match?.id || null, escalated: !match, sessionId: chatSessionId });
    }

    const reply = match?.response_text ||
      "I don't have a ready answer for that yet. Please log in so a live-agent request can be tracked.";
    return res.status(200).json({ reply, matchedRule: match?.id || null, escalated: !match, sessionId: null });
  } catch (error) {
    console.error('Chat failed:', error);
    return res.status(500).json({ error: 'Unable to process chat message' });
  }
}
