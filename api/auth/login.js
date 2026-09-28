import { pool } from '../lib/db.js';
import { setSessionCookie, verifyPassword } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query(
      'SELECT id, email, full_name, role, password_hash, is_active FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    const user = result.rows[0];

    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    setSessionCookie(res, user);
    return res.status(200).json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ error: 'Unable to log in' });
  }
}
