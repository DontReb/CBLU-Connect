import { pool } from '../lib/db.js';
import { requireAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['client', 'admin']);
  if (!user) return;
  try {
    const result = await pool.query(
      `SELECT rc.id, rc.name, rc.description,
              COALESCE(json_agg(json_build_object('id',ci.id,'label',ci.label,'description',ci.description,'required',ci.is_required,'displayOrder',ci.display_order) ORDER BY ci.display_order) FILTER (WHERE ci.id IS NOT NULL),'[]') AS items
       FROM requirement_checklists rc LEFT JOIN checklist_items ci ON ci.checklist_id=rc.id
       WHERE rc.is_active=TRUE GROUP BY rc.id ORDER BY rc.id`
    );
    return res.status(200).json({ checklists: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to load checklists' });
  }
}
