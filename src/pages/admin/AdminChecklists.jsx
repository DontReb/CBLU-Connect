import { useState } from 'react';
import Button from '../../components/ui/Button';
import { useAdminData } from '../../lib/adminDataContext';
import { MOCK_CHECKLIST_NAME } from '../../lib/mockAdmin';

const EMPTY_FORM = { label: '', description: '', keywords: '', isRequired: true };

export default function AdminChecklists() {
  const { checklistItems, addChecklistItem } = useAdminData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim()) return;
    addChecklistItem({
      label: form.label.trim(),
      description: form.description.trim(),
      isRequired: form.isRequired,
      requiredKeywords: form.keywords
        .split(',')
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Checklists</h1>
          <p className="mt-1 text-sm text-ink-soft">Required documents for {MOCK_CHECKLIST_NAME}.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowForm((open) => !open)}
          className="px-4 py-2 text-sm"
        >
          {showForm ? 'Cancel' : 'Add item'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-3 rounded-2xl border border-line bg-panel p-5 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor="item-label">
              Label
            </label>
            <input
              id="item-label"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full rounded-full border border-line px-4 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor="item-description">
              Description
            </label>
            <input
              id="item-description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-full border border-line px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink" htmlFor="item-keywords">
              Required keywords (comma-separated)
            </label>
            <input
              id="item-keywords"
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="e.g. republic of the philippines, driver's license"
              className="w-full rounded-full border border-line px-4 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
            />
            Required document
          </label>
          <Button type="submit" className="px-4 py-2 text-sm">
            Save item
          </Button>
        </form>
      )}

      <ul className="mt-6 space-y-3">
        {checklistItems.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-ink">{item.label}</h3>
                {item.description && (
                  <p className="mt-0.5 max-w-md text-sm text-ink-soft">{item.description}</p>
                )}
              </div>
              {!item.isRequired && (
                <span className="shrink-0 rounded-full bg-line/60 px-2.5 py-1 text-xs font-medium text-ink-soft">
                  Optional
                </span>
              )}
            </div>
            {item.requiredKeywords?.length > 0 && (
              <p className="mt-2 text-xs text-ink-soft">Required text: {item.requiredKeywords.join(', ')}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-2xl bg-accent-light/30 px-5 py-4 text-sm text-ink-soft">
        New items are added here for now; saving to <code>checklist_items</code> and editing or
        removing existing ones comes once the admin API is connected.
      </p>
    </div>
  );
}