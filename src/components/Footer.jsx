const COLUMNS = [
  {
    heading: 'Products',
    links: [
      { label: 'Accounts', href: '#features' },
      { label: 'Cards', href: '#features' },
      { label: 'Loans', href: '#features' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Chat with us', href: '#how-it-works' },
      { label: 'Contact', href: '#footer' },
      { label: 'Branch locator', href: '#footer' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '#footer' },
      { label: 'Terms', href: '#footer' },
      { label: 'Security', href: '#security' },
    ],
  },
];

function FooterLink({ href, children }) {
  return (
    <a href={href} className="group block py-1 text-sm hover:text-white">
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-white/60 transition-all duration-300 group-hover:w-full" />
      </span>
    </a>
  );
}

export default function Footer() {
  return (
    <footer
      id="footer"
      className="scroll-mt-24 rounded-t-[2.5rem] border-t border-white/10 bg-ink px-6 pb-6 pt-14 text-slate-300"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="mb-1.5 font-display text-lg text-white">Cooperative Bank of La Union</p>
          <p>"Let your money grow with CBLU"</p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <h4 className="mb-3 text-sm font-semibold text-white">{column.heading}</h4>
            {column.links.map((link) => (
              <FooterLink key={link.label} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/10 pt-5 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Cooperative Bank of La Union. Est. 1993.</p>
      </div>
    </footer>
  );
}