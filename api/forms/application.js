import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';

// One endpoint for the client's loan application (kept as a single file so
// it only counts once toward Vercel's free-plan function limit):
//   GET  /api/forms/application  → the form template + this client's saved values
//   PUT  /api/forms/application  → save this client's values
//
// Scanning a paper form is a separate endpoint (api/forms/ocr.js) because
// it needs multipart uploads and a longer time limit.

const TEMPLATE_CODE = 'sblaf-isp';

export default async function handler(req, res) {
  const client = requireRole(req, res, 'client');
  if (!client) return;

  if (req.method === 'GET') return getApplication(req, res, client);
  if (req.method === 'PUT') return saveApplication(req, res, client);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function loadTemplate() {
  const templateResult = await pool.query(
    'SELECT id, code, name, description FROM form_templates WHERE code = $1 AND is_active = true',
    [TEMPLATE_CODE]
  );
  if (templateResult.rowCount === 0) return null;
  const template = templateResult.rows[0];

  const fieldsResult = await pool.query(
    `SELECT id, field_key AS "fieldKey", label, section, field_type AS "fieldType",
            options, is_required AS "isRequired", help_text AS "helpText",
            autofill_pattern IS NOT NULL AS "canAutofill"
     FROM form_template_fields
     WHERE template_id = $1
     ORDER BY display_order`,
    [template.id]
  );

  return { template, fields: fieldsResult.rows };
}

async function getApplication(req, res, client) {
  try {
    const loaded = await loadTemplate();
    if (!loaded) {
      return res.status(404).json({ error: 'Loan application form is not set up yet' });
    }
    const { template, fields } = loaded;

    const submissionResult = await pool.query(
      `SELECT id, status, updated_at AS "updatedAt"
       FROM form_submissions WHERE client_id = $1 AND template_id = $2`,
      [client.sub, template.id]
    );
    const submission = submissionResult.rows[0] ?? null;

    const values = {};
    if (submission) {
      const valuesResult = await pool.query(
        `SELECT f.field_key AS "fieldKey", v.value, v.source
         FROM form_submission_values v
         JOIN form_template_fields f ON f.id = v.field_id
         WHERE v.submission_id = $1`,
        [submission.id]
      );
      for (const row of valuesResult.rows) {
        values[row.fieldKey] = { value: row.value ?? '', source: row.source };
      }
    }

    return res.status(200).json({ template, fields, submission, values });
  } catch (err) {
    console.error('Failed to load loan application:', err);
    return res.status(500).json({ error: 'Failed to load loan application' });
  }
}

// Body: { values: { [fieldKey]: { value: string, source: 'ocr' | 'manual' } } }
async function saveApplication(req, res, client) {
  const incoming = req.body?.values;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'values is required' });
  }

  let db;
  try {
    const loaded = await loadTemplate();
    if (!loaded) {
      return res.status(404).json({ error: 'Loan application form is not set up yet' });
    }
    const { template, fields } = loaded;
    const fieldIdByKey = new Map(fields.map((f) => [f.fieldKey, f.id]));

    db = await pool.connect();
    await db.query('BEGIN');

    const submissionResult = await db.query(
      `INSERT INTO form_submissions (client_id, template_id)
       VALUES ($1, $2)
       ON CONFLICT (client_id, template_id) DO UPDATE SET updated_at = now()
       RETURNING id, status, updated_at AS "updatedAt"`,
      [client.sub, template.id]
    );
    const submission = submissionResult.rows[0];

    for (const [fieldKey, entry] of Object.entries(incoming)) {
      const fieldId = fieldIdByKey.get(fieldKey);
      if (!fieldId) continue; // ignore anything that isn't a field on this form

      const value = typeof entry?.value === 'string' ? entry.value.trim().slice(0, 2000) : '';
      const source = entry?.source === 'ocr' ? 'ocr' : 'manual';

      await db.query(
        `INSERT INTO form_submission_values (submission_id, field_id, value, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (submission_id, field_id)
         DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source`,
        [submission.id, fieldId, value, source]
      );
    }

    await db.query('COMMIT');
    return res.status(200).json({ submission });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Failed to save loan application:', err);
    return res.status(500).json({ error: 'Failed to save loan application' });
  } finally {
    if (db) db.release();
  }
}
