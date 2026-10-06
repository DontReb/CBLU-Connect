import { pool } from '../server/db.js';
import { getSessionUser } from '../server/auth.js';

// Live chat between clients and agents — one file, so it only counts once
// toward Vercel's free-plan function limit. Uses the chat_sessions and
// chat_messages tables from Schema.sql.
//
// Vercel's free plan can't keep a connection open, so both sides ask for
// new messages every few seconds (polling) instead of having them pushed.
//
// Client (role 'client'):
//   GET  /api/chat?action=mine                      → your open chat, if any
//   POST /api/chat?action=start   { transcript }    → ask for a live agent
// Agent (role 'agent'):
//   GET  /api/chat?action=queue                     → waiting chats + chats you're handling
//   GET  /api/chat?action=closed                    → chats you've handled that are closed
//   POST /api/chat?action=claim   { sessionId }     → take a waiting chat
// Both (only for chats you're part of):
//   GET  /api/chat?action=session&id=…              → one chat with all its messages
//   POST /api/chat?action=send    { sessionId, text }
//   POST /api/chat?action=close   { sessionId }

const MAX_TEXT_LENGTH = 2000;
const MAX_TRANSCRIPT_MESSAGES = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// action → [handler, role allowed]  (null = client or agent, checked per chat)
const ROUTES = {
  GET: {
    mine: [getMyOpenChat, 'client'],
    queue: [getQueue, 'agent'],
    closed: [getClosedChats, 'agent'],
    session: [getChat, null],
  },
  POST: {
    start: [startChat, 'client'],
    claim: [claimChat, 'agent'],
    send: [sendMessage, null],
    close: [closeChat, null],
  },
};

export default async function handler(req, res) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Please log in to chat with a live agent' });
  }

  const methodRoutes = ROUTES[req.method];
  if (!methodRoutes) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const route = methodRoutes[req.query?.action];
  if (!route) {
    return res.status(400).json({ error: 'Unknown chat action' });
  }

  const [run, role] = route;
  const allowed = role ? user.role === role : user.role === 'client' || user.role === 'agent';
  if (!allowed) {
    return res.status(403).json({ error: 'Live chat is only for client and agent accounts' });
  }

  try {
    return await run(req, res, user);
  } catch (err) {
    console.error(`Chat action "${req.query.action}" failed:`, err);
    return res.status(500).json({ error: 'Something went wrong with the chat. Please try again.' });
  }
}

// ---------------------------------------------------------------------------
// Shared queries
// ---------------------------------------------------------------------------

const SESSION_QUERY = `
  SELECT s.id, s.status, s.client_id AS "clientId", s.agent_id AS "agentId",
         c.full_name AS "clientName", a.full_name AS "agentName",
         s.started_at AS "startedAt", s.escalated_at AS "escalatedAt", s.closed_at AS "closedAt",
         last.content AS "lastMessage", last.created_at AS "lastMessageAt"
  FROM chat_sessions s
  JOIN users c ON c.id = s.client_id
  LEFT JOIN users a ON a.id = s.agent_id
  LEFT JOIN LATERAL (
    SELECT m.content, m.created_at FROM chat_messages m
    WHERE m.session_id = s.id ORDER BY m.id DESC LIMIT 1
  ) last ON true`;

// What the browser gets — the user ids stay on the server.
function publicSession(row) {
  return {
    id: row.id,
    status: row.status,
    clientName: row.clientName,
    agentName: row.agentName,
    startedAt: row.startedAt,
    escalatedAt: row.escalatedAt,
    closedAt: row.closedAt,
    lastMessage: row.lastMessage,
    lastMessageAt: row.lastMessageAt,
  };
}

async function findSession(db, sessionId) {
  const result = await db.query(`${SESSION_QUERY} WHERE s.id = $1`, [sessionId]);
  return result.rows[0] ?? null;
}

// id is cast to int so the browser gets a plain number (BIGSERIAL would
// otherwise arrive as a string).
async function loadMessages(db, sessionId) {
  const result = await db.query(
    `SELECT m.id::int AS id, m.sender_type AS "senderType", m.content,
            m.created_at AS "createdAt", u.full_name AS "senderName"
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.session_id = $1
     ORDER BY m.id`,
    [sessionId]
  );
  return result.rows;
}

async function addMessage(db, sessionId, senderType, senderId, content) {
  const result = await db.query(
    `INSERT INTO chat_messages (session_id, sender_type, sender_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id::int AS id, sender_type AS "senderType", content, created_at AS "createdAt"`,
    [sessionId, senderType, senderId, content]
  );
  return result.rows[0];
}

async function sessionWithMessages(db, sessionId) {
  const session = await findSession(db, sessionId);
  return { session: publicSession(session), messages: await loadMessages(db, sessionId) };
}

// A client can see their own chats. An agent can see any chat that's
// waiting for someone (to decide whether to take it) and the ones they took.
function canView(user, session) {
  if (user.role === 'client') return session.clientId === user.sub;
  return session.status === 'escalated' || session.agentId === user.sub;
}

function readSessionId(value, res) {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    res.status(400).json({ error: 'A valid chat id is required' });
    return null;
  }
  return value;
}

const isOpen = (status) => status === 'escalated' || status === 'with_agent';

// ---------------------------------------------------------------------------
// Client actions
// ---------------------------------------------------------------------------

async function getMyOpenChat(req, res, user) {
  const result = await pool.query(
    `${SESSION_QUERY} WHERE s.client_id = $1 AND s.status IN ('escalated', 'with_agent')
     ORDER BY s.started_at DESC LIMIT 1`,
    [user.sub]
  );
  const session = result.rows[0];
  if (!session) return res.status(200).json({ session: null, messages: [] });
  return res.status(200).json({ session: publicSession(session), messages: await loadMessages(pool, session.id) });
}

