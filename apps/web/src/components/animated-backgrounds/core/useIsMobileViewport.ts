import { useEffect, useState } from 'react';

/**
 * When the phone's chrome is worn: a narrow viewport, or a short one held in
 * a hand — a phone on its side is 844 to 932 points wide, and it is still a
 * phone. The stylesheets' twin is `$compact` in src/styles/mixins.scss, where
 * the reasoning is written out; anything that branches on it in JS reads it
 * from here so the two stay in step.
 */
export const COMPACT_QUERY =
  '(max-width: 768px), (max-height: 500px) and (pointer: coarse)';

/** Whether the phone's chrome is worn right now. False where nobody can say. */
export const isCompactViewport = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(COMPACT_QUERY).matches;

/**
 * True on viewports the mobile stylesheets target.
 *
 * Starts false so the first client render matches SSR (which has no viewport),
 * then settles on mount.
 */
export const useIsMobileViewport = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const media = window.matchMedia(COMPACT_QUERY);
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
};

export default useIsMobileViewport;
