import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';

// The client's requirements checklist — the documents to bring with the
// printed loan application. It is only a list: the client ticks what they
// already have. Nothing is uploaded or stored.
//   GET /api/client/checklist                       → items + which are ticked
//   PUT /api/client/checklist  { itemId, checked }  → tick or untick one item
export default async function handler(req, res) {
  const client = requireRole(req, res, 'client');
  if (!client) return;

  if (req.method === 'GET') return getChecklist(res, client);
  if (req.method === 'PUT') return markItem(req, res, client);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function loadClientChecklist(clientId) {
  const checklistResult = await pool.query(
    'SELECT id, name, description FROM requirement_checklists WHERE is_active = true ORDER BY id LIMIT 1'
  );
  if (checklistResult.rowCount === 0) return { checklistName: '', checklistDescription: '', items: [] };
  const checklist = checklistResult.rows[0];

  const itemsResult = await pool.query(
    `SELECT ci.id, ci.label, ci.description, ci.is_required AS "isRequired",
            m.marked_at AS "checkedAt"
     FROM checklist_items ci
     LEFT JOIN client_checklist_marks m
       ON m.checklist_item_id = ci.id AND m.client_id = $1
     WHERE ci.checklist_id = $2
     ORDER BY ci.display_order, ci.id`,
    [clientId, checklist.id]
  );

  return {
    checklistName: checklist.name,
    checklistDescription: checklist.description ?? '',
    items: itemsResult.rows.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description,
      isRequired: row.isRequired,
      checked: row.checkedAt !== null,
      checkedAt: row.checkedAt,
    })),
  };
}

async function getChecklist(res, client) {
  try {
    return res.status(200).json(await loadClientChecklist(client.sub));
  } catch (err) {
    console.error('Failed to load checklist:', err);
    return res.status(500).json({ error: 'Failed to load checklist' });
  }
}

async function markItem(req, res, client) {
  const itemId = Number(req.body?.itemId);
  const checked = req.body?.checked;
  if (!Number.isInteger(itemId) || typeof checked !== 'boolean') {
    return res.status(400).json({ error: 'itemId and checked (true/false) are required' });
  }

  try {
    // Only items on the active checklist can be ticked.
    const itemResult = await pool.query(
      `SELECT ci.id FROM checklist_items ci
       JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
       WHERE ci.id = $1`,
      [itemId]
    );
    if (itemResult.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    if (checked) {
      await pool.query(
        `INSERT INTO client_checklist_marks (client_id, checklist_item_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [client.sub, itemId]
      );
    } else {
      await pool.query(
        'DELETE FROM client_checklist_marks WHERE client_id = $1 AND checklist_item_id = $2',
        [client.sub, itemId]
      );
    }
    return res.status(200).json({ itemId, checked });
  } catch (err) {
    console.error('Failed to update checklist:', err);
    return res.status(500).json({ error: 'Failed to update checklist' });
  }
}
