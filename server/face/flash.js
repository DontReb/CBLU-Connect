// Checks that the face's colour followed the screen's flashes.
//
// For every flash, the average colour of the middle of the face (cheeks and
// nose, found from the landmarks) is compared with the black frame just
// before it. The change is the light the screen added. A uniform change in
// all three channels (the camera adjusting its brightness) is removed, and
// the direction that's left is compared with the flashed colour's direction:
// cosine 1 = exactly that colour, 0.5 = 60° off, below that = not a match.
import { FLASH_COLOURS } from '../../shared/face/challenge.js';

export const FLASH_RULES = {
  matchCosine: 0.5, // a flash "matches" at or above this
  minMatches: 5, // of FLASH.count (6)
  minStrength: 2.0, // average added light (0–255 scale) below this = too weak to judge
};

/** The cheeks-and-nose region from YuNet landmarks, as [x, y, w, h]. */
export function centreFaceRegion(face) {
  const [rightEye, leftEye, , rightMouth, leftMouth] = face.landmarks;
  const eyeDistance = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]);
  const x1 = Math.min(rightEye[0], rightMouth[0]) - 0.1 * eyeDistance;
  const x2 = Math.max(leftEye[0], leftMouth[0]) + 0.1 * eyeDistance;
  const y1 = (rightEye[1] + leftEye[1]) / 2 + 0.15 * eyeDistance;
  const y2 = (rightMouth[1] + leftMouth[1]) / 2;
  return [x1, y1, Math.max(1, x2 - x1), Math.max(1, y2 - y1)];
}

/** Average RGB inside region [x, y, w, h] (region in that image's own pixels). */
export function meanColour(img, region) {
  const [rx, ry, rw, rh] = region;
  const x1 = Math.max(0, Math.floor(rx));
  const y1 = Math.max(0, Math.floor(ry));
  const x2 = Math.min(img.width, Math.ceil(rx + rw));
  const y2 = Math.min(img.height, Math.ceil(ry + rh));
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * img.width + x) * 3;
      sum[0] += img.data[i];
      sum[1] += img.data[i + 1];
      sum[2] += img.data[i + 2];
      n++;
    }
  }
  return n ? sum.map((s) => s / n) : [0, 0, 0];
}

function withoutUniformPart(v) {
  const mean = (v[0] + v[1] + v[2]) / 3;
  return v.map((c) => c - mean);
}

function cosine(a, b) {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na && nb ? dot / (na * nb) : 0;
}

/**
 * @param {Array<{ colour: string, dark: object, lit: object, darkRegion: number[], litRegion: number[] }>} flashes
 *   dark/lit: RGB images; regions: the face's centre in each image
 * @returns {{ matches: number, total: number, strength: number, cosines: number[], ok: boolean, weak: boolean }}
 */
export function flashResponse(flashes) {
  const cosines = [];
  const strengths = [];
  for (const flash of flashes) {
    const dark = meanColour(flash.dark, flash.darkRegion);
    const lit = meanColour(flash.lit, flash.litRegion);
    const added = [lit[0] - dark[0], lit[1] - dark[1], lit[2] - dark[2]];
    strengths.push(Math.hypot(...added));
    const expected = withoutUniformPart(FLASH_COLOURS[flash.colour]);
    cosines.push(cosine(withoutUniformPart(added), expected));
  }
  const matches = cosines.filter((c) => c >= FLASH_RULES.matchCosine).length;
  const strength = strengths.length ? strengths.reduce((a, b) => a + b, 0) / strengths.length : 0;
  const weak = strength < FLASH_RULES.minStrength;
  return {
    matches,
    total: flashes.length,
    strength,
    cosines,
    weak,
    ok: !weak && matches >= Math.min(FLASH_RULES.minMatches, flashes.length),
  };
}
