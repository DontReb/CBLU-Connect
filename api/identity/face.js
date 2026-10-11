import { IncomingForm } from 'formidable';
import fs from 'fs';
import { pool } from '../../server/db.js';
import { requireRole } from '../../server/auth.js';
import { loadLoanForm, ensureSubmission, loadValues } from '../../server/loanForm.js';
import {
  identityStatus, signChallenge, readToken, secureRandom, photoFingerprint, fillFromScan,
  LOCKED_MESSAGE, MAX_FAILED_TRIES,
} from '../../server/identity.js';
import { makeChallenge, frameNames } from '../../shared/face/challenge.js';
import { loadRgb } from '../../server/face/image.js';
import { checkIdentity, REASONS } from '../../server/face/verify.js';

// The live face check (face verification + liveness detection):
//
//   GET  /api/identity/face → a new random challenge (flash colours, turn
//        order), signed and valid for 5 minutes, plus tries left today.
//   POST /api/identity/face → multipart:
//        scanToken, challengeToken, meta (JSON: when each picture was taken)
//        id         the ID's front photo (the same one that was scanned)
//        front, dark_0, flash_0 … dark_5, flash_5, left/right, front_end
//
// If the check passes, the scanned ID values are written to the loan form.
// Each finished check is logged (result and scores only). The pictures are
// deleted as soon as they are read; no face data is stored.

export const config = {
  api: { bodyParser: false },
};

const MESSAGES = {
  [REASONS.NO_FACE]: "We couldn't see your face clearly. Face the camera in good light and try again.",
  [REASONS.SEVERAL_FACES]: 'More than one face was in the picture. Make sure only you are in front of the camera.',
  [REASONS.NOT_STRAIGHT]: 'Look straight at the camera when asked.',
  [REASONS.TURN_MISSING]: 'We couldn\'t see your head turn. Turn your head slowly, as asked, until the picture is taken.',
  [REASONS.FLASH_WEAK]: "We couldn't see the screen's light on your face. Turn your screen brightness up, move away from bright light behind or above you, and hold your face closer to the screen.",
  [REASONS.FLASH_MISMATCH]: "We couldn't confirm that a live person is in front of the camera.",
  [REASONS.NOT_REAL]: "We couldn't confirm that a live person is in front of the camera.",
  [REASONS.DIFFERENT_PERSON]: "We couldn't confirm that a live person is in front of the camera.",
  [REASONS.NO_MATCH]: "Your face doesn't match the photo on your ID.",
};

