import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import DynamicFormField from '../../components/DynamicFormField';
import { prepareIdPhoto } from '../../lib/idPhoto';

// CBLU's Loan Application Form (Individual and Sole Proprietor, REV. 2023),
// filled in online and then printed. The fields come from the database
// (form_template_fields); this page only draws them.
//
// A photo of ONE valid ID (PhilSys National ID, Driver's License or
// Passport) fills the borrower fields that also appear on the ID — name,
// birth date, sex, citizenship, address, civil status. Everything else the
// client types. A scan never overwrites something the client typed.

const ACCEPTED_IDS = ['PhilSys National ID', "Driver's License (LTO)", 'Passport'];

const SECTION_HINTS = {
  "Spouse's personal data": 'Fill this in if you are married.',
  'Collateral details': 'For secured loans — the property or vehicle you are offering as security.',
  'Co-borrower / co-maker 1': 'Only if the bank asks you for a co-borrower or co-maker.',
  'Co-borrower / co-maker 2': 'Only if the bank asks you for a second co-borrower or co-maker.',
};

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

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

// --- ID photo picker ----------------------------------------------------------

function IdPhotoPicker({ id, label, hint, file, onChange, disabled }) {
  const inputRef = useRef(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <div className="min-w-0 rounded-xl border border-dashed border-line bg-paper/60 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-panel">
          {previewUrl ? (
            <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-ink-soft/60" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="11" r="2" />
              <path d="M14 10h4M14 13h4M6 16h6" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium text-ink">
            {label}
          </label>
          <p className="text-xs text-ink-soft">{hint}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept="image/*"
              disabled={disabled}
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen) onChange(chosen);
                e.target.value = '';
              }}
              className="sr-only"
            />
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="px-3.5 py-1.5 text-xs"
            >
              {file ? 'Change photo' : 'Choose photo'}
            </Button>
            {file && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(null)}
                className="text-xs font-medium text-ink-soft hover:text-red-700 disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- what a scan found ------------------------------------------------------------

function ScanSummary({ result, labelByKey }) {
  const names = (keys) => keys.map((key) => labelByKey[key] ?? key).join(', ');
  return (
    <div className="mt-4 space-y-2 rounded-xl bg-paper px-4 py-3 text-sm" role="status">
      <p className="font-medium text-ink">Read your {result.idLabel}.</p>
      {result.filled.length > 0 ? (
        <p className="text-ink">
          Filled {result.filled.length} {result.filled.length === 1 ? 'field' : 'fields'}:{' '}
          <span className="font-medium">{names(result.filled)}</span>. They're marked "From your ID"
          below — please check each one. If your name has an Ñ, put it back: scans read it as N.
        </p>
      ) : (
        <p className="text-ink">No fields were filled from this photo.</p>
      )}
      {result.kept.length > 0 && (
        <p className="text-ink-soft">Kept what you typed for: {names(result.kept)}.</p>
      )}
      {result.notFound.length > 0 && (
        <p className="text-ink-soft">
          Not read from this ID — please type: {names(result.notFound)}.
        </p>
      )}
      {result.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-ink">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {typeof result.confidence === 'number' && (
        <p className="text-xs text-ink-soft">OCR confidence: {Math.round(result.confidence)}%</p>
      )}
    </div>
  );
}

// --- one collapsible form section ----------------------------------------------------

