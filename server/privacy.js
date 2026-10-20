import { pool } from './db.js';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION } from '../shared/privacy.js';

// Consent records. Every agree or withdraw is a NEW row in
// privacy_consents (never updated or deleted), so the bank can show when a
// client agreed, to which version of the notice, and when they withdrew.
// The latest row per purpose is the current answer.

export function isConsentPurpose(purpose) {
  return Object.hasOwn(CONSENT_PURPOSES, purpose);
}

// { portal: { given, at, version, current }, id_face: { ... } }
// `current` = agreed to the notice version in force now.
export async function getConsents(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (purpose) purpose, given, notice_version AS version, created_at AS at
     FROM privacy_consents
     WHERE user_id = $1
     ORDER BY purpose, created_at DESC, id DESC`,
    [userId]
  );
  const consents = {};
  for (const purpose of Object.keys(CONSENT_PURPOSES)) {
    const row = rows.find((r) => r.purpose === purpose);
    consents[purpose] = row
      ? { given: row.given, at: row.at, version: row.version, current: row.given && row.version === PRIVACY_NOTICE_VERSION }
      : { given: false, at: null, version: null, current: false };
  }
  return consents;
}

export async function recordConsent(userId, purpose, given, { ip, userAgent } = {}) {
  await pool.query(
    `INSERT INTO privacy_consents (user_id, purpose, given, notice_version, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, purpose, given, PRIVACY_NOTICE_VERSION, ip ?? null, userAgent?.slice(0, 255) ?? null]
  );
}

const NEEDED_MESSAGES = {
  portal: 'Please agree to the Privacy Notice first.',
  id_face: 'Please agree to the ID scan and face check first, or type your details by hand.',
};

// For endpoints that handle personal data: checks the client has agreed to
// each purpose (current notice version). Writes a 403 and returns false if
// not, so the handler just does: `if (!(await requireConsent(...))) return;`
export async function requireConsent(res, userId, ...purposes) {
  const consents = await getConsents(userId);
  const missing = purposes.find((purpose) => !consents[purpose]?.current);
  if (!missing) return true;
  res.status(403).json({ error: NEEDED_MESSAGES[missing], code: 'consent_required', purpose: missing });
  return false;
}
