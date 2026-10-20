import { getSessionUser } from '../../server/auth.js';
import { clientAddress } from '../../server/loginLimit.js';
import { getConsents, isConsentPurpose, recordConsent } from '../../server/privacy.js';
import { PRIVACY_NOTICE_VERSION } from '../../shared/privacy.js';

// The logged-in user's own account.
//
// GET  /api/auth/me → { user } — and for clients, { privacy }: which
//                     consents they've given (see server/privacy.js).
// POST /api/auth/me → clients only. Body: { purpose: 'portal' | 'id_face',
//                     given: true | false } — agree to, or withdraw, one
//                     consent. Returns the updated { privacy }.
//
// (Consents live here rather than in their own api/ file to stay under
// Vercel Hobby's 12-function limit.)
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = getSessionUser(req);
  if (!payload) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const user = { id: payload.sub, email: payload.email, fullName: payload.fullName, role: payload.role };

  if (req.method === 'POST') return updateConsent(req, res, user);

  if (user.role !== 'client') return res.status(200).json({ user });

  try {
    const privacy = { version: PRIVACY_NOTICE_VERSION, consents: await getConsents(user.id) };
    return res.status(200).json({ user, privacy });
  } catch (err) {
    // Don't log the client out over this; the dashboard retries.
    console.error('Failed to load consents:', err);
    return res.status(200).json({ user, privacy: null });
  }
}

async function updateConsent(req, res, user) {
  if (user.role !== 'client') {
    return res.status(403).json({ error: 'Only clients give consent here' });
  }

  const { purpose, given } = req.body ?? {};
  if (!isConsentPurpose(purpose) || typeof given !== 'boolean') {
    return res.status(400).json({ error: "Send { purpose: 'portal' | 'id_face', given: true | false }" });
  }

  try {
    await recordConsent(user.id, purpose, given, {
      ip: clientAddress(req),
      userAgent: req.headers?.['user-agent'],
    });
    const privacy = { version: PRIVACY_NOTICE_VERSION, consents: await getConsents(user.id) };
    return res.status(200).json({ privacy });
  } catch (err) {
    console.error('Failed to save consent:', err);
    return res.status(500).json({ error: "Couldn't save your choice. Please try again." });
  }
}
