import React, { useCallback, useEffect, useRef, useState } from 'react';
import { scrollBehavior, supportsScrollTimeline } from '../../lib/utils/motion';

interface ControlRowProps {
  /** The page's own name for its row; the page owns which chips are in it. */
  className: string;
  children: React.ReactNode;
}

/**
 * The row of chips at the top of a list page, and the two things it does when
 * the reader leaves the top of the window.
 *
 * There are two states, and they are not the same object. At rest the row is
 * part of the column: its chips line up with the cards underneath because
 * there is nothing underneath — the row is the first thing in the page, and
 * the ends of it want to be flush with the ends of everything below it.
 * Afloat, it is chrome over moving content, and flush stopped reading: a
 * chip's hairline landed exactly on the border of the card passing under it,
 * and the two made one thickened line. So the row draws in by the same gap it
 * keeps between its own chips, and it grows one more chip — the way back to
 * the top, which is only ever wanted by someone who has left it.
 *
 * The draw-in is the stylesheet's (see `sticky-control-row` in mixins.scss):
 * it runs on the window's own scroll timeline, over exactly the band that
 * carries the row from the column to the frame's edge, which is the same
 * distance and the same machinery the hero folds on. What is here is the other
 * half of that arrangement — the progress published per frame for the browsers
 * that cannot read a scroll timeline — and the chip, which is not a scrub but
 * a thing that is there or is not. It arrives at the end of the same travel:
 * the row pinned, the list running under it, the reader demonstrably away from
 * the top.
 */
const ControlRow: React.FC<ControlRowProps> = ({ className, children }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [afloat, setAfloat] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    // The page scrolls inside the shell's window rather than the document
    // (see .layout in layout.scss), so that is what is listened to.
    const panel = row?.closest<HTMLElement>('.layout') ?? null;
    panelRef.current = panel;
    if (!row || !panel) return;

    // What sits above the row inside the scroller, which is exactly how far the
    // reader has to go before it sticks. A sticky element's own offsetTop
    // reports where it is stuck to rather than where it came from, so it cannot
    // answer this — the band can, and it is the only thing between the
    // scroller's edge and the page (see .window-band in layout.scss). A page
    // with no fold has no band, and then any scroll at all is leaving the top.
    const band = panel.querySelector<HTMLElement>('.window-band');
    let travel = Math.max(band?.offsetHeight ?? 0, 1);

    // Where the draw-in comes from. On the compositor path the stylesheet runs
    // it off the window's own scroll timeline and this writes nothing; the
    // publisher below is for the browsers that cannot, and it is the same
    // arrangement the hero's fold above the window keeps (see layout.tsx).
    const published = !supportsScrollTimeline();

    let frame = 0;
    let last = '';
    const read = () => {
      frame = 0;
      const progress = Math.min(Math.max(panel.scrollTop / travel, 0), 1);
      // The chip is a thing that is there or is not, and the moment it is
      // wanted is the moment the row has finished arriving: pinned, with the
      // list running under it.
      setAfloat(progress >= 1);
      if (!published) return;
      const value = String(Math.round(progress * 1000) / 1000);
      if (value === last) return;
      last = value;
      row.style.setProperty('--row-fold', value);
    };
    // Once per animation frame, and on the compositor path all it does is read
    // a number and hand React a boolean it usually already has.
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();
    panel.addEventListener('scroll', onScroll, { passive: true });

    // A rotation changes the band, and with it the distance the row draws in
    // over.
    const observer = band
      ? new ResizeObserver(() => {
          travel = Math.max(band.offsetHeight, 1);
          last = '';
          read();
        })
      : null;
    if (band) observer?.observe(band);

    return () => {
      panel.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      row.style.removeProperty('--row-fold');
    };
  }, []);

  const toTop = useCallback(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: scrollBehavior() });
  }, []);

  // Just inside the last chip the page gave it, which on every row is the one
  // hung on the right — the search toggle. Inside rather than outside so that
  // search keeps the position it has at rest: the way back opens in the slack
  // between the two groups, where there was nothing, and every other chip in
  // the row stays exactly where it was.
  const items = React.Children.toArray(children);
  const hung = items.pop();

  return (
    <div
      ref={rowRef}
      className={`ui-control-row ${className}${afloat ? ' is-afloat' : ''}`.trim()}
    >
      {items}

      {/* Always in the row, so that arriving and leaving are one transition
          with the draw-in rather than a second thing happening afterwards.
          Collapsed it is nothing: no width, no ink, and a negative margin
          giving back the gap the flex row would otherwise keep for it (see
          .ui-scroll-top in controls.scss). */}
      <button
        type="button"
        className="ui-chip-button ui-icon-chip ui-scroll-top"
        onClick={toTop}
        aria-label="back to the top"
        aria-hidden={!afloat}
        tabIndex={afloat ? 0 : -1}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 19V6" />
          <path d="m5 13 7-7 7 7" />
        </svg>
      </button>

      {hung}
    </div>
  );
};

export default ControlRow;
