export default function Footer() {
  return (
    <footer
      id="footer"
      className="scroll-mt-24 rounded-t-[2.5rem] border-t border-white/10 bg-ink px-6 pb-6 pt-14 text-slate-300"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-10 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="mb-1.5 font-display text-lg text-white">Meridian Bank</p>
          <p>Straightforward banking, explained plainly.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Products</h4>
          <a href="#features" className="block py-1 text-sm hover:text-white">
            Accounts
          </a>
          <a href="#features" className="block py-1 text-sm hover:text-white">
            Cards
          </a>
          <a href="#features" className="block py-1 text-sm hover:text-white">
            Loans
          </a>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Support</h4>
          <a href="#how-it-works" className="block py-1 text-sm hover:text-white">
            Chat with us
          </a>
          <a href="#footer" className="block py-1 text-sm hover:text-white">
            Contact
          </a>
          <a href="#footer" className="block py-1 text-sm hover:text-white">
            Branch locator
          </a>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
          <a href="#footer" className="block py-1 text-sm hover:text-white">
            Privacy
          </a>
          <a href="#footer" className="block py-1 text-sm hover:text-white">
            Terms
          </a>
          <a href="#security" className="block py-1 text-sm hover:text-white">
            Security
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-6xl border-t border-white/10 pt-5 text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Meridian Bank. Member details and licensing go here.</p>
      </div>
    </footer>
  );
}