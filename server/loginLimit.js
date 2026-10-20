// Limits wrong-password tries so nobody can guess a password by trying
// thousands of them. Every login try is written to login_attempts, and two
// rules are checked BEFORE the password is:
//
//   1. Per account: 5 wrong passwords within 15 minutes pause logins to that
//      email for 15 minutes after the last wrong try. A successful login
//      starts the count again.
//   2. Per device (IP address): 20 wrong passwords within 15 minutes, across
//      any emails, pause logins from that address the same way. This stops
//      one person trying a common password on many accounts. It is higher
//      than the account limit because a branch or office may share one
//      address.
//
// While paused, the password isn't even checked, so a correct guess during
// the pause doesn't help. Tries are recorded for emails that don't exist
// too, so the replies never reveal which emails have accounts.

export const LOGIN_LIMITS = {
  maxFailuresPerAccount: 5,
  maxFailuresPerAddress: 20,
  windowMinutes: 15,
  pauseMinutes: 15,
  keepDays: 30, // how long rows stay in login_attempts
};

// Vercel sets x-forwarded-for itself (and replaces any value the browser
// sends), so its first entry is the visitor's real address there.
export function clientAddress(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return (first || req.headers?.['x-real-ip'] || req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

// Lets only one login for the same email (and the same address) run at a
// time, so firing many tries at once can't slip past the count. Call inside
// a transaction; the locks are released when it ends. Email first, then
// address, always in that order, so two logins can't wait on each other.
export async function lockLoginKeys(client, email, address) {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`login-email:${email}`]);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`login-ip:${address}`]);
}

function secondsUntil(date) {
  return Math.max(1, Math.ceil((new Date(date).getTime() - Date.now()) / 1000));
}

// How things stand for this email and address right now.
// Returns { locked, scope, retryAfterSeconds, failuresLeft }.
export async function loginStatus(client, email, address) {
  const { windowMinutes, pauseMinutes, maxFailuresPerAccount, maxFailuresPerAddress } = LOGIN_LIMITS;

  const { rows } = await client.query(
    `WITH last_success AS (
       SELECT max(created_at) AS at FROM login_attempts WHERE email = $1 AND succeeded
     )
     SELECT
       (SELECT count(*)::int FROM login_attempts
         WHERE email = $1 AND NOT succeeded
           AND created_at > now() - make_interval(mins => $3)
           AND created_at > coalesce((SELECT at FROM last_success), '-infinity')) AS account_failures,
       (SELECT max(created_at) FROM login_attempts
         WHERE email = $1 AND NOT succeeded
           AND created_at > coalesce((SELECT at FROM last_success), '-infinity')) AS account_last_failure,
       (SELECT count(*)::int FROM login_attempts
         WHERE ip = $2 AND NOT succeeded
           AND created_at > now() - make_interval(mins => $3)) AS address_failures,
       (SELECT max(created_at) FROM login_attempts
         WHERE ip = $2 AND NOT succeeded) AS address_last_failure`,
    [email, address, windowMinutes]
  );
  const row = rows[0];
  const pauseMs = pauseMinutes * 60 * 1000;

  if (row.account_failures >= maxFailuresPerAccount) {
    const until = new Date(new Date(row.account_last_failure).getTime() + pauseMs);
    if (until > new Date()) return { locked: true, scope: 'account', retryAfterSeconds: secondsUntil(until) };
  }
  if (row.address_failures >= maxFailuresPerAddress) {
    const until = new Date(new Date(row.address_last_failure).getTime() + pauseMs);
    if (until > new Date()) return { locked: true, scope: 'address', retryAfterSeconds: secondsUntil(until) };
  }
  return {
    locked: false,
    failuresLeft: Math.min(
      maxFailuresPerAccount - row.account_failures,
      maxFailuresPerAddress - row.address_failures
    ),
  };
}

export async function recordLoginAttempt(client, { email, address, userId = null, succeeded }) {
  await client.query(
    'INSERT INTO login_attempts (email, ip, user_id, succeeded) VALUES ($1, $2, $3, $4)',
    [email, address, userId, succeeded]
  );
}

// Old rows aren't needed for the limit; keep the table small.
export async function forgetOldAttempts(client) {
  await client.query('DELETE FROM login_attempts WHERE created_at < now() - make_interval(days => $1)', [
    LOGIN_LIMITS.keepDays,
  ]);
}

export function lockedMessage(status) {
  const minutes = Math.ceil(status.retryAfterSeconds / 60);
  const wait = `${minutes} minute${minutes === 1 ? '' : 's'}`;
  if (status.scope === 'address') {
    return `Too many failed logins from this device. Please try again in ${wait}.`;
  }
  return `Too many wrong passwords. For your security, logging in to this account is paused. Please try again in ${wait}, or contact your branch if you've forgotten your password.`;
}

// " 2 more wrong tries will pause…" when few tries are left, else ''.
export function triesLeftWarning(failuresLeft) {
  if (failuresLeft > 2) return '';
  const tries = `${failuresLeft} more wrong ${failuresLeft === 1 ? 'try' : 'tries'}`;
  return ` ${tries} will pause logging in for ${LOGIN_LIMITS.pauseMinutes} minutes.`;
}

export function wrongPasswordMessage(failuresLeft) {
  return `Invalid email or password.${triesLeftWarning(failuresLeft)}`;
}
