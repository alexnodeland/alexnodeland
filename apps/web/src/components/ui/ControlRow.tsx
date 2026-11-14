import React, { useCallback, useEffect, useRef, useState } from 'react';
import { scrollBehavior, supportsScrollTimeline } from '../../lib/utils/motion';
import { ArrowUpIcon } from './EntryIcons';

interface ControlRowProps {
  /** The page's own name for its row. */
  className: string;
  /**
   * What is shown: the page's pickers — a tag, an order, a length. They share
   * one housing at the start of the row.
   */
  children?: React.ReactNode;
  /**
   * What can be taken away: the feed, a download. They share a second housing
   * at the far end, with the way back to the top.
   */
  actions?: React.ReactNode;
}

/**
 * The row of controls at the top of a list page: one grammar for every page
 * that has one.
 *
 * Two housings, each a single control with segments rather than a run of
 * loose boxes — the same object the capsule of page links is. The one at the
 * start holds what the page is showing (its pickers); the one at the far end
 * holds what can be taken away from it (a feed, a download), and the way back
 * to the top once the reader has left it. A page decides what goes in each
 * and nothing else: there is no third place, and no page draws a control of
 * its own.
 *
 * The row has two states, and they are not the same object. At rest it is
 * part of the column: its ends line up with the cards underneath because
 * there is nothing underneath — the row is the first thing in the page.
 * Afloat, the two housings float loose over the list — no bar behind them,
 * only their own frosting — and flush stopped reading: a housing's hairline
 * landed exactly on the border of the card passing under it, and the two made
 * one thickened line. So the row draws in by the gap it keeps between its own
 * housings, and the far one grows the way back to the top, which is only ever
 * wanted by someone who has left it.
 *
 * The draw-in is the stylesheet's (see `sticky-control-row` in mixins.scss):
 * it runs on the window's own scroll timeline, over exactly the band that
 * carries the row from the column to the frame's edge, which is the same
 * distance and the same machinery the hero folds on. What is here is the other
 * half of that arrangement — the progress published per frame for the browsers
 * that cannot read a scroll timeline — and the way back, which is not a scrub
 * but a thing that is there or is not. It arrives at the end of the same
 * travel: the row pinned, the list running under it, the reader demonstrably
 * away from the top.
 */
const ControlRow: React.FC<ControlRowProps> = ({
  className,
  children,
  actions,
}) => {
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
      // The way back is a thing that is there or is not, and the moment it is
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

  const pickers = React.Children.toArray(children);
  const hasActions = React.Children.count(actions) > 0;

  return (
    <div
      ref={rowRef}
      className={`ui-control-row ${className}${afloat ? ' is-afloat' : ''}`.trim()}
    >
      {/* A row with nothing to pick (a role page's CV, which is one document)
          draws no empty housing for it. */}
      {pickers.length > 0 && <div className="ui-toolbar">{pickers}</div>}

      {/* The far end. Always in the row, so that the way back arriving is one
          transition with the draw-in rather than a second thing happening
          afterwards. With actions of its own, the housing is always there and
          the way back opens inside it, on the inner side, so nothing that was
          at the row's end moves. With none, the housing is the way back and
          nothing else, and it is not there at all until it is wanted (see
          .ui-toolbar-end in controls.scss). */}
      <div
        className={`ui-toolbar ui-toolbar-end${hasActions ? '' : ' is-bare'}`}
      >
        <button
          type="button"
          className="ui-toolbar-item is-icon ui-scroll-top"
          onClick={toTop}
          aria-label="back to the top"
          aria-hidden={!afloat}
          tabIndex={afloat ? 0 : -1}
        >
          <ArrowUpIcon />
        </button>
        {actions}
      </div>
    </div>
  );
};

export default ControlRow;
