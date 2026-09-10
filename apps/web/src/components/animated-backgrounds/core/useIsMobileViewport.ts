import { useEffect, useState } from 'react';

// Mirrors the $mobile-breakpoint used by the stylesheets. Anything that needs
// to branch on it in JS should read from here so the two stay in step.
export const MOBILE_BREAKPOINT_PX = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

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

    const media = window.matchMedia(QUERY);
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
};

export default useIsMobileViewport;
