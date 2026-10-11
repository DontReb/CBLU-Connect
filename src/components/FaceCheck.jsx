import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';
import { createDetector } from '../lib/face/detector';
import { runFaceCapture, openCamera, CaptureError, CAPTURE_ERRORS } from '../lib/face/capture';

// The live face check's camera screen (face verification + liveness). It
// only takes the pictures; the page that opens it sends them to the server.
//
// Props:
//   challenge   { colours, turns } from the server (or made locally when testing)
//   onComplete  ({ frames, meta }) => void
//   onCancel    () => void
//   onIncomplete (optional, admin test recorder) ({ frames, meta }, code) => void —
//               called with the pictures taken so far when the check can't
//               be finished (e.g. a printed photo can't turn its head)

const STEPS = [
  { key: 'straight', label: 'Look straight' },
  { key: 'flash', label: 'Screen flashes' },
  { key: 'turns', label: 'Turn your head' },
  { key: 'straight_end', label: 'Look straight' },
];

const STEP_TEXT = {
  straight: 'Look straight at the camera',
  flash: 'Hold still',
  left: 'Turn your head to your LEFT',
  right: 'Turn your head to your RIGHT',
  straight_end: 'Now look straight at the camera again',
};

function stepIndex(step) {
  if (step === 'left' || step === 'right') return 2;
  return STEPS.findIndex((s) => s.key === step);
}

export default function FaceCheck({ challenge, onComplete, onCancel, onIncomplete }) {
  const [phase, setPhase] = useState('intro'); // intro | starting | capturing | error
  const [step, setStep] = useState('straight');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const flashRef = useRef(null);
  const streamRef = useRef(null);
  const abortRef = useRef(null);

  function stopCamera() {
    abortRef.current?.abort();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => stopCamera, []);

  // Esc closes, like any dialog.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        stopCamera();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function setFlash(colour) {
    const el = flashRef.current;
    if (!el) return;
    el.style.display = colour ? 'flex' : 'none';
    if (colour) el.style.backgroundColor = colour;
  }

  async function start() {
    setPhase('starting');
    setError('');
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const [stream, detector] = await Promise.all([openCamera(), createDetector()]);
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (abort.signal.aborted) return;
      setPhase('capturing');
      const result = await runFaceCapture({
        video,
        detector,
        challenge,
        onStep: setStep,
        onHint: setHint,
        setFlash,
        signal: abort.signal,
      });
      stopCamera();
      onComplete(result);
    } catch (err) {
      if (err instanceof CaptureError && err.code === 'cancelled') return;
      stopCamera();
      if (onIncomplete && err instanceof CaptureError && err.partial) {
        onIncomplete(err.partial, err.code);
        return;
      }
      setPhase('error');
      setError(
        err instanceof CaptureError
          ? err.message || CAPTURE_ERRORS[err.code] || 'The face check stopped. Please try again.'
          : 'The face check could not start. Check your connection and try again.'
      );
    }
  }

  function cancel() {
    stopCamera();
    onCancel();
  }

  const current = stepIndex(step);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4" role="dialog" aria-modal="true" aria-labelledby="face-check-title">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-panel p-5 shadow-xl">
        <h2 id="face-check-title" className="text-lg font-semibold text-ink">Face check</h2>

        {phase === 'intro' && (
          <div className="mt-2 space-y-3 text-sm text-ink">
            <p>
              We'll check that you are the person on the ID, and that you're really here. It takes
              about 20 seconds.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Turn your screen brightness up.</li>
              <li>Face a light, with no bright window or lamp behind you.</li>
              <li>Take off sunglasses, caps and face masks.</li>
              <li>Hold your phone or stay at arm's length, face in the oval.</li>
            </ul>
            <p className="rounded-xl bg-highlight/40 px-3 py-2 text-ink">
              The screen will flash colours for about 5 seconds. If flashing lights affect you, verify
              at a CBLU branch instead.
            </p>
            <p className="text-xs text-ink-soft">
              The pictures are used for this check only, then deleted. They are not saved.
            </p>
          </div>
        )}

        {phase !== 'intro' && (
          <ol className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px]" aria-label="Steps">
            {STEPS.map((s, i) => (
              <li
                key={s.key}
                className={`rounded-lg px-1 py-1.5 ${
                  phase === 'capturing' && i === current ? 'bg-ink text-white' : i < current ? 'bg-accent-light/60 text-ink' : 'bg-paper text-ink-soft'
                }`}
              >
                {s.label}
              </li>
            ))}
          </ol>
        )}

        {/* The video stays mounted (and playing) while capturing, even under the flash. */}
        <div className={`relative mx-auto mt-4 aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl bg-ink ${phase === 'intro' ? 'hidden' : ''}`}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full -scale-x-100 object-cover"
            aria-label="Camera preview"
          />
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <defs>
              <mask id="face-oval-mask">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="190" rx="95" ry="125" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(16,30,46,0.45)" mask="url(#face-oval-mask)" />
            <ellipse cx="150" cy="190" rx="95" ry="125" fill="none" stroke="white" strokeWidth="3" strokeDasharray="6 6" />
            {phase === 'capturing' && (step === 'left' || step === 'right') && (
              <path
                d={step === 'left' ? 'M70 190 l30 -22 v14 h40 v16 h-40 v14 z' : 'M230 190 l-30 -22 v14 h-40 v16 h40 v14 z'}
                fill="white"
              />
            )}
          </svg>
          {phase === 'starting' && (
            <p className="absolute inset-x-0 bottom-3 text-center text-sm text-white">Getting the camera ready…</p>
          )}
        </div>

        {phase === 'capturing' && (
          <div className="mt-3 text-center" aria-live="polite">
            <p className="text-base font-semibold text-ink">{STEP_TEXT[step]}</p>
            <p className="mt-0.5 min-h-5 text-sm text-ink-soft">{hint}</p>
          </div>
        )}

        {phase === 'error' && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={cancel} className="px-4 py-2 text-sm">
            Cancel
          </Button>
          {(phase === 'intro' || phase === 'error') && (
            <Button type="button" onClick={start} className="px-5 py-2 text-sm">
              {phase === 'error' ? 'Try again' : 'Start camera'}
            </Button>
          )}
        </div>
      </div>

      {/* Full-screen flash, painted directly by the capture script */}
      <div
        ref={flashRef}
        className="fixed inset-0 z-[70] items-center justify-center"
        style={{ display: 'none' }}
        aria-hidden="true"
      >
        <p className="rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white">Hold still</p>
      </div>
    </div>
  );
}
