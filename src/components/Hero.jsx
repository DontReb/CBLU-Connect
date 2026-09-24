export default function Hero({ onOpenChat }) {
  return (
    <section className="hero" id="top">
      <div className="hero__copy">
        <h1>Banking questions, answered plainly.</h1>
        <p>
          Ask about accounts, cards, or loans and get a straight answer in
          seconds. If it needs a person, we'll bring one into the
          conversation — no phone tree required.
        </p>
        <div className="hero__actions">
          <button type="button" className="btn btn--primary" onClick={onOpenChat}>
            Ask a question
          </button>
          <a className="btn btn--ghost" href="#features">
            Explore accounts
          </a>
        </div>
      </div>
      <div className="hero__mark" aria-hidden="true">
        <svg viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="92" stroke="var(--ink)" strokeWidth="1" />
          <circle cx="120" cy="120" r="64" stroke="var(--ink)" strokeWidth="1" />
          <circle cx="120" cy="120" r="36" stroke="var(--brass)" strokeWidth="2" />
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
                stroke="var(--ink)"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}