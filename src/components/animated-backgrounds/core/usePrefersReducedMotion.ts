import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when the OS asks for less motion, tracked live.
 *
 * The one-shot `matchMedia(QUERY).matches` reads elsewhere in the shell are
 * fine where they are: each one runs at the moment it decides whether to
 * animate a single transition, so it always sees the current preference. This
 * hook is for the other case — a preference latched into a long-lived effect,
 * where sampling once means a mid-session toggle (or a battery saver flipping
 * it for you) never takes effect.
 *
 * Starts false so the first client render matches SSR, then settles on mount.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const media = window.matchMedia(QUERY);
    const update = () => setPrefersReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
};

export default usePrefersReducedMotion;
