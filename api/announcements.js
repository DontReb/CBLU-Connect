import { pool } from '../server/db.js';
import { getSessionUser, requireRole } from '../server/auth.js';

// All announcement actions in one file, so it only counts once toward
// Vercel's free-plan function limit:
//   GET    /api/announcements          → newest first (any logged-in user)
//   POST   /api/announcements          → create (admin only)
//   PUT    /api/announcements?id=12    → edit (admin only)
//   DELETE /api/announcements?id=12    → delete for good (admin only)

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;

export default async function handler(req, res) {
  if (req.method === 'GET') return listAnnouncements(req, res);
  if (req.method === 'POST') return createAnnouncement(req, res);
  if (req.method === 'PUT') return updateAnnouncement(req, res);
  if (req.method === 'DELETE') return deleteAnnouncement(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
}

const SELECT_COLUMNS = `
  a.id, a.title, a.body,
  a.created_at AS "createdAt", a.updated_at AS "updatedAt",
  u.full_name AS "authorName"
`;

// Returns { title, body } or writes a 400 and returns null.
function readInput(req, res) {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
  if (!title || !body) {
    res.status(400).json({ error: 'Title and message are both required' });
    return null;
  }
  if (title.length > MAX_TITLE_LENGTH || body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `Keep the title under ${MAX_TITLE_LENGTH} and the message under ${MAX_BODY_LENGTH} characters` });
    return null;
  }
  return { title, body };
}

// Returns the numeric ?id= or writes a 400 and returns null.
function readId(req, res) {
  const id = Number.parseInt(req.query?.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'A valid announcement id is required' });
    return null;
  }
  return id;
}

async function listAnnouncements(req, res) {
  if (!getSessionUser(req)) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const result = await pool.query(
      `SELECT ${SELECT_COLUMNS}
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC
       LIMIT 50`
    );
    return res.status(200).json({ announcements: result.rows });
  } catch (err) {
    console.error('Failed to load announcements:', err);
    return res.status(500).json({ error: 'Failed to load announcements' });
  }
}

async function createAnnouncement(req, res) {
  const admin = requireRole(req, res, 'admin');
  if (!admin) return;
  const input = readInput(req, res);
  if (!input) return;

  try {
    const result = await pool.query(
      `WITH inserted AS (
         INSERT INTO announcements (title, body, created_by)
         VALUES ($1, $2, $3)
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
       FROM inserted a
       LEFT JOIN users u ON u.id = a.created_by`,
      [input.title, input.body, admin.sub]
    );
    return res.status(201).json({ announcement: result.rows[0] });
  } catch (err) {
    console.error('Failed to create announcement:', err);
    return res.status(500).json({ error: 'Failed to post announcement' });
  }
}

async function updateAnnouncement(req, res) {
  const admin = requireRole(req, res, 'admin');
  if (!admin) return;
  const id = readId(req, res);
  if (!id) return;
  const input = readInput(req, res);
  if (!input) return;

  try {
    const result = await pool.query(
      `WITH updated AS (
         UPDATE announcements SET title = $1, body = $2
         WHERE id = $3
         RETURNING *
       )
       SELECT ${SELECT_COLUMNS}
       FROM updated a
       LEFT JOIN users u ON u.id = a.created_by`,
      [input.title, input.body, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.status(200).json({ announcement: result.rows[0] });
  } catch (err) {
    console.error('Failed to update announcement:', err);
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
}

async function deleteAnnouncement(req, res) {
  const admin = requireRole(req, res, 'admin');
  if (!admin) return;
  const id = readId(req, res);
  if (!id) return;

  try {
    const result = await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('Failed to delete announcement:', err);
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
}
