// Placeholder milestones — replace each year and description with the
// cooperative's actual, verified history before this goes live.

const MILESTONES = [
  { year: 'Founding — [Year]', copy: 'Add a milestone — how and why the cooperative was founded.' },
  { year: 'Growth — [Year]', copy: 'Add a milestone — a major expansion, branch, or new service.' },
  { year: 'Recognition — [Year]', copy: 'Add a milestone — an award, certification, or regulatory milestone.' },
  { year: 'Today', copy: 'Add where the cooperative stands now and what it currently offers.' },
];

export default function History() {
  return (
    <section id="history" className="scroll-mt-24 border-y border-line bg-panel px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <div className="mb-14">
          <h2 className="mb-2 font-display text-3xl font-medium md:text-4xl">Our history</h2>
          <p className="text-ink-soft">
            A placeholder timeline — replace each milestone with a verified date and event.
          </p>
        </div>
        <ol className="list-none">
          {MILESTONES.map((m, i) => (
            <li key={m.year} className="relative flex gap-5 pb-10 last:pb-0">
              {i < MILESTONES.length - 1 && (
                <span
                  className="absolute bottom-0 left-3.5 top-8 w-px bg-line"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-accent bg-panel text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <div>
                <span className="mb-1 block text-sm font-semibold text-accent-dark">{m.year}</span>
                <p className="max-w-md text-sm text-ink-soft">{m.copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}