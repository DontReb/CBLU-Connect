// YuNet face detector (OpenCV Zoo, MIT licence) — pre- and post-processing.
//
// Plain JavaScript with no dependencies, so the browser (live camera
// guidance) and the server (the decision) find faces the same way. Each side
// runs the ONNX model itself and passes the outputs in here.
//
// Model: face_detection_yunet_2026may.onnx — dynamic input [1, 3, H, W], BGR,
// pixel values 0–255, H and W multiples of 32. Outputs per stride (8, 16, 32):
// cls, obj (scores), bbox (4 numbers), kps (5 landmarks × 2).
// Decoding follows OpenCV's FaceDetectorYN (modules/objdetect/src/face_detect.cpp).
//
// Wu, W., Peng, H. & Yu, S. (2023). YuNet: A Tiny Millisecond-level Face
// Detector. Machine Intelligence Research, 20, 656–665.

export const STRIDES = [8, 16, 32];

// Landmark order returned by YuNet, as seen in the image:
// 0 = right eye, 1 = left eye, 2 = nose tip, 3 = right mouth corner,
// 4 = left mouth corner ("right" = the person's right, which is on the image's left).
export const LANDMARKS = ['rightEye', 'leftEye', 'nose', 'rightMouth', 'leftMouth'];

/**
 * Builds the model input from RGB(A) pixels.
 * @param {Uint8Array|Uint8ClampedArray} pixels  width*height*channels bytes
 * @param {number} width
 * @param {number} height
 * @param {number} channels  3 (RGB) or 4 (RGBA, e.g. canvas ImageData)
 * @returns {{ data: Float32Array, dims: number[], padWidth: number, padHeight: number }}
 */
export function toYunetInput(pixels, width, height, channels = 3) {
  const padWidth = Math.ceil(width / 32) * 32;
  const padHeight = Math.ceil(height / 32) * 32;
  const plane = padWidth * padHeight;
  const data = new Float32Array(3 * plane); // zero padding on the right/bottom
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * channels;
      const dst = y * padWidth + x;
      data[dst] = pixels[src + 2]; // B
      data[plane + dst] = pixels[src + 1]; // G
      data[2 * plane + dst] = pixels[src]; // R
    }
  }
  return { data, dims: [1, 3, padHeight, padWidth], padWidth, padHeight };
}

/**
 * Turns the model outputs into faces.
 * @param {Record<string, {data: Float32Array}>} outputs  ONNX Runtime results
 * @param {number} padWidth
 * @param {number} padHeight
 * @param {{ scoreThreshold?: number, nmsThreshold?: number, scale?: number }} options
 *   scale: multiply coordinates by this (when the image was resized before detection)
 * @returns {Array<{ box: number[], landmarks: number[][], score: number }>}
 *   box = [x, y, width, height]; sorted by score, highest first
 */
export function decodeYunet(outputs, padWidth, padHeight, options = {}) {
  const { scoreThreshold = 0.8, nmsThreshold = 0.3, scale = 1 } = options;
  const faces = [];
  for (const stride of STRIDES) {
    const cols = padWidth / stride;
    const rows = padHeight / stride;
    const cls = outputs[`cls_${stride}`].data;
    const obj = outputs[`obj_${stride}`].data;
    const bbox = outputs[`bbox_${stride}`].data;
    const kps = outputs[`kps_${stride}`].data;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const score = Math.sqrt(clamp01(cls[i]) * clamp01(obj[i]));
        if (score < scoreThreshold) continue;
        const cx = (c + bbox[i * 4]) * stride;
        const cy = (r + bbox[i * 4 + 1]) * stride;
        const w = Math.exp(bbox[i * 4 + 2]) * stride;
        const h = Math.exp(bbox[i * 4 + 3]) * stride;
        const landmarks = [];
        for (let n = 0; n < 5; n++) {
          landmarks.push([
            (kps[i * 10 + 2 * n] + c) * stride * scale,
            (kps[i * 10 + 2 * n + 1] + r) * stride * scale,
          ]);
        }
        faces.push({
          box: [(cx - w / 2) * scale, (cy - h / 2) * scale, w * scale, h * scale],
          landmarks,
          score,
        });
      }
    }
  }
  return nms(faces, nmsThreshold);
}

function clamp01(v) {
  return Math.min(Math.max(v, 0), 1);
}

function iou(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
}

function nms(faces, threshold) {
  const sorted = [...faces].sort((a, b) => b.score - a.score);
  const kept = [];
  for (const face of sorted) {
    if (kept.every((k) => iou(k.box, face.box) <= threshold)) kept.push(face);
  }
  return kept;
}

/** The biggest face (by box area), or null. */
export function largestFace(faces) {
  let best = null;
  for (const face of faces) {
    if (!best || face.box[2] * face.box[3] > best.box[2] * best.box[3]) best = face;
  }
  return best;
}
