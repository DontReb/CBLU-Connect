import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { usePrivacy } from '../../lib/privacyContext';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION } from '../../../shared/privacy.js';

// Shown instead of the client dashboard until the client agrees to the
// current Privacy Notice (ClientDashboardLayout decides). A short summary
// here, the full notice one click away (a "layered" notice), and an
// explicit tick + button: consent is never assumed.

const SUMMARY = [
  'We use your details, including sensitive ones like your age, civil status and TIN, only to prepare and process your loan application.',
  'The ID scan and face check are optional and asked separately. Your ID photo and face pictures are never saved.',
  'Bank staff see only what their role needs. Our hosting and database providers store the data for us.',
  'We don’t sell your information or use it for advertising.',
  'You can withdraw your consent at any time on the Privacy page, and ask to see, correct or delete your information.',
];

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PrivacyConsent({ onLogout }) {
  const { consents, status, reload, setConsent } = usePrivacy();
  const [ticked, setTicked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return <p className="mx-auto max-w-2xl text-sm text-ink-soft">Loading…</p>;
  }
  if (status === 'error') {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-panel p-6 text-sm">
        <p role="alert" className="text-red-700">
          Couldn’t load your privacy settings.
        </p>
        <Button type="button" variant="ghost" onClick={reload} className="mt-3 px-4 py-2 text-sm">
          Try again
        </Button>
      </div>
    );
  }

  const portal = consents.portal;
  let reason = null;
  if (portal.given && portal.version !== PRIVACY_NOTICE_VERSION) {
    reason = 'We’ve updated our Privacy Notice. Please read it and agree again to keep using the portal.';
  } else if (!portal.given && portal.at) {
    reason = `You withdrew your consent on ${formatDate(portal.at)}. To use the portal again, agree below.`;
  }

  async function agree(e) {
    e.preventDefault();
    if (!ticked || saving) return;
    setSaving(true);
    setError('');
    try {
      await setConsent('portal', true);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Your privacy</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Before you continue, please read how Cooperative Bank of La Union uses your information.
      </p>

      {reason && (
        <p role="status" className="mt-4 rounded-xl bg-highlight/40 px-4 py-3 text-sm text-ink">
          {reason}
        </p>
      )}

      <form onSubmit={agree} className="mt-5 rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-ink">In short</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-ink">
          {SUMMARY.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link to="/privacy" target="_blank" rel="noopener" className="font-medium text-accent-dark underline">
            Read the full Privacy Notice
          </Link>{' '}
          <span className="text-ink-soft">(opens in a new tab · version {PRIVACY_NOTICE_VERSION})</span>
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper p-4 text-sm text-ink">
          <input
            type="checkbox"
            checked={ticked}
            onChange={(e) => setTicked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent-dark)]"
          />
          <span>{CONSENT_PURPOSES.portal.statement}</span>
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!ticked || saving} className="px-5 py-2.5">
            {saving ? 'Saving…' : 'Agree and continue'}
          </Button>
          <Button type="button" variant="ghost" onClick={onLogout} disabled={saving} className="px-5 py-2.5">
            Not now, log out
          </Button>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          If you don’t agree, you can still apply in person at any CBLU branch.
        </p>
      </form>
    </div>
  );
}
