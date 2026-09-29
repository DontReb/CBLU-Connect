// Placeholder — the checklist upload UI (one control per required document,
// wired to POST /api/documents/upload) is the next piece to build. This page
// exists so the "Documents" nav link doesn't dead-end in the meantime.

export default function ClientDocuments() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Documents</h1>
      <div className="mt-6 rounded-2xl border border-dashed border-line bg-panel p-8 text-center">
        <p className="text-sm text-ink-soft">
          The checklist upload flow — one control per required document, with live OCR
          validation — is being built next. This page is a placeholder in the meantime.
        </p>
      </div>
    </div>
  );
}