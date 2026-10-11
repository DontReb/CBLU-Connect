// Measures the face check on recorded test sessions (made on the admin's
// "Face check tests" page with consenting volunteers).
//
//   node scripts/face-eval.mjs <folder with the session .zip files>
//   node scripts/face-eval.mjs sessions/ --threshold 0.40 --csv sessions.csv --roc roc.csv
//
// Every session goes through server/face/verify.js — the same code that
// decides a client's face check — so the numbers describe the real system.
//
// FACE VERIFICATION (ISO/IEC 19795-1 terms), from the SFace similarity
// between the ID photo and the "look straight" picture:
//   genuine pairs  = each real-person session vs. that volunteer's own ID
//   impostor pairs = each real-person session vs. every OTHER volunteer's ID
//   TAR  True Acceptance Rate   genuine pairs accepted ÷ genuine pairs
//   FRR  False Rejection Rate   genuine pairs rejected ÷ genuine pairs (= 1 − TAR)
//   FAR  False Acceptance Rate  impostor pairs accepted ÷ impostor pairs
//   TRR  True Rejection Rate    impostor pairs rejected ÷ impostor pairs (= 1 − FAR)
//   EER  Equal Error Rate       the error rate at the threshold where FAR = FRR
//
// LIVENESS DETECTION (ISO/IEC 30107-3 terms), from the liveness decision:
//   APCER  attack sessions accepted as a real person ÷ attack sessions,
//          per attack type (printed photo, screen, other); the highest is reported
//   BPCER  real-person sessions rejected as an attack ÷ real-person sessions
//   ACER   (APCER + BPCER) ÷ 2 — a benchmark average (OULU-NPU), not defined
//          in ISO/IEC 30107-3; always read it next to APCER and BPCER
//   Average processing time — the server's time to decide (per session), and
//          the time the person spent in front of the camera
//
// A session that couldn't finish the camera steps (e.g. a printed photo can't
// turn its head) never reaches the server: it counts as "rejected as an
// attack" for liveness and is listed separately as a non-response. It has no
// face match score, so it's left out of the face verification numbers
// (reported as failure to acquire).
import fs from 'node:fs';
import path from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { loadRgb } from '../server/face/image.js';
import { detectFaces } from '../server/face/detect.js';
import { faceFeature, cosineSimilarity } from '../server/face/match.js';
import { checkIdentity, THRESHOLDS } from '../server/face/verify.js';
import { largestFace } from '../shared/face/yunet.js';
import { frameNames } from '../shared/face/challenge.js';

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : null;
};
const dir = args[0];
if (!dir || dir.startsWith('--')) {
  console.error('Usage: node scripts/face-eval.mjs <folder with session .zip files> [--threshold 0.363] [--csv out.csv] [--roc roc.csv]');
  process.exit(1);
}
const threshold = option('--threshold') ? Number(option('--threshold')) : THRESHOLDS.match;

// ---------------------------------------------------------------- read sessions
function readSession(file) {
  const files = unzipSync(fs.readFileSync(file));
  const session = JSON.parse(strFromU8(files['session.json']));
  const frames = {};
  for (const [name, data] of Object.entries(files)) {
    const m = name.match(/^frames\/(.+)\.jpg$/);
    if (m) frames[m[1]] = Buffer.from(data);
  }
  return { file: path.basename(file), ...session, idPhoto: Buffer.from(files['id.jpg']), frameFiles: frames };
}

const sessions = fs.readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith('.zip'))
  .sort()
  .map((f) => readSession(path.join(dir, f)));
if (sessions.length === 0) {
  console.error(`No session .zip files in ${dir}`);
  process.exit(1);
}

// ---------------------------------------------------------------- run each session
const results = [];
for (const s of sessions) {
  const row = { session: s, outcome: null };
  const names = frameNames(s.challenge);
  if (s.incomplete || names.some((n) => !s.frameFiles[n])) {
    row.outcome = { complete: false, live: false, reason: s.incomplete ?? 'missing_pictures' };
  } else {
    const idImage = await loadRgb(s.idPhoto, 1600);
    const frames = {};
    for (const name of names) frames[name] = await loadRgb(s.frameFiles[name], 960);
    const result = await checkIdentity({ idImage, frames, challenge: s.challenge });
    row.outcome = { complete: true, ...result };
  }
  results.push(row);
  const o = row.outcome;
  console.log(
    `${s.file.padEnd(44)} ${s.presentation.padEnd(10)} ` +
    (o.complete
      ? `live=${o.live ? 'yes' : 'no '} match=${o.scores.match ?? '—'} real=${o.scores.realFace ?? '—'} ` +
        `flash=${o.scores.flashMatches ?? '—'}/${o.scores.flashTotal ?? '—'} ${o.reason ?? 'passed'} ${o.processingMs} ms`
      : `did not finish (${o.reason})`)
  );
}

