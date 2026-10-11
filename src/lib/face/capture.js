// Runs one live face check in front of the camera and returns the pictures.
// Used by the client's face check and by the admin's test recorder, so both
// capture in exactly the same way.
//
//   1. look straight            → "front"
//   2. screen flashes colours   → "dark_0", "flash_0", … "dark_5", "flash_5"
//   3. turn left / right        → "left", "right" (in the challenge's order)
//   4. look straight again      → "front_end"
//
// Pictures are the camera's own (not mirrored). The on-screen preview is
// mirrored separately, so it feels like a mirror to the client.
import { largestFace } from '../../../shared/face/yunet.js';
import { headTurn, TURN } from '../../../shared/face/pose.js';
import { FLASH, FLASH_COLOURS, TURN_TIMEOUT_MS } from '../../../shared/face/challenge.js';

const FULL_WIDTH = 640;
const FLASH_WIDTH = 320;
const STRAIGHT_TIMEOUT_MS = 30000;

export class CaptureError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new CaptureError('cancelled', 'Cancelled'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

function snapshot(video, width) {
  const scale = Math.min(1, width / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not save a picture'))), 'image/jpeg', quality);
  });
}

// Ignore tiny faces in the background when counting faces.
function mainFaces(faces) {
  const biggest = largestFace(faces);
  if (!biggest) return [];
  const area = biggest.box[2] * biggest.box[3];
  return faces.filter((f) => f.box[2] * f.box[3] >= area * 0.25);
}

/** Is the client positioned for a straight-on picture? Returns { ok, hint }. */
export function checkStraight(faces, video) {
  const main = mainFaces(faces);
  if (main.length === 0) return { ok: false, hint: "We can't see your face. Face the camera in good light." };
  if (main.length > 1) return { ok: false, hint: 'Only one face, please.' };
  const [x, y, w, h] = main[0].box;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (w < vw * 0.28) return { ok: false, hint: 'Move closer to the screen.' };
  if (w > vw * 0.8) return { ok: false, hint: 'Move back a little.' };
  const cx = (x + w / 2) / vw;
  const cy = (y + h / 2) / vh;
  if (Math.abs(cx - 0.5) > 0.2 || Math.abs(cy - 0.5) > 0.25) return { ok: false, hint: 'Put your face in the middle of the oval.' };
  if (Math.abs(headTurn(main[0].landmarks)) > TURN.straightMax) return { ok: false, hint: 'Look straight at the camera.' };
  return { ok: true, hint: 'Hold still…' };
}

function checkTurn(faces, direction) {
  const main = mainFaces(faces);
  if (main.length === 0) return { ok: false, hint: `Turn your head slowly to your ${direction}.` };
  if (main.length > 1) return { ok: false, hint: 'Only one face, please.' };
  const turn = headTurn(main[0].landmarks);
  const ok = direction === 'left' ? turn >= TURN.captureAt : turn <= -TURN.captureAt;
  return { ok, hint: ok ? 'Hold it…' : `Turn your head slowly to your ${direction}.` };
}

async function waitFor({ detector, video, signal, onHint }, check, needed, timeoutMs, timeoutCode) {
  const started = performance.now();
  let streak = 0;
  for (;;) {
    if (signal.aborted) throw new CaptureError('cancelled', 'Cancelled');
    if (performance.now() - started > timeoutMs) throw new CaptureError(timeoutCode, '');
    const faces = await detector.detect(video);
    const { ok, hint } = check(faces);
    onHint(hint);
    streak = ok ? streak + 1 : 0;
    if (streak >= needed) return;
    await sleep(40, signal);
  }
}

/**
 * @param {object} p
 * @param {HTMLVideoElement} p.video  playing camera stream
 * @param {{ detect: Function }} p.detector
 * @param {{ colours: string[], turns: string[] }} p.challenge
 * @param {(step: string) => void} p.onStep       'straight' | 'flash' | 'left' | 'right' | 'straight_end'
 * @param {(hint: string) => void} p.onHint
 * @param {(colour: string|null) => void} p.setFlash  paints the full-screen flash ('#rrggbb' or null)
 * @param {AbortSignal} p.signal
 * @returns {Promise<{ frames: Record<string, Blob>, meta: { times: Record<string, number>, captureMs: number } }>}
 */
