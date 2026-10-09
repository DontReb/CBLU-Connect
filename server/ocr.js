import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

// Runs OCR on ID photos for the loan application scan (api/forms/ocr.js).
//
// Tesseract needs an English language file, eng.traineddata. The project
// keeps a copy in its root folder, and vercel.json ("includeFiles") packs
// it into the OCR function on deploy — so a live scan reads it from disk
// instead of downloading it from the internet on every cold start.
// If that copy is ever missing, fall back to downloading it into the OS
// temp folder (/tmp on Vercel — the only writable folder there).
const BUNDLED_LANGUAGE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cachePath = fs.existsSync(path.join(BUNDLED_LANGUAGE_DIR, 'eng.traineddata'))
  ? BUNDLED_LANGUAGE_DIR
  : os.tmpdir();

// The browser already shrinks photos and saves them as JPEG before upload
// (see src/lib/idPhoto.js), so these are what arrives. PDFs and HEIC files
// are turned away with a clear message before OCR.
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const UNSUPPORTED_FILE_MESSAGE = 'Please upload a photo of your ID saved as a JPG, PNG or WebP image.';

export function isSupportedImage(file) {
  return SUPPORTED_IMAGE_TYPES.has(file?.mimetype);
}

// Page segmentation mode 6 reads the card as one block of text, line by
// line. On ID cards it was more accurate than the default automatic layout
// (mode 3), which sometimes gave up on a photo with a dark background or a
// shadow across it. See "OCR accuracy" in the README.
const PAGE_SEGMENTATION_MODE = '6';

// How a photo is cleaned up before OCR. Both turn it upright (phones store
// rotation separately, in EXIF) and grayscale.
//   standard — resized to 1600 px wide: small photos get bigger letters,
//              big ones get faster to read.
//   flatten  — 2000 px wide, then divided by a heavily blurred copy of
//              itself, which evens out shadows and uneven lighting. Used as
//              a second try when the standard pass misses fields.
async function prepare(filePath, mode) {
  const width = mode === 'flatten' ? 2000 : 1600;
  const base = await sharp(filePath).rotate().grayscale().resize({ width }).png().toBuffer();
  if (mode !== 'flatten') return base;
  // colour-dodge with the inverted blur = photo ÷ blurred background
  const background = await sharp(base).blur(width / 40).negate().png().toBuffer();
  return sharp(base).composite([{ input: background, blend: 'colour-dodge' }]).normalize().png().toBuffer();
}

/**
 * OCR several photos with one Tesseract worker.
 * @param {string[]} filePaths
 * @param {'standard'|'flatten'} mode
 * @returns {Promise<{ text: string, confidence: number }[]>} in the same order
 */
export async function runOcr(filePaths, mode = 'standard') {
  // errorHandler makes a file Tesseract can't read come back as a normal
  // rejected promise. Without it, Tesseract throws the error from its
  // background thread, which crashes the whole server process.
  const worker = await createWorker('eng', 1, { cachePath, errorHandler: () => {} });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PAGE_SEGMENTATION_MODE });
    const results = [];
    for (const filePath of filePaths) {
      const { data } = await worker.recognize(await prepare(filePath, mode));
      results.push({ text: data.text || '', confidence: data.confidence });
    }
    return results;
  } finally {
    await worker.terminate();
  }
}
