import { verifySessionToken, SESSION_COOKIE_NAME } from '../../server/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const payload = verifySessionToken(token);
    return res.status(200).json({
      user: { id: payload.sub, email: payload.email, fullName: payload.fullName, role: payload.role },
    });
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
}