export async function runFaceCapture({ video, detector, challenge, onStep, onHint, setFlash, signal }) {
  const t0 = performance.now();
  const canvases = {};
  const times = {};
  try {
    await captureSteps({ video, detector, challenge, onStep, onHint, setFlash, signal }, t0, canvases, times);
  } catch (err) {
    // Keep what was taken, for the admin test recorder: an attack (a photo,
    // a screen) often can't finish the check, and that is a result too.
    if (err instanceof CaptureError && err.code !== 'cancelled') {
      err.partial = { frames: await encodeAll(canvases), meta: { times, captureMs: Math.round(performance.now() - t0) } };
    }
    throw err;
  }
  const captureMs = Math.round(performance.now() - t0);
  return { frames: await encodeAll(canvases), meta: { times, captureMs } };
}

async function encodeAll(canvases) {
  const frames = {};
  for (const [name, canvas] of Object.entries(canvases)) {
    const small = name.startsWith('dark_') || name.startsWith('flash_');
    frames[name] = await toJpeg(canvas, small ? 0.85 : 0.9);
  }
  return frames;
}

async function captureSteps({ video, detector, challenge, onStep, onHint, setFlash, signal }, t0, canvases, times) {
  const ctx = { detector, video, signal, onHint };
  const grab = (name, width) => {
    canvases[name] = snapshot(video, width);
    times[name] = Math.round(performance.now() - t0);
  };

  // 1. Look straight
  onStep('straight');
  await waitFor(ctx, (faces) => checkStraight(faces, video), 3, STRAIGHT_TIMEOUT_MS, 'no_face');
  grab('front', FULL_WIDTH);

  // 2. Flashes. The colour is painted straight onto the overlay (no React
  // re-render) so the timing is tight; each picture is taken after the
  // camera has had time to adjust.
  onStep('flash');
  onHint('Hold still while the screen flashes.');
  try {
    setFlash('#000000');
    await sleep(700, signal);
    for (let i = 0; i < challenge.colours.length; i++) {
      setFlash('#000000');
      await sleep(FLASH.darkMs, signal);
      grab(`dark_${i}`, FLASH_WIDTH);
      const [r, g, b] = FLASH_COLOURS[challenge.colours[i]];
      setFlash(`rgb(${r}, ${g}, ${b})`);
      await sleep(FLASH.settleMs, signal);
      grab(`flash_${i}`, FLASH_WIDTH);
      await sleep(FLASH.colourMs - FLASH.settleMs, signal);
    }
  } finally {
    setFlash(null);
  }

  // 3. Head turns
  for (const direction of challenge.turns) {
    onStep(direction);
    await waitFor(ctx, (faces) => checkTurn(faces, direction), 2, TURN_TIMEOUT_MS, 'turn_timeout');
    grab(direction, FULL_WIDTH);
  }

  // 4. Look straight again
  onStep('straight_end');
  await waitFor(ctx, (faces) => checkStraight(faces, video), 2, STRAIGHT_TIMEOUT_MS, 'no_face');
  grab('front_end', FULL_WIDTH);
}

/** The front camera, as small as works well. */
export async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CaptureError('no_camera', "This browser can't use the camera. Try Chrome or Safari on your phone.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    });
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
      throw new CaptureError('camera_blocked', 'Camera access was blocked. Allow the camera for this site in your browser settings, then try again.');
    }
    if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
      throw new CaptureError('no_camera', 'No camera was found on this device.');
    }
    throw new CaptureError('no_camera', 'The camera could not be started. Close other apps using it and try again.');
  }
}

export const CAPTURE_ERRORS = {
  no_face: "We couldn't see your face clearly for long enough. Find better light and try again.",
  turn_timeout: "We couldn't see your head turn. Turn your head slowly to the side, as asked, until the picture is taken.",
};
