// Placeholder copy throughout this section — swap in the cooperative's
// verified mission, vision, and value statements before this goes live.

const VALUE_PILLARS = [
  'Add a short value statement (e.g. member-owned, community-first).',
  'Add a short value statement (e.g. locally rooted since [year]).',
  'Add a short value statement (e.g. regulated by [authority]).',
];

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
            Placeholder copy below — replace with the cooperative's verified mission, vision, and history before launch.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-panel p-8 shadow-sm">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/50 text-accent-dark">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <h3 className="mb-2 text-lg font-semibold">Mission</h3>
            <p className="text-sm text-ink-soft">
              Add the cooperative's official mission statement here — a concise sentence on who you serve and why the cooperative exists.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-panel p-8 shadow-sm">
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-light/50 text-accent-dark">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
            </span>
            <h3 className="mb-2 text-lg font-semibold">Vision</h3>
            <p className="text-sm text-ink-soft">
              Add the cooperative's official vision statement here — where the cooperative aims to be in the years ahead.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {VALUE_PILLARS.map((pillar) => (
            <div
              key={pillar}
              className="rounded-2xl border border-dashed border-line px-5 py-4 text-sm text-ink-soft"
            >
              {pillar}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}