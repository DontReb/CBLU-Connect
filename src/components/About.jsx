const MISSION_LINES = [
  { letter: 'C', rest: 'ommitted to provide innovative products and services for financial sustainability.' },
  { letter: 'B', rest: 'e an active player in the economic growth of Agri-Agra and MSMEs sectors.' },
  { letter: 'L', rest: 'ead in the advocacy for saving mobilization, financial literacy and independence.' },
  {
    letter: 'U',
    rest: 'ndertake appropriate seminars and trainings for the professional growth of officers and staff towards service excellence.',
  },
];

const VISION_TEXT =
  'A financially stable and growing cooperative bank in Northern Luzon practicing good governance by providing affordable and effective banking services that responds to the needs of its stakeholders in the countryside development.';

const TAGLINE = 'Let your money grow with CBLU';

export default function About() {
  return (
    <section id="about" className="relative scroll-mt-24 overflow-hidden px-6 py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--color-accent)_0%,transparent_70%)] opacity-15 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="mb-12 max-w-xl">
          <h2 className="mb-2 font-display text-3xl font-medium md:text-4xl">Who we are</h2>
          <p className="text-ink-soft">
            Cooperative Bank of La Union has served the province since 1993 — here's what guides us.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-panel p-8 shadow-sm">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/50 text-accent-dark">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <h3 className="mb-4 text-lg font-semibold">Mission</h3>
            <div className="space-y-3">
              {MISSION_LINES.map((line) => (
                <p key={line.letter} className="text-sm leading-relaxed text-ink-soft">
                  <span className="mr-1 font-display text-2xl font-semibold text-accent">{line.letter}</span>
                  {line.rest}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-panel p-8 shadow-sm">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/50 text-accent-dark">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </span>
            <h3 className="mb-2 text-lg font-semibold">Vision</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{VISION_TEXT}</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-accent-light/40 px-6 py-5 text-center">
          <p className="font-display text-lg italic text-ink">"{TAGLINE}"</p>
        </div>
      </div>
    </section>
  );
}