const STEPS = [
  {
    title: 'Ask your question',
    copy: 'Type what you need in the chat — an account question, a card issue, anything at all.',
  },
  {
    title: 'Get an instant answer',
    copy: 'Our assistant matches common questions to a clear, ready answer, day or night.',
  },
  {
    title: 'Talk to a person if needed',
    copy: "Can't find it? The conversation hands off to a live agent, with everything you've typed carried over.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-2xl px-6 py-20">
      <div className="mb-11">
        <h2 className="mb-2 font-display text-3xl font-medium md:text-4xl">
          How the chat works
        </h2>
        <p className="text-ink-soft">Three steps, and a person is never more than one message away.</p>
      </div>
      <ol className="list-none">
        {STEPS.map((step, i) => (
          <li key={step.title} className="group relative flex gap-5 pb-9 last:pb-0">
            {i < STEPS.length - 1 && (
              <span
                className="absolute bottom-0 left-3.5 top-8 w-px bg-line"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent text-sm font-semibold text-white shadow-md shadow-accent/30 transition-transform duration-200 group-hover:scale-110">
              {i + 1}
            </span>
            <div>
              <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
              <p className="max-w-[42ch] text-sm text-ink-soft">{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}