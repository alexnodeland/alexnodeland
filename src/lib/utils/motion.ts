/**
 * Motion preferences, read at the moment a decision is made.
 *
 * Each caller runs this when it is about to start one transition or scroll,
 * so it always sees the current preference; the long-lived effects that latch
 * a value use the `usePrefersReducedMotion` hook instead.
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * The `behavior` a programmatic scroll should take: smooth, unless the
 * visitor has asked for less motion, in which case it lands at once. Every
 * `scrollIntoView` and `scrollTo` on the site reads this rather than writing
 * `'smooth'` itself.
 */
export const scrollBehavior = (): 'auto' | 'smooth' =>
  prefersReducedMotion() ? 'auto' : 'smooth';
