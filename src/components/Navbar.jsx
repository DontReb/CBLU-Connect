const NAV_LINKS = [
    { label: 'Personal Banking', href: '#features' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Security', href: '#security' },
    { label: 'Support', href: '#footer' },
];

export default function Navbar({ onOpenChat }) {
    return (
        <header className="nav">
            <div className="nav__inner">
                <a className="nav__brand" href="#top">
                    CBLU Cooperative Bank of La Union
                </a>
                <nav className="nav__links" aria-label="Primary">
                    {NAV_LINKS.map((link) => (
                        <a key={link.href} href={link.href}>
                            {link.label}
                        </a>
                    ))}
                </nav>
                <div className="nav__actions">
                    <button type="button" className="btn btn--ghost" onClick={onOpenChat}>
                        Chat with us
                    </button>
                    <a className="btn btn--primary" href="#login">
                        Log in
                    </a>
                </div>
            </div>
        </header>
    )}