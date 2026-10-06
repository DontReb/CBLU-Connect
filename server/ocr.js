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

// Tesseract.js reads JPG, PNG, WebP and BMP. It cannot read PDFs or iPhone
// HEIC photos, so those are turned away with a clear message before OCR.
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/bmp']);
export const UNSUPPORTED_FILE_MESSAGE = 'Please upload a photo or scan saved as a JPG, PNG or WebP image.';

export function isSupportedImage(file) {
  return SUPPORTED_IMAGE_TYPES.has(file?.mimetype);
}

export async function runOcr(filePath) {
  // errorHandler makes a file Tesseract can't read come back as a normal
  // rejected promise. Without it, Tesseract throws the error from its
  // background thread, which crashes the whole server process.
  const worker = await createWorker('eng', 1, { cachePath, errorHandler: () => {} });
  try {
    const { data } = await worker.recognize(filePath);
    return { text: data.text || '', confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
