import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import logo from '../assets/cblu-logo.png';

// Shared icon set for sidebar nav items and the topbar controls. Stroke
// style matches the send/chat icons already used in ChatWidget (viewBox 24,
// strokeWidth 1.6, currentColor) so dashboards feel like the same product.
const ICON_PATHS = {
  home: <path d="M4 11.5 12 4l8 7.5M6 9.5V20h5v-6h2v6h5V9.5" />,
  document: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </>
  ),
    review: (
    <>
      <path d="M8 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" />
      <path d="M9.5 13l1.75 1.75L14.5 11" />
    </>
  ),
    // Same shape as the chat toggle button in ChatWidget, so the nav item ties
  // visually back to the widget these sessions are escalated from.
  chat: <path d="M4 5h16v11H8l-4 4V5z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M14 8V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-2" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" />
    </>
  ),
};

function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

// navItems: [{ to, label, icon, end? }]. `end` is forwarded to NavLink so
// the "Overview" link isn't highlighted while on nested sub-routes.
export default function DashboardLayout({ roleLabel, userName, navItems, onLogout, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const location = useLocation();

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-accent-light/50 text-accent-dark' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
    }`;

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={navLinkClass}
        >
          <Icon name={item.icon} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-line bg-panel md:flex">
        <Link to="/" className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <img src={logo} alt="Cooperative Bank of La Union" className="h-9 w-9 rounded-full object-contain" />
          <span className="font-display text-lg font-semibold text-ink">CBLU</span>
        </Link>
        <div className="flex flex-1 flex-col py-4">{nav}</div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-ink/40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="drawer"
              role="dialog"
              aria-label="Navigation"
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-panel shadow-2xl md:hidden"
              initial={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <Link to="/" className="flex items-center gap-2.5">
                  <img src={logo} alt="Cooperative Bank of La Union" className="h-9 w-9 rounded-full object-contain" />
                  <span className="font-display text-lg font-semibold text-ink">CBLU</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="text-ink-soft"
                >
                  <Icon name="close" />
                </button>
              </div>
              <div className="flex flex-1 flex-col py-4">{nav}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-3.5 md:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="text-ink-soft md:hidden"
          >
            <Icon name="menu" />
          </button>
          <span className="hidden text-sm text-ink-soft md:inline">{roleLabel} dashboard</span>
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-ink">{userName}</p>
              <p className="text-xs text-ink-soft">{roleLabel}</p>
            </div>
            {/* Placeholder until a real session exists — just returns home. */}
                        <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-line p-2 text-ink-soft transition-colors hover:border-ink hover:text-ink"
              aria-label="Log out"
              title="Log out"
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
            className="flex-1 px-5 py-8 md:px-8"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}