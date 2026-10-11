// Passive anti-spoofing with MiniFASNet (Minivision "Silent-Face-Anti-
// Spoofing", Apache-2.0): looks at one picture and judges whether it shows a
// real face or a printed photo / screen.
//
// Two small models look at the face with different amounts of surrounding
// background (2.7× and 4× the face box), each resized to 80 × 80, BGR,
// values 0–255. Each outputs three classes (0 = fake, 1 = real, 2 = fake);
// as in the original code, the two softmax outputs are added and the
// "real" share is the score (0–1).
import { cropResize, toChw } from './image.js';
import { run } from './models.js';

const VIEWS = [
  { model: 'minifasnet_v2', scale: 2.7 },
  { model: 'minifasnet_v1se', scale: 4.0 },
];

/** Same crop as the original CropImage._get_new_box. */
export function spoofCropBox(width, height, box, scale) {
  const [x, y, boxW, boxH] = box;
  const s = Math.min((height - 1) / boxH, (width - 1) / boxW, scale);
  const newW = boxW * s;
  const newH = boxH * s;
  const cx = boxW / 2 + x;
  const cy = boxH / 2 + y;
  let x1 = cx - newW / 2;
  let y1 = cy - newH / 2;
  let x2 = cx + newW / 2;
  let y2 = cy + newH / 2;
  if (x1 < 0) { x2 -= x1; x1 = 0; }
  if (y1 < 0) { y2 -= y1; y1 = 0; }
  if (x2 > width - 1) { x1 -= x2 - width + 1; x2 = width - 1; }
  if (y2 > height - 1) { y1 -= y2 - height + 1; y2 = height - 1; }
  return [Math.trunc(x1), Math.trunc(y1), Math.trunc(x2), Math.trunc(y2)];
}

/** @returns {Promise<number>} 0–1, higher = more likely a real face */
export async function realFaceScore(img, face) {
  const box = face.box.map(Math.round);
  const total = [0, 0, 0];
  for (const view of VIEWS) {
    const [x1, y1, x2, y2] = spoofCropBox(img.width, img.height, box, view.scale);
    const crop = cropResize(img, x1, y1, x2 - x1 + 1, y2 - y1 + 1, 80, 80);
    const outputs = await run(view.model, toChw(crop, 'bgr'), [1, 3, 80, 80]);
    const logits = Array.from(Object.values(outputs)[0].data);
    const max = Math.max(...logits);
    const exps = logits.map((v) => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    exps.forEach((v, i) => { total[i] += v / sum; });
  }
  return total[1] / VIEWS.length;
}
