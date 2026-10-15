import { useState } from 'react';
import Button from '../../components/ui/Button';
import { useAdminData } from '../../lib/adminDataContext';

// Admins create client accounts (there's no public sign-up: the bank
// decides who gets one). Leave the password empty to get a generated one,
// shown here ONCE so the admin can hand it to the client.

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none';

const EMPTY = { fullName: '', email: '', phoneNumber: '', branch: '', accountNumber: '', password: '' };

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

// The login details to give the client, after the account is made.
function CreatedNotice({ created, onDone, onAddAnother }) {
  const [copied, setCopied] = useState(false);
  const details = `Email: ${created.client.email}${created.password ? `\nTemporary password: ${created.password}` : ''}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div role="status" className="rounded-2xl border border-accent/40 bg-accent-light/25 p-5">
      <p className="font-semibold text-ink">Account created for {created.client.fullName}.</p>
      <p className="mt-1 text-sm text-ink">Give the client these login details:</p>
      <dl className="mt-3 grid gap-x-4 gap-y-1 rounded-xl bg-panel px-4 py-3 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-soft">Email</dt>
        <dd className="font-medium text-ink">{created.client.email}</dd>
        <dt className="text-ink-soft">Password</dt>
        <dd className="font-mono font-medium text-ink">
          {created.password ?? <span className="font-sans font-normal text-ink-soft">the one you typed</span>}
        </dd>
      </dl>
      {created.password && (
        <p className="mt-2 text-xs text-ink-soft">
          This password is shown only now; the system keeps it scrambled and can't show it again.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="ghost" onClick={copy} className="px-4 py-2 text-sm">
          {copied ? 'Copied' : 'Copy login details'}
        </Button>
        <Button type="button" variant="ghost" onClick={onAddAnother} className="px-4 py-2 text-sm">
          Add another
        </Button>
        <Button type="button" onClick={onDone} className="px-4 py-2 text-sm">
          Done
        </Button>
      </div>
    </div>
  );
}

export default function AddClientForm({ onClose }) {
  const { addClient } = useAdminData();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { client, password }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      setCreated(await addClient(form));
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return <CreatedNotice created={created} onDone={onClose} onAddAnother={() => setCreated(null)} />;
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-panel p-5 shadow-sm" aria-labelledby="add-client-title">
      <h2 id="add-client-title" className="text-lg font-semibold text-ink">
        Add a client
      </h2>
      <p className="mt-1 text-sm text-ink-soft">The client logs in with this email and password.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="new-client-name" label="Full name *">
          <input id="new-client-name" value={form.fullName} onChange={set('fullName')} maxLength={255} required className={INPUT_CLASS} placeholder="Juan Dela Cruz" />
        </Field>
        <Field id="new-client-email" label="Email *">
          <input id="new-client-email" type="email" value={form.email} onChange={set('email')} maxLength={255} required className={INPUT_CLASS} placeholder="juan@example.com" />
        </Field>
        <Field id="new-client-phone" label="Mobile number">
          <input id="new-client-phone" type="tel" value={form.phoneNumber} onChange={set('phoneNumber')} maxLength={20} className={INPUT_CLASS} placeholder="0917 123 4567" />
        </Field>
        <Field id="new-client-branch" label="Branch">
          <input id="new-client-branch" value={form.branch} onChange={set('branch')} maxLength={100} className={INPUT_CLASS} placeholder="CBLU Main Branch — Dagupan" />
        </Field>
        <Field id="new-client-account" label="Account number" hint="If they already have one with the bank.">
          <input id="new-client-account" value={form.accountNumber} onChange={set('accountNumber')} maxLength={50} className={INPUT_CLASS} />
        </Field>
        <Field id="new-client-password" label="Password" hint="Leave empty to generate one. At least 8 characters if you type one.">
          <input id="new-client-password" type="text" value={form.password} onChange={set('password')} minLength={8} maxLength={100} autoComplete="new-password" className={INPUT_CLASS} />
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="px-5 py-2 text-sm">
          {saving ? 'Creating…' : 'Create account'}
        </Button>
      </div>
    </form>
  );
}
