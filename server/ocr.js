import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { loadRgb } from './face/image.js';
import { detectFaces } from './face/detect.js';

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

// The portrait on an ID sits right next to the text, and Tesseract reads
// bits of it as letters on the same line ("LW © GARCIA"). So the face (and
// the small "ghost" face some IDs have) is found with the face detector and
// painted white before OCR. On the accepted IDs the portrait is on the left
// with the text to its right, so the white area reaches left (hair and
// background) and up and down, but stops just past the face's right edge —
// a portrait can fill its frame, and the text can start right after it.
async function withoutPortraits(filePath) {
  const img = await loadRgb(filePath); // upright
  const faces = (await detectFaces(img, { scoreThreshold: 0.7 }))
    .filter((f) => f.box[2] >= img.width * 0.03); // ignore tiny false finds in the text
  if (faces.length === 0) return sharp(filePath).rotate(); // untouched
  const boxes = faces.map(({ box: [x, y, w, h] }) => {
    const x1 = Math.max(0, Math.round(x - 0.45 * w));
    const y1 = Math.max(0, Math.round(y - 0.6 * h));
    const x2 = Math.min(img.width, Math.round(x + 1.03 * w));
    const y2 = Math.min(img.height, Math.round(y + 1.7 * h));
    return `<rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" fill="#fff"/>`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${img.width}" height="${img.height}">${boxes.join('')}</svg>`;
  // Lossless in between (PNG), so the letters aren't blurred by re-saving,
  // and the photo's resolution (dpi) kept, which Tesseract uses.
  const { density = 72 } = await sharp(filePath).metadata();
  const masked = await sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .withMetadata({ density })
    .png()
    .toBuffer();
  return sharp(masked);
}

// How a photo is cleaned up before OCR. Both start upright (phones store
// rotation separately, in EXIF), with the portrait blanked, in grayscale.
//   standard — resized to 1600 px wide: small photos get bigger letters,
//              big ones get faster to read.
//   flatten  — 2000 px wide, then divided by a heavily blurred copy of
//              itself, which evens out shadows and uneven lighting. Used as
//              a second try when the standard pass misses fields.
async function prepare(filePath, mode) {
  const width = mode === 'flatten' ? 2000 : 1600;
  const base = await (await withoutPortraits(filePath)).grayscale().resize({ width }).png().toBuffer();
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
