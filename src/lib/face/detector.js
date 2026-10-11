// Live face finding in the browser, used only to guide the client (is their
// face in the frame, are they looking straight, have they turned far
// enough). The real decision is made on the server from the pictures.
//
// ONNX Runtime (WebAssembly) and the YuNet model (230 KB, in
// public/models/face/) load only when the face check opens, so the rest of
// the site doesn't download them.
import { toYunetInput, decodeYunet } from '../../../shared/face/yunet.js';

// Same size as the pictures the server checks (640 px wide), so the head
// turn measured here matches the server's.
const DETECT_WIDTH = 640;

let modelPromise = null;

function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      const ort = await import('onnxruntime-web/wasm');
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create('/models/face/yunet.onnx', {
        executionProviders: ['wasm'],
      });
      return { ort, session };
    })();
    modelPromise.catch(() => {
      modelPromise = null; // allow a retry
    });
  }
  return modelPromise;
}

export async function createDetector() {
  const { ort, session } = await loadModel();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  /**
   * Faces in the current video frame, in the video's own pixel coordinates
   * (not mirrored).
   */
  async function detect(video) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return [];
    const scale = Math.min(1, DETECT_WIDTH / vw);
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const input = toYunetInput(data, canvas.width, canvas.height, 4);
    const outputs = await session.run({
      [session.inputNames[0]]: new ort.Tensor('float32', input.data, input.dims),
    });
    return decodeYunet(outputs, input.padWidth, input.padHeight, { scoreThreshold: 0.7, scale: 1 / scale });
  }

  return { detect };
}