function FormSection({ section, fields, values, open, onToggle, onFieldChange }) {
  const filled = fields.filter((field) => (values[field.fieldKey]?.value ?? '') !== '').length;
  const bodyId = `section-${section.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <section className="rounded-2xl border border-line bg-panel shadow-sm">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left"
        >
          <span className="min-w-0">
            <span className="block text-lg font-semibold text-ink">{section}</span>
            {SECTION_HINTS[section] && (
              <span className="block text-sm font-normal text-ink-soft">{SECTION_HINTS[section]}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3 text-xs text-ink-soft">
            {filled} of {fields.length}
            <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor" aria-hidden="true">
              <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
            </svg>
          </span>
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="grid gap-4 border-t border-line px-5 pb-5 pt-4 sm:grid-cols-2">
          {fields.map((field) => (
            <DynamicFormField
              key={field.fieldKey}
              field={field}
              value={values[field.fieldKey]?.value ?? ''}
              source={values[field.fieldKey]?.source}
              onChange={onFieldChange}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// --- page --------------------------------------------------------------------------

export default function ClientLoanApplication() {
  const navigate = useNavigate();
  const [loadStatus, setLoadStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ template: null, fields: [] });
  const [values, setValues] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [openOverrides, setOpenOverrides] = useState({}); // section → open/closed by the client

  const [frontPhoto, setFrontPhoto] = useState(null);
  const [backPhoto, setBackPhoto] = useState(null);
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

  // Sections with a required field or anything filled in start open; the
  // optional ones (spouse, collateral, co-makers) start closed. Once the
  // client opens or closes one, that choice sticks.
  function isSectionOpen(section, fields) {
    if (section in openOverrides) return openOverrides[section];
    return fields.some((field) => field.isRequired || (values[field.fieldKey]?.value ?? '') !== '');
  }

  function toggleSection(section, fields) {
    const open = isSectionOpen(section, fields);
    setOpenOverrides((prev) => ({ ...prev, [section]: !open }));
  }

  function handleFieldChange(fieldKey, value) {
    setValues((prev) => ({ ...prev, [fieldKey]: { value, source: 'manual' } }));
    setHasUnsavedChanges(true);
  }

  async function save() {
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
      return true;
    } catch (err) {
      setSaveError(err.message || 'Saving failed — try again.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!saving) await save();
  }

  async function handlePrint() {
    if (saving) return;
    if (hasUnsavedChanges && !(await save())) return;
    navigate('/print/loan-application');
  }

  async function handleScan() {
    if (!frontPhoto || scanning) return;
    setScanning(true);
    setScanError('');
    setScanResult(null);

    try {
      // Save typed changes first, so the server knows not to overwrite them.
      if (hasUnsavedChanges && !(await save())) throw new Error('Save your changes first, then try again.');

      const body = new FormData();
      body.append('front', await prepareIdPhoto(frontPhoto, 'id-front.jpg'));
      if (backPhoto) body.append('back', await prepareIdPhoto(backPhoto, 'id-back.jpg'));

      const res = await fetch('/api/forms/ocr', { method: 'POST', credentials: 'include', body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Reading your ID failed — try again.');

      setValues((prev) => {
        const next = { ...prev };
        for (const key of data.filled) next[key] = data.values[key];
        return next;
      });
      setLastSavedAt(new Date().toISOString());
      setScanResult(data);
    } catch (err) {
      setScanError(err.message || 'Reading your ID failed — try again.');
    } finally {
      setScanning(false);
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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-medium text-ink md:text-3xl">Loan Application</h1>
      <p className="mt-1 text-sm text-ink-soft">{form.template?.name}</p>

      <ol className="mt-5 grid gap-2 text-sm sm:grid-cols-4">
        {[
          'Scan a valid ID',
          'Check and complete the form',
          'Print it, sign it, attach a 2x2 photo',
          'Bring it with your requirements',
        ].map((step, i) => (
          <li key={step} className="flex items-start gap-2 rounded-xl bg-panel px-3 py-2.5 shadow-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
              {i + 1}
            </span>
            <span className="text-ink">{step}</span>
          </li>
        ))}
      </ol>

      {/* Scan an ID */}
      <section className="mt-6 rounded-2xl border border-line bg-panel p-5 shadow-sm" aria-labelledby="scan-heading">
        <h2 id="scan-heading" className="text-lg font-semibold text-ink">
          Fill in your details from a valid ID
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Take a clear, well-lit photo of the whole card, straight on. We'll fill in your name, date of
          birth, sex, citizenship, address and civil status — whichever your ID shows.
        </p>
        <p className="mt-2 text-sm text-ink">
          <span className="font-medium">Accepted IDs:</span> {ACCEPTED_IDS.join(', ')}.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <IdPhotoPicker
            id="id-front"
            label="Front of your ID"
            hint="Required"
            file={frontPhoto}
            onChange={setFrontPhoto}
            disabled={scanning}
          />
          <IdPhotoPicker
            id="id-back"
            label="Back of your ID"
            hint="PhilSys ID only — fills sex and civil status"
            file={backPhoto}
            onChange={setBackPhoto}
            disabled={scanning}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="button" onClick={handleScan} disabled={!frontPhoto || scanning} className="px-5 py-2.5 text-sm">
            {scanning ? 'Reading your ID…' : 'Read my ID'}
          </Button>
          <p className="min-w-0 flex-1 text-xs text-ink-soft">
            {scanning
              ? 'This can take up to a minute.'
              : 'Your photos are only read, then deleted. They are not saved.'}
          </p>
        </div>

        {scanError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {scanError}
          </p>
        )}
        {scanResult && <ScanSummary result={scanResult} labelByKey={labelByKey} />}
      </section>

      {/* The form itself — noValidate so a half-finished draft can still be saved */}
      <form onSubmit={handleSave} noValidate className="mt-6 space-y-4">
        {sections.map(({ section, fields }) => (
          <FormSection
            key={section}
            section={section}
            fields={fields}
            values={values}
            open={isSectionOpen(section, fields)}
            onToggle={() => toggleSection(section, fields)}
            onFieldChange={handleFieldChange}
          />
        ))}

        <p className="rounded-2xl bg-accent-light/30 px-5 py-4 text-sm text-ink-soft">
          The printed form leaves these for you to fill in by hand: bank deposits, automobiles, real
          estate property, credit information, trade and personal references, and signatures.
        </p>

        {/* On phones the bar sits higher so the chat button (bottom-right) doesn't cover it */}
        <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel/95 px-5 py-3.5 shadow-lg shadow-ink/10 backdrop-blur sm:bottom-4">
          <div className="min-w-0 text-sm">
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
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" onClick={handlePrint} disabled={saving} className="px-4 py-2.5 text-sm">
              Print form
            </Button>
            <Button type="submit" disabled={saving} className="px-5 py-2.5 text-sm">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Next: tick the documents you already have on your{' '}
        <Link to="/dashboard/client/requirements" className="font-medium text-accent-dark hover:underline">
          Requirements
        </Link>{' '}
        page. They print as the last page of the form.
      </p>
    </div>
  );
}
