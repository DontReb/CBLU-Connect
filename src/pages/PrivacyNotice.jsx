import { Link } from 'react-router-dom';
import logo from '../assets/cblu-logo.png';
import { PRIVACY_CONTACT, PRIVACY_NOTICE_VERSION } from '../../shared/privacy.js';

// The full privacy notice for CBLU Connect (Data Privacy Act of 2012, RA
// 10173). Public: linked from the footer, the login page, the consent
// screen and the client's Privacy page. Keep it in step with what the
// system really does; if the change is one clients should agree to again,
// also change PRIVACY_NOTICE_VERSION in shared/privacy.js.

const EFFECTIVE_DATE = new Date(`${PRIVACY_NOTICE_VERSION}T00:00:00+08:00`).toLocaleDateString('en-PH', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Manila',
});

const WHAT_WE_COLLECT = [
  {
    what: 'Account details',
    detail: 'Your name, email, mobile number, branch and account number.',
    when: 'When the bank opens your portal account.',
    kept: 'While you have an account.',
  },
  {
    what: 'Loan application details',
    detail:
      'What you fill in on the loan form: loan details, name, date of birth, sex, civil status, citizenship, TIN, addresses, employment and income, home ownership, collateral, and your spouse’s details if you give them.',
    when: 'When you type them, or when an ID scan fills them in.',
    kept: 'With your application, for as long as banking rules require the bank to keep loan records.',
  },
  {
    what: 'Photo of your ID (only if you choose the ID scan)',
    detail: 'Read on our server to fill in your form.',
    when: 'When you tap “Read my ID”.',
    kept: 'Not kept: deleted as soon as it is read. We keep only the ID type and the time of the scan.',
  },
  {
    what: 'Face check pictures (only if you choose the face check)',
    detail:
      'About 16 pictures from your camera, compared with your ID photo and checked to make sure a real person is there.',
    when: 'During the face check.',
    kept: 'Not kept: deleted as soon as they are checked. No face data is stored. We keep the result (passed or not, the reason, the match scores and timings).',
  },
  {
    what: 'Requirements checklist',
    detail: 'Which requirements you have ticked as ready. No documents are uploaded.',
    when: 'When you tick them.',
    kept: 'While you have an account.',
  },
  {
    what: 'Live chat',
    detail:
      'Your messages with our live agents, and the chatbot messages just before you asked for an agent. Chatbot conversations that don’t go to an agent are not saved.',
    when: 'When you ask for a live agent.',
    kept: 'While you have an account.',
  },
  {
    what: 'Security records',
    detail: 'Login tries (the email typed, internet address, time, and whether it worked) and your consent choices.',
    when: 'Each time you log in, or agree or withdraw.',
    kept: 'Login tries: 30 days. Consent choices: kept as proof of what you agreed to.',
  },
];

const RIGHTS = [
  ['Be informed', 'whether and how your personal information is used (this notice).'],
  ['Access', 'a copy of your personal information and how it has been used.'],
  ['Object', 'to processing, and withdraw your consent at any time.'],
  ['Correct', 'information that is wrong or out of date. You can fix most form details yourself.'],
  ['Erasure or blocking', 'of information that is no longer needed, was collected unlawfully, or that you withdrew consent for.'],
  ['Data portability', 'a copy of your information in a common electronic format.'],
  ['Damages', 'if you are harmed by inaccurate, wrongly obtained or unauthorised use of your information.'],
  ['File a complaint', 'with the National Privacy Commission (privacy.gov.ph).'],
];

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-lg font-semibold text-ink">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export function PrivacyContactDetails() {
  const { controller, dpoName, dpoEmail, address, phone } = PRIVACY_CONTACT;
  return (
    <address className="not-italic">
      <span className="font-medium">Data Protection Officer{dpoName ? `: ${dpoName}` : ''}</span>
      <br />
      {controller}
      <br />
      {address}
      <br />
      {phone}
      {dpoEmail && (
        <>
          <br />
          <a href={`mailto:${dpoEmail}`} className="text-accent-dark underline">
            {dpoEmail}
          </a>
        </>
      )}
    </address>
  );
}

