import { useEffect, useState } from 'react';

// Edit this array to change the wording or add more steps. It loops
// continuously: every HOLD_MS it advances to the next phrase (wrapping
// back to the start), cross-fading over TRANSITION_MS.
const PHRASES = [
  'Welcome to Cooperative Bank of La Union Web Portal',
  'Banking questions, answered plainly.',
];

const HOLD_MS = 2600;
const TRANSITION_MS = 700;

export default function AnimatedHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % PHRASES.length);
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    // Fixed height + overflow-hidden — this box never resizes, so nothing
    // below it (paragraph, buttons) can ever shift when the phrase changes.
    // Bump h-48/h-72 further if the longest phrase ever clips on some
    // screen size — these have a safety margin but aren't pixel-tested.
    <div className="relative mb-5 h-48 overflow-hidden md:h-72">
      {PHRASES.map((phrase, i) => {
        const isActive = i === index;
        return (
          <h1
            key={phrase}
            aria-hidden={!isActive}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
            className={`absolute inset-0 flex items-center font-display text-3xl font-medium leading-[1.15] transition-all ease-out md:text-6xl ${
              isActive
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none translate-y-4 opacity-0'
            }`}
          >
            {phrase}
          </h1>
        );
      })}
    </div>
  );
}