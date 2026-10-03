import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'cblu_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SALT_ROUNDS = 10;

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function signSessionToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${SESSION_MAX_AGE_SECONDS}s` });
}

export function verifySessionToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Reads and verifies the session cookie, returning the decoded payload or
// null — never throws, so callers can just check truthiness.
export function getSessionUser(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  try {
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// The frontend's RequireRole guard is easy to bypass with a direct API
// call, so every role-restricted endpoint checks this too. Writes the
// 401/403 response itself and returns null on failure, so the route
// handler just does: `const user = requireRole(req, res, 'admin'); if
// (!user) return;`
export function requireRole(req, res, role) {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Not logged in' });
    return null;
  }
  if (user.role !== role) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
}

// `Secure` only turns on in production, where Vercel always serves over
// https — `vercel dev` serves plain http://localhost, and a browser
// silently drops a Secure cookie set over http, which would break local
// login entirely. This is different from db.js's SSL setting, which stays
// on everywhere: that's the hosted Postgres itself requiring SSL regardless
// of where the request originates, not a property of this cookie.
function cookieParts(value, maxAge) {
  const parts = [`${SESSION_COOKIE_NAME}=${value}`, 'HttpOnly', 'Path=/', `Max-Age=${maxAge}`, 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', cookieParts(token, SESSION_MAX_AGE_SECONDS));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookieParts('', 0));
}