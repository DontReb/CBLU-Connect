// Reads the values the loan application needs from the OCR text of a
// Philippine ID. Supported IDs:
//   - PhilSys National ID (front; the back adds sex and civil status)
//   - LTO Driver's License
//   - Passport (the two machine-readable lines at the bottom carry check
//     digits, so the birth date read from there can be verified)
//
// Only these values are returned — never the ID number or anything else on
// the card. They match form_template_fields.id_source:
//   lastName, firstName, middleName, suffix, birthDate (YYYY-MM-DD),
//   sex (Male/Female), nationality, address, civilStatus
//
// Everything here works on plain text, so it can be tested without OCR.
// OCR text from phone photos is noisy: labels go missing, capitals come out
// lowercase, digits come out as look-alike letters. Each reader below
// anchors on whatever labels survived and falls back to the order the
// values are printed in.

export const ID_LABELS = {
  philsys: 'PhilSys National ID',
  drivers_license: "Driver's License",
  passport: 'Passport',
};

export const UNKNOWN_ID_MESSAGE =
  "We couldn't tell which ID this is. We accept a PhilSys National ID, a Driver's License or a Passport. " +
  'Try a well-lit photo of the whole card, taken straight on.';

// ---------------------------------------------------------------------------
// Which ID (and which side) is in this photo?
// ---------------------------------------------------------------------------

export function detectIdSide(text) {
  const t = (text || '').toUpperCase();
  if (/PASSPORT|PASAPORTE/.test(t) || /[<K«]PHL\S*<</.test(t.replace(/\s+/g, ''))) return 'passport';
  if (/DRIVER.?S\s*LICEN|LAND\s*TRANSPORTATION|TRANSPORTATION\s*OFFICE|LICENSE\s*NO/.test(t)) return 'drivers_license';
  if (/PAGKAKAKILANLAN|IDENTIFICATION\s*CARD|GIVEN\s*NAM|GITNANG/.test(t)) return 'philsys_front';
  if (/KA[LI1]AGAYANG|KASARIAN|MARITAL\s*STAT|PAGKAKALOOB|DATE\s*OF\s*ISSUE/.test(t)) return 'philsys_back';
  return null;
}

function idTypeOf(side) {
  return side?.startsWith('philsys') ? 'philsys' : side;
}

// ---------------------------------------------------------------------------
// Main entry: the front photo and, optionally, the back
// ---------------------------------------------------------------------------

/**
 * @param {{ text: string, confidence?: number, slot?: 'front'|'back' }[]} images
 * @returns {{ idType: string|null, fields: object, warnings: string[], confidence: number|null }}
 */
export function parseIdImages(images) {
  const scanned = images.map((img) => ({ ...img, side: detectIdSide(img.text) }));
  const confidence = average(scanned.map((img) => img.confidence));
  const first = scanned.find((img) => img.side);
  if (!first) return { idType: null, fields: {}, warnings: [], confidence };

  const idType = idTypeOf(first.side);
  // A photo in the "back" slot that OCR couldn't place is taken to be the
  // back of the PhilSys ID whose front was recognised.
  for (const img of scanned) {
    if (!img.side && img.slot === 'back' && idType === 'philsys') img.side = 'philsys_back';
  }

  const warnings = [];
  const used = scanned.filter((img) => idTypeOf(img.side) === idType);
  if (used.length < scanned.length) {
    warnings.push(`Only your ${ID_LABELS[idType]} was read. The other photo doesn't look like the same ID.`);
  }

  let fields = {};
  if (idType === 'philsys') {
    const front = used.find((img) => img.side === 'philsys_front');
    const back = used.find((img) => img.side === 'philsys_back');
    if (front) fields = { ...fields, ...parsePhilSysFront(front.text, warnings) };
    if (back) fields = { ...fields, ...parsePhilSysBack(back.text, warnings) };
    if (!front) warnings.push('Add a photo of the front of your PhilSys ID to fill in your name, birth date and address.');
    if (!back) warnings.push('Add a photo of the back of your PhilSys ID to also fill in your sex and civil status.');
  } else if (idType === 'drivers_license') {
    fields = parseDriversLicense(used[0].text, warnings);
  } else if (idType === 'passport') {
    fields = parsePassport(used[0].text, warnings);
    warnings.push("Passports don't show an address, so type your permanent home address yourself.");
  }

  for (const key of Object.keys(fields)) {
    if (!fields[key]) delete fields[key];
  }
  const sides = used.map((img) => img.side);
  return { idType, sides, fields, warnings, confidence };
}

