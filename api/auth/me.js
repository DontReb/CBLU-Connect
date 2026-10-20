import { pool } from '../../server/db.js';
import {
  getSessionUser, verifyPassword, hashPassword, signSessionToken, setSessionCookie, clearSessionCookie,
} from '../../server/auth.js';
import {
  clientAddress, lockLoginKeys, loginStatus, recordLoginAttempt, lockedMessage, triesLeftWarning,
} from '../../server/loginLimit.js';
import { getConsents, isConsentPurpose, recordConsent } from '../../server/privacy.js';
import { loadAccount, profileOf, sessionOutdated } from '../../server/account.js';
import { PRIVACY_NOTICE_VERSION } from '../../shared/privacy.js';
import { passwordProblem, PHONE_PATTERN, PHONE_MESSAGE } from '../../shared/account.js';

// The logged-in user's own account.
//
// GET   /api/auth/me → { user } — and for clients also { privacy } (which
//                      consents they've given) and { profile } (the details
//                      on their Profile page).
// POST  /api/auth/me → clients: agree to or withdraw a consent.
//                      Body: { purpose: 'portal' | 'id_face', given: true | false }
// PUT   /api/auth/me → change password. Body: { currentPassword, newPassword }.
//                      Wrong current passwords count toward the login limit.
//                      Other devices are logged out; this one stays in.
// PATCH /api/auth/me → change your mobile number. Body: { phoneNumber }
//
// A session started before the password last changed, or for an account
// that's been deactivated, is ended here (401) — the website checks this
// endpoint on every page load.
//
// (All of this lives in one file to stay under Vercel Hobby's 12-function
// limit.)
const HANDLERS = { GET: getMe, POST: updateConsent, PUT: changePassword, PATCH: updateProfile };

export default async function handler(req, res) {
  const handle = HANDLERS[req.method];
  if (!handle) return res.status(405).json({ error: 'Method not allowed' });

  const session = getSessionUser(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  let account;
  try {
    account = await loadAccount(session.sub);
  } catch (err) {
    console.error('Failed to load account:', err);
    // Reading: don't log anyone out over a database hiccup; use the session.
    if (req.method === 'GET') {
      const user = { id: session.sub, email: session.email, fullName: session.fullName, role: session.role };
      return res.status(200).json({ user, privacy: null, profile: null });
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }

  if (!account || !account.isActive || sessionOutdated(session, account)) {
    clearSessionCookie(res);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  return handle(req, res, account);
}

function userOf(account) {
  return {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    mustChangePassword: account.mustChangePassword,
  };
}

async function getMe(req, res, account) {
  const user = userOf(account);
  if (user.role !== 'client') return res.status(200).json({ user });

  let privacy = null;
  try {
    privacy = { version: PRIVACY_NOTICE_VERSION, consents: await getConsents(user.id) };
  } catch (err) {
    // Don't log the client out over this; the dashboard retries.
    console.error('Failed to load consents:', err);
  }
  return res.status(200).json({ user, privacy, profile: profileOf(account) });
}

async function updateConsent(req, res, account) {
  if (account.role !== 'client') {
    return res.status(403).json({ error: 'Only clients give consent here' });
  }

  const { purpose, given } = req.body ?? {};
  if (!isConsentPurpose(purpose) || typeof given !== 'boolean') {
    return res.status(400).json({ error: "Send { purpose: 'portal' | 'id_face', given: true | false }" });
  }

  try {
    await recordConsent(account.id, purpose, given, {
      ip: clientAddress(req),
      userAgent: req.headers?.['user-agent'],
    });
    const privacy = { version: PRIVACY_NOTICE_VERSION, consents: await getConsents(account.id) };
    return res.status(200).json({ privacy });
  } catch (err) {
    console.error('Failed to save consent:', err);
    return res.status(500).json({ error: "Couldn't save your choice. Please try again." });
  }
}

async function changePassword(req, res, account) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== 'string' || !currentPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Enter your current password and a new one.' });
  }
  const problem = passwordProblem(newPassword, account.email);
  if (problem) return res.status(400).json({ error: problem, field: 'newPassword' });
  if (newPassword === currentPassword) {
    return res.status(400).json({ error: 'Choose a password different from your current one.', field: 'newPassword' });
  }

  const address = clientAddress(req);
  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    // Same limit as logging in: otherwise someone with an unlocked,
    // logged-in device could guess the password here without limit.
    await lockLoginKeys(db, account.email, address);
    const status = await loginStatus(db, account.email, address);
    if (status.locked) {
      await db.query('COMMIT');
      res.setHeader('Retry-After', String(status.retryAfterSeconds));
      return res.status(429).json({ error: lockedMessage(status), retryAfterSeconds: status.retryAfterSeconds });
    }

    if (!(await verifyPassword(currentPassword, account.passwordHash))) {
      await recordLoginAttempt(db, { email: account.email, address, userId: account.id, succeeded: false });
      const after = await loginStatus(db, account.email, address);
      await db.query('COMMIT');
      if (after.locked) {
        res.setHeader('Retry-After', String(after.retryAfterSeconds));
        return res.status(429).json({ error: lockedMessage(after), retryAfterSeconds: after.retryAfterSeconds });
      }
      return res.status(401).json({
        error: `Your current password isn't right.${triesLeftWarning(after.failuresLeft)}`,
        field: 'currentPassword',
      });
    }

    // The time comes from here, not the database, so the new session below
    // is never "older" than the change (see sessionOutdated).
    const changedAt = new Date();
    await db.query(
      `UPDATE users SET password_hash = $2, must_change_password = FALSE, password_changed_at = $3
       WHERE id = $1`,
      [account.id, await hashPassword(newPassword), changedAt]
    );
    await recordLoginAttempt(db, { email: account.email, address, userId: account.id, succeeded: true });
    await db.query('COMMIT');

    // Keep THIS device logged in with a fresh session; older ones end.
    setSessionCookie(res, signSessionToken({
      sub: account.id, role: account.role, email: account.email, fullName: account.fullName,
    }));
    return res.status(200).json({
      user: { ...userOf(account), mustChangePassword: false },
      passwordChangedAt: changedAt,
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Failed to change password:', err);
    return res.status(500).json({ error: "Couldn't change your password. Please try again." });
  } finally {
    db?.release();
  }
}

async function updateProfile(req, res, account) {
  const raw = req.body?.phoneNumber;
  if (raw !== null && typeof raw !== 'string') {
    return res.status(400).json({ error: 'Send { phoneNumber }' });
  }
  const phoneNumber = (raw ?? '').trim().slice(0, 20);
  if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
    return res.status(400).json({ error: PHONE_MESSAGE });
  }

  try {
    await pool.query('UPDATE users SET phone_number = $2 WHERE id = $1', [account.id, phoneNumber || null]);
    const updated = await loadAccount(account.id);
    return res.status(200).json({ profile: profileOf(updated) });
  } catch (err) {
    console.error('Failed to update profile:', err);
    return res.status(500).json({ error: "Couldn't save your mobile number. Please try again." });
  }
}
