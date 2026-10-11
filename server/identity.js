// Identity check helpers shared by the ID scan (api/forms/ocr.js) and the
// face check (api/identity/face.js).
//
// Flow: scan ID → face check → only then are the ID's values written to the
// form. Between the two steps nothing is stored on the server: the scan's
// values travel back to the browser inside a signed token (the client can
// read it — it's their own data — but can't change it), together with a
// fingerprint (SHA-256) of the ID photo, so the face check must use the same
// photo that was scanned.
//
// Each finished face check is logged in identity_checks (result and scores
// only — never pictures or face data). Three failed checks in one day
// (Philippine time) lock scanning until the next day; the client can still
// type the form by hand or verify at a branch.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const MAX_FAILED_TRIES = 3;
const SCAN_TOKEN_MINUTES = 30;
const CHALLENGE_MINUTES = 5;

// A key derived from JWT_SECRET, so these tokens can never pass as a login.
function secret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return crypto.createHash('sha256').update(`${process.env.JWT_SECRET}:identity-check`).digest();
}

export function photoFingerprint(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export function signScanToken({ clientId, idType, confidence, values, warnings, photo }) {
  return jwt.sign(
    { typ: 'id-scan', idType, confidence, values, warnings, photo },
    secret(),
    { subject: String(clientId), expiresIn: `${SCAN_TOKEN_MINUTES}m` }
  );
}

export function signChallenge({ clientId, challenge }) {
  return jwt.sign(
    { typ: 'face-challenge', cid: crypto.randomUUID(), ...challenge },
    secret(),
    { subject: String(clientId), expiresIn: `${CHALLENGE_MINUTES}m` }
  );
}

/** Decoded token, or null when it's missing, expired, tampered with, or someone else's. */
export function readToken(token, typ, clientId) {
  try {
    const payload = jwt.verify(String(token ?? ''), secret());
    return payload.typ === typ && payload.sub === String(clientId) ? payload : null;
  } catch {
    return null;
  }
}

/** Secure 0 ≤ x < 1 for making challenges. */
export function secureRandom() {
  return crypto.randomInt(0, 2 ** 32) / 2 ** 32;
}

/**
 * { verifiedAt, failedToday, triesLeft, locked } for one client.
 * "Today" is the calendar day in the Philippines.
 */
export async function identityStatus(db, clientId) {
  const result = await db.query(
    `SELECT
       (SELECT max(created_at) FROM identity_checks WHERE client_id = $1 AND passed) AS "verifiedAt",
       (SELECT count(*)::int FROM identity_checks
         WHERE client_id = $1 AND NOT passed
           AND created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
       ) AS "failedToday"`,
    [clientId]
  );
  const { verifiedAt, failedToday } = result.rows[0];
  const triesLeft = Math.max(0, MAX_FAILED_TRIES - failedToday);
  return { verifiedAt, failedToday, triesLeft, locked: triesLeft === 0 };
}

export const LOCKED_MESSAGE =
  "You've used all 3 face check tries for today. Please visit a CBLU branch to verify your identity, " +
  'or try again tomorrow. You can still fill in the form by hand.';

/**
 * Writes scanned values into the form. A value the client typed themselves
 * is never overwritten. Returns { filled, kept } field keys.
 */
export async function fillFromScan(db, submissionId, fields, values) {
  const filled = [];
  const kept = [];
  for (const field of fields) {
    const value = values[field.fieldKey];
    if (!value) continue;
    const result = await db.query(
      `INSERT INTO form_submission_values (submission_id, field_id, value, source)
       VALUES ($1, $2, $3, 'ocr')
       ON CONFLICT (submission_id, field_id)
       DO UPDATE SET value = EXCLUDED.value, source = 'ocr'
       WHERE form_submission_values.source <> 'manual'
          OR COALESCE(form_submission_values.value, '') = ''
       RETURNING id`,
      [submissionId, field.id, value]
    );
    (result.rowCount > 0 ? filled : kept).push(field.fieldKey);
  }
  return { filled, kept };
}
