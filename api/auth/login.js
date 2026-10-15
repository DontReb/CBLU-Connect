import { pool } from '../../server/db.js';
import { verifyPassword, signSessionToken, setSessionCookie } from '../../server/auth.js';
import {
  clientAddress,
  forgetOldAttempts,
  lockedMessage,
  lockLoginKeys,
  loginStatus,
  recordLoginAttempt,
  wrongPasswordMessage,
} from '../../server/loginLimit.js';

// Compared against when the email has no account, so a wrong email takes
// as long as a wrong password and the timing doesn't reveal which emails
// exist. (A bcrypt hash of a random string nobody knows.)
const NO_ACCOUNT_HASH = '$2b$10$31AqMz1Je24ZwahibIs3I.u52XL.JaFJV10b2He7/fp/h/C1obdyq';

function sendLocked(res, status) {
  res.setHeader('Retry-After', String(status.retryAfterSeconds));
  return res.status(429).json({ error: lockedMessage(status), retryAfterSeconds: status.retryAfterSeconds });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim().slice(0, 255);
  const address = clientAddress(req);

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await lockLoginKeys(client, normalizedEmail, address);

    // Paused? Then don't even look at the password.
    const status = await loginStatus(client, normalizedEmail, address);
    if (status.locked) {
      await client.query('COMMIT');
      return sendLocked(res, status);
    }

    const result = await client.query(
      'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = $1',
      [normalizedEmail]
    );
    const user = result.rows[0];
    const passwordMatches = await verifyPassword(password, user?.password_hash ?? NO_ACCOUNT_HASH);

    // Same reply whether the email doesn't exist or the password is wrong —
    // don't give an attacker a way to tell which.
    if (!user || !passwordMatches) {
      await recordLoginAttempt(client, { email: normalizedEmail, address, userId: user?.id, succeeded: false });
      const after = await loginStatus(client, normalizedEmail, address);
      await client.query('COMMIT');
      if (after.locked) return sendLocked(res, after);
      return res.status(401).json({ error: wrongPasswordMessage(after.failuresLeft) });
    }

    await recordLoginAttempt(client, { email: normalizedEmail, address, userId: user.id, succeeded: true });
    await forgetOldAttempts(client);
    await client.query('COMMIT');

    // Only said after the right password, so it doesn't reveal the account.
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated' });
    }

    const token = signSessionToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      fullName: user.full_name,
    });
    setSessionCookie(res, token);

    return res.status(200).json({
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error('Login failed:', err);
    if (client) await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: 'Login failed' });
  } finally {
    client?.release();
  }
}