// Body: { transcript: [{ from: 'user' | 'bot', text }] } — the conversation
// the client already had with the chatbot, so the agent has context.
async function startChat(req, res, user) {
  const transcript = Array.isArray(req.body?.transcript)
    ? req.body.transcript.slice(-MAX_TRANSCRIPT_MESSAGES)
    : [];

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    // Already waiting or chatting? Reuse that chat instead of opening a second one.
    const existing = await db.query(
      `SELECT id FROM chat_sessions WHERE client_id = $1 AND status IN ('escalated', 'with_agent')
       ORDER BY started_at DESC LIMIT 1`,
      [user.sub]
    );
    if (existing.rowCount > 0) {
      await db.query('COMMIT');
      return res.status(200).json(await sessionWithMessages(pool, existing.rows[0].id));
    }

    const created = await db.query(
      `INSERT INTO chat_sessions (client_id, status, escalated_at)
       VALUES ($1, 'escalated', now()) RETURNING id`,
      [user.sub]
    );
    const sessionId = created.rows[0].id;

    for (const entry of transcript) {
      const text = typeof entry?.text === 'string' ? entry.text.trim().slice(0, MAX_TEXT_LENGTH) : '';
      if (!text) continue;
      const fromClient = entry.from === 'user';
      await addMessage(db, sessionId, fromClient ? 'client' : 'bot', fromClient ? user.sub : null, text);
    }
    await addMessage(db, sessionId, 'bot', null, 'Live agent requested — waiting for someone to join.');

    await db.query('COMMIT');
    return res.status(201).json(await sessionWithMessages(pool, sessionId));
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    db.release();
  }
}

// ---------------------------------------------------------------------------
// Agent actions
// ---------------------------------------------------------------------------

async function getQueue(req, res, user) {
  // Chats you're already handling first, then waiting chats, oldest first.
  const result = await pool.query(
    `${SESSION_QUERY}
     WHERE s.status = 'escalated' OR (s.status = 'with_agent' AND s.agent_id = $1)
     ORDER BY (s.status = 'with_agent') DESC, s.escalated_at ASC`,
    [user.sub]
  );
  return res.status(200).json({ sessions: result.rows.map(publicSession) });
}

async function getClosedChats(req, res, user) {
  const result = await pool.query(
    `${SESSION_QUERY} WHERE s.status = 'closed' AND s.agent_id = $1
     ORDER BY s.closed_at DESC LIMIT 50`,
    [user.sub]
  );
  return res.status(200).json({ sessions: result.rows.map(publicSession) });
}

async function claimChat(req, res, user) {
  const sessionId = readSessionId(req.body?.sessionId, res);
  if (!sessionId) return;

  // The WHERE status = 'escalated' makes this safe if two agents click
  // "Claim" at the same moment — only one update can succeed.
  const claimed = await pool.query(
    `UPDATE chat_sessions SET status = 'with_agent', agent_id = $2
     WHERE id = $1 AND status = 'escalated' RETURNING id`,
    [sessionId, user.sub]
  );
  if (claimed.rowCount === 0) {
    return res.status(409).json({ error: 'This chat was already taken by another agent or has ended.' });
  }

  await addMessage(pool, sessionId, 'bot', null, `${user.fullName} joined the chat.`);
  return res.status(200).json(await sessionWithMessages(pool, sessionId));
}

// ---------------------------------------------------------------------------
// Client or agent actions
// ---------------------------------------------------------------------------

async function getChat(req, res, user) {
  const sessionId = readSessionId(req.query?.id, res);
  if (!sessionId) return;

  const session = await findSession(pool, sessionId);
  if (!session || !canView(user, session)) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  return res.status(200).json({ session: publicSession(session), messages: await loadMessages(pool, sessionId) });
}

async function sendMessage(req, res, user) {
  const sessionId = readSessionId(req.body?.sessionId, res);
  if (!sessionId) return;
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Message is empty' });
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Keep messages under ${MAX_TEXT_LENGTH} characters` });
  }

  const session = await findSession(pool, sessionId);
  if (!session || !canView(user, session)) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  // Clients can write while waiting or chatting; agents only once they've claimed it.
  const canWrite =
    user.role === 'client' ? isOpen(session.status) : session.status === 'with_agent' && session.agentId === user.sub;
  if (!canWrite) {
    return res.status(409).json({
      error: session.status === 'closed' ? 'This chat has ended.' : 'Claim this chat before replying.',
    });
  }

  const message = await addMessage(pool, sessionId, user.role, user.sub, text);
  return res.status(201).json({ message: { ...message, senderName: user.fullName } });
}

async function closeChat(req, res, user) {
  const sessionId = readSessionId(req.body?.sessionId, res);
  if (!sessionId) return;

  const session = await findSession(pool, sessionId);
  const isParticipant =
    session && (user.role === 'client' ? session.clientId === user.sub : session.agentId === user.sub);
  if (!isParticipant) {
    return res.status(404).json({ error: 'Chat not found' });
  }

  if (isOpen(session.status)) {
    const closed = await pool.query(
      `UPDATE chat_sessions SET status = 'closed', closed_at = now()
       WHERE id = $1 AND status IN ('escalated', 'with_agent') RETURNING id`,
      [sessionId]
    );
    if (closed.rowCount > 0) {
      await addMessage(pool, sessionId, 'bot', null, `${user.fullName} ended the chat.`);
    }
  }
  return res.status(200).json(await sessionWithMessages(pool, sessionId));
}
