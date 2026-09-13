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

/**
 * Whether the browser can run an animation off a scroll offset rather than a
 * clock — and reach one declared on another element, which is how anything
 * outside the scroller (the hero above the window, the chips inside it) gets
 * at the window's own scroll.
 *
 * The two features are needed as a pair: the timeline alone, without the scope
 * that lets a sibling name it, would leave the fold with no driver at all. Both
 * the hero's fold and the control rows' draw-in ask this and fall back to a
 * progress number published per frame when the answer is no.
 */
export const supportsScrollTimeline = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timeline: scroll()') &&
  CSS.supports('timeline-scope: --window');
