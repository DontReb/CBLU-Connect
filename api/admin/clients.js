import crypto from 'crypto';
import { pool } from '../../server/db.js';
import { requireRole, hashPassword } from '../../server/auth.js';
import { LOAN_FORM_CODE } from '../../server/loanForm.js';
import { MAX_FAILED_TRIES } from '../../server/identity.js';
import { getConsents } from '../../server/privacy.js';
import { passwordProblem, PHONE_PATTERN, PHONE_MESSAGE } from '../../shared/account.js';

// GET  /api/admin/clients          → every client with their progress
// GET /api/admin/clients?id=<id>  → one client: which requirements they've
//                                   ticked, how far their loan application
//                                   is, their recent face checks, and
//                                   their privacy consents
// POST /api/admin/clients          → create a client account (the bank
//                                   creates accounts; there's no public
//                                   sign-up). Body: { fullName, email,
//                                   phoneNumber?, branch?, accountNumber?,
//                                   password? } — leave password out to get
//                                   a generated one, returned ONCE. Either
//                                   way the client must choose their own
//                                   password at their first login.
// PATCH /api/admin/clients?id=<id> → { action: 'reset-password' }: a new
//                                   temporary password, returned ONCE. Logs
//                                   the client out everywhere, lifts any
//                                   login pause, and makes them choose their
//                                   own password at their next login.
//
// Progress counts the items on the ACTIVE requirements checklist that the
// client has ticked. Clients only tick what they have — nothing is
// uploaded — so this shows readiness, not verified documents.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireRole(req, res, 'admin');
  if (!admin) return;

  if (req.method === 'POST') return createClient(req, res);
  if (req.method === 'PATCH') return resetPassword(req, res);

  try {
    if (req.query?.id) return await getClient(res, String(req.query.id));
    return await listClients(res);
  } catch (err) {
    console.error('Failed to load clients:', err);
    return res.status(500).json({ error: 'Failed to load clients' });
  }
}

const CLIENT_QUERY = `
  WITH active_items AS (
    SELECT ci.id, ci.is_required
    FROM checklist_items ci
    JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
  ),
  loan_form AS (
    SELECT id FROM form_templates WHERE code = $1
  )
  SELECT
    u.id,
    u.full_name AS "fullName",
    u.email,
    cp.branch,
    cp.verification_status AS "verificationStatus",
    (SELECT COUNT(*) FROM client_checklist_marks m
       JOIN active_items ai ON ai.id = m.checklist_item_id
       WHERE m.client_id = u.id)::int AS "checkedCount",
    (SELECT COUNT(*) FROM active_items)::int AS "totalCount",
    (SELECT COUNT(*) FROM active_items ai
       WHERE ai.is_required AND NOT EXISTS (
         SELECT 1 FROM client_checklist_marks m WHERE m.client_id = u.id AND m.checklist_item_id = ai.id
       ))::int AS "requiredMissing",
    fs.updated_at AS "applicationUpdatedAt",
    fs.last_id_type AS "lastIdType",
    fs.last_scan_at AS "lastScanAt",
    (SELECT COUNT(*) FROM form_submission_values v
       WHERE v.submission_id = fs.id AND COALESCE(v.value, '') <> '')::int AS "filledCount",
    (SELECT COUNT(*) FROM form_template_fields f
       WHERE f.template_id = (SELECT id FROM loan_form) AND f.is_required)::int AS "requiredFieldCount",
    (SELECT COUNT(*) FROM form_submission_values v
       JOIN form_template_fields f ON f.id = v.field_id AND f.is_required
       WHERE v.submission_id = fs.id AND COALESCE(v.value, '') <> '')::int AS "requiredFilledCount",
    (SELECT max(ic.created_at) FROM identity_checks ic
       WHERE ic.client_id = u.id AND ic.passed) AS "identityVerifiedAt",
    (SELECT COUNT(*) FROM identity_checks ic
       WHERE ic.client_id = u.id AND NOT ic.passed
         AND ic.created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Manila') AT TIME ZONE 'Asia/Manila')
    )::int AS "identityFailedToday",
    (SELECT COUNT(*) FROM identity_checks ic WHERE ic.client_id = u.id)::int AS "identityCheckCount"
  FROM users u
  LEFT JOIN client_profiles cp ON cp.user_id = u.id
  LEFT JOIN form_submissions fs ON fs.client_id = u.id AND fs.template_id = (SELECT id FROM loan_form)
  WHERE u.role = 'client'
`;

function toClient(row) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    branch: row.branch,
    verificationStatus: row.verificationStatus,
    checklist: {
      checked: row.checkedCount,
      total: row.totalCount,
      requiredMissing: row.requiredMissing,
    },
    application: row.applicationUpdatedAt
      ? {
          updatedAt: row.applicationUpdatedAt,
          lastIdType: row.lastIdType,
          lastScanAt: row.lastScanAt,
          filledCount: row.filledCount,
          requiredFilled: row.requiredFilledCount,
          requiredTotal: row.requiredFieldCount,
        }
      : null,
    identity: {
      verifiedAt: row.identityVerifiedAt,
      failedToday: row.identityFailedToday,
      locked: row.identityFailedToday >= MAX_FAILED_TRIES,
      checkCount: row.identityCheckCount,
    },
  };
}

