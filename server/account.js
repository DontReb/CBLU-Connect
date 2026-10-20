import { pool } from './db.js';

// The logged-in user's own account row (plus, for clients, the bank
// details in client_profiles and whether their identity has been verified
// by a face check). Used by api/auth/me.js.

export async function loadAccount(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.full_name AS "fullName", u.role, u.phone_number AS "phoneNumber",
            u.is_active AS "isActive", u.must_change_password AS "mustChangePassword",
            u.password_changed_at AS "passwordChangedAt", u.password_hash AS "passwordHash",
            u.created_at AS "createdAt",
            cp.account_number AS "accountNumber", cp.branch,
            (SELECT max(ic.created_at) FROM identity_checks ic
              WHERE ic.client_id = u.id AND ic.passed) AS "identityVerifiedAt"
     FROM users u
     LEFT JOIN client_profiles cp ON cp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

// A session started before the password last changed (here or by a bank
// reset) is no longer valid: that's how other devices get logged out.
// `iat` is in whole seconds, so compare whole seconds.
export function sessionOutdated(session, account) {
  if (!account.passwordChangedAt || !session.iat) return false;
  return session.iat < Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
}

// What the Profile page shows. Never includes the password hash.
export function profileOf(account) {
  return {
    fullName: account.fullName,
    email: account.email,
    phoneNumber: account.phoneNumber,
    accountNumber: account.accountNumber,
    branch: account.branch,
    memberSince: account.createdAt,
    passwordChangedAt: account.passwordChangedAt,
    identityVerifiedAt: account.identityVerifiedAt,
  };
}
