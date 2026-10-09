import { useState } from 'react';
import Button from '../../components/ui/Button';
import { useAdminData } from '../../lib/adminDataContext';

// The requirements checklist: the documents clients bring with their
// printed loan application. Clients see this list, tick what they have, and
// it prints as the last page of their form.

const EMPTY_FORM = { label: '', description: '', isRequired: true };
const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-panel px-3.5 py-2 text-sm text-ink focus:border-accent focus:outline-none';

function ItemForm({ idPrefix, initial, submitLabel, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit({ label: form.label.trim(), description: form.description.trim(), isRequired: form.isRequired });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor={`${idPrefix}-label`}>
          Document
        </label>
        <input
          id={`${idPrefix}-label`}
          value={form.label}
          maxLength={150}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="e.g. Proof of income"
          className={INPUT_CLASS}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink" htmlFor={`${idPrefix}-description`}>
          Details for the client
        </label>
        <textarea
          id={`${idPrefix}-description`}
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Latest ITR, or payslips for the past 2 months"
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={form.isRequired}
          onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
          className="h-4 w-4 accent-[var(--color-accent-dark)]"
        />
        Required for every applicant (untick for "if applicable")
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" className="px-4 py-2 text-sm" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        <Button type="button" variant="ghost" className="px-4 py-2 text-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ItemRow({ item, onUpdate, onDelete }) {
  const [mode, setMode] = useState('view'); // view | edit | confirmDelete
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await onDelete(item.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (mode === 'edit') {
    return (
      <li className="rounded-2xl border border-accent/50 bg-panel p-5 shadow-sm">
        <ItemForm
          idPrefix={`edit-${item.id}`}
          initial={{ label: item.label, description: item.description ?? '', isRequired: item.isRequired }}
          submitLabel="Save changes"
          onSubmit={async (values) => {
            await onUpdate(item.id, values);
            setMode('view');
          }}
          onCancel={() => setMode('view')}
        />
      </li>
    );
  }

  return (
    <li className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-ink">{item.label}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.isRequired ? 'bg-highlight/50 text-ink' : 'bg-line/60 text-ink-soft'
              }`}
            >
              {item.isRequired ? 'Required' : 'If applicable'}
            </span>
          </div>
          {item.description && <p className="mt-0.5 text-sm text-ink-soft">{item.description}</p>}
        </div>
        {mode === 'view' && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-ink"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('confirmDelete')}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink hover:border-red-700 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        )}
      </div>
      {mode === 'confirmDelete' && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm">
          <span className="min-w-0 flex-1 text-red-800">
            Remove "{item.label}"? Clients' ticks on it are removed too.
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="rounded-full bg-red-700 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {busy ? 'Removing…' : 'Remove'}
          </button>
          <button
            type="button"
            onClick={() => setMode('view')}
            disabled={busy}
            className="text-xs font-medium text-ink-soft hover:text-ink"
          >
            Keep it
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </li>
  );
}

export default function AdminRequirements() {
  const { checklist, checklistItems, checklistStatus, addChecklistItem, updateChecklistItem, deleteChecklistItem } =
    useAdminData();
  const [adding, setAdding] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Requirements</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {checklist?.name ?? 'Requirements checklist'} — clients tick what they have, and it prints with
            their application form.
          </p>
        </div>
        {!adding && checklistStatus === 'ready' && checklist && (
          <Button type="button" variant="ghost" onClick={() => setAdding(true)} className="px-4 py-2 text-sm">
            Add document
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-4 rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <ItemForm
            idPrefix="new-item"
            initial={EMPTY_FORM}
            submitLabel="Add document"
            onSubmit={async (values) => {
              await addChecklistItem(values);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}

      {checklistStatus === 'error' && (
        <p className="mt-6 rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
          Couldn't load the checklist. Try refreshing the page.
        </p>
      )}

      {checklistStatus === 'loading' && <p className="mt-6 text-sm text-ink-soft">Loading the checklist…</p>}

      {checklistStatus === 'ready' && !checklist && (
        <p className="mt-6 text-sm text-ink-soft">There is no active checklist. Run db/seed.sql to create one.</p>
      )}

      {checklistStatus === 'ready' && checklist && (
        <ul className="mt-6 space-y-3">
          {checklistItems.map((item) => (
            <ItemRow key={item.id} item={item} onUpdate={updateChecklistItem} onDelete={deleteChecklistItem} />
          ))}
        </ul>
      )}
    </div>
  );
}