// ---------------------------------------------------------------- face verification
// Live feature (front picture) per real-person session, ID feature per volunteer.
const features = new Map(); // cache by buffer
async function featureOf(buffer, maxSide) {
  if (!features.has(buffer)) {
    const img = await loadRgb(buffer, maxSide);
    const face = largestFace(await detectFaces(img, { scoreThreshold: 0.6 }));
    features.set(buffer, face ? await faceFeature(img, face) : null);
  }
  return features.get(buffer);
}

const bonaFide = results.filter((r) => !r.session.attack);
const attacks = results.filter((r) => r.session.attack);
const idsByVolunteer = new Map(); // volunteer → [feature]
for (const r of bonaFide) {
  const f = await featureOf(r.session.idPhoto, 1600);
  if (!f) continue;
  const list = idsByVolunteer.get(r.session.volunteer) ?? [];
  if (!list.some((g) => cosineSimilarity(g, f) > 0.9999)) list.push(f); // same ID photo twice
  idsByVolunteer.set(r.session.volunteer, list);
}

const genuine = [];
const impostor = [];
let failedToAcquire = 0;
for (const r of bonaFide) {
  if (!r.outcome.complete || r.outcome.scores?.match == null) {
    failedToAcquire++;
    continue;
  }
  genuine.push(r.outcome.scores.match);
  const live = await featureOf(r.session.frameFiles.front, 960);
  if (!live) continue;
  for (const [volunteer, ids] of idsByVolunteer) {
    if (volunteer === r.session.volunteer) continue;
    for (const id of ids) impostor.push(cosineSimilarity(live, id));
  }
}

const rate = (n, d) => (d ? n / d : NaN);
const pct = (v) => (Number.isNaN(v) ? '—' : `${(100 * v).toFixed(2)}%`);
const at = (t) => {
  const accepted = genuine.filter((s) => s >= t).length;
  const falseAccepted = impostor.filter((s) => s >= t).length;
  const tar = rate(accepted, genuine.length);
  const far = rate(falseAccepted, impostor.length);
  return { t, tar, frr: 1 - tar, far, trr: 1 - far };
};

// EER: sweep every score as a threshold and take the point where FAR and FRR
// are closest (their average there).
let eer = null;
const sweep = [];
if (genuine.length && impostor.length) {
  const candidates = [...new Set([...genuine, ...impostor, -1, 1.0001])].sort((a, b) => a - b);
  for (const t of candidates) {
    const p = at(t);
    sweep.push(p);
    if (!eer || Math.abs(p.far - p.frr) < Math.abs(eer.far - eer.frr)) eer = p;
  }
}

const op = at(threshold);
console.log('\nFACE VERIFICATION (ID photo vs. live face)');
console.log(`  Real-person sessions: ${bonaFide.length}  (genuine pairs ${genuine.length}, impostor pairs ${impostor.length}, failed to acquire ${failedToAcquire})`);
console.log(`  Volunteers with an ID photo: ${idsByVolunteer.size}`);
console.log(`  At threshold ${threshold}:`);
console.log(`    TAR  True Acceptance Rate   ${pct(op.tar)}`);
console.log(`    FRR  False Rejection Rate   ${pct(op.frr)}`);
console.log(`    FAR  False Acceptance Rate  ${pct(op.far)}`);
console.log(`    TRR  True Rejection Rate    ${pct(op.trr)}`);
console.log(`  EER  Equal Error Rate         ${eer ? `${pct((eer.far + eer.frr) / 2)} at threshold ${eer.t.toFixed(3)}` : '— (needs genuine and impostor pairs)'}`);
if (impostor.length && impostor.length < 300) {
  console.log(`  Note: with ${impostor.length} impostor pairs, FAR can't be measured below ${pct(1 / impostor.length)}.`);
}

