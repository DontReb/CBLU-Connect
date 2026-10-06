import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/ui/Button';
import DynamicFormField from '../../components/DynamicFormField';

// Client-side digital version of the paper Business Loan Application Form
// (Individual / Sole-Proprietorship). The fields come from the database
// (form_template_fields), not from this file — this page just draws them.
//
// Scanning a photo of a filled-out paper form only auto-fills the fields
// that can be read reliably (email, mobile number, TIN). Everything else
// the client types. A scan never overwrites something the client typed.

function groupBySection(fields) {
  const groups = [];
  const positionBySection = new Map();
  for (const field of fields) {
    if (!positionBySection.has(field.section)) {
      positionBySection.set(field.section, groups.length);
      groups.push({ section: field.section, fields: [] });
    }
    groups[positionBySection.get(field.section)].fields.push(field);
  }
  return groups;
}

// Same rule the server applies when it saves scan results: a value the
// client typed themselves always wins over a scan.
function mergeScanResults(prev, found) {
  const next = { ...prev };
  for (const [fieldKey, value] of Object.entries(found)) {
    const current = prev[fieldKey];
    if (current?.source === 'manual' && current.value !== '') continue;
    next[fieldKey] = { value, source: 'ocr' };
  }
  return next;
}

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ClientLoanApplication() {
  const [loadStatus, setLoadStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ template: null, fields: [] });
  const [values, setValues] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fileInputRef = useRef(null);
  const [scanFile, setScanFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadApplication() {
      try {
        const res = await fetch('/api/forms/application', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (ignore) return;
        if (!res.ok) {
          setLoadError(data.error || '');
          setLoadStatus('error');
          return;
        }
        setForm({ template: data.template, fields: data.fields });
        setValues(data.values ?? {});
        setLastSavedAt(data.submission?.updatedAt ?? null);
        setLoadStatus('ready');
      } catch {
        if (!ignore) setLoadStatus('error');
      }
    }

    loadApplication();
    return () => {
      ignore = true;
    };
  }, []);

  const sections = useMemo(() => groupBySection(form.fields), [form.fields]);
  const labelByKey = useMemo(
    () => Object.fromEntries(form.fields.map((field) => [field.fieldKey, field.label])),
    [form.fields]
  );
  const missingRequiredCount = form.fields.filter(
    (field) => field.isRequired && !(values[field.fieldKey]?.value ?? '').trim()
  ).length;

  function handleFieldChange(fieldKey, value) {
    setValues((prev) => ({ ...prev, [fieldKey]: { value, source: 'manual' } }));
    setHasUnsavedChanges(true);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setScanFile(file);
      setScanError('');
    }
  }

  async function handleScan() {
    if (!scanFile || scanning) return;
    setScanning(true);
    setScanError('');
    setScanResult(null);

    const formData = new FormData();
    formData.append('document', scanFile);

    try {
      const res = await fetch('/api/forms/ocr', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Scanning failed — try again.');

      setValues((prev) => mergeScanResults(prev, data.found ?? {}));
      setScanResult(data);
    } catch (err) {
      setScanError(err.message || 'Scanning failed — try again.');
    } finally {
      setScanning(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError('');

    try {
      const res = await fetch('/api/forms/application', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Saving failed — try again.');

      setLastSavedAt(data.submission?.updatedAt ?? new Date().toISOString());
      setHasUnsavedChanges(false);
    } catch (err) {
      setSaveError(err.message || 'Saving failed — try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loadStatus === 'loading') {
    return <p className="mx-auto max-w-3xl text-sm text-ink-soft">Loading your loan application…</p>;
  }

  if (loadStatus === 'error') {
    return (
      <p className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-5 text-sm text-red-700">
        {loadError || "Couldn't load the loan application."} Try refreshing the page.
      </p>
    );
  }

  const foundKeys = Object.keys(scanResult?.found ?? {});

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Loan Application</h1>
      <p className="mt-1 text-sm text-ink-soft">{form.template?.name}</p>

      {/* Scan a paper form */}
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm">
        <h2 className="font-medium text-ink">Already filled out the paper form?</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          Upload a clear, well-lit photo of it and we'll fill in your email address, mobile number and
          TIN automatically. Everything else, please type below. Scanning can take up to a minute.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="shrink-0 px-4 py-2 text-sm"
          >
            Choose photo
          </Button>
          {/* On phones the file name drops to its own line instead of being squeezed */}
          <span className="order-last w-full truncate text-sm text-ink-soft sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
            {scanFile?.name ?? 'No photo selected'}
          </span>
          <Button
            type="button"
            onClick={handleScan}
            disabled={!scanFile || scanning}
            className="shrink-0 px-4 py-2 text-sm"
          >
            {scanning ? 'Scanning…' : 'Scan & fill'}
          </Button>
        </div>

        {scanError && <p className="mt-3 text-sm text-red-700">{scanError}</p>}

        {scanResult && (
          <div className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm">
            {foundKeys.length > 0 ? (
              <p className="text-ink">
                Found {foundKeys.length} of {scanResult.scannableCount}:{' '}
                <span className="font-medium">{foundKeys.map((key) => labelByKey[key] ?? key).join(', ')}</span>.
                They're marked "From scan" below — please check each one. Anything you typed yourself was
                left as is.
              </p>
            ) : (
              <p className="text-ink">
                The scan couldn't find an email address, mobile number or TIN. Try a sharper, straighter
                photo — or just type them in below.
              </p>
            )}
            {typeof scanResult.confidence === 'number' && (
              <p className="mt-1 text-xs text-ink-soft">
                OCR confidence: {Math.round(scanResult.confidence)}%
              </p>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-accent-dark">
                See the text the scanner read
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel p-3 text-xs text-ink-soft">
                {scanResult.extractedText?.trim() || '(no text found)'}
              </pre>
            </details>
          </div>
        )}
      </section>

      {/* The form itself — noValidate so a half-finished draft can still be saved */}
      <form onSubmit={handleSave} noValidate className="mt-6 space-y-6">
        {sections.map(({ section, fields }) => (
          <fieldset key={section} className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
            <legend className="px-1 text-lg font-semibold text-ink">{section}</legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <DynamicFormField
                  key={field.fieldKey}
                  field={field}
                  value={values[field.fieldKey]?.value ?? ''}
                  source={values[field.fieldKey]?.source}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          </fieldset>
        ))}

        {/* On phones the bar sits higher so the chat button (bottom-right) doesn't cover Save */}
        <div className="sticky bottom-24 z-10 sm:bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 px-5 py-3.5 shadow-lg shadow-ink/10 backdrop-blur">
          <div className="text-sm">
            {saveError ? (
              <p className="text-red-700">{saveError}</p>
            ) : hasUnsavedChanges ? (
              <p className="text-ink">You have unsaved changes.</p>
            ) : lastSavedAt ? (
              <p className="text-ink-soft">Saved {formatDateTime(lastSavedAt)}</p>
            ) : (
              <p className="text-ink-soft">Not saved yet.</p>
            )}
            <p className="text-xs text-ink-soft">
              {missingRequiredCount === 0
                ? 'All required fields are filled in.'
                : `${missingRequiredCount} required field${missingRequiredCount === 1 ? '' : 's'} (*) still empty.`}
            </p>
          </div>
          <Button type="submit" disabled={saving} className="px-5 py-2.5 text-sm">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      <p className="mt-6 rounded-2xl bg-accent-light/30 px-5 py-4 text-sm text-ink-soft">
        Not included yet: downloading or printing the completed form as a PDF; the repeating tables on
        the paper form (trade references, existing deposit accounts, loans and credit cards); and the
        Cooperative / Partnership / Corporation version of the form.
      </p>
    </div>
  );
}
