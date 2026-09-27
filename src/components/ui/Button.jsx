const VARIANTS = {
  primary: 'bg-ink text-white shadow-lg shadow-ink/10 hover:bg-accent-dark hover:shadow-xl',
  ghost: 'bg-transparent border border-line text-ink hover:border-ink hover:bg-ink/5',
  ghostLight: 'border border-white/40 bg-white/10 text-white backdrop-blur-sm hover:border-white hover:bg-white/20',
};

// Renders a <button> by default; pass as="a" (with href) to render a link
// that looks the same. Extra classes merge in after the variant's classes.
export default function Button({ as: Tag = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}