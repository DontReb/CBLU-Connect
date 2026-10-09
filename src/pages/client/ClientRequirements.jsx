import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChecklist } from '../../lib/checklistContext';

// The documents to bring with the printed application. Ticking an item only
// records that the client has it ready — nothing is uploaded. The same list
// prints as the last page of the application.
function RequirementRow({ item, onToggle }) {
  const id = `requirement-${item.id}`;
  return (
    <li>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-colors sm:p-5 ${
          item.checked ? 'border-accent/60 bg-accent-light/20' : 'border-line bg-panel hover:border-ink/40'
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-accent-dark)]"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`font-medium ${item.checked ? 'text-ink-soft line-through decoration-ink-soft/40' : 'text-ink'}`}>
              {item.label}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                item.isRequired ? 'bg-highlight/50 text-ink' : 'bg-line/60 text-ink-soft'
              }`}
            >
              {item.isRequired ? 'Required' : 'If applicable'}
            </span>
          </span>
          {item.description && <span className="mt-1 block text-sm text-ink-soft">{item.description}</span>}
        </span>
      </label>
    </li>
  );
}

export default function ClientRequirements() {
  const { checklist, status, setItemChecked } = useChecklist();
  const [saveError, setSaveError] = useState('');

  if (status === 'loading') {
    return <p className="mx-auto max-w-3xl text-sm text-ink-soft">Loading your requirements…</p>;
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
        Couldn't load your requirements. Try refreshing the page.
      </p>
    );
  }

  const { items } = checklist;
  const ready = items.filter((item) => item.checked).length;
  const requiredLeft = items.filter((item) => item.isRequired && !item.checked).length;

  async function handleToggle(itemId, checked) {
    setSaveError('');
    try {
      await setItemChecked(itemId, checked);
    } catch {
      setSaveError("Couldn't save that tick. Check your connection and try again.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Requirements</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Bring these documents to the bank with your signed application form. Tick each one you
        already have — this is only a checklist, so nothing is uploaded.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium text-ink">
            {ready} of {items.length} ready
          </p>
          <p className={`text-sm ${requiredLeft ? 'text-ink-soft' : 'font-medium text-accent-dark'}`}>
            {requiredLeft === 0
              ? 'All required documents ready'
              : `${requiredLeft} required ${requiredLeft === 1 ? 'document' : 'documents'} left`}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-paper"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={ready}
          aria-label="Documents ready"
        >
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${items.length === 0 ? 0 : (ready / items.length) * 100}%` }}
          />
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </p>
      )}

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">The bank hasn't listed any requirements yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <RequirementRow key={item.id} item={item} onToggle={handleToggle} />
          ))}
        </ul>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-accent-light/30 p-5">
        <p className="min-w-0 flex-1 text-sm text-ink">
          This list prints as the last page of your application form, with your ticks.
        </p>
        <Link
          to="/print/loan-application"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Print application
        </Link>
      </div>
    </div>
  );
}
