import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';

// The requirements checklist clients see and print with their application.
//   GET    /api/admin/checklist-items          → the active checklist and its items
//   POST   /api/admin/checklist-items          → add an item
//   PUT    /api/admin/checklist-items?id=<id>  → edit an item
//   DELETE /api/admin/checklist-items?id=<id>  → remove an item (and clients' ticks on it)
export default async function handler(req, res) {
  const admin = requireRole(req, res, 'admin');
  if (!admin) return;

  try {
    if (req.method === 'GET') return await listItems(res);
    if (req.method === 'POST') return await createItem(req, res);
    if (req.method === 'PUT') return await updateItem(req, res);
    if (req.method === 'DELETE') return await deleteItem(req, res);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Checklist items request failed:', err);
    return res.status(500).json({ error: 'Something went wrong with the checklist' });
  }
}

const ITEM_COLUMNS = `id, checklist_id AS "checklistId", label, description,
                      is_required AS "isRequired", display_order AS "displayOrder"`;

async function activeChecklist() {
  const result = await pool.query(
    'SELECT id, name, description FROM requirement_checklists WHERE is_active = true ORDER BY id LIMIT 1'
  );
  return result.rows[0] ?? null;
}

// Only items on the active checklist can be changed here.
async function findActiveItem(id) {
  if (!Number.isInteger(id)) return null;
  const result = await pool.query(
    `SELECT ci.id FROM checklist_items ci
     JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
     WHERE ci.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

function readItemBody(body) {
  const label = typeof body?.label === 'string' ? body.label.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!label) return { error: 'label is required' };
  if (label.length > 150) return { error: 'label must be 150 characters or fewer' };
  return { label, description: description || null, isRequired: Boolean(body?.isRequired) };
}

async function listItems(res) {
  const checklist = await activeChecklist();
  if (!checklist) return res.status(200).json({ checklist: null, items: [] });
  const result = await pool.query(
    `SELECT ${ITEM_COLUMNS} FROM checklist_items WHERE checklist_id = $1 ORDER BY display_order, id`,
    [checklist.id]
  );
  return res.status(200).json({ checklist, items: result.rows });
}

async function createItem(req, res) {
  const item = readItemBody(req.body);
  if (item.error) return res.status(400).json({ error: item.error });

  const checklist = await activeChecklist();
  if (!checklist) return res.status(400).json({ error: 'No active checklist to add this item to' });

  const result = await pool.query(
    `INSERT INTO checklist_items (checklist_id, label, description, is_required, display_order)
     VALUES ($1, $2, $3, $4,
             (SELECT COALESCE(MAX(display_order), 0) + 1 FROM checklist_items WHERE checklist_id = $1))
     RETURNING ${ITEM_COLUMNS}`,
    [checklist.id, item.label, item.description, item.isRequired]
  );
  return res.status(201).json({ item: result.rows[0] });
}

async function updateItem(req, res) {
  const id = Number(req.query?.id);
  if (!(await findActiveItem(id))) return res.status(404).json({ error: 'Checklist item not found' });
  const item = readItemBody(req.body);
  if (item.error) return res.status(400).json({ error: item.error });

  const result = await pool.query(
    `UPDATE checklist_items SET label = $2, description = $3, is_required = $4
     WHERE id = $1 RETURNING ${ITEM_COLUMNS}`,
    [id, item.label, item.description, item.isRequired]
  );
  return res.status(200).json({ item: result.rows[0] });
}

async function deleteItem(req, res) {
  const id = Number(req.query?.id);
  if (!(await findActiveItem(id))) return res.status(404).json({ error: 'Checklist item not found' });
  await pool.query('DELETE FROM checklist_items WHERE id = $1', [id]);
  return res.status(200).json({ id });
}