export default async function handler(req, res) {
  const client = requireRole(req, res, 'client');
  if (!client) return;

  if (req.method === 'GET') return issueChallenge(res, client);
  if (req.method === 'POST') return verify(req, res, client);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function issueChallenge(res, client) {
  try {
    const status = await identityStatus(pool, client.sub);
    if (status.locked) return res.status(423).json({ error: LOCKED_MESSAGE, identity: status });
    const challenge = makeChallenge(secureRandom);
    return res.status(200).json({
      challenge,
      challengeToken: signChallenge({ clientId: client.sub, challenge }),
      identity: status,
    });
  } catch (err) {
    console.error('Face check challenge failed:', err);
    return res.status(500).json({ error: 'Could not start the face check. Please try again.' });
  }
}

async function verify(req, res, client) {
  const tempFiles = [];
  let db;
  try {
    const { fields, files } = await parseForm(req);
    for (const list of Object.values(files)) for (const file of list) tempFiles.push(file.filepath);

    const scan = readToken(fields.scanToken?.[0], 'id-scan', client.sub);
    if (!scan) return res.status(400).json({ error: 'Your ID scan has expired. Please scan your ID again.' });
    const challengeToken = readToken(fields.challengeToken?.[0], 'face-challenge', client.sub);
    if (!challengeToken) return res.status(400).json({ error: 'The face check took too long. Please start it again.' });
    const challenge = { colours: challengeToken.colours, turns: challengeToken.turns };

    const status = await identityStatus(pool, client.sub);
    if (status.locked) return res.status(423).json({ error: LOCKED_MESSAGE, identity: status });

    const used = await pool.query('SELECT 1 FROM identity_checks WHERE challenge_id = $1', [challengeToken.cid]);
    if (used.rowCount) return res.status(409).json({ error: 'This face check was already used. Please start it again.' });

    // The ID photo must be the one that was scanned.
    const idFile = files.id?.[0];
    if (!idFile || photoFingerprint(fs.readFileSync(idFile.filepath)) !== scan.photo) {
      return res.status(400).json({ error: 'Please scan your ID again, then do the face check.' });
    }

    // Every picture, taken in the challenge's order.
    const names = frameNames(challenge);
    const meta = parseMeta(fields.meta?.[0]);
    const missing = names.filter((name) => !files[name]?.[0]);
    if (missing.length || !inOrder(names, meta.times)) {
      return res.status(400).json({ error: 'Some pictures were missing. Please do the face check again.' });
    }

    const idImage = await loadRgb(idFile.filepath, 1600);
    const frames = {};
    for (const name of names) frames[name] = await loadRgb(files[name][0].filepath, 960);

    const result = await checkIdentity({ idImage, frames, challenge });

    if (result.reason === REASONS.NO_FACE_ON_ID) {
      // Not the client's fault — doesn't use up a try.
      return res.status(422).json({ error: "We couldn't find the photo on your ID. Scan your ID again with the photo clearly visible." });
    }

    db = await pool.connect();
    await db.query('BEGIN');
    await db.query(
      `INSERT INTO identity_checks
         (client_id, challenge_id, id_type, passed, face_verified, live, failure_reason,
          match_score, real_face_score, flash_matches, flash_total, turn_left, turn_right,
          same_person_score, capture_ms, processing_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        client.sub, challengeToken.cid, scan.idType, result.passed, result.faceVerified, result.live, result.reason,
        result.scores.match, result.scores.realFace, result.scores.flashMatches, result.scores.flashTotal,
        result.scores.turnLeft, result.scores.turnRight, result.scores.sameSession,
        meta.captureMs, result.processingMs,
      ]
    );

    if (!result.passed) {
      await db.query('COMMIT');
      const after = await identityStatus(pool, client.sub);
      return res.status(200).json({
        passed: false,
        faceVerified: result.faceVerified,
        live: result.live,
        reason: result.reason,
        message: after.locked ? LOCKED_MESSAGE : `${MESSAGES[result.reason]} ${triesText(after.triesLeft)}`,
        identity: after,
      });
    }

    // Passed: now the scanned values go into the form.
    const form = await loadLoanForm(db);
    const submission = await ensureSubmission(db, client.sub, form.template.id);
    const { filled, kept } = await fillFromScan(db, submission.id, form.fields.filter((f) => f.idSource), scan.values);
    await db.query(
      `UPDATE form_submissions
       SET last_id_type = $2, last_scan_at = now(), last_ocr_confidence = $3,
           identity_verified_at = now(), identity_match_score = $4
       WHERE id = $1`,
      [submission.id, scan.idType, scan.confidence, result.scores.match]
    );
    await db.query('COMMIT');

    return res.status(200).json({
      passed: true,
      faceVerified: true,
      live: true,
      filled,
      kept,
      warnings: scan.warnings,
      values: await loadValues(pool, submission.id),
      identity: await identityStatus(pool, client.sub),
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    if (err?.httpCode === 413 || err?.code === 1009 || err?.code === 1016) {
      return res.status(413).json({ error: 'The pictures were too large. Please try again.' });
    }
    console.error('Face check failed:', err);
    return res.status(500).json({ error: 'The face check failed. Please try again.' });
  } finally {
    if (db) db.release();
    for (const filePath of tempFiles) fs.unlink(filePath, () => {});
  }
}

function triesText(left) {
  return `${left} ${left === 1 ? 'try' : 'tries'} left today (of ${MAX_FAILED_TRIES}).`;
}

function parseMeta(raw) {
  try {
    const meta = JSON.parse(raw ?? '{}');
    return {
      times: meta.times && typeof meta.times === 'object' ? meta.times : {},
      captureMs: Number.isFinite(meta.captureMs) ? Math.round(meta.captureMs) : null,
    };
  } catch {
    return { times: {}, captureMs: null };
  }
}

// Pictures must have been taken one after another, in the challenge's order
// (so the turn order matches what was asked).
function inOrder(names, times) {
  let last = -Infinity;
  for (const name of names) {
    const t = Number(times[name]);
    if (!Number.isFinite(t) || t <= last) return false;
    last = t;
  }
  return true;
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFiles: 20,
      maxFileSize: 4 * 1024 * 1024,
      maxTotalFileSize: 8 * 1024 * 1024,
      keepExtensions: true,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
