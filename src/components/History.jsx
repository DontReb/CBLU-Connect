// Placeholder milestones — replace each year and description with the
// cooperative's actual, verified history before this goes live.

const MILESTONES = [
  { year: 'Conceptualization — 1991', copy: 'The Cooperative Bank of La Union (CBLU) was conceptualized on September 9, 1991 through the initiative of Chairman Amparo M. Aspiras of the La Union Ladies Association (LULA), inspired by the vision of former Agoo Mayor Jose Luis M. Aspiras to help poor communities overcome poverty through cooperative banking.' },
  { year: 'Authorization and Registration — 1993', copy: 'CBLU received its Certificate of Authority to Operate from the Bangko Sentral ng Pilipinas (BSP) on November 24, 1993. It was officially registered as a cooperative entity by the Cooperative Development Authority (CDA) on December 15, 1993.' },
  { year: 'Start of Operations — 1994', copy: 'On January 18, 1994, CBLU officially began operations in Consolacion, Agoo, La Union. The bank started with 26 cooperative members and a paid-up capital of ₱2.7 million, providing financial services primarily to cooperative members.' },
  { year: 'Growth and Present Day — Today', copy: 'After nearly three decades of operation, CBLU has grown to 178 cooperative owners with ₱15 million subscribed and paid-up capital, ₱33.362 million net worth, and ₱279.363 million total assets. The bank now operates from its building along National Highway, Sta. Barbara, Agoo, La Union, continuing to provide quality banking services to cooperatives and the general public.' },
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
            <li key={m.year} className="group relative flex gap-5 pb-10 last:pb-0">
              {i < MILESTONES.length - 1 && (
                <span
                  className="absolute bottom-0 left-3.5 top-8 w-px bg-line"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10 flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-accent bg-panel text-xs font-semibold text-accent transition-all duration-200 group-hover:scale-110 group-hover:bg-accent group-hover:text-white">
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