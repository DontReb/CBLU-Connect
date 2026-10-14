import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { loadLoanForm, ensureSubmission, loadValues } from '../../server/loanForm.js';
import { identityStatus } from '../../server/identity.js';

// The client's loan application (one file, so it counts once toward
// Vercel's free-plan function limit):
//   GET  /api/forms/application  → the form's fields + this client's saved values
//   PUT  /api/forms/application  → save this client's values
//
// Filling fields from an ID photo is api/forms/ocr.js (it needs multipart
// uploads and a longer time limit). The printable form is built in the
// browser from the GET response.

export default async function handler(req, res) {
  const client = requireRole(req, res, 'client');
  if (!client) return;

  if (req.method === 'GET') return getApplication(res, client);
  if (req.method === 'PUT') return saveApplication(req, res, client);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function getApplication(res, client) {
  try {
    const form = await loadLoanForm();
    if (!form) return res.status(404).json({ error: 'Loan application form is not set up yet' });
    const { template, fields } = form;

    const submissionResult = await pool.query(
      `SELECT id, status, last_id_type AS "lastIdType", last_scan_at AS "lastScanAt",
              identity_verified_at AS "identityVerifiedAt", updated_at AS "updatedAt"
       FROM form_submissions WHERE client_id = $1 AND template_id = $2`,
      [client.sub, template.id]
    );
    const submission = submissionResult.rows[0] ?? null;
    const values = submission ? await loadValues(pool, submission.id) : {};

    return res.status(200).json({
      template,
      // Database ids stay on the server; the page works with field keys.
      fields: fields.map((field) => ({
        fieldKey: field.fieldKey,
        label: field.label,
        section: field.section,
        fieldType: field.fieldType,
        options: field.options,
        isRequired: field.isRequired,
        helpText: field.helpText,
        idSource: field.idSource,
      })),
      submission: submission && {
        status: submission.status,
        lastIdType: submission.lastIdType,
        lastScanAt: submission.lastScanAt,
        identityVerifiedAt: submission.identityVerifiedAt,
        updatedAt: submission.updatedAt,
      },
      values,
      // Face check: when it last passed, tries left today, locked or not.
      identity: await identityStatus(pool, client.sub),
    });
  } catch (err) {
    console.error('Failed to load loan application:', err);
    return res.status(500).json({ error: 'Failed to load loan application' });
  }
}

// Body: { values: { [fieldKey]: { value: string, source: 'ocr' | 'manual' } } }
//    or { clear: true } — erase every answer (the "Clear form" button)
async function saveApplication(req, res, client) {
  if (req.body?.clear === true) return clearApplication(res, client);
  const incoming = req.body?.values;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'values is required' });
  }

  let db;
  try {
    const form = await loadLoanForm();
    if (!form) return res.status(404).json({ error: 'Loan application form is not set up yet' });
    const fieldByKey = new Map(form.fields.map((f) => [f.fieldKey, f]));

    db = await pool.connect();
    await db.query('BEGIN');
    const submission = await ensureSubmission(db, client.sub, form.template.id);
    const saved = await loadValues(db, submission.id);

    for (const [fieldKey, entry] of Object.entries(incoming)) {
      const field = fieldByKey.get(fieldKey);
      if (!field) continue; // ignore anything that isn't a field on this form

      const value = typeof entry?.value === 'string' ? entry.value.trim().slice(0, 2000) : '';
      // "From your ID" ('ocr') only stays on a value the server itself wrote
      // after a passed face check, and only while it's unchanged. Anything
      // the client sends or edits is 'manual'.
      const before = saved[fieldKey];
      const source = entry?.source === 'ocr' && before?.source === 'ocr' && before.value === value ? 'ocr' : 'manual';

      await db.query(
        `INSERT INTO form_submission_values (submission_id, field_id, value, source)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (submission_id, field_id)
         DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source`,
        [submission.id, field.id, value, source]
      );
    }

    await db.query('COMMIT');
    return res.status(200).json({
      submission: {
        status: submission.status,
        lastIdType: submission.lastIdType,
        lastScanAt: submission.lastScanAt,
        updatedAt: submission.updatedAt,
      },
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Failed to save loan application:', err);
    return res.status(500).json({ error: 'Failed to save loan application' });
  } finally {
    if (db) db.release();
  }
}

// Erases all of this client's answers and the details of their last scan.
// Their face check history and requirement ticks are not touched.
async function clearApplication(res, client) {
  let db;
  try {
    const form = await loadLoanForm();
    if (!form) return res.status(404).json({ error: 'Loan application form is not set up yet' });

    db = await pool.connect();
    await db.query('BEGIN');
    const submission = await ensureSubmission(db, client.sub, form.template.id);
    await db.query('DELETE FROM form_submission_values WHERE submission_id = $1', [submission.id]);
    const updated = await db.query(
      `UPDATE form_submissions
       SET last_id_type = NULL, last_scan_at = NULL, last_ocr_confidence = NULL, updated_at = now()
       WHERE id = $1
       RETURNING updated_at AS "updatedAt"`,
      [submission.id]
    );
    await db.query('COMMIT');
    return res.status(200).json({
      cleared: true,
      submission: { status: submission.status, lastIdType: null, lastScanAt: null, updatedAt: updated.rows[0].updatedAt },
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Failed to clear loan application:', err);
    return res.status(500).json({ error: 'Failed to clear the form' });
  } finally {
    if (db) db.release();
  }
}
