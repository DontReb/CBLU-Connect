import os from 'os';
import { createWorker } from 'tesseract.js';

// Shared by document upload (api/documents/upload.js) and the loan
// application scan (api/forms/ocr.js).
//
// Tesseract downloads its English language file (eng.traineddata) the
// first time it runs and caches it to disk. By default it caches to the
// current folder, which is read-only on Vercel — so cache to the OS temp
// folder instead (/tmp on Vercel). /tmp survives between requests on a
// warm instance, so the download doesn't repeat on every scan.
export async function runOcr(filePath) {
  const worker = await createWorker('eng', 1, { cachePath: os.tmpdir() });
  try {
    const { data } = await worker.recognize(filePath);
    return { text: data.text || '', confidence: data.confidence };
  } finally {
    await worker.terminate();
  }
}
