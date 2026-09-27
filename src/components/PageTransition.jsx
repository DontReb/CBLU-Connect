import { motion, useReducedMotion } from 'motion/react';

// "Drill" effect: the page you're leaving scales up slightly and fades,
// like the camera pushing forward through it; the page you're arriving on
// starts slightly smaller and grows into place. Same treatment both
// directions (forward to /login, back to /), so no navigation-direction
// tracking is needed.
const VARIANTS = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.04 },
};

const REDUCED_VARIANTS = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function PageTransition({ children }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? REDUCED_VARIANTS : VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: shouldReduceMotion ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}