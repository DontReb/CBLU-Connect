// Calls /api/chat (see api/chat.js for the list of actions). Shared by the
// site-wide chat widget and the agent dashboard. Throws an Error carrying
// the server's message and the HTTP status (err.status) when a call fails.
export async function chatRequest(action, { method = 'GET', query = '', body } = {}) {
  const res = await fetch(`/api/chat?action=${action}${query}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong with the chat.');
    err.status = res.status;
    throw err;
  }
  return data;
}

// Adds messages we don't have yet (matched by id), keeping them in order.
// A slow or repeated check can never duplicate or remove a message.
export function mergeMessagesById(current, incoming) {
  const known = new Set(current.map((m) => m.id));
  const added = incoming.filter((m) => !known.has(m.id));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => a.id - b.id);
}
