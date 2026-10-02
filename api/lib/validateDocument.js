// Deterministic, explainable validation — same "rule-based" spirit as the
// chatbot: no ML classifier to justify, just keyword rules you can list in
// a defense. validation_rules on checklist_items looks like:
//   { "requiredKeywords": ["republic of the philippines", "driver's license"] }

export function validateAgainstRules(extractedText, rules = {}) {
  const text = (extractedText || '').toLowerCase();
  const required = rules.requiredKeywords || [];

  if (required.length === 0) {
    return {
      isValid: false,
      matchedKeywords: [],
      missing: [],
      notes: 'No validation rules configured for this checklist item.',
    };
  }

  const matchedKeywords = required.filter((kw) => text.includes(kw.toLowerCase()));
  const missing = required.filter((kw) => !text.includes(kw.toLowerCase()));
  const isValid = missing.length === 0;

  const notes = isValid
    ? 'All required terms were found in the document.'
    : `Missing expected terms: ${missing.join(', ')}`;

  return { isValid, matchedKeywords, missing, notes };
}