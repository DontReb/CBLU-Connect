const TRUST_POINTS = [
  '256-bit encryption protects every session, from login to logout.',
  'Licensed and regulated as a banking partner in every market we serve.',
  'Your data is never shared with third parties without your consent.',
];

export default function Security() {
  return (
    <section id="security" className="scroll-mt-24 bg-ink px-6 py-16 text-white">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
        {TRUST_POINTS.map((point) => (
          <div
            key={point}
            className="rounded-2xl border border-white/10 border-l-2 border-l-accent bg-white/5 p-6 backdrop-blur-sm"
          >
            <p className="text-sm text-slate-300">{point}</p>
          </div>
        ))}
      </div>
    </section>
  );
}