import Button from './ui/Button';
import branchPhoto from '../assets/branch-hero.jpg';

export default function Hero({ onOpenChat }) {
  return (
    <section
      id="top"
      className="relative flex min-h-[34rem] scroll-mt-24 items-end overflow-hidden bg-cover bg-center md:min-h-[38rem]"
      style={{ backgroundImage: `url(${branchPhoto})` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-24 text-white">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-highlight" />
          Chat support, seven days a week
        </span>
        <h1 className="mb-5 max-w-[20ch] font-display text-5xl font-medium leading-[1.05] md:text-7xl">
          Banking questions, answered plainly.
        </h1>
        <p className="mb-8 max-w-[46ch] text-lg text-white/85">
          Ask about accounts, cards, or loans and get a straight answer in
          seconds. If it needs a person, we'll bring one into the
          conversation — no phone tree required.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <Button variant="primary" onClick={onOpenChat}>
            Ask a question
          </Button>
          <Button as="a" href="#features" variant="ghostLight">
            Explore accounts
          </Button>
        </div>
      </div>
    </section>
  );
}