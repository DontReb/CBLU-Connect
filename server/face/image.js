// Small image helpers for the face check: decode a photo to raw RGB pixels,
// cut out and resize regions, and straighten a face for the face matcher.
// Pixels are { data: Uint8Array (RGB), width, height }.
import sharp from 'sharp';

/** Decodes a JPEG/PNG/WebP (path or Buffer) to RGB, upright, at most `maxSide` px. */
export async function loadRgb(input, maxSide = 0) {
  let pipeline = sharp(input).rotate().removeAlpha().toColourspace('srgb');
  if (maxSide) pipeline = pipeline.resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

/** Resizes RGB pixels with bilinear sampling. */
export function resizeRgb(img, width, height) {
  return cropResize(img, 0, 0, img.width, img.height, width, height);
}

/**
 * Cuts the rectangle (x, y, w, h) out of `img` and resizes it to outW × outH
 * with bilinear sampling (like OpenCV's INTER_LINEAR on a crop).
 */
export function cropResize(img, x, y, w, h, outW, outH) {
  const out = new Uint8Array(outW * outH * 3);
  const sx = w / outW;
  const sy = h / outH;
  for (let oy = 0; oy < outH; oy++) {
    const fy = y + (oy + 0.5) * sy - 0.5;
    for (let ox = 0; ox < outW; ox++) {
      const fx = x + (ox + 0.5) * sx - 0.5;
      sample(img, fx, fy, out, (oy * outW + ox) * 3);
    }
  }
  return { data: out, width: outW, height: outH };
}

/**
 * Applies the 2×3 affine matrix M (output → input mapping is its inverse) to
 * make an outW × outH image, like OpenCV's warpAffine with INTER_LINEAR and
 * a black border.
 */
export function warpAffine(img, M, outW, outH) {
  const [a, b, c, d, e, f] = M;
  const det = a * e - b * d;
  // Inverse of [[a b c][d e f][0 0 1]]
  const ia = e / det;
  const ib = -b / det;
  const id = -d / det;
  const ie = a / det;
  const ic = -(ia * c + ib * f);
  const ifx = -(id * c + ie * f);
  const out = new Uint8Array(outW * outH * 3);
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const fx = ia * ox + ib * oy + ic;
      const fy = id * ox + ie * oy + ifx;
      sample(img, fx, fy, out, (oy * outW + ox) * 3);
    }
  }
  return { data: out, width: outW, height: outH };
}

function sample(img, fx, fy, out, o) {
  const { data, width, height } = img;
  if (fx < -1 || fy < -1 || fx > width || fy > height) {
    out[o] = out[o + 1] = out[o + 2] = 0;
    return;
  }
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const dx = fx - x0;
  const dy = fy - y0;
  for (let ch = 0; ch < 3; ch++) {
    const p00 = pixel(data, width, height, x0, y0, ch);
    const p10 = pixel(data, width, height, x0 + 1, y0, ch);
    const p01 = pixel(data, width, height, x0, y0 + 1, ch);
    const p11 = pixel(data, width, height, x0 + 1, y0 + 1, ch);
    out[o + ch] = Math.round(
      p00 * (1 - dx) * (1 - dy) + p10 * dx * (1 - dy) + p01 * (1 - dx) * dy + p11 * dx * dy
    );
  }
}

function pixel(data, width, height, x, y, ch) {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0;
  return data[(y * width + x) * 3 + ch];
}

/**
 * Similarity transform (rotation + uniform scale + shift) that best maps the
 * `src` points onto `dst` (least squares; Umeyama, 1991). Returns the 2×3
 * matrix [a, b, c, d, e, f] for x' = a·x + b·y + c, y' = d·x + e·y + f.
 */
export function similarityTransform(src, dst) {
  const n = src.length;
  let sxm = 0, sym = 0, dxm = 0, dym = 0;
  for (let i = 0; i < n; i++) {
    sxm += src[i][0]; sym += src[i][1];
    dxm += dst[i][0]; dym += dst[i][1];
  }
  sxm /= n; sym /= n; dxm /= n; dym /= n;
  let srcVar = 0, sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i][0] - sxm;
    const sy = src[i][1] - sym;
    const dx = dst[i][0] - dxm;
    const dy = dst[i][1] - dym;
    srcVar += sx * sx + sy * sy;
    sumA += sx * dx + sy * dy;
    sumB += sx * dy - sy * dx;
  }
  const a = sumA / srcVar;
  const b = sumB / srcVar;
  // x' = a·x − b·y + tx ; y' = b·x + a·y + ty
  const tx = dxm - (a * sxm - b * sym);
  const ty = dym - (b * sxm + a * sym);
  return [a, -b, tx, b, a, ty];
}

/** Planar CHW float tensor from RGB pixels, in BGR or RGB order, values 0–255. */
export function toChw(img, order = 'bgr') {
  const { data, width, height } = img;
  const plane = width * height;
  const out = new Float32Array(3 * plane);
  const map = order === 'bgr' ? [2, 1, 0] : [0, 1, 2];
  for (let i = 0; i < plane; i++) {
    out[i] = data[i * 3 + map[0]];
    out[plane + i] = data[i * 3 + map[1]];
    out[2 * plane + i] = data[i * 3 + map[2]];
  }
  return out;
}

/** JPEG bytes from RGB pixels (for test captures and debugging). */
export function rgbToJpeg(img, quality = 90) {
  return sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 3 } })
    .jpeg({ quality })
    .toBuffer();
}
