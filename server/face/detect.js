// Finds faces with YuNet. YuNet works best on faces up to about 300 px, so
// larger pictures are shrunk first and the results scaled back.
import { toYunetInput, decodeYunet } from '../../shared/face/yunet.js';
import { resizeRgb } from './image.js';
import { run } from './models.js';

/**
 * @param {{data: Uint8Array, width: number, height: number}} img  RGB pixels
 * @param {{ maxSide?: number, scoreThreshold?: number }} options
 * @returns {Promise<Array<{box: number[], landmarks: number[][], score: number}>>}
 */
export async function detectFaces(img, options = {}) {
  const { maxSide = 640, scoreThreshold = 0.8 } = options;
  const scale = Math.max(img.width, img.height) > maxSide ? maxSide / Math.max(img.width, img.height) : 1;
  const small = scale < 1
    ? resizeRgb(img, Math.round(img.width * scale), Math.round(img.height * scale))
    : img;
  const input = toYunetInput(small.data, small.width, small.height, 3);
  const outputs = await run('yunet', input.data, input.dims);
  return decodeYunet(outputs, input.padWidth, input.padHeight, { scoreThreshold, scale: 1 / scale });
}