// The fields each ID (side) shows. A suffix is left out: most people have none.
const FIELDS_ON = {
  philsys_front: ['lastName', 'firstName', 'middleName', 'birthDate', 'address'],
  philsys_back: ['sex', 'civilStatus'],
  drivers_license: ['lastName', 'firstName', 'middleName', 'birthDate', 'sex', 'nationality', 'address'],
  passport: ['lastName', 'firstName', 'middleName', 'birthDate', 'sex', 'nationality'],
};

// Fields the photos should have given but didn't — a reason to try again
// with differently prepared photos.
export function missingFields(scan) {
  if (!scan.idType) return ['idType'];
  return scan.sides.flatMap((side) => FIELDS_ON[side] ?? []).filter((key) => !scan.fields[key]);
}

// Fills the gaps in a first scan with a second scan of the same photos.
// What the first scan read always wins.
export function combineScans(first, second) {
  if (!first.idType) return second;
  if (second.idType !== first.idType) return first;
  return {
    ...first,
    fields: { ...second.fields, ...first.fields },
    warnings: [...new Set([...first.warnings, ...second.warnings])],
  };
}

// ---------------------------------------------------------------------------
// PhilSys National ID
// ---------------------------------------------------------------------------

// Labels are matched loosely because OCR often garbles a letter or two
// ("Middie Name", "Tirahany/Addre").
const PHILSYS_FRONT_FIELDS = [
  { key: 'lastName', re: /LAST\s*NAM|^APELYID/i, kind: 'name' },
  { key: 'givenNames', re: /GIVEN\s*NAM|MGA\s*PANGAL/i, kind: 'name' },
  { key: 'middleName', re: /MID\w*\s*NAM|GITNANG/i, kind: 'name' },
  { key: 'birthDate', re: /DATE\s*OF\s*BIR|KAPANGANAKAN/i, kind: 'birthDate' },
  { key: 'address', re: /ADDR|TIRAHAN/i, kind: 'label' },
];

export function parsePhilSysFront(text, warnings = []) {
  const lines = toLines(text);
  const found = readFieldsInOrder(lines, PHILSYS_FRONT_FIELDS);
  const given = splitSuffix(cleanName(found.givenNames));
  // The address starts after its label — or after the last value read, if
  // the label was lost.
  const addressFrom = found.labelAt.address ?? found.lastIndex;
  return {
    lastName: cleanName(found.lastName),
    firstName: given.name,
    middleName: cleanName(found.middleName),
    suffix: given.suffix,
    birthDate: parseBirthDate(found.birthDate),
    address: readAddress(lines, addressFrom, warnings),
  };
}

export function parsePhilSysBack(text, warnings = []) {
  const upper = (text || '').toUpperCase();
  return {
    sex: readSexWord(upper),
    civilStatus: readCivilStatus(upper, warnings),
  };
}

// ---------------------------------------------------------------------------
// LTO Driver's License
// ---------------------------------------------------------------------------

export function parseDriversLicense(text, warnings = []) {
  const lines = toLines(text);

  // Name: "LAST, FIRST MIDDLE" on the line after its label — or, if the label
  // didn't come through, the first mostly-capitals line with a comma.
  let nameAt = -1;
  const nameLabel = labelIndex(lines, /LAST\s*NAM|FIRST\s*NAM/i);
  if (nameLabel >= 0 && looksLikeLicenseName(lines[nameLabel + 1])) nameAt = nameLabel + 1;
  if (nameAt < 0) nameAt = lines.findIndex(looksLikeLicenseName);
  const names = nameAt >= 0 ? splitLicenseName(lines[nameAt], warnings) : {};

  // Nationality, sex and birth date share one row: "PHL  M  1990/01/01  ..."
  let rowAt = lines.findIndex((line, i) => i > nameAt && findBirthDate(line));
  if (rowAt < 0) rowAt = lines.findIndex((line, i) => i > nameAt && /\bPHL\b/.test(line));
  const row = rowAt >= 0 ? lines[rowAt] : '';
  const birthDate = findBirthDate(row);
  const sex = readLicenseSex(row);
  const nationality = /\bPHL\b|FILIPINO/i.test(text) ? 'Filipino' : null;

  // Address: after its label, else the line after that row.
  let addressFrom = labelIndex(lines, /^\W*ADDR/i);
  if (addressFrom < 0) addressFrom = rowAt >= 0 ? rowAt : nameAt >= 0 ? nameAt + 1 : null;
  const address = readAddress(lines, addressFrom, warnings, 2);

  return { ...names, birthDate, sex, nationality, address };
}

