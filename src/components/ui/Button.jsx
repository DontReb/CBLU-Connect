const VARIANTS = {
  primary: 'bg-ink text-white shadow-lg shadow-ink/10 hover:bg-accent-dark hover:shadow-xl',
  ghost: 'bg-transparent border border-line text-ink hover:border-ink hover:bg-ink/5',
};

// Renders a <button> by default; pass as="a" (with href) to render a link
// that looks the same. Extra classes merge in after the variant's classes.
export default function Button({ as: Tag = 'button', variant = 'primary', className = '', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}