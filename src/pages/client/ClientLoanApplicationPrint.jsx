import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/cblu-logo.png';
import { useAuth } from '../../lib/authContext';
import './loanApplicationPrint.css';

// The client's loan application laid out like CBLU's paper form (Loan
// Application Form — Individual and Sole Proprietor, CBLU REV. 2023), ready
// to print, sign and bring to the bank, followed by the requirements
// checklist with the client's ticks.
//
// Values come from /api/forms/application; field keys match
// db/forms_seed.sql. Empty fields print blank so they can be written in by
// hand, and so do the parts of the form that stay on paper: the bank and
// other assets tables, trade and personal references, signatures and
// "For Bank's Use Only".

// Copied from CBLU's form, as printed.
const AUTHORIZATION_TEXT = [
  '1.) We affirm that the statement made in the application and the information given by me/us are true and correct and that any material misrepresentation or falsify therein will be construed as an act of to defraud COOPERATIVE BANK OF LA UNION, for which civil and criminal liability can be pursued against me/us. I/We agree to notify COOPERATIVE BANK OF LA UNION of any material change affecting the statements/information mentioned herein. I/We hereby authorize you to verify and investigate such statements/information as maybe required covering the application from above references or from other sources you may considered appropriate. For this purpose, We hereby waive my/our rights on the confidentiality of client information. Further, We agree that all statements/information gathered about me/us shall be used to determine my/our eligibility for this loan.',
  '2.) I/We certify that the proceeds of the loan, if this application is approved, will be used solely for the purpose sated in the application.',
  '3.) In case of disapproval, I/We understand that the bank is under no obligation to disclose the reason/s for such disapproval.',
];

// "For Bank's Use Only". Names are left for the bank to write in, so the
// printout stays right when staff change; add them here to pre-print them.
const BANK_SIGNATORIES = [
  { heading: 'Recommended for Approval:', name: '', title: 'LOAN OFFICER' },
  { heading: 'Approved By:', name: '', title: 'GENERAL MANAGER' },
];

// Margins are 0.35 in on every side; the page content is 7.75 x 12.2 in.
const PAPERS = {
  long: { label: 'Long bond paper — 8.5 × 13 in', w: 8.5, h: 13 },
  legal: { label: 'Legal — 8.5 × 14 in', w: 8.5, h: 14 },
  a4: { label: 'A4 — 8.27 × 11.69 in', w: 8.27, h: 11.69 },
  letter: { label: 'Letter / short bond — 8.5 × 11 in', w: 8.5, h: 11 },
};
const PAPER_STORAGE_KEY = 'cblu.printPaper';
const TOTAL_PAGES = 3;

function readSavedPaper() {
  try {
    const saved = localStorage.getItem(PAPER_STORAGE_KEY);
    return PAPERS[saved] ? saved : 'long';
  } catch {
    return 'long';
  }
}

// --- formatting ------------------------------------------------------------------

function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso || '';
}

function ageOn(iso, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  let age = today.getFullYear() - Number(m[1]);
  const beforeBirthday =
    today.getMonth() + 1 < Number(m[2]) || (today.getMonth() + 1 === Number(m[2]) && today.getDate() < Number(m[3]));
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? String(age) : '';
}

function formatAmount(value) {
  if (value === '' || value == null) return '';
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value;
}

// "JUAN S. DELA CRUZ JR." — for the signature lines.
function printedName(get, prefix) {
  const first = get(`${prefix}_first_name`);
  const last = get(`${prefix}_last_name`);
  if (!first && !last) return '';
  const middle = get(`${prefix}_middle_name`);
  const initials = middle ? `${middle.split(/\s+/).map((part) => part[0]).join('')}.` : '';
  return [first, initials, last, get(`${prefix}_ext_name`)].filter(Boolean).join(' ');
}

// --- building blocks -----------------------------------------------------------------

function Box({ checked }) {
  return (
    <span className="lp-box" aria-hidden="true">
      {checked ? '✓' : ''}
    </span>
  );
}

