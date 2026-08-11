import { MOBILE_BREAKPOINT_PX } from './useIsMobileViewport';

// One place for every background's answer to "how many device pixels is a
// frame worth?". The simulations are soft fields, not text: nobody reads them
// at 1:1, and the pixels they draw are immediately composited under the
// window's scrim and blur. On a desktop the old cap of 2 stands. On a phone —
// where the same fullscreen canvas fights the page's own compositing for a
// far smaller GPU, and a 3x panel at cap 2 is still ~2M pixels per frame —
// the cap drops to 1.5, which halves the fill cost and is indistinguishable
// through the scrim.
const DESKTOP_MAX_PIXEL_RATIO = 2;
const MOBILE_MAX_PIXEL_RATIO = 1.5;

export const getRenderPixelRatio = (): number => {
  if (typeof window === 'undefined') return 1;
  const dpr = window.devicePixelRatio || 1;
  const mobile =
    typeof window.matchMedia === 'function' &&
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
  return Math.min(
    dpr,
    mobile ? MOBILE_MAX_PIXEL_RATIO : DESKTOP_MAX_PIXEL_RATIO
  );
};

export default getRenderPixelRatio;
