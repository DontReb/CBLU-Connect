import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import { useAuth } from '../../lib/authContext';
import { PHONE_MESSAGE, PHONE_PATTERN } from '../../../shared/account.js';

// The client's own account: details from the bank (users + client_profiles),
// whether a face check has verified their identity, and their password.
// Clients can change their mobile number and password here; name, email,
// branch and account number are the bank's to change.

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
}

function Card({ title, children, labelledBy }) {
  return (
    <section aria-labelledby={labelledBy} className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
      <h2 id={labelledBy} className="text-base font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid gap-0.5 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

const NOT_ON_FILE = <span className="font-normal text-ink-soft">Not on file</span>;

function MobileNumber({ value, onSaved }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function start() {
    setDraft(value ?? '');
    setError('');
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    const phoneNumber = draft.trim();
    if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) return setError(PHONE_MESSAGE);
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save your mobile number. Please try again.");
      onSaved(data.profile);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{value || NOT_ON_FILE}</span>
        <button type="button" onClick={start} className="text-sm font-medium text-accent-dark underline">
          {value ? 'Change' : 'Add'}
          <span className="sr-only"> mobile number</span>
        </button>
      </span>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2">
      <label htmlFor={`${id}-phone`} className="sr-only">
        Mobile number
      </label>
      <input
        id={`${id}-phone`}
        type="tel"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        maxLength={20}
        autoComplete="tel"
        placeholder="0917 123 4567"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full max-w-xs rounded-xl border border-line bg-panel px-3.5 py-2 text-sm font-normal text-ink focus:border-accent focus:outline-none"
        autoFocus
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-normal text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="px-4 py-2 text-sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving} className="px-4 py-2 text-sm">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ClientProfile() {
  const { user, login } = useAuth();
  const [state, setState] = useState({ status: 'loading', profile: null });
  const [passwordNote, setPasswordNote] = useState('');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.profile) throw new Error();
        if (!ignore) setState({ status: 'ready', profile: data.profile });
      } catch {
        if (!ignore) setState({ status: 'error', profile: null });
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const { status, profile } = state;
  const setProfile = (next) => setState({ status: 'ready', profile: next });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-ink-soft">Your account with Cooperative Bank of La Union.</p>
      </div>

      {status === 'loading' && <p className="text-sm text-ink-soft">Loading your profile…</p>}
      {status === 'error' && (
        <p role="alert" className="rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn’t load your profile. Try refreshing the page.
        </p>
      )}

      {status === 'ready' && (
        <>
          <Card title="Your details" labelledBy="details-heading">
            <dl className="mt-1 divide-y divide-line">
              <Row label="Full name">{profile.fullName}</Row>
              <Row label="Email">{profile.email}</Row>
              <Row label="Mobile number">
                <MobileNumber value={profile.phoneNumber} onSaved={setProfile} />
              </Row>
              <Row label="Branch">{profile.branch || NOT_ON_FILE}</Row>
              <Row label="Account number">{profile.accountNumber || NOT_ON_FILE}</Row>
              <Row label="Client since">{formatDate(profile.memberSince)}</Row>
            </dl>
            <p className="mt-2 text-xs text-ink-soft">
              To change your name, email, branch or account number, please contact your branch.
            </p>
          </Card>

          <Card title="Identity" labelledBy="identity-heading">
            {profile.identityVerifiedAt ? (
              <p className="mt-2 text-sm text-ink">
                <span className="font-medium text-accent-dark">Verified</span> by a face check on{' '}
                {formatDate(profile.identityVerifiedAt)}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink">
                Not verified yet.{' '}
                <Link to="/dashboard/client/loan-application" className="font-medium text-accent-dark underline">
                  Scan a valid ID
                </Link>{' '}
                to verify it with a face check, or bring your ID to the branch.
              </p>
            )}
          </Card>

          <Card title="Password" labelledBy="password-heading">
            <p className="mt-1 text-sm text-ink-soft">
              {profile.passwordChangedAt
                ? `Last changed ${formatDate(profile.passwordChangedAt)}.`
                : 'You haven’t changed your password yet.'}
            </p>
            {passwordNote && (
              <p role="status" className="mt-3 rounded-xl bg-accent-light/40 px-4 py-3 text-sm text-ink">
                {passwordNote}
              </p>
            )}
            <div className="mt-4">
              <ChangePasswordForm
                email={user.email}
                onChanged={(updated, changedAt) => {
                  login(updated);
                  setProfile({ ...profile, passwordChangedAt: changedAt });
                  setPasswordNote('Password changed. Any other devices logged in to your account will be logged out.');
                }}
              />
            </div>
          </Card>

          <p className="text-sm text-ink-soft">
            Your privacy choices are on the{' '}
            <Link to="/dashboard/client/privacy" className="font-medium text-accent-dark underline">
              Privacy page
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