export default function PrivacyNotice() {
  return (
    <div className="min-h-screen bg-paper px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <img src={logo} alt="" className="h-9 w-9 rounded-full object-contain" />
          <span className="font-display text-lg font-semibold text-ink">CBLU</span>
        </Link>

        <article className="rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-10">
          <h1 className="font-display text-3xl font-medium text-ink">Privacy Notice</h1>
          <p className="mt-1 text-sm text-ink-soft">
            CBLU Connect · Version {PRIVACY_NOTICE_VERSION} · Effective {EFFECTIVE_DATE}
          </p>

          <p className="mt-6 text-sm leading-relaxed text-ink">
            Cooperative Bank of La Union (“CBLU”, “we”) runs CBLU Connect, the online portal where our
            clients prepare loan applications. This notice explains what personal information the portal
            collects, why, who can see it, how long we keep it, and your rights under the Data Privacy Act
            of 2012 (Republic Act No. 10173). CBLU is the personal information controller: we decide how
            your information is used and are responsible for it.
          </p>

          <Section id="collect" title="1. What we collect">
            {/* Stacked on phones, three columns from the sm breakpoint up. */}
            <div className="overflow-hidden rounded-2xl border border-line">
              <div
                aria-hidden="true"
                className="hidden bg-paper px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid sm:grid-cols-[1.4fr_1fr_1.2fr] sm:gap-4"
              >
                <span>Information</span>
                <span>When</span>
                <span>How long we keep it</span>
              </div>
              <ul className="divide-y divide-line">
                {WHAT_WE_COLLECT.map((row) => (
                  <li key={row.what} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1.2fr] sm:gap-4">
                    <div>
                      <p className="font-medium text-ink">{row.what}</p>
                      <p className="mt-0.5 text-ink-soft">{row.detail}</p>
                    </div>
                    <p>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft sm:sr-only">
                        When
                      </span>
                      {row.when}
                    </p>
                    <p>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft sm:sr-only">
                        How long we keep it
                      </span>
                      {row.kept}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p>
              Your date of birth (age), civil status, TIN and ID numbers are <em>sensitive personal
              information</em> under the law. We use them only with your consent, given before you fill in
              the form.
            </p>
          </Section>

          <Section id="why" title="2. Why we use it">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium">To prepare and process your loan application</span>, including
                printing your form and checking your requirements, with your consent.
              </li>
              <li>
                <span className="font-medium">To fill in your form from your ID and confirm the ID is yours</span>{' '}
                (ID scan and face check), only if you choose them and agree separately.
              </li>
              <li>
                <span className="font-medium">To answer your questions</span> through the chatbot and our live
                agents.
              </li>
              <li>
                <span className="font-medium">To keep your account safe</span>: limiting wrong-password tries and
                keeping a record of logins. This is in the bank’s and your legitimate interest.
              </li>
              <li>
                <span className="font-medium">To meet our legal duties</span> as a bank, such as keeping loan
                records and answering lawful orders of regulators and courts.
              </li>
            </ul>
            <p>We do not sell your information and do not use it for advertising.</p>
          </Section>

          <Section id="who" title="3. Who can see it">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <span className="font-medium">CBLU staff who need it</span>: administrators see your application
                progress, ticked requirements and face check results; live agents see the chats they handle.
              </li>
              <li>
                <span className="font-medium">Our service providers</span>: Vercel (hosting) and Neon (database)
                store and process the portal’s data for us, following our instructions. Their servers may be
                outside the Philippines; we remain responsible for your information wherever it is processed.
                The ID scan and face check run on our own servers; no outside AI service sees your photos.
              </li>
              <li>
                <span className="font-medium">Government bodies</span>, such as the Bangko Sentral ng Pilipinas,
                the Anti-Money Laundering Council or the courts, only when the law requires it.
              </li>
            </ul>
          </Section>

          <Section id="protect" title="4. How we protect it">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>All connections to the portal are encrypted (HTTPS).</li>
              <li>Passwords are stored scrambled (hashed), so no one can read them, not even our staff.</li>
              <li>Logging in pauses after repeated wrong passwords.</li>
              <li>Each staff role sees only what that role needs.</li>
              <li>ID photos and face check pictures are deleted as soon as they are checked.</li>
            </ul>
          </Section>

          <Section id="choices" title="5. Your choices and consent">
            <p>
              <span className="font-medium">Using the portal</span> needs your consent, because the loan form
              asks for sensitive personal information. If you don’t agree, you can still apply in person at any
              CBLU branch.
            </p>
            <p>
              <span className="font-medium">The ID scan and face check</span> are optional and need a separate
              consent. Without them, you can type your details yourself and have your ID checked at the branch.
            </p>
            <p>
              <span className="font-medium">You can withdraw either consent at any time</span> on the Privacy page
              of your client dashboard, as easily as you gave it. Withdrawing stops further use from then on; it
              does not undo what was done before. Information already saved stays with your application until
              you ask us to delete it, except what the bank must keep by law.
            </p>
          </Section>

          <Section id="others" title="6. Information about other people">
            <p>
              If you give us your spouse’s or anyone else’s details, please tell them, and make sure they agree
              to the bank using them for your application.
            </p>
          </Section>

          <Section id="rights" title="7. Your rights">
            <p>Under the Data Privacy Act, you have the right to:</p>
            <ul className="space-y-1.5">
              {RIGHTS.map(([right, detail]) => (
                <li key={right}>
                  <span className="font-medium">{right}</span> — {detail}
                </li>
              ))}
            </ul>
            <p>
              To use these rights, or to ask a question about your information, contact our Data Protection
              Officer below. We may ask you to prove who you are first.
            </p>
          </Section>

          <Section id="changes" title="8. Changes to this notice">
            <p>
              When we change this notice in a way that affects you, we will show you the new version and ask
              for your consent again the next time you log in.
            </p>
          </Section>

          <Section id="contact" title="9. Contact us">
            <PrivacyContactDetails />
          </Section>
        </article>

        <p className="mt-6 text-center text-sm text-ink-soft">
          <Link to="/" className="hover:text-accent-dark">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
