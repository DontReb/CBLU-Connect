import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import DynamicFormField from '../../components/DynamicFormField';
import FaceCheck from '../../components/FaceCheck';
import { prepareIdPhoto } from '../../lib/idPhoto';

// CBLU's Loan Application Form (Individual and Sole Proprietor, REV. 2023),
// filled in online and then printed. The fields come from the database
// (form_template_fields); this page only draws them.
//
// A photo of ONE valid ID (PhilSys National ID, Driver's License or
// Passport) fills the borrower fields that also appear on the ID — name,
// birth date, sex, citizenship, address, civil status — but only after a
// live face check (the face matches the ID photo, and it's a real person,
// not a photo or video). Everything else the client types. A scan never
// overwrites something the client typed. Three failed face checks lock
// scanning for the day; the client can still type the form by hand.

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

// --- what a scan found, before the face check ---------------------------------------

function ScanPreview({ scan, labelByKey, onStartFaceCheck, starting, disabled }) {
  const names = (keys) => keys.map((key) => labelByKey[key] ?? key).join(', ');
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-paper px-4 py-3 text-sm" role="status">
      <p className="font-medium text-ink">Read your {scan.idLabel}.</p>
      {scan.willFill.length > 0 ? (
        <>
          <p className="text-ink">After a quick face check, these will be filled in:</p>
          <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
            {scan.willFill.map((key) => (
              <div key={key} className="contents">
                <dt className="text-ink-soft">{labelByKey[key] ?? key}</dt>
                <dd className="font-medium text-ink">{scan.values[key]}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className="text-ink">Nothing new to fill from this photo.</p>
      )}
      {scan.kept.length > 0 && <p className="text-ink-soft">Keeping what you typed for: {names(scan.kept)}.</p>}
      {scan.notFound.length > 0 && (
        <p className="text-ink-soft">Not read from this ID — please type: {names(scan.notFound)}.</p>
      )}
      {scan.warnings.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-ink">
          {scan.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {scan.willFill.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <Button type="button" onClick={onStartFaceCheck} disabled={disabled || starting} className="px-5 py-2.5 text-sm">
            {starting ? 'Starting…' : 'Start face check'}
          </Button>
          <p className="min-w-0 flex-1 text-xs text-ink-soft">
            Uses your camera to match your face with your ID photo.
          </p>
        </div>
      )}
    </div>
  );
}

// --- what was filled, after the face check -------------------------------------------

function ScanSummary({ result, labelByKey }) {
  const names = (keys) => keys.map((key) => labelByKey[key] ?? key).join(', ');
  return (
    <div className="mt-4 space-y-2 rounded-xl bg-paper px-4 py-3 text-sm" role="status">
      <p className="font-medium text-ink">Face check passed. Your {result.idLabel} details are in the form.</p>
      {result.filled.length > 0 ? (
        <p className="text-ink">
          Filled {result.filled.length} {result.filled.length === 1 ? 'field' : 'fields'}:{' '}
          <span className="font-medium">{names(result.filled)}</span>. They're marked "From your ID"
          below — please check each one. If your name has an Ñ, put it back: scans read it as N.
        </p>
      ) : (
        <p className="text-ink">No fields were changed.</p>
      )}
      {result.kept.length > 0 && <p className="text-ink-soft">Kept what you typed for: {names(result.kept)}.</p>}
      {result.notFound.length > 0 && (
        <p className="text-ink-soft">Not read from this ID — please type: {names(result.notFound)}.</p>
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

// --- "Clear form" confirmation --------------------------------------------------------

function ClearFormDialog({ filledCount, clearing, error, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus(); // the safe choice has focus when it opens
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !clearing) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearing, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-desc">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-xl">
        <h2 id="clear-title" className="text-lg font-semibold text-ink">Clear the whole form?</h2>
        <p id="clear-desc" className="mt-2 text-sm text-ink">
          This erases every answer in your loan application ({filledCount}{' '}
          {filledCount === 1 ? 'field' : 'fields'} filled in), including any details from your ID scan. It can't be
          undone.
        </p>
        <p className="mt-2 text-xs text-ink-soft">Your requirements ticks and face check are not affected.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={clearing} className="px-4 py-2 text-sm">
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={clearing}
            className="rounded-full bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
          >
            {clearing ? 'Clearing…' : 'Clear form'}
          </button>
        </div>
      </div>
    </div>
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
  const [pendingScan, setPendingScan] = useState(null); // read, waiting for the face check
  const [scanResult, setScanResult] = useState(null); // filled after the face check
  const [scanError, setScanError] = useState('');

  const [identity, setIdentity] = useState(null); // { verifiedAt, triesLeft, locked }
  const [challenge, setChallenge] = useState(null); // open face check
  const [startingFaceCheck, setStartingFaceCheck] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [faceError, setFaceError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState('');

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
        setIdentity(data.identity ?? null);
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
  const filledCount = form.fields.filter((field) => (values[field.fieldKey]?.value ?? '') !== '').length;
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

  async function clearForm() {
    setClearing(true);
    setClearError('');
    try {
      const res = await fetch('/api/forms/application', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Clearing failed — try again.');
      setValues({});
      setHasUnsavedChanges(false);
      setLastSavedAt(data.submission?.updatedAt ?? new Date().toISOString());
      setOpenOverrides({});
      setScanResult(null);
      setPendingScan(null);
      setSaveError('');
      setConfirmClear(false);
    } catch (err) {
      setClearError(err.message || 'Clearing failed — try again.');
    } finally {
      setClearing(false);
    }
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
    setFaceError('');
    setScanResult(null);
    setPendingScan(null);

    try {
      // Save typed changes first, so the server knows not to overwrite them.
      if (hasUnsavedChanges && !(await save())) throw new Error('Save your changes first, then try again.');

      // The same photo goes to the face check, so keep the prepared copy.
      const front = await prepareIdPhoto(frontPhoto, 'id-front.jpg');
      const body = new FormData();
      body.append('front', front);
      if (backPhoto) body.append('back', await prepareIdPhoto(backPhoto, 'id-back.jpg'));

      const res = await fetch('/api/forms/ocr', { method: 'POST', credentials: 'include', body });
      const data = await res.json().catch(() => ({}));
      if (data.identity) setIdentity(data.identity);
      if (!res.ok) throw new Error(data.error || 'Reading your ID failed — try again.');
      setPendingScan({ ...data, front });
    } catch (err) {
      setScanError(err.message || 'Reading your ID failed — try again.');
    } finally {
      setScanning(false);
    }
  }

  async function startFaceCheck() {
    if (!pendingScan || startingFaceCheck) return;
    setStartingFaceCheck(true);
    setFaceError('');
    try {
      const res = await fetch('/api/identity/face', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (data.identity) setIdentity(data.identity);
      if (!res.ok) throw new Error(data.error || 'Could not start the face check — try again.');
      setChallenge({ ...data.challenge, token: data.challengeToken });
    } catch (err) {
      setFaceError(err.message || 'Could not start the face check — try again.');
    } finally {
      setStartingFaceCheck(false);
    }
  }

  async function handleFaceCaptured({ frames, meta }) {
    const scan = pendingScan;
    const challengeToken = challenge.token;
    setChallenge(null);
    setVerifying(true);
    setFaceError('');
    try {
      if (hasUnsavedChanges && !(await save())) throw new Error('Save your changes first, then try again.');
      const body = new FormData();
      body.append('scanToken', scan.scanToken);
      body.append('challengeToken', challengeToken);
      body.append('meta', JSON.stringify(meta));
      body.append('id', scan.front, 'id-front.jpg');
      for (const [name, blob] of Object.entries(frames)) body.append(name, blob, `${name}.jpg`);

      const res = await fetch('/api/identity/face', { method: 'POST', credentials: 'include', body });
      const data = await res.json().catch(() => ({}));
      if (data.identity) setIdentity(data.identity);
      if (!res.ok) throw new Error(data.error || 'The face check failed — try again.');
      if (!data.passed) {
        setFaceError(data.message);
        if (data.identity?.locked) setPendingScan(null);
        return;
      }

      setValues((prev) => {
        const next = { ...prev };
        for (const key of data.filled) next[key] = data.values[key];
        return next;
      });
      setLastSavedAt(new Date().toISOString());
      setScanResult({
        idLabel: scan.idLabel,
        filled: data.filled,
        kept: data.kept,
        notFound: scan.notFound,
        confidence: scan.confidence,
      });
      setPendingScan(null);
      setFrontPhoto(null);
      setBackPhoto(null);
    } catch (err) {
      setFaceError(err.message || 'The face check failed — try again.');
    } finally {
      setVerifying(false);
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
          'Scan a valid ID, then a face check',
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
        <p className="mt-1 text-sm text-ink-soft">
          After reading your ID, a quick face check with your camera confirms the ID is yours.
        </p>
        {identity?.verifiedAt && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent-light/50 px-3 py-1 text-xs font-medium text-ink">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0z" />
            </svg>
            Identity verified {formatDateTime(identity.verifiedAt)}
          </p>
        )}
        {identity?.locked && (
          <p role="alert" className="mt-3 rounded-xl bg-highlight/40 px-4 py-3 text-sm text-ink">
            You've used all 3 face check tries for today. Please visit a CBLU branch to verify your
            identity, or try again tomorrow. You can still fill in the form below by hand.
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <IdPhotoPicker
            id="id-front"
            label="Front of your ID"
            hint="Required"
            file={frontPhoto}
            onChange={setFrontPhoto}
            disabled={scanning || verifying || identity?.locked}
          />
          <IdPhotoPicker
            id="id-back"
            label="Back of your ID"
            hint="PhilSys ID only — fills sex and civil status"
            file={backPhoto}
            onChange={setBackPhoto}
            disabled={scanning || verifying || identity?.locked}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            type="button"
            variant={pendingScan ? 'ghost' : 'primary'}
            onClick={handleScan}
            disabled={!frontPhoto || scanning || verifying || identity?.locked}
            className="px-5 py-2.5 text-sm"
          >
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
        {pendingScan && (
          <ScanPreview
            scan={pendingScan}
            labelByKey={labelByKey}
            onStartFaceCheck={startFaceCheck}
            starting={startingFaceCheck}
            disabled={verifying || identity?.locked}
          />
        )}
        {verifying && (
          <p className="mt-3 text-sm text-ink" role="status">
            Checking your face… this takes a few seconds.
          </p>
        )}
        {faceError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {faceError}
          </p>
        )}
        {scanResult && <ScanSummary result={scanResult} labelByKey={labelByKey} />}
      </section>

      {confirmClear && (
        <ClearFormDialog
          filledCount={filledCount}
          clearing={clearing}
          error={clearError}
          onConfirm={clearForm}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {challenge && (
        <FaceCheck challenge={challenge} onComplete={handleFaceCaptured} onCancel={() => setChallenge(null)} />
      )}

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
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setClearError('');
                setConfirmClear(true);
              }}
              disabled={saving || filledCount === 0}
              className="rounded-full px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear form
            </button>
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