function looksLikeLicenseName(line) {
  if (!line || !line.includes(',') || countDigits(line) > 1) return false;
  if (/REPUBLIC|DEPARTMENT|OFFICE/i.test(line)) return false;
  const [before, after] = splitOnce(line, ',');
  return Boolean(cleanName(before) && cleanName(after));
}

// The sex letter sits just before the birth date. OCR may double it ("mM")
// or misread F as "E" or "IE".
function readLicenseSex(row) {
  if (!row) return null;
  const tokens = row.split(/\s+/);
  const dateAt = tokens.findIndex((t) => /\d{2,4}\s*[/.-]/.test(t));
  const candidates = dateAt > 0 ? [tokens[dateAt - 1]] : tokens.slice(1, 3);
  for (const token of candidates) {
    const t = token.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (/^[MN]{1,2}$/.test(t)) return 'Male';
    if (/^(F{1,2}|E|IE|PF|FE)$/.test(t)) return 'Female';
  }
  return null;
}

// Licenses print given and middle names together, so the split is a guess:
// the middle name is the last word, plus any particle before it (DE LEON,
// DELA CRUZ). A suffix (JR, SR, III) sits between them and settles it.
const NAME_PARTICLES = new Set(['DE', 'DEL', 'DELA', 'DELOS', 'LOS', 'LA', 'LAS', 'SAN', 'STA', 'STA.', 'STO', 'STO.', 'VDA', 'VDA.']);

function splitLicenseName(line, warnings) {
  const [lastPart, restPart] = splitOnce(line, ',');
  const lastName = cleanName(lastPart);
  const tokens = cleanName(restPart).split(' ').filter(Boolean);
  if (tokens.length === 0) return { lastName };

  const suffixAt = tokens.findIndex((token, i) => i > 0 && suffixOf(token));
  if (suffixAt > 0) {
    return {
      lastName,
      firstName: tokens.slice(0, suffixAt).join(' '),
      suffix: suffixOf(tokens[suffixAt]),
      middleName: tokens.slice(suffixAt + 1).join(' '),
    };
  }

  if (tokens.length === 1) return { lastName, firstName: tokens[0] };
  let middleStart = tokens.length - 1;
  while (middleStart > 1 && NAME_PARTICLES.has(tokens[middleStart - 1])) middleStart -= 1;
  if (tokens.length >= 3) {
    warnings.push("Driver's licenses print the first and middle names together. Check that they were split correctly.");
  }
  return {
    lastName,
    firstName: tokens.slice(0, middleStart).join(' '),
    middleName: tokens.slice(middleStart).join(' '),
  };
}

// ---------------------------------------------------------------------------
// Passport
// ---------------------------------------------------------------------------

const PASSPORT_FIELDS = [
  { key: 'docRow', re: /PASSPORT\s*N|COUNTRY\s*CODE|URI\s*\/\s*TYPE/i, kind: 'docRow' },
  { key: 'surname', re: /SURNAM|^APELYID/i, kind: 'name' },
  { key: 'givenNames', re: /GIVEN\s*NAM|^PANGALAN/i, kind: 'name' },
  { key: 'middleName', re: /MID\w*\s*NAM|PANG\w*TNANG/i, kind: 'name' },
  { key: 'birthDate', re: /DATE\s*OF\s*BIR|PETSA\s*NG\s*KAPANGANAKAN/i, kind: 'birthDate' },
  { key: 'nationalityRow', re: /NATIONALITY|NASYONALIDAD/i, kind: 'label' },
  { key: 'issueRow', re: /DATE\s*OF\s*ISSUE|PAGKAKALOOB|VALID\s*UNTIL/i, kind: 'label' },
];

