import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { LOAN_FORM_CODE } from '../../server/loanForm.js';

// GET /api/admin/clients          → every client with their progress
// GET /api/admin/clients?id=<id>  → one client: which requirements they've
//                                   ticked, and how far their loan
//                                   application is
//
// Progress counts the items on the ACTIVE requirements checklist that the
// client has ticked. Clients only tick what they have — nothing is
// uploaded — so this shows readiness, not verified documents.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireRole(req, res, 'admin');
  if (!admin) return;

  try {
    if (req.query?.id) return await getClient(res, String(req.query.id));
    return await listClients(res);
  } catch (err) {
    console.error('Failed to load clients:', err);
    return res.status(500).json({ error: 'Failed to load clients' });
  }
}

const CLIENT_QUERY = `
  WITH active_items AS (
    SELECT ci.id, ci.is_required
    FROM checklist_items ci
    JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
  ),
  loan_form AS (
    SELECT id FROM form_templates WHERE code = $1
  )
  SELECT
    u.id,
    u.full_name AS "fullName",
    u.email,
    cp.branch,
    cp.verification_status AS "verificationStatus",
    (SELECT COUNT(*) FROM client_checklist_marks m
       JOIN active_items ai ON ai.id = m.checklist_item_id
       WHERE m.client_id = u.id)::int AS "checkedCount",
    (SELECT COUNT(*) FROM active_items)::int AS "totalCount",
    (SELECT COUNT(*) FROM active_items ai
       WHERE ai.is_required AND NOT EXISTS (
         SELECT 1 FROM client_checklist_marks m WHERE m.client_id = u.id AND m.checklist_item_id = ai.id
       ))::int AS "requiredMissing",
    fs.updated_at AS "applicationUpdatedAt",
    fs.last_id_type AS "lastIdType",
    fs.last_scan_at AS "lastScanAt",
    (SELECT COUNT(*) FROM form_submission_values v
       WHERE v.submission_id = fs.id AND COALESCE(v.value, '') <> '')::int AS "filledCount",
    (SELECT COUNT(*) FROM form_template_fields f
       WHERE f.template_id = (SELECT id FROM loan_form) AND f.is_required)::int AS "requiredFieldCount",
    (SELECT COUNT(*) FROM form_submission_values v
       JOIN form_template_fields f ON f.id = v.field_id AND f.is_required
       WHERE v.submission_id = fs.id AND COALESCE(v.value, '') <> '')::int AS "requiredFilledCount"
  FROM users u
  LEFT JOIN client_profiles cp ON cp.user_id = u.id
  LEFT JOIN form_submissions fs ON fs.client_id = u.id AND fs.template_id = (SELECT id FROM loan_form)
  WHERE u.role = 'client'
`;

function toClient(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    branch: row.branch,
    verificationStatus: row.verificationStatus,
    checklist: {
      checked: row.checkedCount,
      total: row.totalCount,
      requiredMissing: row.requiredMissing,
    },
    application: row.applicationUpdatedAt
      ? {
          updatedAt: row.applicationUpdatedAt,
          lastIdType: row.lastIdType,
          lastScanAt: row.lastScanAt,
          filledCount: row.filledCount,
          requiredFilled: row.requiredFilledCount,
          requiredTotal: row.requiredFieldCount,
        }
      : null,
  };
}

async function listClients(res) {
  const result = await pool.query(`${CLIENT_QUERY} ORDER BY u.full_name`, [LOAN_FORM_CODE]);
  return res.status(200).json({ clients: result.rows.map(toClient) });
}

async function getClient(res, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid client id' });

  const result = await pool.query(`${CLIENT_QUERY} AND u.id = $2`, [LOAN_FORM_CODE, id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });

  const items = await pool.query(
    `SELECT ci.id, ci.label, ci.is_required AS "isRequired", m.marked_at AS "checkedAt"
     FROM checklist_items ci
     JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
     LEFT JOIN client_checklist_marks m ON m.checklist_item_id = ci.id AND m.client_id = $1
     ORDER BY ci.display_order, ci.id`,
    [id]
  );

  return res.status(200).json({
    client: {
      ...toClient(result.rows[0]),
      items: items.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isRequired: row.isRequired,
        checked: row.checkedAt !== null,
        checkedAt: row.checkedAt,
      })),
    },
  });
}
