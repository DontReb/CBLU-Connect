// Renders one field of a database-defined form (form_template_fields),
// picking the right input for its fieldType. Used by the client Loan
// Application page; nothing in here is specific to that one form.
//
// Props:
//   field    — { fieldKey, label, fieldType, options, isRequired, helpText, idSource }
//              options: ['A', 'B'] or grouped: [{ group: 'Secured', options: ['A', 'B'] }]
//              idSource: set when a scanned ID can fill this field
//   value    — current string value ('' when empty)
//   source   — 'ocr' | 'manual' | undefined — where the value came from
//   onChange — (fieldKey, newValue) => void

const INPUT_CLASS =
  'w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none';

const INPUT_TYPES = {
  text: 'text',
  number: 'number',
  date: 'date',
  email: 'email',
  tel: 'tel',
};

export default function DynamicFormField({ field, value, source, onChange }) {
  const id = `field-${field.fieldKey}`;
  const helpId = field.helpText ? `${id}-help` : undefined;
  const fromScan = source === 'ocr' && value !== '';

  function handleChange(e) {
    onChange(field.fieldKey, e.target.value);
  }

  let control;
  if (field.fieldType === 'textarea') {
    control = (
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={handleChange}
        required={field.isRequired}
        aria-describedby={helpId}
        className={`${INPUT_CLASS} resize-y`}
      />
    );
  } else if (field.fieldType === 'select') {
    const options = Array.isArray(field.options) ? field.options : [];
    control = (
      <select
        id={id}
        value={value}
        onChange={handleChange}
        required={field.isRequired}
        aria-describedby={helpId}
        className={INPUT_CLASS}
      >
        <option value="">Select…</option>
        {options.map((option) =>
          typeof option === 'string' ? (
            <option key={option} value={option}>
              {option}
            </option>
          ) : (
            <optgroup key={option.group} label={option.group}>
              {option.options.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </optgroup>
          )
        )}
      </select>
    );
  } else {
    control = (
      <input
        id={id}
        type={INPUT_TYPES[field.fieldType] ?? 'text'}
        inputMode={field.fieldType === 'number' ? 'decimal' : undefined}
        min={field.fieldType === 'number' ? 0 : undefined}
        step={field.fieldType === 'number' ? 'any' : undefined}
        value={value}
        onChange={handleChange}
        required={field.isRequired}
        aria-describedby={helpId}
        className={INPUT_CLASS}
      />
    );
  }

  return (
    <div className={field.fieldType === 'textarea' ? 'sm:col-span-2' : undefined}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {field.label}
          {field.isRequired && (
            <span className="text-red-600" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
        {fromScan ? (
          <span className="rounded-full bg-highlight/50 px-2 py-0.5 text-[11px] font-medium text-ink">
            From your ID — please check
          </span>
        ) : (
          // Only hint on empty fields — a scan never replaces a typed value
          field.idSource && value === '' && (
            <span className="rounded-full bg-accent-light/40 px-2 py-0.5 text-[11px] font-medium text-accent-dark">
              Your ID can fill this
            </span>
          )
        )}
      </div>
      {control}
      {field.helpText && (
        <p id={helpId} className="mt-1 text-xs text-ink-soft">
          {field.helpText}
        </p>
      )}
    </div>
  );
}