export function parsePassport(text, warnings = []) {
  const lines = toLines(text);
  const visual = readFieldsInOrder(lines, PASSPORT_FIELDS);
  const mrz = readMrz(lines);

  // Names: the printed name keeps spaces and Ñ, the machine-readable lines
  // OCR more reliably. Use the printed one when both agree.
  const lastName = pickName(cleanName(visual.surname), mrz.surname);
  const givenRaw = pickName(cleanName(visual.givenNames), mrz.givenTruncated ? null : mrz.givenNames);
  const given = splitSuffix(givenRaw);

  // The middle name is only printed, not in the machine-readable lines. If
  // its label was missed, it is the line after the given names. (A "middle
  // name" equal to the given name or surname means the lines were read out
  // of step — use the line after the given names then, too.)
  let middleName = cleanName(visual.middleName);
  if ([lastName, givenRaw].some((name) => name && lettersOnly(name) === lettersOnly(middleName))) middleName = '';
  if (!middleName && givenRaw) {
    const at = lines.findIndex((line) => lettersOnly(line) && lettersOnly(line) === lettersOnly(givenRaw));
    for (const next of at >= 0 ? lines.slice(at + 1, at + 3) : []) {
      if (countDigits(next) > 0 || /[<«]/.test(next)) break;
      if (ACCEPTS.name(next)) { middleName = cleanName(next); break; }
    }
  }

  let birthDate = mrz.birthDateValid ? mrz.birthDate : null;
  if (!birthDate) {
    birthDate = parseBirthDate(visual.birthDate) || mrz.birthDate || null;
    if (birthDate) warnings.push('Check your date of birth — it was hard to read.');
  }

  let sex = mrz.sex;
  if (!sex && visual.birthDate) sex = readSexLetter(visual.birthDate);

  let nationality = null;
  if (mrz.nationality === 'PHL' || /FILIPINO/i.test(text)) nationality = 'Filipino';

  return { lastName, firstName: given.name, middleName, suffix: given.suffix, birthDate, sex, nationality };
}

