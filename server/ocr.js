import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

// Shared by document upload (api/documents/upload.js) and the loan
// application scan (api/forms/ocr.js).
//
// Tesseract needs an English language file, eng.traineddata. The project
// keeps a copy in its root folder, and vercel.json ("includeFiles") packs
// it into the OCR functions on deploy — so a live scan reads it from disk
// instead of downloading it from the internet on every cold start.
// If that copy is ever missing, fall back to downloading it into the OS
// temp folder (/tmp on Vercel — the only writable folder there).
const BUNDLED_LANGUAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = fs.existsSync(path.join(BUNDLED_LANGUAGE_DIR, 'eng.traineddata'))
  ? BUNDLED_LANGUAGE_DIR
  : os.tmpdir();

export async function runOcr(filePath) {
  const worker = await createWorker('eng', 1, { cachePath });
  try {
    const { data } = await worker.recognize(filePath);
    return { text: data.text || '', confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
