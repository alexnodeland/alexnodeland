import React from 'react';
import { scrollBehavior } from '../../lib/utils/motion';

/**
 * Lands an address's fragment on its section.
 *
 * The page scrolls inside the fixed window (.layout), not the document, so
 * the browser's own fragment navigation has nothing to scroll. Resolve the
 * hash to its section and scroll the container ourselves.
 *
 * The wait is long enough for the shell's navigation transition to settle
 * (the hero peels, then the region eases to its new height, and the window
 * resizes with it). Scrolling into a frame that is still growing lands in
 * the wrong place, and the hero collapse would fight the reset; once the
 * shell is still, the smooth scroll drives the collapse normally.
 */
export const useHashScroll = (): void => {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    };
    const timer = window.setTimeout(scrollToHash, 420);
    window.addEventListener('hashchange', scrollToHash);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', scrollToHash);
    };
  }, []);
};

export default useHashScroll;
