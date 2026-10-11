// Measures how accurately the ID scan fills the loan form.
//
//   node scripts/ocr-accuracy.mjs tests/ocr-samples/standard
//   node scripts/ocr-accuracy.mjs tests/ocr-samples/hard --csv results.csv
//
// The folder needs the ID photos and a cases.json listing, for each test,
// the photo files (front first) and the values the scan should read:
//
//   { "cases": [ { "name": "p1 philsys photo", "condition": "photo",
//       "idType": "philsys", "files": ["front.jpg", "back.jpg"],
//       "expected": { "lastName": "DELA CRUZ", "birthDate": "1990-01-01",
//                     "suffix": null, ... } } ] }
//
// Works the same with real ID photos (with the owners' consent): put them
// in a folder with a cases.json and run it on that folder.
//
// Three measures, on the values the scan puts into the form:
//
//   Field accuracy — a field is correct only if the scan's value matches
//     exactly, ignoring case, spaces and punctuation (so "PENA" for "PEÑA"
//     is wrong). An expected null (e.g. no suffix) is correct when nothing
//     was read.
//   CER (Character Error Rate) = (S + D + I) / N, where S, D, I are the
//     characters substituted, deleted and inserted to turn what was read
//     into the expected value (Levenshtein distance) and N is the number of
//     characters expected. Added up over all fields, then divided.
//   WER (Word Error Rate) — the same, counting words instead of characters.
//
// For CER and WER, case is ignored and runs of spaces count as one space;
// punctuation and Ñ count. Lower is better; 0% = perfect. A field that
// wasn't read at all counts as all its characters/words deleted.
//
// Runs the same code as the live site (server/idScan.js), one case at a time.

import fs from 'node:fs';
import path from 'node:path';
import { scanId } from '../server/idScan.js';

const dir = process.argv[2];
const csvAt = process.argv.indexOf('--csv');
const csvPath = csvAt > 0 ? process.argv[csvAt + 1] : null;
if (!dir) {
  console.error('Usage: node scripts/ocr-accuracy.mjs <folder with cases.json> [--csv results.csv]');
  process.exit(1);
}

const { cases } = JSON.parse(fs.readFileSync(path.join(dir, 'cases.json'), 'utf8'));

function normalize(value) {
  if (value == null) return '';
  return String(value).toUpperCase().replace(/[^A-Z0-9Ñ]/g, '');
}

// For CER/WER: same letters and punctuation, case and extra spaces ignored.
function forErrorRate(value) {
  if (value == null) return '';
  return String(value).toUpperCase().replace(/\s+/g, ' ').trim();
}

/** Levenshtein distance between two sequences (strings or word arrays). */
export function editDistance(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

const words = (text) => (text ? text.split(' ') : []);

const tally = new Map(); // group → { correct, total, charErrors, chars, wordErrors, words }
function count(group, ok, errors) {
  const t = tally.get(group) ?? { correct: 0, total: 0, charErrors: 0, chars: 0, wordErrors: 0, words: 0 };
  t.correct += ok ? 1 : 0;
  t.total += 1;
  t.charErrors += errors.charErrors;
  t.chars += errors.chars;
  t.wordErrors += errors.wordErrors;
  t.words += errors.words;
  tally.set(group, t);
}

const rows = [['case', 'id_type', 'condition', 'field', 'expected', 'read', 'result', 'char_errors', 'expected_chars', 'word_errors', 'expected_words']];
let detected = 0;
let secondPasses = 0;
let totalMs = 0;

for (const testCase of cases) {
  const started = Date.now();
  const scan = await scanId(testCase.files.map((file) => path.join(dir, file)));
  const ms = Date.now() - started;
  totalMs += ms;
  if (scan.passes === 2) secondPasses += 1;
  if (scan.idType === testCase.idType) detected += 1;

  const misses = [];
  for (const [field, expected] of Object.entries(testCase.expected)) {
    const read = scan.fields[field] ?? null;
    const ok = normalize(read) === normalize(expected);
    const result = ok ? 'correct' : read ? 'wrong' : 'missed';
    const ref = forErrorRate(expected);
    const hyp = forErrorRate(read);
    const errors = {
      charErrors: editDistance(hyp, ref),
      chars: ref.length,
      wordErrors: editDistance(words(hyp), words(ref)),
      words: words(ref).length,
    };
    for (const group of ['All fields', `ID: ${testCase.idType}`, `Photo: ${testCase.condition}`, `Field: ${field}`]) {
      count(group, ok, errors);
    }
    rows.push([testCase.name, testCase.idType, testCase.condition, field, expected ?? '', read ?? '', result,
      errors.charErrors, errors.chars, errors.wordErrors, errors.words]);
    if (!ok) misses.push(`${field}: read ${JSON.stringify(read)}, expected ${JSON.stringify(expected)}`);
  }
  console.log(`${testCase.name.padEnd(28)} ${String(ms).padStart(6)} ms  ${scan.passes} pass${scan.passes > 1 ? 'es' : '  '}  ${misses.length ? misses.join('; ') : 'all correct'}`);
}

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—');
console.log('\nID type recognised:', `${detected}/${cases.length}`, pct(detected, cases.length));
console.log(`\n${'Group'.padEnd(28)} ${'Fields correct'.padEnd(18)} ${'CER'.padStart(7)} ${'WER'.padStart(7)}`);
const order = (g) => (g === 'All fields' ? 0 : g.startsWith('ID:') ? 1 : g.startsWith('Photo:') ? 2 : 3);
const groups = [...tally.entries()].sort((a, b) => order(a[0]) - order(b[0]));
for (const [group, t] of groups) {
  console.log(
    `${group.padEnd(28)} ${`${t.correct}/${t.total}`.padStart(9)} ${pct(t.correct, t.total).padStart(7)}  ` +
    `${pct(t.charErrors, t.chars).padStart(7)} ${pct(t.wordErrors, t.words).padStart(7)}`
  );
}
console.log(`Average time per ID: ${(totalMs / cases.length / 1000).toFixed(1)} s; second pass needed: ${secondPasses}/${cases.length}`);

if (csvPath) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(csvPath, csv + '\n');
  console.log('Wrote', csvPath);
}
