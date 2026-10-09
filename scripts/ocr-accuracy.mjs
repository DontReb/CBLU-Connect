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
// Each expected field counts as correct only if the scan's value matches
// exactly, ignoring case, spaces and punctuation (so "PENA" for "PEÑA" is
// wrong). An expected null (e.g. no suffix) is correct when nothing was read.
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

const tally = new Map(); // group → { correct, total }
function count(group, ok) {
  const t = tally.get(group) ?? { correct: 0, total: 0 };
  t.correct += ok ? 1 : 0;
  t.total += 1;
  tally.set(group, t);
}

const rows = [['case', 'id_type', 'condition', 'field', 'expected', 'read', 'result']];
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
    for (const group of ['All fields', `ID: ${testCase.idType}`, `Photo: ${testCase.condition}`, `Field: ${field}`]) {
      count(group, ok);
    }
    rows.push([testCase.name, testCase.idType, testCase.condition, field, expected ?? '', read ?? '', result]);
    if (!ok) misses.push(`${field}: read ${JSON.stringify(read)}, expected ${JSON.stringify(expected)}`);
  }
  console.log(`${testCase.name.padEnd(28)} ${String(ms).padStart(6)} ms  ${scan.passes} pass${scan.passes > 1 ? 'es' : '  '}  ${misses.length ? misses.join('; ') : 'all correct'}`);
}

const pct = (a, b) => `${((100 * a) / b).toFixed(1)}%`;
console.log('\nID type recognised:', `${detected}/${cases.length}`, pct(detected, cases.length));
for (const [group, t] of tally) {
  console.log(`${group.padEnd(28)} ${String(t.correct).padStart(4)}/${String(t.total).padEnd(4)} ${pct(t.correct, t.total)}`);
}
console.log(`Average time per ID: ${(totalMs / cases.length / 1000).toFixed(1)} s; second pass needed: ${secondPasses}/${cases.length}`);

if (csvPath) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  fs.writeFileSync(csvPath, csv + '\n');
  console.log('Wrote', csvPath);
}
