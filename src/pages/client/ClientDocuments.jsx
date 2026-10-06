import { useRef, useState } from 'react';
import Button from '../../components/ui/Button';
import { useChecklist } from '../../lib/checklistContext';

const STATUS_META = {
  valid: { label: 'Valid', badge: 'bg-accent-light/50 text-accent-dark' },
  invalid: { label: 'Needs attention', badge: 'bg-red-100 text-red-700' },
  pending: { label: 'Not submitted', badge: 'bg-line/60 text-ink-soft' },
  processing: { label: 'Checking…', badge: 'bg-highlight/40 text-ink' },
  error: { label: 'Upload failed', badge: 'bg-red-100 text-red-700' },
};

function ChecklistItemCard({ item, onUpload }) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const isProcessing = item.status === 'processing';
  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
  const notesAreBad = item.status === 'invalid' || item.status === 'error';

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  function handleUploadClick() {
    if (!selectedFile || isProcessing) return;
    onUpload(item.id, selectedFile).catch(() => {
      // Already reflected in item.status/notes via the provider — nothing
      // more to do here, just don't let an unhandled rejection surface.
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-ink">{item.label}</h3>
          {item.description && (
            <p className="mt-0.5 max-w-md text-sm text-ink-soft">{item.description}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      {item.notes && (
        <p className={`mt-3 text-sm ${notesAreBad ? 'text-red-700' : 'text-ink-soft'}`}>
          {item.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="shrink-0 px-4 py-2 text-sm"
        >
          {item.status === 'valid' ? 'Replace file' : 'Choose file'}
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
          {selectedFile?.name ?? item.fileName ?? 'No file selected'}
        </span>
        <Button
          type="button"
          onClick={handleUploadClick}
          disabled={!selectedFile || isProcessing}
          className="shrink-0 px-4 py-2 text-sm"
        >
          {isProcessing ? 'Checking…' : 'Upload'}
        </Button>
      </div>
    </div>
  );
}

export default function ClientDocuments() {
  const { checklist, status, uploadDocument } = useChecklist();

  if (status === 'loading') {
    return <p className="mx-auto max-w-3xl text-sm text-ink-soft">Loading your checklist…</p>;
  }

  if (status === 'error') {
    return (
      <p className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
        Couldn't load your checklist. Try refreshing the page.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Documents</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload each required document for your {checklist.name.toLowerCase()}. We'll check it
        automatically as soon as it's in — OCR can take a few seconds per file.
      </p>

      <div className="mt-6 space-y-4">
        {checklist.items.map((item) => (
          <ChecklistItemCard key={item.id} item={item} onUpload={uploadDocument} />
        ))}
      </div>
    </div>
  );
}