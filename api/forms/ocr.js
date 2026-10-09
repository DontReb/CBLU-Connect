import { IncomingForm } from 'formidable';
import fs from 'fs';
import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { isSupportedImage, UNSUPPORTED_FILE_MESSAGE } from '../../server/ocr.js';
import { ID_LABELS, UNKNOWN_ID_MESSAGE } from '../../server/idParsers.js';
import { scanId } from '../../server/idScan.js';
import { loadLoanForm, ensureSubmission, loadValues } from '../../server/loanForm.js';

// POST /api/forms/ocr — multipart: "front" (required) and "back" (optional)
// photos of ONE valid ID: PhilSys National ID, Driver's License or Passport.
//
// Reads the ID, then fills the loan application fields that also appear on
// the ID (name, birth date, sex, citizenship, address, civil status — the
// fields with an id_source). A value the client typed themselves is never
// overwritten.
//
// Data minimisation: the photos are deleted as soon as they are read, and
// neither the photos nor the ID's text are stored — only the form values,
// which ID type was scanned, when, and OCR's confidence.
//
// Formidable reads the multipart stream itself, so the default body parser
// is off. This function's time limit is set in vercel.json ("functions").
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = requireRole(req, res, 'client');
  if (!client) return;

  const tempFiles = [];
  let db;
  try {
    const { files } = await parseForm(req);
    const front = files.front?.[0];
    const back = files.back?.[0];
    for (const file of [front, back]) if (file) tempFiles.push(file.filepath);

    if (!front) {
      return res.status(400).json({ error: 'Add a photo of the front of your ID.' });
    }
    if (![front, back].filter(Boolean).every(isSupportedImage)) {
      return res.status(400).json({ error: UNSUPPORTED_FILE_MESSAGE });
    }

    const form = await loadLoanForm();
    if (!form) {
      return res.status(404).json({ error: 'Loan application form is not set up yet' });
    }

    // 1. Read the ID
    const scan = await scanId(tempFiles);
    if (!scan.idType) {
      return res.status(422).json({ error: UNKNOWN_ID_MESSAGE });
    }

    // 2. Fill the matching fields. The WHERE clause is what stops a scan
    //    from overwriting something the client typed or corrected.
    db = await pool.connect();
    await db.query('BEGIN');
    const submission = await ensureSubmission(db, client.sub, form.template.id);

    const filled = [];
    const kept = [];
    const notFound = [];
    for (const field of form.fields.filter((f) => f.idSource)) {
      const value = scan.fields[field.idSource];
      if (!value || (field.fieldType === 'select' && !optionValues(field.options).includes(value))) {
        // Most people have no suffix (Jr., III), so a missing one isn't news.
        if (field.idSource !== 'suffix') notFound.push(field.fieldKey);
        continue;
      }
      const result = await db.query(
        `INSERT INTO form_submission_values (submission_id, field_id, value, source)
         VALUES ($1, $2, $3, 'ocr')
         ON CONFLICT (submission_id, field_id)
         DO UPDATE SET value = EXCLUDED.value, source = 'ocr'
         WHERE form_submission_values.source <> 'manual'
            OR COALESCE(form_submission_values.value, '') = ''
         RETURNING id`,
        [submission.id, field.id, value]
      );
      (result.rowCount > 0 ? filled : kept).push(field.fieldKey);
    }

    await db.query(
      `UPDATE form_submissions
       SET last_id_type = $2, last_scan_at = now(), last_ocr_confidence = $3
       WHERE id = $1`,
      [submission.id, scan.idType, scan.confidence]
    );
    await db.query('COMMIT');

    return res.status(200).json({
      idType: scan.idType,
      idLabel: ID_LABELS[scan.idType],
      filled,      // written by this scan
      kept,        // read from the ID, but the client had typed their own value
      notFound,    // could be filled from this ID type, but wasn't readable / isn't on it
      warnings: scan.warnings,
      confidence: scan.confidence,
      values: await loadValues(pool, submission.id),
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    if (err?.httpCode === 413 || err?.code === 1009) {
      return res.status(413).json({ error: 'That photo is too large. Try a smaller one (under 8 MB).' });
    }
    console.error('ID scan failed:', err);
    return res.status(500).json({ error: 'Reading your ID failed. Please try again.' });
  } finally {
    if (db) db.release();
    for (const filePath of tempFiles) fs.unlink(filePath, () => {});
  }
}

// Select options may be plain strings or { group, options } groups.
function optionValues(options) {
  return (options ?? []).flatMap((option) => (typeof option === 'string' ? [option] : option.options ?? []));
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ maxFiles: 2, keepExtensions: true, maxFileSize: 8 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
