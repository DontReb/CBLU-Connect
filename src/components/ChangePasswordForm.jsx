import { useId, useState } from 'react';
import Button from './ui/Button';
import { PASSWORD_HINT, passwordProblem } from '../../shared/account.js';

// Current password + new password (twice). Sends PUT /api/auth/me; the
// server checks everything again. Used on the Profile page and on the
// "choose your own password" screen after a temporary password.
//
// onChanged(user, passwordChangedAt) runs after a successful change.

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none aria-[invalid=true]:border-red-600';

export default function ChangePasswordForm({ email, currentLabel = 'Current password', submitLabel = 'Change password', onChanged }) {
  const id = useId();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState({ field: '', message: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!current) return setError({ field: 'currentPassword', message: `Enter your ${currentLabel.toLowerCase()}.` });
    const problem = passwordProblem(next, email);
    if (problem) return setError({ field: 'newPassword', message: problem });
    if (next === current) {
      return setError({ field: 'newPassword', message: 'Choose a password different from your current one.' });
    }
    if (confirm !== next) return setError({ field: 'confirm', message: "The two new passwords don't match." });

    setSaving(true);
    setError({ field: '', message: '' });
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ field: data.field ?? '', message: data.error || "Couldn't change your password. Please try again." });
        if (data.field === 'currentPassword' || res.status === 429) setCurrent('');
        return;
      }
      setCurrent('');
      setNext('');
      setConfirm('');
      setShow(false);
      onChanged?.(data.user, data.passwordChangedAt);
    } catch {
      setError({ field: '', message: 'Could not reach the server. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  const type = show ? 'text' : 'password';
  const errorId = `${id}-error`;
  const invalid = (field) => (error.field === field ? 'true' : undefined);
  const describedBy = (field, extra) =>
    [extra, error.field === field ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-current`} className="mb-1 block text-sm font-medium text-ink">
          {currentLabel}
        </label>
        <input
          id={`${id}-current`}
          type={type}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          aria-invalid={invalid('currentPassword')}
          aria-describedby={describedBy('currentPassword')}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor={`${id}-new`} className="mb-1 block text-sm font-medium text-ink">
          New password
        </label>
        <input
          id={`${id}-new`}
          type={type}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          maxLength={72}
          aria-invalid={invalid('newPassword')}
          aria-describedby={describedBy('newPassword', `${id}-hint`)}
          className={INPUT_CLASS}
        />
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-soft">
          {PASSWORD_HINT}
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-confirm`} className="mb-1 block text-sm font-medium text-ink">
          Type the new password again
        </label>
        <input
          id={`${id}-confirm`}
          type={type}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          maxLength={72}
          aria-invalid={invalid('confirm')}
          aria-describedby={describedBy('confirm')}
          className={INPUT_CLASS}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-accent-dark)]"
        />
        Show passwords
      </label>

      {error.message && (
        <p id={errorId} role="alert" className="text-sm text-red-700">
          {error.message}
        </p>
      )}

      <Button type="submit" disabled={saving} className="px-5 py-2.5">
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}