// ---------------------------------------------------------------- liveness
const isAcceptedAsLive = (r) => r.outcome.complete && r.outcome.live === true;
const bpcer = rate(bonaFide.filter((r) => !isAcceptedAsLive(r)).length, bonaFide.length);
const species = new Map();
for (const r of attacks) {
  const key = r.session.presentation;
  const s = species.get(key) ?? { total: 0, accepted: 0, nonResponse: 0 };
  s.total++;
  if (isAcceptedAsLive(r)) s.accepted++;
  if (!r.outcome.complete) s.nonResponse++;
  species.set(key, s);
}
const apcerBySpecies = [...species.entries()].map(([key, s]) => ({ key, ...s, apcer: rate(s.accepted, s.total) }));
const apcer = apcerBySpecies.length ? Math.max(...apcerBySpecies.map((s) => s.apcer)) : NaN;
const acer = (apcer + bpcer) / 2;

const complete = results.filter((r) => r.outcome.complete);
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const processing = avg(complete.map((r) => r.outcome.processingMs));
const capture = avg(results.map((r) => r.session.captureMs).filter(Number.isFinite));

console.log('\nLIVENESS DETECTION (real person vs. photo / screen)');
console.log(`  Real-person sessions: ${bonaFide.length}; attack sessions: ${attacks.length}`);
for (const s of apcerBySpecies) {
  console.log(`  APCER ${s.key.padEnd(8)} ${pct(s.apcer).padStart(8)}  (${s.accepted}/${s.total} accepted; ${s.nonResponse} couldn't finish the camera steps)`);
}
console.log(`  APCER (highest)            ${pct(apcer)}`);
console.log(`  BPCER                      ${pct(bpcer)}  (${bonaFide.filter((r) => !isAcceptedAsLive(r)).length}/${bonaFide.length} real people rejected)`);
console.log(`  ACER                       ${pct(acer)}`);
console.log(`  Average processing time    ${Number.isNaN(processing) ? '—' : `${(processing / 1000).toFixed(2)} s`} (server decision, ${complete.length} sessions, on this computer)`);
console.log(`  Average capture time       ${Number.isNaN(capture) ? '—' : `${(capture / 1000).toFixed(1)} s`} (person in front of the camera)`);

const reasons = new Map();
for (const r of results) {
  const key = `${r.session.attack ? 'attack' : 'real'}: ${r.outcome.complete ? (r.outcome.reason ?? 'passed') : `did not finish (${r.outcome.reason})`}`;
  reasons.set(key, (reasons.get(key) ?? 0) + 1);
}
console.log('\nOutcomes:');
for (const [key, n] of [...reasons.entries()].sort()) console.log(`  ${String(n).padStart(4)}  ${key}`);

// ---------------------------------------------------------------- files
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvPath = option('--csv');
if (csvPath) {
  const header = ['file', 'volunteer', 'presentation', 'attack', 'shown_person', 'complete', 'live', 'face_verified', 'passed', 'reason',
    'match', 'real_face', 'flash_matches', 'flash_total', 'flash_strength', 'turn_left', 'turn_right', 'same_person', 'processing_ms', 'capture_ms'];
  const lines = results.map(({ session: s, outcome: o }) => [
    s.file, s.volunteer, s.presentation, s.attack, s.shownPerson, o.complete, o.live, o.faceVerified ?? '', o.passed ?? '', o.reason ?? '',
    o.scores?.match, o.scores?.realFace, o.scores?.flashMatches, o.scores?.flashTotal, o.scores?.flashStrength,
    o.scores?.turnLeft, o.scores?.turnRight, o.scores?.sameSession, o.processingMs, s.captureMs,
  ].map(csvCell).join(','));
  fs.writeFileSync(csvPath, [header.join(','), ...lines].join('\n') + '\n');
  console.log('\nWrote', csvPath);
}
const rocPath = option('--roc');
if (rocPath) {
  const lines = sweep.map((p) => [p.t.toFixed(4), p.tar.toFixed(4), p.frr.toFixed(4), p.far.toFixed(4), p.trr.toFixed(4)].join(','));
  fs.writeFileSync(rocPath, ['threshold,tar,frr,far,trr', ...lines].join('\n') + '\n');
  console.log('Wrote', rocPath, '(one row per threshold, for a ROC/DET chart)');
}