// The two 44-character lines at the bottom of the data page (ICAO 9303 TD3):
//   P<PHLSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<<
//   P1234567A1PHL9001011M3003046<<<<<<<<<<<<<<02
function readMrz(lines) {
  const out = {};
  const compact = lines.map((line) => line.replace(/\s+/g, '').replace(/[«‹([{]/g, '<'));

  // Lowercase letters never appear in these lines; OCR produces them from '<'.
  for (const line of compact.map((l) => l.replace(/[a-z]/g, '<'))) {
    const at = line.search(/[<K]PHL|^P.?PHL/);
    if (at < 0 || !line.includes('<<')) continue;
    const names = line.slice(line.indexOf('PHL', at) + 3);
    const split = names.indexOf('<<');
    if (split <= 0) continue;
    const rest = names.slice(split + 2);
    out.surname = mrzName(names.slice(0, split));
    out.givenNames = mrzName(rest.split('<<')[0]);
    out.givenTruncated = !rest.includes('<<');
    break;
  }

  // Nationality, birth date + check digit, sex, expiry + check digit.
  const D = '[0-9OoQDIlL|SsBZzGg]';
  const dataRe = new RegExp(`([A-Z<]{3})(${D}{6})(${D})([A-Z<])(${D}{6})(${D})`);
  for (const line of compact) {
    const m = line.match(dataRe);
    if (!m) continue;
    const birth = fixDigits(m[2]);
    out.nationality = m[1];
    out.birthDate = mrzDate(birth);
    out.birthDateValid = Boolean(out.birthDate) && mrzCheckDigit(birth) === fixDigits(m[3]);
    out.sex = m[4] === 'M' ? 'Male' : m[4] === 'F' ? 'Female' : null;
    break;
  }
  return out;
}

function mrzName(part) {
  return part
    .replace(/0/g, 'O').replace(/1/g, 'I').replace(/5/g, 'S').replace(/8/g, 'B').replace(/2/g, 'Z').replace(/6/g, 'G')
    .replace(/[^A-Z<]/g, '')
    .split('<').filter(Boolean).join(' ');
}

function mrzCheckDigit(value) {
  const weights = [7, 3, 1];
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    const n = c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
    total += n * weights[i % 3];
  }
  return String(total % 10);
}

function mrzDate(yymmdd) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = Number(yymmdd.slice(0, 2));
  const year = yy > new Date().getFullYear() % 100 ? 1900 + yy : 2000 + yy;
  return adultBirthDate(validDate(year, Number(yymmdd.slice(2, 4)), Number(yymmdd.slice(4, 6))));
}

// Printed name vs the machine-readable one:
//  - the same (ignoring spaces and Ñ→N): the printed one, which keeps
//    spaces and Ñ;
//  - a letter or two apart: the machine-readable one — OCR misread the
//    printed name;
//  - the machine-readable one is the printed one plus extra letters: the
//    printed one — OCR read some '<' as letters (often 'K');
//  - otherwise: the machine-readable one — the printed lines were probably
//    read out of step.
function pickName(printed, machine) {
  if (!machine) return printed || null;
  if (!printed) return machine;
  const strip = (s) => s.replace(/Ñ/g, 'N').replace(/[^A-Z]/g, '');
  const p = strip(printed);
  const m = strip(machine);
  const distance = editDistance(p, m);
  if (distance === 0) return printed;
  if (distance <= 2) return machine;
  if (p.length >= 3 && m.includes(p)) return printed;
  return machine;
}

function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// ---------------------------------------------------------------------------
// Reading labelled values
// ---------------------------------------------------------------------------

const CARD_HEADER = /REPUBLI|PILIPINAS|PAGKAKAKILANLAN|IDENTIFICATION\s*CARD|PASAPORTE|PASSPORT\b(?!\s*N)/i;

// What a value line of each kind must look like.
const ACCEPTS = {
  // Not a machine-readable line (has '<' or one very long run of letters).
  name: (line) =>
    countDigits(line) < 3 &&
    !/[<«]|[A-Za-z]{18,}/.test(line) &&
    cleanName(line).replace(/[^A-ZÑ]/g, '').length >= 2,
  birthDate: (line) => Boolean(parseBirthDate(line)),
  docRow: (line) => /\bPHL\b/i.test(line) && countDigits(line) >= 4,
  label: () => false,
};

// Reads values printed under their labels, in card order. A value is the
// first fitting line after its label. If OCR lost the label, it is the first
// fitting line after the previous value and before the next label found.
function readFieldsInOrder(lines, fields) {
  const labelAt = fields.map((field) => labelIndex(lines, field.re));
  const isLabel = (line) => fields.some((field) => field.re.test(line));
  const firstLabel = Math.min(...labelAt.filter((i) => i >= 0), lines.length);

  let cursor = 0;
  lines.forEach((line, i) => {
    if (i < firstLabel && CARD_HEADER.test(line)) cursor = i + 1;
  });

  const out = { labelAt: {}, lastIndex: cursor - 1 };
  fields.forEach((field, k) => {
    if (labelAt[k] >= 0) {
      out.labelAt[field.key] = labelAt[k];
      cursor = Math.max(cursor, labelAt[k] + 1);
    }
    const from = labelAt[k] >= 0 ? labelAt[k] + 1 : cursor;
    const later = labelAt.slice(k + 1).filter((i) => i >= from);
    let to = later.length ? Math.min(...later) : lines.length;
    if (labelAt[k] >= 0) to = Math.min(to, from + 2);

    for (let i = from; i < to; i += 1) {
      const line = lines[i];
      if (isLabel(line) || CARD_HEADER.test(line)) continue;
      if (ACCEPTS[field.kind](line)) {
        out[field.key] = line;
        cursor = i + 1;
        out.lastIndex = i;
        break;
      }
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function toLines(text) {
  return (text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function labelIndex(lines, re) {
  return lines.findIndex((line) => re.test(line));
}

function countDigits(s) {
  return (s || '').replace(/\D/g, '').length;
}

function capitalShare(s) {
  const letters = (s || '').replace(/[^A-Za-zÑñ]/g, '');
  if (!letters) return 0;
  return letters.replace(/[^A-ZÑ]/g, '').length / letters.length;
}

// IDs print names in capitals. Keep the words that are mostly capitals —
// on a mostly-capitals line, also longer words OCR partly lowercased — and
// drop single letters and noise ("a", "ee", "|") from the card's edges.
function cleanName(raw) {
  if (!raw) return '';
  const capitalsLine = capitalShare(raw) >= 0.6;
  return raw
    .split(' ')
    .map((token) => token.replace(/[^A-Za-zÑñ.'-]/g, ''))
    .filter((token) => {
      const letters = token.replace(/[^A-Za-zÑñ]/g, '');
      if (letters.length < 2) return false;
      return capitalShare(letters) > 0.5 || (capitalsLine && letters.length >= 3);
    })
    .map((token) => token.toUpperCase().replace(/^[.'-]+|[-']+$/g, ''))
    .filter(Boolean)
    .join(' ');
}

function lettersOnly(s) {
  return cleanName(s).replace(/[^A-ZÑ]/g, '');
}

const SUFFIXES = { JR: 'Jr.', SR: 'Sr.', II: 'II', III: 'III', IV: 'IV' };

// "JR", "JR.", "III" — and III as OCR often reads it ("ILL", "ITI", "1II").
function suffixOf(token) {
  const t = (token || '').replace(/\.$/, '').toUpperCase();
  if (SUFFIXES[t]) return SUFFIXES[t];
  if (/^[IL1T|]{3}$/.test(t) && t.includes('I')) return 'III';
  return null;
}

function splitSuffix(given) {
  const tokens = (given || '').split(' ').filter(Boolean);
  if (tokens.length > 1 && suffixOf(tokens[tokens.length - 1])) {
    return { name: tokens.slice(0, -1).join(' '), suffix: suffixOf(tokens[tokens.length - 1]) };
  }
  return { name: tokens.join(' ') || null, suffix: null };
}

function splitOnce(s, sep) {
  const i = s.indexOf(sep);
  return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + sep.length)];
}

// Up to `maxLines` lines after line `after`, stopping at the next label,
// the PhilSys card number, or a line with nothing in capitals.
function readAddress(lines, after, warnings, maxLines = 3) {
  if (after == null || after < -1) return null;
  const parts = [];
  let skipped = 0;
  for (let i = after + 1; i < lines.length && parts.length < maxLines; i += 1) {
    const line = lines[i];
    if (/\d{4}\s*-\s*\d{4}\s*-\s*\d{4}/.test(line)) break;           // PhilSys card number
    if (/[A-Z]\d{2}-\d{2}-\d{6}/.test(line)) break;                     // license number
    if (/LICEN[CS]E|EXPIRATION|AGENCY|BLOOD|DATE OF|PETSA/i.test(line)) break;
    const kept = line
      .split(' ')
      .filter((token) => {
        const lower = token.replace(/[^a-z]/g, '').length;
        const upper = token.replace(/[^A-ZÑ0-9]/g, '').length;
        return upper > 0 && (lower === 0 || (upper > lower && upper + lower >= 3));
      })
      .join(' ');
    if (!kept || kept.replace(/[^A-Z0-9]/g, '').length < 3) {
      // A garbled label line can sit between the label found and the value.
      if (parts.length === 0 && skipped === 0) { skipped += 1; continue; }
      break;
    }
    parts.push(kept);
  }
  if (parts.length === 0) return null;
  const address = parts
    .join(' ')
    .replace(/,?\s*PHILIPPINES\b/, '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/, '')
    .trim();
  if (address && !/\d{4}\s*$/.test(address)) warnings.push('Check your address — include your ZIP code if it is missing.');
  return address || null;
}

// --- dates ---

const MONTHS = {
  JAN: 1, ENE: 1, FEB: 2, PEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6, HUN: 6,
  JUL: 7, HUL: 7, AUG: 8, AGO: 8, SEP: 9, SET: 9, OCT: 10, OKT: 10, NOV: 11, NOB: 11, DEC: 12, DIS: 12,
};

// OCR often reads digits as look-alike letters.
function fixDigits(s) {
  return s
    .replace(/[OoQD]/g, '0').replace(/[IlL|!i]/g, '1').replace(/[Ss]/g, '5')
    .replace(/B/g, '8').replace(/[gq]/g, '9').replace(/[Zz]/g, '2').replace(/G/g, '6');
}

function validDate(year, month, day) {
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// A borrower is an adult, so a birth date is 18 to 100 years ago. This also
// keeps issue and expiry dates from being read as the birth date.
function adultBirthDate(iso) {
  if (!iso) return null;
  const now = new Date();
  const hadBirthday = iso.slice(5) <= now.toISOString().slice(5, 10);
  const age = now.getUTCFullYear() - Number(iso.slice(0, 4)) - (hadBirthday ? 0 : 1);
  return age >= 18 && age <= 100 ? iso : null;
}

// "JANUARY 01, 1990", "01 JAN 1990", "1990/01/01", "01/23/1990"
export function parseDate(raw) {
  if (!raw) return null;
  const s = raw.toUpperCase();
  const D = '[0-9OQDILSBZG|]';
  const monthFirst = new RegExp(`([A-Z]{3,9})\\.?\\s*(${D}{1,2}),?\\s+(${D}{4})`, 'g');
  for (const m of s.matchAll(monthFirst)) {
    const month = MONTHS[m[1].slice(0, 3)];
    const date = month && validDate(Number(fixDigits(m[3])), month, Number(fixDigits(m[2])));
    if (date) return date;
  }
  const dayFirst = new RegExp(`(${D}{1,2})\\s*([A-Z]{3,9})\\.?,?\\s+(${D}{4})`, 'g');
  for (const m of s.matchAll(dayFirst)) {
    const month = MONTHS[m[2].slice(0, 3)];
    const date = month && validDate(Number(fixDigits(m[3])), month, Number(fixDigits(m[1])));
    if (date) return date;
  }
  return findNumericDate(raw, (d) => d);
}

function parseBirthDate(raw) {
  if (!raw) return null;
  return adultBirthDate(parseDate(raw)) || findBirthDate(raw);
}

function findBirthDate(raw) {
  return findNumericDate(raw || '', adultBirthDate);
}

// The first numeric date that passes `accept` (so a license's expiry date
// or number is skipped).
function findNumericDate(raw, accept) {
  const D = '[0-9OoQDIlL|SsBZzGg]';
  const yearFirst = new RegExp(`(?<![0-9])(${D}{4})\\s*[/.-]\\s*(${D}{2})\\s*[/.-]\\s*(${D}{2})(?![0-9])`, 'g');
  for (const m of raw.matchAll(yearFirst)) {
    const date = accept(validDate(Number(fixDigits(m[1])), Number(fixDigits(m[2])), Number(fixDigits(m[3]))));
    if (date) return date;
  }
  const yearLast = new RegExp(`(?<![0-9])(${D}{2})\\s*[/.-]\\s*(${D}{2})\\s*[/.-]\\s*(${D}{4})(?![0-9])`, 'g');
  for (const m of raw.matchAll(yearLast)) {
    const date = accept(validDate(Number(fixDigits(m[3])), Number(fixDigits(m[1])), Number(fixDigits(m[2]))));
    if (date) return date;
  }
  return null;
}

// --- sex and civil status ---

function readSexWord(upper) {
  if (/\bFEMALE\b|\bBABAE\b/.test(upper)) return 'Female';
  if (/\bMALE\b|\bLALAKI\b/.test(upper)) return 'Male';
  return null;
}

// A lone M or F.
function readSexLetter(line) {
  if (!line) return null;
  for (const token of line.split(/\s+/)) {
    const t = token.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (t === 'M') return 'Male';
    if (t === 'F') return 'Female';
  }
  return null;
}

function readCivilStatus(upper, warnings) {
  if (/\bSINGLE\b/.test(upper)) return 'Single';
  if (/\bMARRIED\b/.test(upper)) return 'Married';
  if (/\bWIDOW(ED|ER)?\b/.test(upper)) return 'Widow/er';
  if (/\bSEPARATED\b/.test(upper)) return 'Separated';
  const other = upper.match(/\b(ANNULLED|DIVORCED)\b/);
  if (other) warnings.push(`Your ID says ${other[1]}. Choose the civil status that applies on the form.`);
  return null;
}

function average(numbers) {
  const valid = numbers.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
}
