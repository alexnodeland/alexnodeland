import { useCallback, useEffect, useRef, useState } from 'react';

const NONE: readonly number[] = [];

interface ScrollSpyOptions {
  /**
   * How far down the viewport the reading line sits, as a fraction of its
   * height. A little above centre, so a card lights up as you arrive at it
   * rather than once it has already gone past.
   */
  readingLine?: number;
}

/**
 * Reports which items in a list are sitting at the reading line, so a list can
 * highlight itself as the page scrolls rather than holding on to whatever the
 * last tap left behind. Works in both directions — the answer is recomputed
 * from geometry every frame that moves, not accumulated from scroll direction.
 *
 * Ties light up together, which is what keeps a multi-column grid from picking
 * one arbitrary cell out of a row that is all equally under the line.
 */
export function useScrollSpy<T extends HTMLElement>(
  itemSelector: string,
  { readingLine = 0.4 }: ScrollSpyOptions = {}
) {
  const containerRef = useRef<T | null>(null);
  const [activeIndices, setActiveIndices] = useState<readonly number[]>(NONE);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(container.querySelectorAll(itemSelector));
    const viewportHeight = window.innerHeight;
    const line = viewportHeight * readingLine;

    let closest = Infinity;
    const distances = items.map(item => {
      const { top, bottom } = item.getBoundingClientRect();
      // Items that have scrolled out never win, however near their edge is.
      if (bottom <= 0 || top >= viewportHeight) return Infinity;
      // Zero while the line is inside the item; otherwise the gap to it.
      const distance = Math.round(Math.max(top - line, line - bottom, 0));
      if (distance < closest) closest = distance;
      return distance;
    });

    setActiveIndices(previous => {
      if (closest === Infinity) {
        // Nothing in view: drop the highlight rather than stranding it on the
        // last item, which would otherwise stay lit for the rest of the page.
        return previous.length === 0 ? previous : NONE;
      }

      const next: number[] = [];
      distances.forEach((distance, index) => {
        if (distance === closest) next.push(index);
      });

      const unchanged =
        next.length === previous.length &&
        next.every((index, i) => index === previous[i]);
      return unchanged ? previous : next;
    });
  }, [itemSelector, readingLine]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    // The page scrolls inside `.layout`, not the window, and scroll events do
    // not bubble — capturing on the document catches them wherever they start.
    const scrollOptions = { capture: true, passive: true } as const;
    document.addEventListener('scroll', schedule, scrollOptions);
    window.addEventListener('resize', schedule);

    // Filtering a list, expanding a card, or a webfont landing all move items
    // without a scroll, so watch the container's own geometry as well.
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    measure();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      resizeObserver?.disconnect();
    };
  }, [measure]);

  const isActive = useCallback(
    (index: number) => activeIndices.includes(index),
    [activeIndices]
  );

  return { containerRef, activeIndices, isActive };
}

export default useScrollSpy;
