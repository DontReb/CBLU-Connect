// Loads the face models once per server instance and runs them with
// ONNX Runtime (the WebAssembly build, which works in a Vercel function
// without native binaries).
//
//   yunet.onnx                 finds faces + 5 landmarks      OpenCV Zoo, MIT
//   sface.onnx                 face → 128 numbers to compare   OpenCV Zoo, Apache-2.0
//   minifasnet_v2.onnx         real face vs photo/screen      Minivision Silent-Face, Apache-2.0
//   minifasnet_v1se.onnx       (second view, averaged)        Minivision Silent-Face, Apache-2.0
import path from 'path';
import { fileURLToPath } from 'url';
import * as ort from 'onnxruntime-web';

export const MODEL_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'models', 'face');

ort.env.wasm.numThreads = 1; // a Vercel function has one CPU
ort.env.logLevel = 'error';

const sessions = new Map();

export function getSession(name) {
  if (!sessions.has(name)) {
    const promise = ort.InferenceSession.create(path.join(MODEL_DIR, `${name}.onnx`), {
      graphOptimizationLevel: 'all',
    });
    promise.catch(() => sessions.delete(name)); // allow a retry after a failed load
    sessions.set(name, promise);
  }
  return sessions.get(name);
}

export async function run(name, input, dims) {
  const session = await getSession(name);
  const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, dims) };
  return session.run(feeds);
}
