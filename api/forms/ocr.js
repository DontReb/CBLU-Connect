import { IncomingForm } from 'formidable';
import fs from 'fs';
import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { runOcr, isSupportedImage, UNSUPPORTED_FILE_MESSAGE } from '../../server/ocr.js';
import { extractAutofillValues } from '../../server/formAutofill.js';

// POST /api/forms/ocr — multipart, one file in the "document" field.
// Scans a photo of a filled-out paper loan application, finds the values
// for the few fields that can be reliably auto-filled (email, mobile, TIN),
// and saves them as source 'ocr' — but never over a value the client typed
// themselves (source 'manual').
//
// Formidable reads the multipart stream itself, so the default body parser
// is off. This function's time limit is set in vercel.json ("functions").
export const config = {
  api: { bodyParser: false },
};

const TEMPLATE_CODE = 'sblaf-isp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = requireRole(req, res, 'client');
  if (!client) return;

  let tempFilePath;

  try {
    const { files } = await parseForm(req);
    const file = files.document?.[0];
    if (!file) {
      return res.status(400).json({ error: 'A photo of the form is required' });
    }
    tempFilePath = file.filepath;
    if (!isSupportedImage(file)) {
      return res.status(400).json({ error: UNSUPPORTED_FILE_MESSAGE });
    }

    const templateResult = await pool.query(
      'SELECT id FROM form_templates WHERE code = $1 AND is_active = true',
      [TEMPLATE_CODE]
    );
    if (templateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Loan application form is not set up yet' });
    }
    const templateId = templateResult.rows[0].id;

    const fieldsResult = await pool.query(
      `SELECT id, field_key AS "fieldKey", autofill_pattern AS "autofillPattern"
       FROM form_template_fields
       WHERE template_id = $1 AND autofill_pattern IS NOT NULL`,
      [templateId]
    );
    const autofillFields = fieldsResult.rows;

    // 1. OCR the photo
    const { text, confidence } = await runOcr(tempFilePath);

    // 2. Pattern-match the few auto-fillable fields
    const found = extractAutofillValues(text, autofillFields);

    // 3. Make sure this client has a submission row, and keep the raw text
    const submissionResult = await pool.query(
      `INSERT INTO form_submissions (client_id, template_id, last_ocr_text, last_ocr_confidence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id, template_id)
       DO UPDATE SET last_ocr_text = EXCLUDED.last_ocr_text,
                     last_ocr_confidence = EXCLUDED.last_ocr_confidence
       RETURNING id`,
      [client.sub, templateId, text, confidence]
    );
    const submissionId = submissionResult.rows[0].id;

    // 4. Save what was found — the WHERE clause is what stops a scan from
    //    overwriting something the client corrected by hand.
    const fieldIdByKey = new Map(autofillFields.map((f) => [f.fieldKey, f.id]));
    const saved = [];
    for (const [fieldKey, value] of Object.entries(found)) {
      const result = await pool.query(
        `INSERT INTO form_submission_values (submission_id, field_id, value, source)
         VALUES ($1, $2, $3, 'ocr')
         ON CONFLICT (submission_id, field_id)
         DO UPDATE SET value = EXCLUDED.value, source = 'ocr'
         WHERE form_submission_values.source <> 'manual'
         RETURNING id`,
        [submissionId, fieldIdByKey.get(fieldKey), value]
      );
      if (result.rowCount > 0) saved.push(fieldKey);
    }

    return res.status(200).json({
      extractedText: text,
      confidence,
      found,          // everything the patterns matched
      saved,          // the subset actually written (not blocked by a manual value)
      scannableCount: autofillFields.length,
    });
  } catch (err) {
    console.error('Form scan failed:', err);
    return res.status(500).json({ error: 'Scanning the form failed' });
  } finally {
    if (tempFilePath) fs.unlink(tempFilePath, () => {});
  }
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: false, keepExtensions: true, maxFileSize: 10 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
