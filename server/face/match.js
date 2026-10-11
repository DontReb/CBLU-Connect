// Face matching with SFace (OpenCV Zoo, Apache-2.0).
//
// Each face is straightened using its five landmarks (eyes level, fixed
// size and position — the standard 112 × 112 layout) and turned into 128
// numbers. Two faces are compared with cosine similarity: 1 = identical,
// around 0 = unrelated. OpenCV's suggested "same person" threshold for SFace
// is 0.363.
//
// Zhong, Y., Deng, W., Hu, J., Zhao, D., Li, X. & Wen, D. (2021). SFace:
// Sigmoid-Constrained Hypersphere Loss for Robust Face Recognition.
// IEEE Transactions on Image Processing, 30, 2587–2598.
import { similarityTransform, warpAffine, toChw } from './image.js';
import { run } from './models.js';

// Where the eyes, nose and mouth corners go in the 112 × 112 face picture
// (same order as YuNet's landmarks).
const TEMPLATE_112 = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

export function alignFace(img, face) {
  const M = similarityTransform(face.landmarks, TEMPLATE_112);
  return warpAffine(img, M, 112, 112);
}

/** 128 numbers describing the face, scaled to length 1. */
export async function faceFeature(img, face) {
  const aligned = alignFace(img, face);
  const outputs = await run('sface', toChw(aligned, 'rgb'), [1, 3, 112, 112]);
  const feature = Float32Array.from(Object.values(outputs)[0].data);
  let norm = 0;
  for (const v of feature) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return feature.map((v) => v / norm);
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both have length 1
}