async function listClients(res) {
  const result = await pool.query(`${CLIENT_QUERY} ORDER BY u.full_name`, [LOAN_FORM_CODE]);
  return res.status(200).json({ clients: result.rows.map(toClient) });
}

async function getClient(res, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid client id' });

  const result = await pool.query(`${CLIENT_QUERY} AND u.id = $2`, [LOAN_FORM_CODE, id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Client not found' });

  const items = await pool.query(
    `SELECT ci.id, ci.label, ci.is_required AS "isRequired", m.marked_at AS "checkedAt"
     FROM checklist_items ci
     JOIN requirement_checklists rc ON rc.id = ci.checklist_id AND rc.is_active
     LEFT JOIN client_checklist_marks m ON m.checklist_item_id = ci.id AND m.client_id = $1
     ORDER BY ci.display_order, ci.id`,
    [id]
  );

  // The 10 latest face checks: results and scores only (no pictures are kept).
  const checks = await pool.query(
    `SELECT created_at AS "at", id_type AS "idType", passed, face_verified AS "faceVerified", live,
            failure_reason AS "reason", match_score AS "matchScore", real_face_score AS "realFaceScore",
            flash_matches AS "flashMatches", flash_total AS "flashTotal",
            capture_ms AS "captureMs", processing_ms AS "processingMs"
     FROM identity_checks WHERE client_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [id]
  );

  return res.status(200).json({
    client: {
      ...toClient(result.rows[0]),
      consents: await getConsents(id),
      identityChecks: checks.rows,
      items: items.rows.map((row) => ({
        id: row.id,
        label: row.label,
        isRequired: row.isRequired,
        checked: row.checkedAt !== null,
        checkedAt: row.checkedAt,
      })),
    },
  });
}

// --- creating a client account ----------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Easy to read aloud or type from a printout: no 0/O, 1/l/I.
const PASSWORD_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword() {
  const group = () => Array.from({ length: 4 }, () => PASSWORD_LETTERS[crypto.randomInt(PASSWORD_LETTERS.length)]).join('');
  return `${group()}-${group()}-${group()}`; // e.g. Kp7m-Qx3t-Rw9z
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function createClient(req, res) {
  const fullName = text(req.body?.fullName, 255);
  const email = text(req.body?.email, 255).toLowerCase();
  const phoneNumber = text(req.body?.phoneNumber, 20);
  const branch = text(req.body?.branch, 100);
  const accountNumber = text(req.body?.accountNumber, 50);
  const typedPassword = typeof req.body?.password === 'string' ? req.body.password : '';

  if (fullName.length < 2) return res.status(400).json({ error: "Enter the client's full name." });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
    return res.status(400).json({ error: PHONE_MESSAGE });
  }
  const problem = typedPassword ? passwordProblem(typedPassword, email) : '';
  if (problem) return res.status(400).json({ error: `Password: ${problem}` });
  const password = typedPassword || generatePassword();

  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const user = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, phone_number, must_change_password)
       VALUES ($1, $2, $3, 'client', $4, TRUE)
       RETURNING id`,
      [email, await hashPassword(password), fullName, phoneNumber || null]
    );
    const id = user.rows[0].id;
    await db.query(
      `INSERT INTO client_profiles (user_id, account_number, branch)
       VALUES ($1, $2, $3)`,
      [id, accountNumber || null, branch || null]
    );
    await db.query('COMMIT');

    const result = await pool.query(`${CLIENT_QUERY} AND u.id = $2`, [LOAN_FORM_CODE, id]);
    return res.status(201).json({
      client: toClient(result.rows[0]),
      // Only sent now, never again: the database keeps just its hash.
      password: typedPassword ? null : password,
    });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    if (err?.code === '23505') {
      const field = /account_number/.test(err.constraint ?? err.detail ?? '') ? 'account number' : 'email';
      return res.status(409).json({ error: `Another account already uses this ${field}.` });
    }
    console.error('Failed to create client:', err);
    return res.status(500).json({ error: 'Failed to create the account' });
  } finally {
    if (db) db.release();
  }
}

// --- resetting a client's password ------------------------------------------------

async function resetPassword(req, res) {
  const id = String(req.query?.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'Invalid client id' });
  if (req.body?.action !== 'reset-password') {
    return res.status(400).json({ error: "Send { action: 'reset-password' }" });
  }

  const password = generatePassword();
  let db;
  try {
    db = await pool.connect();
    await db.query('BEGIN');
    const updated = await db.query(
      `UPDATE users
       SET password_hash = $2, must_change_password = TRUE, password_changed_at = $3
       WHERE id = $1 AND role = 'client'
       RETURNING email`,
      [id, await hashPassword(password), new Date()]
    );
    if (updated.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Client not found' });
    }
    // Lift any login pause, so the client can log in with the new password now.
    await db.query('DELETE FROM login_attempts WHERE email = $1 AND NOT succeeded', [updated.rows[0].email]);
    await db.query('COMMIT');
    // Only sent now, never again: the database keeps just its hash.
    return res.status(200).json({ password });
  } catch (err) {
    if (db) await db.query('ROLLBACK').catch(() => {});
    console.error('Failed to reset password:', err);
    return res.status(500).json({ error: 'Failed to reset the password' });
  } finally {
    if (db) db.release();
  }
}
