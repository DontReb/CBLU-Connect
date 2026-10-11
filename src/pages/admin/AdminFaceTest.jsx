import { useEffect, useMemo, useState } from 'react';
import { zipSync, strToU8 } from 'fflate';
import Button from '../../components/ui/Button';
import FaceCheck from '../../components/FaceCheck';
import { prepareIdPhoto } from '../../lib/idPhoto';
import { makeChallenge } from '../../../shared/face/challenge.js';

// Records test sessions for measuring the face check (face verification and
// liveness detection) with volunteers. Each session runs exactly the same
// camera steps as a client's face check, then downloads to THIS computer as
// a .zip: the ID photo, the camera pictures and a session.json. Nothing is
// sent to the server. Measure them with:
//
//   node scripts/face-eval.mjs <folder with the .zip files>
//
// Recordings contain faces (biometric data): get each volunteer's written
// consent, keep the files somewhere safe, and delete them after the study.

const PRESENTATIONS = [
  { value: 'bona_fide', label: 'Real person (the volunteer)', attack: false },
  { value: 'print', label: 'Attack: printed photo', attack: true },
  { value: 'screen', label: 'Attack: photo or video on a phone/tablet screen', attack: true },
  { value: 'other', label: 'Attack: other (describe)', attack: true },
];

const INCOMPLETE_LABELS = {
  no_face: 'stopped — no usable face',
  turn_timeout: 'stopped — head turn not seen',
};

function stamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function buildZip({ session, idPhoto, frames }) {
  const files = {
    'session.json': strToU8(JSON.stringify(session, null, 2)),
    'id.jpg': new Uint8Array(await idPhoto.arrayBuffer()),
  };
  for (const [name, blob] of Object.entries(frames)) {
    files[`frames/${name}.jpg`] = new Uint8Array(await blob.arrayBuffer());
  }
  // The pictures are already JPEG-compressed; storing them is enough.
  return new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function AdminFaceTest() {
  const [volunteer, setVolunteer] = useState('');
  const [presentation, setPresentation] = useState('bona_fide');
  const [shownPerson, setShownPerson] = useState('');
  const [attackNote, setAttackNote] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [preparedId, setPreparedId] = useState(null);
  const [error, setError] = useState('');
  const [recordings, setRecordings] = useState([]); // this visit only

  const kind = PRESENTATIONS.find((p) => p.value === presentation);
  const code = volunteer.trim().toUpperCase();
  const shownCode = kind.attack ? (shownPerson.trim().toUpperCase() || code) : code;
  const canStart = /^[A-Z0-9-]{2,12}$/.test(code) && idFile && consent && (presentation !== 'other' || attackNote.trim());

  const idPreview = useMemo(() => (idFile ? URL.createObjectURL(idFile) : null), [idFile]);
  useEffect(() => () => idPreview && URL.revokeObjectURL(idPreview), [idPreview]);

  async function start() {
    setError('');
    try {
      setPreparedId(await prepareIdPhoto(idFile, 'id.jpg'));
      setChallenge(makeChallenge());
    } catch {
      setError("That ID photo couldn't be read. Try another photo.");
    }
  }

  async function save({ frames, meta }, incomplete = null) {
    const recordedAt = new Date();
    const session = {
      format: 'cblu-face-session/1',
      volunteer: code,
      presentation,
      attack: kind.attack,
      shownPerson: shownCode, // whose face/ID is presented (the volunteer, unless an attack shows someone else)
      attackNote: presentation === 'other' ? attackNote.trim() : '',
      challenge: { colours: challenge.colours, turns: challenge.turns },
      incomplete, // null, or why the camera steps couldn't be finished
      times: meta.times,
      captureMs: meta.captureMs,
      recordedAt: recordedAt.toISOString(),
      userAgent: navigator.userAgent,
      screen: { width: window.screen.width, height: window.screen.height },
    };
    const filename = `${code}_${presentation}_${stamp(recordedAt)}.zip`;
    const zip = await buildZip({ session, idPhoto: preparedId, frames });
    download(zip, filename);
    setRecordings((prev) => [
      { filename, presentation: kind.label, incomplete, pictures: Object.keys(frames).length, zip },
      ...prev,
    ]);
    setChallenge(null);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Face check tests</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Record test sessions with volunteers to measure face verification (TAR, TRR, FAR, FRR, EER) and
        liveness detection (APCER, BPCER, ACER, processing time). Each session runs the same camera steps
        as a client's face check.
      </p>

      <div className="mt-4 rounded-2xl bg-highlight/30 px-5 py-4 text-sm text-ink">
        <p className="font-medium">Recordings contain faces — biometric personal data.</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Get each volunteer's signed consent before recording. Use codes (P01, P02…), not names.</li>
          <li>Recordings download to this computer only; nothing is sent to the server.</li>
          <li>Keep them in a protected folder and delete them when the study is done.</li>
        </ul>
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">New recording</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-ink">Volunteer code</span>
            <input
              value={volunteer}
              onChange={(e) => setVolunteer(e.target.value)}
              placeholder="P01"
              maxLength={12}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 uppercase"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink">What is in front of the camera</span>
            <select
              value={presentation}
              onChange={(e) => setPresentation(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2"
            >
              {PRESENTATIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {kind.attack && (
            <label className="block text-sm">
              <span className="font-medium text-ink">Whose face is shown</span>
              <input
                value={shownPerson}
                onChange={(e) => setShownPerson(e.target.value)}
                placeholder={code || 'Same volunteer'}
                maxLength={12}
                className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2 uppercase"
              />
              <span className="mt-1 block text-xs text-ink-soft">Leave empty if it's the volunteer's own photo.</span>
            </label>
          )}
          {presentation === 'other' && (
            <label className="block text-sm">
              <span className="font-medium text-ink">Describe the attack</span>
              <input
                value={attackNote}
                onChange={(e) => setAttackNote(e.target.value)}
                placeholder="e.g. paper mask with eye holes"
                maxLength={120}
                className="mt-1 w-full rounded-xl border border-line bg-panel px-3 py-2"
              />
            </label>
          )}
          <div className="text-sm sm:col-span-2">
            <label htmlFor="face-test-id" className="font-medium text-ink">
              ID photo {kind.attack ? 'of the person shown' : 'of the volunteer'}
            </label>
            <p className="text-xs text-ink-soft">The front of a PhilSys ID, Driver's License or Passport.</p>
            <div className="mt-2 flex items-center gap-3">
              {idPreview && <img src={idPreview} alt="ID preview" className="h-14 w-20 rounded-lg border border-line object-cover" />}
              <input
                id="face-test-id"
                type="file"
                accept="image/*"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span className="text-ink">The volunteer has signed the consent form for this study.</span>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4">
          <Button type="button" onClick={start} disabled={!canStart} className="px-5 py-2.5 text-sm">
            Start recording
          </Button>
        </div>
      </section>

      {recordings.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Recorded this visit</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {recordings.map((rec) => (
              <li key={rec.filename} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{rec.filename}</span>
                  <span className="block text-xs text-ink-soft">
                    {rec.presentation} · {rec.pictures} pictures
                    {rec.incomplete ? ` · ${INCOMPLETE_LABELS[rec.incomplete] ?? rec.incomplete}` : ''}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => download(rec.zip, rec.filename)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
                >
                  Download again
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {challenge && (
        <FaceCheck
          challenge={challenge}
          onComplete={(result) => save(result)}
          onIncomplete={(partial, reason) => save(partial, reason)}
          onCancel={() => setChallenge(null)}
        />
      )}
    </div>
  );
}
