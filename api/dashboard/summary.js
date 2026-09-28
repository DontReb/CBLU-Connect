import { pool } from '../lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (user.role === 'admin') {
      const [users, rules, sessions, uploads] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS count FROM users'),
        pool.query('SELECT COUNT(*)::int AS count FROM chatbot_rules WHERE is_active = TRUE'),
        pool.query("SELECT COUNT(*)::int AS count FROM chat_sessions WHERE status IN ('escalated', 'with_agent')"),
        pool.query('SELECT COUNT(*)::int AS count FROM document_uploads'),
      ]);
      return res.status(200).json({
        role: 'admin',
        metrics: {
          users: users.rows[0].count,
          activeRules: rules.rows[0].count,
          activeChats: sessions.rows[0].count,
          uploads: uploads.rows[0].count,
        },
      });
    }

    if (user.role === 'agent') {
      const [queue, active, profile] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS count FROM chat_sessions WHERE status = 'escalated'"),
        pool.query("SELECT COUNT(*)::int AS count FROM chat_sessions WHERE agent_id = $1 AND status = 'with_agent'", [user.id]),
        pool.query('SELECT status, max_concurrent_chats FROM agent_profiles WHERE user_id = $1', [user.id]),
      ]);
      return res.status(200).json({
        role: 'agent',
        metrics: {
          queue: queue.rows[0].count,
          activeChats: active.rows[0].count,
          status: profile.rows[0]?.status || 'offline',
          maxConcurrentChats: profile.rows[0]?.max_concurrent_chats || 3,
        },
      });
    }

    const [checklists, uploads] = await Promise.all([
      pool.query(
        `SELECT rc.id, rc.name, rc.description,
                COALESCE(json_agg(json_build_object(
                  'id', ci.id, 'label', ci.label, 'description', ci.description,
                  'required', ci.is_required, 'displayOrder', ci.display_order,
                  'validationRules', ci.validation_rules
                ) ORDER BY ci.display_order) FILTER (WHERE ci.id IS NOT NULL), '[]') AS items
         FROM requirement_checklists rc
         LEFT JOIN checklist_items ci ON ci.checklist_id = rc.id
         WHERE rc.is_active = TRUE
         GROUP BY rc.id
         ORDER BY rc.id`
      ),
      pool.query(
        `SELECT du.id, du.file_name, du.status, du.uploaded_at, ci.label AS checklist_item,
                dv.is_valid, dv.notes, dor.confidence_score
         FROM document_uploads du
         JOIN checklist_items ci ON ci.id = du.checklist_item_id
         LEFT JOIN document_validations dv ON dv.document_upload_id = du.id
         LEFT JOIN document_ocr_results dor ON dor.document_upload_id = du.id
         WHERE du.client_id = $1
         ORDER BY du.uploaded_at DESC`,
        [user.id]
      ),
    ]);

    return res.status(200).json({
      role: 'client',
      checklists: checklists.rows,
      uploads: uploads.rows,
    });
  } catch (error) {
    console.error('Dashboard summary failed:', error);
    return res.status(500).json({ error: 'Unable to load dashboard' });
  }
}
