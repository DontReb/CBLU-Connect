import { pool } from '../lib/db.js';
import { requireRole } from '../lib/auth.js';

export default async function handler(req, res) {
  const admin = requireRole(req, res, 'admin');
  if (!admin) return;

  if (req.method === 'GET') {
    return listItems(req, res);
  }
  if (req.method === 'POST') {
    return createItem(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

function toItem(row) {
  return {
    id: row.id,
    checklistId: row.checklistId,
    label: row.label,
    description: row.description,
    isRequired: row.isRequired,
    requiredKeywords: row.validationRules?.requiredKeywords ?? [],
    displayOrder: row.displayOrder,
  };
}

async function listItems(req, res) {
  try {
    const result = await pool.query(`
      SELECT id, checklist_id AS "checklistId", label, description,
             is_required AS "isRequired", validation_rules AS "validationRules",
             display_order AS "displayOrder"
      FROM checklist_items
      ORDER BY display_order
    `);
    return res.status(200).json({ items: result.rows.map(toItem) });
  } catch (err) {
    console.error('Failed to load checklist items:', err);
    return res.status(500).json({ error: 'Failed to load checklist items' });
  }
}

async function createItem(req, res) {
  const { label, description, isRequired, requiredKeywords } = req.body ?? {};
  if (!label || typeof label !== 'string' || !label.trim()) {
    return res.status(400).json({ error: 'label is required' });
  }

  try {
    // New items go on whichever checklist is currently active — there's
    // only one in practice right now (seed.sql creates it).
    const checklistResult = await pool.query(
      'SELECT id FROM requirement_checklists WHERE is_active = true ORDER BY id LIMIT 1'
    );
    if (checklistResult.rowCount === 0) {
      return res.status(400).json({ error: 'No active checklist to add this item to' });
    }
    const checklistId = checklistResult.rows[0].id;

    const orderResult = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 AS "nextOrder" FROM checklist_items WHERE checklist_id = $1',
      [checklistId]
    );
    const nextOrder = orderResult.rows[0].nextOrder;

    const validationRules = {
      requiredKeywords: Array.isArray(requiredKeywords) ? requiredKeywords : [],
    };

    const insertResult = await pool.query(
      `INSERT INTO checklist_items (checklist_id, label, description, is_required, validation_rules, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, checklist_id AS "checklistId", label, description,
                 is_required AS "isRequired", validation_rules AS "validationRules",
                 display_order AS "displayOrder"`,
      [checklistId, label.trim(), description?.trim() || null, Boolean(isRequired), JSON.stringify(validationRules), nextOrder]
    );

    return res.status(201).json({ item: toItem(insertResult.rows[0]) });
  } catch (err) {
    console.error('Failed to create checklist item:', err);
    return res.status(500).json({ error: 'Failed to create checklist item' });
  }
}