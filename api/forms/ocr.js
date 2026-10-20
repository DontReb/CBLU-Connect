import { IncomingForm } from 'formidable';
import fs from 'fs';
import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { isSupportedImage, UNSUPPORTED_FILE_MESSAGE } from '../../server/ocr.js';
import { ID_LABELS, UNKNOWN_ID_MESSAGE } from '../../server/idParsers.js';
import { scanId } from '../../server/idScan.js';
import { loadLoanForm, loadValues } from '../../server/loanForm.js';
import { identityStatus, signScanToken, photoFingerprint, LOCKED_MESSAGE } from '../../server/identity.js';
import { requireConsent } from '../../server/privacy.js';

// POST /api/forms/ocr — multipart: "front" (required) and "back" (optional)
// photos of ONE valid ID: PhilSys National ID, Driver's License or Passport.
//
// Reads the ID and works out which loan application fields it can fill
// (name, birth date, sex, citizenship, address, civil status — the fields
// with an id_source). NOTHING is written yet: the values come back inside a
// signed scanToken, and api/identity/face.js writes them only after the
// client passes the live face check. A value the client typed themselves is
// never overwritten.
//
// Data minimisation: the photos are deleted as soon as they are read, and
// neither the photos nor the ID's text are stored.
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
  try {
    // No consent, no reading: checked before the photos are even received.
    if (!(await requireConsent(res, client.sub, 'portal', 'id_face'))) return;

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

    const status = await identityStatus(pool, client.sub);
    if (status.locked) {
      return res.status(423).json({ error: LOCKED_MESSAGE, identity: status });
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

    // 2. Work out what the face check will fill — without writing anything.
    const current = await currentValues(client.sub, form.template.id);
    const values = {};
    const willFill = [];
    const kept = [];
    const notFound = [];
    for (const field of form.fields.filter((f) => f.idSource)) {
      const value = scan.fields[field.idSource];
      if (!value || (field.fieldType === 'select' && !optionValues(field.options).includes(value))) {
        // Most people have no suffix (Jr., III), so a missing one isn't news.
        if (field.idSource !== 'suffix') notFound.push(field.fieldKey);
        continue;
      }
      values[field.fieldKey] = value;
      const typed = current[field.fieldKey];
      (typed?.source === 'manual' && typed.value ? kept : willFill).push(field.fieldKey);
    }

    return res.status(200).json({
      idType: scan.idType,
      idLabel: ID_LABELS[scan.idType],
      values,      // what the ID says, by field key
      willFill,    // written after the face check passes
      kept,        // read from the ID, but the client had typed their own value
      notFound,    // could be filled from this ID type, but wasn't readable / isn't on it
      warnings: scan.warnings,
      confidence: scan.confidence,
      identity: status,
      scanToken: signScanToken({
        clientId: client.sub,
        idType: scan.idType,
        confidence: scan.confidence,
        values,
        warnings: scan.warnings,
        photo: photoFingerprint(fs.readFileSync(front.filepath)),
      }),
    });
  } catch (err) {
    if (err?.httpCode === 413 || err?.code === 1009) {
      return res.status(413).json({ error: 'That photo is too large. Try a smaller one (under 8 MB).' });
    }
    console.error('ID scan failed:', err);
    return res.status(500).json({ error: 'Reading your ID failed. Please try again.' });
  } finally {
    for (const filePath of tempFiles) fs.unlink(filePath, () => {});
  }
}

async function currentValues(clientId, templateId) {
  const result = await pool.query(
    'SELECT id FROM form_submissions WHERE client_id = $1 AND template_id = $2',
    [clientId, templateId]
  );
  return result.rowCount ? loadValues(pool, result.rows[0].id) : {};
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
