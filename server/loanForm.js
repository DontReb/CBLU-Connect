import { pool } from './db.js';

// CBLU's Loan Application Form — Individual and Sole Proprietor (CBLU REV.
// 2023). Seeded by db/forms_seed.sql; printed by
// src/pages/client/ClientLoanApplicationPrint.jsx.
export const LOAN_FORM_CODE = 'cblu-loan-isp-2023';

// The template and its fields, in display order. `idSource` says which value
// from a scanned ID fills the field (null = the client types it).
export async function loadLoanForm(db = pool) {
  const templateResult = await db.query(
    'SELECT id, code, name, description FROM form_templates WHERE code = $1 AND is_active = true',
    [LOAN_FORM_CODE]
  );
  if (templateResult.rowCount === 0) return null;
  const template = templateResult.rows[0];

  const fieldsResult = await db.query(
    `SELECT id, field_key AS "fieldKey", label, section, field_type AS "fieldType",
            options, is_required AS "isRequired", help_text AS "helpText",
            id_source AS "idSource"
     FROM form_template_fields
     WHERE template_id = $1
     ORDER BY display_order`,
    [template.id]
  );
  return { template, fields: fieldsResult.rows };
}

// This client's application row (created on first save or scan).
export async function ensureSubmission(db, clientId, templateId) {
  const result = await db.query(
    `INSERT INTO form_submissions (client_id, template_id)
     VALUES ($1, $2)
     ON CONFLICT (client_id, template_id) DO UPDATE SET updated_at = now()
     RETURNING id, status, last_id_type AS "lastIdType", last_scan_at AS "lastScanAt",
               updated_at AS "updatedAt"`,
    [clientId, templateId]
  );
  return result.rows[0];
}

// { fieldKey: { value, source } } for one application.
export async function loadValues(db, submissionId) {
  const result = await db.query(
    `SELECT f.field_key AS "fieldKey", v.value, v.source
     FROM form_submission_values v
     JOIN form_template_fields f ON f.id = v.field_id
     WHERE v.submission_id = $1`,
    [submissionId]
  );
  const values = {};
  for (const row of result.rows) values[row.fieldKey] = { value: row.value ?? '', source: row.source };
  return values;
}
