import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { usePrivacy } from '../../lib/privacyContext';
import { PrivacyContactDetails } from '../PrivacyNotice';
import { CONSENT_PURPOSES, PRIVACY_NOTICE_VERSION } from '../../../shared/privacy.js';

// The client's consents, with a way to withdraw each one: withdrawing must
// be as easy as agreeing (NPC Circular 2023-04). Withdrawing 'portal'
// brings back the consent screen; withdrawing 'id_face' turns off the
// ID scan and face check.

const WITHDRAW_EFFECTS = {
  portal:
    'You won’t be able to use your client dashboard until you agree again. What you’ve already saved stays with your application until you ask the bank to delete it.',
  id_face:
    'You won’t be able to scan your ID or take the face check; you can still type your details by hand. Results of checks already done stay with your application.',
};

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function statusText(consent) {
  if (consent.current) return `Agreed on ${formatDate(consent.at)}`;
  if (consent.given) return 'Agreed to an older version of the notice';
  if (consent.at) return `Withdrawn on ${formatDate(consent.at)}`;
  return 'Not agreed';
}

function WithdrawDialog({ purpose, saving, error, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus(); // the safe choice has focus when it opens
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="withdraw-title"
      aria-describedby="withdraw-desc"
    >
      <div className="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-xl">
        <h2 id="withdraw-title" className="text-lg font-semibold text-ink">
          Withdraw consent?
        </h2>
        <p className="mt-1 text-sm font-medium text-ink">{CONSENT_PURPOSES[purpose].title}</p>
        <p id="withdraw-desc" className="mt-2 text-sm text-ink">
          {WITHDRAW_EFFECTS[purpose]}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={saving} className="px-4 py-2 text-sm">
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-full bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {saving ? 'Withdrawing…' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientPrivacy() {
  const { consents, setConsent } = usePrivacy();
  const [withdrawing, setWithdrawing] = useState(null); // purpose being withdrawn
  const [saving, setSaving] = useState(null); // purpose being saved
  const [error, setError] = useState({ purpose: null, message: '' });

  // The layout only shows this page once 'portal' is agreed, so consents is loaded.
  async function change(purpose, given) {
    setSaving(purpose);
    setError({ purpose: null, message: '' });
    try {
      await setConsent(purpose, given);
      setWithdrawing(null);
    } catch (err) {
      setError({ purpose, message: err.message });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Privacy</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What you’ve agreed to, and how to change it.{' '}
        <Link to="/privacy" target="_blank" rel="noopener" className="font-medium text-accent-dark underline">
          Read the Privacy Notice
        </Link>{' '}
        (version {PRIVACY_NOTICE_VERSION}).
      </p>

      <ul className="mt-6 space-y-4">
        {Object.entries(CONSENT_PURPOSES).map(([purpose, { title, statement }]) => {
          const consent = consents[purpose];
          return (
            <li key={purpose} className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    consent.current ? 'bg-accent-light/50 text-ink' : 'bg-paper text-ink-soft'
                  }`}
                >
                  {statusText(consent)}
                </span>
              </div>
              <p className="mt-2 text-sm text-ink-soft">{statement}</p>
              {purpose === 'portal' && (
                <p className="mt-2 text-xs text-ink-soft">Needed to use the client portal.</p>
              )}
              {purpose === 'id_face' && (
                <p className="mt-2 text-xs text-ink-soft">Optional: you can type your details by hand instead.</p>
              )}
              <div className="mt-3">
                {consent.current ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setError({ purpose: null, message: '' });
                      setWithdrawing(purpose);
                    }}
                    className="px-4 py-2 text-sm"
                  >
                    Withdraw consent
                  </Button>
                ) : (
                  <Button type="button" onClick={() => change(purpose, true)} disabled={saving === purpose} className="px-4 py-2 text-sm">
                    {saving === purpose ? 'Saving…' : 'I agree'}
                  </Button>
                )}
              </div>
              {!withdrawing && error.purpose === purpose && (
                <p role="alert" className="mt-2 text-sm text-red-700">
                  {error.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm" aria-labelledby="rights-heading">
        <h2 id="rights-heading" className="text-base font-semibold text-ink">
          Your rights
        </h2>
        <p className="mt-2 text-sm text-ink">
          You can ask to see a copy of your information, correct it, have it deleted or blocked, or get it in an
          electronic file. Contact our Data Protection Officer:
        </p>
        <div className="mt-3 text-sm text-ink">
          <PrivacyContactDetails />
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          You can also file a complaint with the National Privacy Commission (privacy.gov.ph).
        </p>
      </section>

      {withdrawing && (
        <WithdrawDialog
          purpose={withdrawing}
          saving={saving === withdrawing}
          error={error.purpose === withdrawing ? error.message : ''}
          onConfirm={() => change(withdrawing, false)}
          onCancel={() => setWithdrawing(null)}
        />
      )}
    </div>
  );
}
