import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = requireRole(req, res, 'client');
  if (!client) return;

  try {
    const checklistResult = await pool.query(
      'SELECT id, name FROM requirement_checklists WHERE is_active = true ORDER BY id LIMIT 1'
    );
    if (checklistResult.rowCount === 0) {
      return res.status(200).json({ checklistName: '', items: [] });
    }
    const checklist = checklistResult.rows[0];

    // For each item, pull this client's most recent upload + validation
    // result via a lateral join, so an item with zero uploads yet still
    // shows up (with null status fields) instead of being left out.
    const itemsResult = await pool.query(
      `SELECT
         ci.id,
         ci.label,
         ci.description,
         ci.is_required AS "isRequired",
         latest.file_name AS "fileName",
         latest.is_valid AS "isValid",
         latest.notes
       FROM checklist_items ci
       LEFT JOIN LATERAL (
         SELECT du.file_name, dv.is_valid, dv.notes
         FROM document_uploads du
         LEFT JOIN document_validations dv ON dv.document_upload_id = du.id
         WHERE du.client_id = $1 AND du.checklist_item_id = ci.id
         ORDER BY du.uploaded_at DESC
         LIMIT 1
       ) latest ON true
       WHERE ci.checklist_id = $2
       ORDER BY ci.display_order`,
      [client.sub, checklist.id]
    );

    const items = itemsResult.rows.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      isRequired: row.isRequired,
      fileName: row.fileName,
      status: row.isValid === null ? 'pending' : row.isValid ? 'valid' : 'invalid',
      notes: row.notes,
    }));

    return res.status(200).json({ checklistName: checklist.name, items });
  } catch (err) {
    console.error('Failed to load checklist:', err);
    return res.status(500).json({ error: 'Failed to load checklist' });
  }
}