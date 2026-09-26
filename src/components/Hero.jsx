import Button from './ui/Button';

export default function Hero({ onOpenChat }) {
  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--color-accent-light)_0%,transparent_70%)] opacity-40 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-20 md:grid-cols-[1fr_18rem]">
        <div>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
            Chat support, seven days a week
          </span>
          <h1 className="mb-5 max-w-[18ch] font-display text-5xl font-medium leading-[1.05] md:text-7xl">
            Banking questions, answered plainly.
          </h1>
          <p className="mb-8 max-w-[46ch] text-lg text-ink-soft">
            Ask about accounts, cards, or loans and get a straight answer in
            seconds. If it needs a person, we'll bring one into the
            conversation — no phone tree required.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Button variant="primary" onClick={onOpenChat}>
              Ask a question
            </Button>
            <Button as="a" href="#features" variant="ghost">
              Explore accounts
            </Button>
          </div>
        </div>
        <div className="relative mx-auto w-40 md:mx-0 md:w-full" aria-hidden="true">
          <svg viewBox="0 0 240 240" fill="none">
            <circle cx="120" cy="120" r="92" stroke="var(--color-ink)" strokeWidth="1" />
            <circle cx="120" cy="120" r="64" stroke="var(--color-ink)" strokeWidth="1" />
            <circle cx="120" cy="120" r="36" stroke="var(--color-accent)" strokeWidth="2" />
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i / 24) * Math.PI * 2;
              const x1 = 120 + Math.cos(angle) * 96;
              const y1 = 120 + Math.sin(angle) * 96;
              const x2 = 120 + Math.cos(angle) * 104;
              const y2 = 120 + Math.sin(angle) * 104;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--color-ink)"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}