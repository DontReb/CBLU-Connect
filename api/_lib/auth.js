import crypto from 'node:crypto';
import { pool } from './db.js';

const COOKIE_NAME = 'cblu_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function secret() {
  return process.env.AUTH_SECRET || process.env.SESSION_SECRET || 'development-only-change-this-secret';
}

function encode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function sign(payload) {
  const body = encode(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + signature;
}

function verify(token) {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [algorithm, n, r, p, saltB64, hashB64] = String(stored).split('$');
    if (algorithm !== 'scrypt') return false;
    const derived = crypto.scryptSync(
      password,
      Buffer.from(saltB64, 'base64'),
      Buffer.from(hashB64, 'base64').length,
      { N: Number(n), r: Number(r), p: Number(p) }
    );
    return crypto.timingSafeEqual(derived, Buffer.from(hashB64, 'base64'));
  } catch {
    return false;
  }
}

export function setSessionCookie(res, user) {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.full_name,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const token = sign(payload);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function getSession(req) {
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
  return verify(cookies[COOKIE_NAME]);
}

export async function requireAuth(req, res, roles = []) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
  if (roles.length && !roles.includes(session.role)) {
    res.status(403).json({ error: 'You do not have permission to access this resource' });
    return null;
  }

  const result = await pool.query(
    'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
    [session.sub]
  );
  if (result.rowCount === 0 || !result.rows[0].is_active) {
    clearSessionCookie(res);
    res.status(401).json({ error: 'Account is inactive or no longer exists' });
    return null;
  }
  return result.rows[0];
}
