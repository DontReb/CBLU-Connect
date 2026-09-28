import { IncomingForm } from 'formidable';
import fs from 'fs';
import { createWorker } from 'tesseract.js';
import { pool } from '../lib/db.js';
import { validateAgainstRules } from '../lib/validateDocument.js';
import { requireAuth } from '../_lib/auth.js';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res, ['client', 'admin']);
  if (!user) return;

  let tempFilePath;
  try {
    const { fields, files } = await parseForm(req);
    const requestedClientId = fields.clientId?.[0];
    const checklistItemId = fields.checklistItemId?.[0];
    const file = files.document?.[0];

    if (!checklistItemId || !file) {
      return res.status(400).json({ error: 'checklistItemId and document are required' });
    }

    const clientId = user.role === 'admin' ? requestedClientId : user.id;
    if (!clientId) return res.status(400).json({ error: 'clientId is required for admin uploads' });

    tempFilePath = file.filepath;

    const itemResult = await pool.query(
      'SELECT id, label, validation_rules FROM checklist_items WHERE id = $1',
      [checklistItemId]
    );
    if (itemResult.rowCount === 0) return res.status(404).json({ error: 'Unknown checklist item' });

    const checklistItem = itemResult.rows[0];
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(tempFilePath);
    await worker.terminate();

    const { isValid, matchedKeywords, notes } = validateAgainstRules(
      data.text,
      checklistItem.validation_rules
    );

    const uploadResult = await pool.query(
      `INSERT INTO document_uploads (client_id, checklist_item_id, file_name, status)
       VALUES ($1, $2, $3, 'processed') RETURNING id`,
      [clientId, checklistItemId, file.originalFilename || 'uploaded-document']
    );
    const documentId = uploadResult.rows[0].id;

    await pool.query(
      `INSERT INTO document_ocr_results (document_upload_id, extracted_text, confidence_score, ocr_engine)
       VALUES ($1, $2, $3, 'tesseract.js')`,
      [documentId, data.text, data.confidence]
    );

    await pool.query(
      `INSERT INTO document_validations (document_upload_id, is_valid, matched_keywords, notes)
       VALUES ($1, $2, $3, $4)`,
      [documentId, isValid, JSON.stringify(matchedKeywords), notes]
    );

    return res.status(200).json({
      documentId,
      checklistItem: checklistItem.label,
      isValid,
      matchedKeywords,
      notes,
      ocrConfidence: data.confidence,
    });
  } catch (err) {
    console.error('Document processing failed:', err);
    return res.status(500).json({ error: 'Document processing failed' });
  } finally {
    if (tempFilePath) fs.unlink(tempFilePath, () => {});
  }
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ multiples: false, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
