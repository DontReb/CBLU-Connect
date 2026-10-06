// Rule-based auto-fill for the loan application scan — same explainable,
// keyword/pattern spirit as the chatbot and document validation.
//
// Only fields that have an autofill_pattern in form_template_fields are
// ever attempted. On purpose, that's just three: email, mobile number and
// TIN — the only fields whose *shape* is unique on the page. Dates, peso
// amounts and plain numbers appear many times on the same form, so a
// pattern can't tell which one belongs where; guessing would put a
// client's birthday into their spouse's birthday field. Checkboxes are
// never attempted either, because OCR doesn't reliably see tick marks.
//
// A pattern may use one capture group to mean "the value is this part" —
// e.g. the TIN pattern matches the printed "TIN:" label but only keeps
// the digits after it.

export function extractAutofillValues(text, fields) {
  const found = {};

  for (const field of fields) {
    if (!field.autofillPattern) continue;

    let regex;
    try {
      regex = new RegExp(field.autofillPattern, 'i');
    } catch {
      continue; // a bad pattern in the database shouldn't break the whole scan
    }

    const match = regex.exec(text || '');
    if (!match) continue;

    const value = (match[1] ?? match[0]).replace(/\s+/g, ' ').trim();
    if (value) found[field.fieldKey] = value;
  }

  return found;
}
