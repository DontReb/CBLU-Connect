import { Link } from 'react-router-dom';
import Button from './ui/Button';
import logo from '../assets/cblu-logo.png';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Accounts', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Find us', href: '#location' },
];

export default function Navbar({ onOpenChat }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-paper/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-10 px-6 py-3">
        <a href="#top" className="mr-auto flex items-center gap-2.5 transition-opacity hover:opacity-75">
          <img src={logo} alt="Cooperative Bank of La Union" className="h-10 w-10 rounded-full object-contain" />
          <span className="font-display text-xl font-semibold">CBLU</span>
        </a>
        <nav aria-label="Primary" className="hidden gap-7 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="group relative py-1 hover:text-accent-dark">
              {link.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent-dark transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onOpenChat}>
            Chat with us
          </Button>
          <Button as={Link} to="/login" variant="primary">
            Log in
          </Button>
        </div>
      </div>
    </header>
  );
}