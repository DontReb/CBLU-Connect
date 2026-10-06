import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireRole(req, res, 'admin');
  if (!admin) return;

  try {
    // A checklist item counts as done for a client once any of their
    // uploads against it has a validation row with is_valid = true —
    // COUNT(DISTINCT checklist_item_id) so a retry doesn't get double
    // counted. total_count assumes a single active checklist, same as the
    // rest of the app right now.
    const result = await pool.query(`
      SELECT
        u.id,
        u.full_name AS "fullName",
        u.email,
        cp.branch,
        cp.verification_status AS "verificationStatus",
        (COUNT(DISTINCT du.checklist_item_id) FILTER (WHERE dv.is_valid))::int AS "validItemCount",
        (SELECT COUNT(*) FROM checklist_items)::int AS "totalItemCount"
      FROM users u
      JOIN client_profiles cp ON cp.user_id = u.id
      LEFT JOIN document_uploads du ON du.client_id = u.id
      LEFT JOIN document_validations dv ON dv.document_upload_id = du.id
      WHERE u.role = 'client'
      GROUP BY u.id, u.full_name, u.email, cp.branch, cp.verification_status
      ORDER BY u.full_name
    `);

    const clients = result.rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      branch: row.branch,
      verificationStatus: row.verificationStatus,
      checklistProgress: `${row.validItemCount} of ${row.totalItemCount}`,
    }));

    return res.status(200).json({ clients });
  } catch (err) {
    console.error('Failed to load clients:', err);
    return res.status(500).json({ error: 'Failed to load clients' });
  }
}