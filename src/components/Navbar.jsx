import Button from './ui/Button';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Accounts', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
];

export default function Navbar({ onOpenChat }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-10 px-6 py-4">
        <a href="#top" className="mr-auto font-display text-xl font-semibold">
          Meridian Bank
        </a>
        <nav aria-label="Primary" className="hidden gap-7 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-accent-dark">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onOpenChat}>
            Chat with us
          </Button>
          <Button as="a" href="#login" variant="primary">
            Log in
          </Button>
        </div>
      </div>
    </header>
  );
}