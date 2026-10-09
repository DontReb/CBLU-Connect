import { runOcr } from './ocr.js';
import { parseIdImages, missingFields, combineScans } from './idParsers.js';

// Reads one ID from its photos: front first, then (optionally) the back.
// A first pass uses the standard photo clean-up; if it can't tell the ID
// type or misses fields the ID shows, a second pass evens out shadows and
// lighting and fills the gaps. Most clear photos need only the first pass.
export async function scanId(filePaths) {
  const slots = (results) => results.map((result, i) => ({ ...result, slot: i === 0 ? 'front' : 'back' }));
  const first = parseIdImages(slots(await runOcr(filePaths, 'standard')));
  if (missingFields(first).length === 0) return { ...first, passes: 1 };

  const second = parseIdImages(slots(await runOcr(filePaths, 'flatten')));
  return { ...combineScans(first, second), passes: 2 };
}