function Options({ options, value, labels = {}, spread = false }) {
  return (
    <span className={`lp-options${spread ? ' lp-spread' : ''}`}>
      {options.map((option) => (
        <span key={option} className="lp-option">
          <Box checked={value === option} />
          {labels[option] ?? option}
        </span>
      ))}
    </span>
  );
}

const spanOf = (span) => ({ gridColumn: `span ${span} / span ${span}` });

function Cell({ span, label, children, clamp = false, short = false, inline = false }) {
  return (
    <div className={`lp-cell${short ? ' lp-short' : ''}${inline ? ' lp-inline' : ''}`} style={spanOf(span)}>
      <span className="lp-label">{label}</span>
      <span className={`lp-value${clamp ? ' lp-clamp' : ''}`}>{children}</span>
    </div>
  );
}

function OptionCell({ span, label, children, short = false }) {
  return (
    <div className={`lp-cell${short ? ' lp-short' : ''}`} style={spanOf(span)}>
      <span className="lp-label">{label}</span>
      {children}
    </div>
  );
}

function HandTable({ title, columns, widths, rows = 3 }) {
  return (
    <div className="lp-section">
      {title && <div className="lp-subbar">{title}</div>}
      <table className="lp-table">
        {widths && (
          <colgroup>
            {widths.map((width, i) => (
              <col key={i} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((column) => (
                <td key={column} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Signature({ name, caption }) {
  return (
    <div>
      <div className="lp-signature-name">{name}</div>
      <div className="lp-signature-caption">{caption}</div>
      <div className="lp-signature-date" />
      <div className="lp-signature-caption">DATE</div>
    </div>
  );
}

function Page({ number, children, revision = false }) {
  return (
    <div className="lp-sheet">
      <div className="lp-page">
        <div className="lp-content">{children}</div>
        <div className="lp-footer">
          <span>{revision ? 'CBLU REV. 2023 (BH-        )' : ''}</span>
          <span>
            Page {number} of {TOTAL_PAGES}
          </span>
        </div>
      </div>
    </div>
  );
}

const ADDRESS_HINT = '(No.,Street, Subd./Bldg.Name,City/Municipality,Zip Code)';
const SHORT_INCOME = {
  'Php 50,001.00 to 75,000.00': 'Php 50,001.00 75,000.00',
  'Over Php 200,000.00': 'over 200,000.00',
};

// --- the form's blocks ------------------------------------------------------------------

// Borrower and the two co-borrowers/co-makers share this layout.
function PersonBlock({ prefix, get, optionsOf, borrower = false }) {
  const income = optionsOf(`${prefix}_gross_income`);
  return (
    <div className="lp-grid">
      <Cell span={5} label="Last name">{get(`${prefix}_last_name`)}</Cell>
      <Cell span={4} label="First name">{get(`${prefix}_first_name`)}</Cell>
      <Cell span={4} label="Middle name">{get(`${prefix}_middle_name`)}</Cell>
      <Cell span={2} label="Extension name">{get(`${prefix}_ext_name`)}</Cell>
      <Cell span={3} label="Date of birth">{formatDate(get(`${prefix}_birth_date`))}</Cell>
      <Cell span={2} label="Age">{ageOn(get(`${prefix}_birth_date`))}</Cell>
      <OptionCell span={4} label="Gender">
        <Options options={optionsOf(`${prefix}_gender`)} value={get(`${prefix}_gender`)} />
      </OptionCell>

      <Cell span={15} label={`Permanent home address ${ADDRESS_HINT}`}>{get(`${prefix}_permanent_address`)}</Cell>
      <Cell span={3} label="Citizenship">{get(`${prefix}_citizenship`)}</Cell>
      <Cell span={3} label="TIN">{get(`${prefix}_tin`)}</Cell>
      <Cell span={3} label="Cellphone no.">{get(`${prefix}_cellphone`)}</Cell>

      <Cell span={15} label={`Present home address ${ADDRESS_HINT}`}>{get(`${prefix}_present_address`)}</Cell>
      <Cell span={3} label="Years of stay">{get(`${prefix}_years_of_stay`)}</Cell>
      <OptionCell span={6} label="Civil status">
        <Options options={optionsOf(`${prefix}_civil_status`)} value={get(`${prefix}_civil_status`)} />
      </OptionCell>

      {borrower && (
        <>
          <OptionCell span={15} label="Home ownership" short>
            <span className="lp-options">
              {optionsOf('b_home_ownership').map((option) => (
                <span key={option} className="lp-option">
                  <Box checked={get('b_home_ownership') === option} />
                  {option === 'Rented' ? (
                    <>
                      Rented at P <b style={{ minWidth: '0.6in', borderBottom: '0.5pt solid #111' }}>{formatAmount(get('b_monthly_rent'))}</b> /Mo.
                    </>
                  ) : (
                    option
                  )}
                </span>
              ))}
            </span>
          </OptionCell>
          <Cell span={9} label="Number of family members" short>{get('b_family_members')}</Cell>
        </>
      )}

      <Cell span={14} label={<>Employer/business name <i>(if self employed)</i></>}>{get(`${prefix}_employer_name`)}</Cell>
      <Cell span={5} label="Position/title">{get(`${prefix}_position`)}</Cell>
      <Cell span={5} label="Years of employment/business">{get(`${prefix}_years_employed`)}</Cell>

      <Cell span={14} label={<>Employer/business address <i>(if self employed)</i></>}>{get(`${prefix}_employer_address`)}</Cell>
      <Cell span={5} label={borrower ? 'Contact no. of employer/business' : 'No. of employer/business'}>
        {get(`${prefix}_employer_contact`)}
      </Cell>
      <Cell span={5} label="Nature of job/business">{get(`${prefix}_nature_of_business`)}</Cell>

      <OptionCell span={24} label="Gross monthly income" short>
        <Options options={income} value={get(`${prefix}_gross_income`)} labels={SHORT_INCOME} spread />
      </OptionCell>
      {borrower && (
        <>
          <Cell span={24} label="Source of other income" short inline>{get('b_other_income_source')}</Cell>
          <OptionCell span={24} label="Other gross monthly income" short>
            <Options options={income} value={get('b_other_gross_income')} labels={SHORT_INCOME} spread />
          </OptionCell>
        </>
      )}
    </div>
  );
}

function SpouseBlock({ get, optionsOf }) {
  const income = optionsOf('s_gross_income');
  return (
    <div className="lp-grid">
      <Cell span={4} label="Last name">{get('s_last_name')}</Cell>
      <Cell span={3} label="First name">{get('s_first_name')}</Cell>
      <Cell span={3} label="Middle name">{get('s_middle_name')}</Cell>
      <Cell span={2} label="Extension name">{get('s_ext_name')}</Cell>
      <Cell span={3} label="Date of birth">{formatDate(get('s_birth_date'))}</Cell>
      <Cell span={2} label="Age">{ageOn(get('s_birth_date'))}</Cell>
      <Cell span={3} label="Citizenship">{get('s_citizenship')}</Cell>
      <Cell span={4} label="Cellphone no.">{get('s_cellphone')}</Cell>

      <Cell span={15} label={`Present home address ${ADDRESS_HINT}`}>{get('s_present_address')}</Cell>
      <OptionCell span={5} label="Occupation">
        <Options options={optionsOf('s_occupation')} value={get('s_occupation')} />
      </OptionCell>
      <Cell span={4} label="TIN">{get('s_tin')}</Cell>

      <Cell span={14} label={<>Employer/business name <i>(if self employed)</i></>}>{get('s_employer_name')}</Cell>
      <Cell span={5} label="Position/title">{get('s_position')}</Cell>
      <Cell span={5} label="Years of employment/business">{get('s_years_employed')}</Cell>

      <Cell span={14} label={<>Employer/business address <i>(if self employed)</i></>}>{get('s_employer_address')}</Cell>
      <Cell span={5} label="Contact no. of employer/business">{get('s_employer_contact')}</Cell>
      <Cell span={5} label="Nature of job/business">{get('s_nature_of_business')}</Cell>

      <OptionCell span={24} label="Gross monthly income" short>
        <Options options={income} value={get('s_gross_income')} labels={SHORT_INCOME} spread />
      </OptionCell>
      <Cell span={24} label="Source of other income" short inline>{get('s_other_income_source')}</Cell>
      <OptionCell span={24} label="Other gross monthly income" short>
        <Options options={income} value={get('s_other_gross_income')} labels={SHORT_INCOME} spread />
      </OptionCell>
    </div>
  );
}

function CollateralBlock({ get, optionsOf }) {
  // One registered owner per line on the online form; the paper form has three lines.
  const owners = get('col_registered_owners').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ownerLines = [owners[0], owners[1], owners.slice(2).join('; ')];
  return (
    <div className="lp-grid">
      <Cell span={13} label="TCT/OCT no/s" short inline>{get('col_tct_oct')}</Cell>
      <Cell span={11} label="Registered owner/s" short inline>{ownerLines[0]}</Cell>
      <Cell span={13} label="Tax declaration no." short inline>{get('col_tax_dec_no')}</Cell>
      <Cell span={11} label="Registered owner/s" short inline>{ownerLines[1]}</Cell>
      <div className="lp-cell lp-short lp-inline" style={spanOf(13)}>
        <span className="lp-label">Type of improvement</span>
        <Options options={optionsOf('col_improvement_type')} value={get('col_improvement_type')} />
      </div>
      <Cell span={11} label="Registered owner/s" short inline>{ownerLines[2]}</Cell>
      <Cell span={13} label="Description" short inline>{get('col_description')}</Cell>
      <Cell span={5} label="Lot area (sq.m.)" short inline>{get('col_lot_area')}</Cell>
      <Cell span={6} label="Floor area (sq.ms.)" short inline>{get('col_floor_area')}</Cell>
      <Cell span={13} label="Tax declaration no. improvement" short inline>{get('col_tax_dec_improvement')}</Cell>
      <Cell span={11} label="Location" short inline>{get('col_location')}</Cell>
      <Cell span={24} label="Others (chattel/certificate of time deposit/etc)" short inline>{get('col_others')}</Cell>
    </div>
  );
}

function RequirementsPage({ checklist, applicantName, printedOn }) {
  const items = checklist.items;
  const ready = items.filter((item) => item.checked).length;
  const missingRequired = items.filter((item) => item.isRequired && !item.checked);
  return (
    <>
      <div className="lp-header" style={{ borderBottom: '0.75pt solid #222', paddingBottom: '6pt' }}>
        <div className="lp-bank">
          <img src={logo} alt="" />
          <div>
            <div className="lp-bank-name">COOPERATIVE BANK OF LA UNION</div>
            <div className="lp-bank-sub">
              Sta. Barbara, Agoo, La Union
              <small>(072) 682 2227 / (072) 682 2228</small>
            </div>
          </div>
        </div>
        <div className="lp-title">
          REQUIREMENTS CHECKLIST
          <b>{checklist.checklistName || 'Documents to bring with your application form'}</b>
        </div>
      </div>
      <div className="lp-grid" style={{ marginTop: '8pt' }}>
        <Cell span={16} label="Applicant">{applicantName}</Cell>
        <Cell span={8} label="Printed on">{printedOn}</Cell>
      </div>
      <p style={{ margin: '8pt 0 5pt', fontSize: '8pt' }}>
        Bring these documents with your signed application form. A tick means you marked the document as
        ready in CBLU Connect: {ready} of {items.length} ready
        {missingRequired.length > 0
          ? `, ${missingRequired.length} required still to prepare.`
          : ', all required documents ready.'}
      </p>
      <table className="lp-table">
        <colgroup>
          <col style={{ width: '0.5in' }} />
          <col style={{ width: '2.3in' }} />
          <col />
          <col style={{ width: '0.8in' }} />
          <col style={{ width: '0.75in' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Ready</th>
            <th>Document</th>
            <th>Details</th>
            <th>Needed</th>
            <th>Received (bank)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td style={{ textAlign: 'center' }}>
                <Box checked={item.checked} />
              </td>
              <td>{item.label}</td>
              <td style={{ fontWeight: 400, fontSize: '7pt' }}>{item.description}</td>
              <td style={{ fontWeight: 400, fontSize: '7pt' }}>{item.isRequired ? 'Required' : 'If applicable'}</td>
              <td style={{ textAlign: 'center' }}>
                <Box checked={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="lp-grid" style={{ marginTop: '14pt' }}>
        <Cell span={12} label="Documents received by (bank staff)" />
        <Cell span={6} label="Date received" />
        <Cell span={6} label="Remarks" />
      </div>
    </>
  );
}

// --- page ---------------------------------------------------------------------------

export default function ClientLoanApplicationPrint() {
  const { user } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [application, setApplication] = useState(null);
  const [checklist, setChecklist] = useState({ checklistName: '', items: [] });
  const [paper, setPaper] = useState(readSavedPaper);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const [appRes, listRes] = await Promise.all([
          fetch('/api/forms/application', { credentials: 'include' }),
          fetch('/api/client/checklist', { credentials: 'include' }),
        ]);
        if (!appRes.ok) throw new Error('application');
        const appData = await appRes.json();
        const listData = listRes.ok ? await listRes.json() : { checklistName: '', items: [] };
        if (ignore) return;
        setApplication(appData);
        setChecklist(listData);
        setStatus('ready');
      } catch {
        if (!ignore) setStatus('error');
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const fieldByKey = useMemo(
    () => Object.fromEntries((application?.fields ?? []).map((field) => [field.fieldKey, field])),
    [application]
  );

  function choosePaper(next) {
    setPaper(next);
    try {
      localStorage.setItem(PAPER_STORAGE_KEY, next);
    } catch {
      // Not remembered — fine.
    }
  }

  if (status === 'loading') {
    return <p className="p-8 text-sm text-ink-soft">Preparing your application form…</p>;
  }
  if (status === 'error') {
    return (
      <div className="p-8 text-sm">
        <p className="text-red-700">Couldn't load your application. Try refreshing the page.</p>
        <Link to="/dashboard/client/loan-application" className="mt-3 inline-block font-medium text-accent-dark hover:underline">
          ← Back to your application
        </Link>
      </div>
    );
  }

  const values = application.values ?? {};
  const get = (key) => (values[key]?.value ?? '').trim();
  const optionsOf = (key) =>
    (fieldByKey[key]?.options ?? []).flatMap((option) => (typeof option === 'string' ? [option] : option.options));
  const missingRequired = application.fields.filter((field) => field.isRequired && !get(field.fieldKey));

  const size = PAPERS[paper];
  const zoom = Math.min(1, (size.w - 0.7) / 7.75, (size.h - 0.7) / 12.2);
  const printedOn = new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const [secured, unsecured] = fieldByKey.loan_type?.options ?? [];

  return (
    <div
      className="lp-root bg-paper py-6 print:bg-white print:py-0"
      style={{ '--lp-zoom': zoom, '--lp-paper-w': `${size.w}in`, '--lp-paper-h': `${size.h}in` }}
    >
      <style>{`@page { size: ${size.w}in ${size.h}in; margin: 0.35in; }`}</style>

      {/* Screen-only toolbar */}
      <div className="mx-auto mb-6 max-w-[8.5in] px-4 font-body print:hidden">
        <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link to="/dashboard/client/loan-application" className="text-sm font-medium text-accent-dark hover:underline">
              ← Back to your application
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              Print
            </button>
          </div>
          <h1 className="mt-4 font-display text-2xl font-medium text-ink">Your printable application</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Print it, sign it, attach a recent 2x2 ID picture, and bring it to the bank with the documents on
            the last page. Anything left blank can be written in by hand.
          </p>
          {missingRequired.length > 0 && (
            <p className="mt-3 rounded-xl bg-highlight/40 px-4 py-2.5 text-sm text-ink">
              {missingRequired.length} required {missingRequired.length === 1 ? 'field is' : 'fields are'} still empty
              and will print blank: {missingRequired.map((field) => field.label).join(', ')}.
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <label htmlFor="paper" className="font-medium text-ink">
              Paper size
            </label>
            <select
              id="paper"
              value={paper}
              onChange={(e) => choosePaper(e.target.value)}
              className="rounded-xl border border-line bg-panel px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {Object.entries(PAPERS).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-ink-soft">
              Choose the same paper in the print window, and turn off "Headers and footers".
            </span>
          </div>
        </div>
      </div>

      {/* Page 1 — front of the form */}
      <Page number={1}>
        <div className="lp-top">
          <div>
            <div className="lp-header">
              <div className="lp-bank">
                <img src={logo} alt="" />
                <div>
                  <div className="lp-bank-name">
                    COOPERATIVE BANK OF LA
                    <br />
                    UNION
                  </div>
                  <div className="lp-bank-sub">
                    Sta.barbara, agoo, La Union
                    <small>(072) 682 2227 / (072) 682 2228</small>
                  </div>
                </div>
              </div>
              <div className="lp-title">
                Loan Application FORM
                <b>Individual and Sole Proprietor</b>
              </div>
            </div>
            <div className="lp-instruction">Instruction: Please fill out this form completely with all the required information</div>
            <div className="lp-bar">LOAN DETAILS</div>
            <div className="lp-grid" style={{ gridTemplateColumns: '1.06fr 1fr' }}>
              {[secured, unsecured].filter(Boolean).map((group) => (
                <div key={group.group} className="lp-cell" style={{ display: 'flex', gap: '5pt' }}>
                  <span className="lp-label" style={{ width: '0.56in', flexShrink: 0 }}>
                    Loan type ({group.group})
                  </span>
                  <span className="lp-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 0 }}>
                    {group.options.map((option) => (
                      <span key={option} className="lp-option">
                        <Box checked={get('loan_type') === option} />
                        {option}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="lp-photo">
            Attach a recent
            <br />
            2x2 ID picture
          </div>
        </div>
        <div className="lp-grid" style={{ borderTop: 'none' }}>
          <Cell span={7} label="Amount applied">
            {get('amount_applied') && `Php ${formatAmount(get('amount_applied'))}`}
          </Cell>
          <OptionCell span={5} label="Facility">
            <Options options={optionsOf('facility')} value={get('facility')} />
          </OptionCell>
          <OptionCell span={12} label="Desired term">
            <Options options={optionsOf('desired_term')} value={get('desired_term')} spread />
          </OptionCell>
          <Cell span={7} label="Amount approved" />
          <Cell span={17} label="Loan purpose" clamp>
            {get('loan_purpose')}
          </Cell>
        </div>

        <div className="lp-section">
          <div className="lp-bar">BORROWER&apos;S DATA</div>
          <PersonBlock prefix="b" get={get} optionsOf={optionsOf} borrower />
        </div>

        <div className="lp-section">
          <div className="lp-bar">SPOUSE&apos;S PERSONAL DATA</div>
          <SpouseBlock get={get} optionsOf={optionsOf} />
        </div>

        <div className="lp-section">
          <div className="lp-bar">
            COLLATERAL DETAILS <i>(For Collateralized Loan)</i>
          </div>
          <CollateralBlock get={get} optionsOf={optionsOf} />
        </div>

        <div className="lp-section">
          <div className="lp-bar">BANK AND OTHER ASSETS INFORMATION</div>
          <div className="lp-pair">
            <HandTable title="BANK DEPOSITS" columns={['Account type', 'Bank name', 'Balance']} />
            <HandTable title="AUTOMOBILES" columns={['Model', 'Type', 'Year', 'Purchase price']} />
          </div>
          <HandTable
            title="REAL ESTATE PROPERTY"
            columns={['Location/address', 'Description', 'Lot area', 'Floor area', 'Market value']}
            widths={['33%', '24%', '13%', '13%', '17%']}
          />
          <div className="lp-section">
            <div className="lp-bar lp-bar-small">
              CREDIT INFORMATION <i>(LOANS/MORTGAGES)</i>
            </div>
            <HandTable
              columns={["Loan type", "Creditor's name", "Creditor's address", 'Outstanding balance', 'Amortization', 'Date granted', 'Maturity date']}
              widths={['10%', '17%', '22%', '15%', '12%', '12%', '12%']}
            />
          </div>
        </div>
      </Page>

      {/* Page 2 — back of the form */}
      <Page number={2} revision>
        <div className="lp-section" style={{ marginTop: 0 }}>
          <div className="lp-bar">
            TRADE REFERENCES INFORMATION <i>(For Self-Employed Only)</i>
          </div>
          <HandTable
            columns={['Name of supplier or customer', 'Address', 'Years of dealings', 'Contact person and no.']}
            widths={['26%', '29%', '17%', '28%']}
            rows={2}
          />
        </div>
        <div className="lp-section">
          <div className="lp-bar">
            PERSONAL REFERENCE <i>(Other than Relatives)</i>
          </div>
          <HandTable
            columns={['Name', 'Address', 'Contact no.', 'Relationship']}
            widths={['26%', '29%', '17%', '28%']}
            rows={2}
          />
        </div>

        <div className="lp-section">
          <div className="lp-bar">CO-BORROWER/CO-MAKERS INFORMATION - 1</div>
          <PersonBlock prefix="c1" get={get} optionsOf={optionsOf} />
        </div>
        <div className="lp-section">
          <div className="lp-bar">CO-BORROWER/CO-MAKERS INFORMATION - 2</div>
          <PersonBlock prefix="c2" get={get} optionsOf={optionsOf} />
        </div>

        <div className="lp-section">
          <div className="lp-bar">AUTHORIZATION AND UNDERTAKING</div>
          <div className="lp-text">
            {AUTHORIZATION_TEXT.map((paragraph) => (
              <p key={paragraph.slice(0, 4)}>{paragraph}</p>
            ))}
          </div>
          <div className="lp-signatures">
            <Signature name={printedName(get, 'b')} caption="PRINTED NAME AND SIGNATURE OF BORROWER" />
            <Signature name={printedName(get, 's')} caption="PRINTED NAME AND SIGNATURE OF SPOUSE" />
            <Signature name={printedName(get, 'c1')} caption="PRINTED NAME AND SIGNATURE OF CO-BORROWER/CO-MAKER" />
            <Signature name={printedName(get, 'c2')} caption="PRINTED NAME AND SIGNATURE OF CO-BORROWER/CO-MAKER" />
          </div>
        </div>

        <div className="lp-section">
          <div className="lp-bar lp-bar-small">For Bank&apos;s Use Only</div>
          <div className="lp-bank-use">
            {BANK_SIGNATORIES.map((signatory) => (
              <div key={signatory.title}>
                <div>{signatory.heading}</div>
                <div className="lp-sign-line" style={{ textAlign: 'center', fontWeight: 700 }}>
                  {signatory.name}
                </div>
                <div className="lp-sign-title">{signatory.title}</div>
              </div>
            ))}
            <div>
              <div>Date of Approval</div>
              <div className="lp-sign-line" />
            </div>
          </div>
        </div>
      </Page>

      {/* Page 3 — requirements checklist */}
      <Page number={3}>
        <RequirementsPage
          checklist={checklist}
          applicantName={printedName(get, 'b') || user?.fullName || ''}
          printedOn={printedOn}
        />
      </Page>
    </div>
  );
}
