const FEATURES = [
  {
    title: 'Everyday accounts',
    copy: 'Checking and savings built for daily use, with no hidden fees to track down.',
  },
  {
    title: 'Cards',
    copy: 'Debit and credit cards with real-time spend alerts and an instant freeze switch.',
  },
  {
    title: 'Loans & mortgages',
    copy: 'Personal, auto, and home loans with rates that are clear from application to payoff.',
  },
  {
    title: 'Digital banking',
    copy: 'Move money, pay bills, and check balances from your phone or your browser.',
  },
  {
    title: 'Security',
    copy: 'Fraud monitoring and two-factor sign-in on every account, running at all times.',
  },
  {
    title: 'Branches & ATMs',
    copy: 'Find a nearby branch or a fee-free ATM in seconds, wherever you are.',
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-24 px-6 py-20">
      <div className="mx-auto mb-11 max-w-xl">
        <h2 className="mb-2 font-display text-3xl font-medium md:text-4xl">
          What you can ask about
        </h2>
        <p className="max-w-md text-ink-soft">
          The assistant covers most day-to-day questions across these areas.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-line bg-panel p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
          >
            <h3 className="mb-1.5 text-lg font-semibold">{feature.title}</h3>
            <p className="text-sm text-ink-soft">{feature.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}