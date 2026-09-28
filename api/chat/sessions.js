import { pool } from '../lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  const user = await requireAuth(req, res, ['agent', 'admin']);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT cs.id, cs.status, cs.started_at, cs.escalated_at,
                u.full_name AS client_name, u.email AS client_email,
                COUNT(cm.id)::int AS message_count
         FROM chat_sessions cs
         JOIN users u ON u.id = cs.client_id
         LEFT JOIN chat_messages cm ON cm.session_id = cs.id
         WHERE cs.status IN ('escalated', 'with_agent')
         GROUP BY cs.id, u.full_name, u.email
         ORDER BY cs.escalated_at NULLS LAST, cs.started_at`
      );
      return res.status(200).json({ sessions: result.rows });
    }
    if (req.method === 'PATCH') {
      const { sessionId, status } = req.body || {};
      if (!sessionId || !['with_agent', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid session update' });
      const result = status === 'with_agent'
        ? await pool.query("UPDATE chat_sessions SET agent_id=$1,status='with_agent' WHERE id=$2 AND status='escalated' RETURNING id", [user.id, sessionId])
        : await pool.query("UPDATE chat_sessions SET status='closed',closed_at=now() WHERE id=$1 AND (agent_id=$2 OR $3='admin') RETURNING id", [sessionId, user.id, user.role]);
      if (!result.rowCount) return res.status(404).json({ error: 'Session not found or unavailable' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load chat sessions' });
  }
}
