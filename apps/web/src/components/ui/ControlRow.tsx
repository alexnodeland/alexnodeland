import React, { useCallback, useEffect, useRef, useState } from 'react';
import { scrollBehavior } from '../../lib/utils/motion';
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
 * part of the column: the first thing in the page, with nothing behind it.
 * Afloat, it is chrome over moving content — the list runs underneath — and
 * it becomes a bar the list disappears under (see `sticky-control-row` in
 * mixins.scss), and its far housing grows the way back to the top, which is
 * only ever wanted by someone who has left it. This component is what knows
 * which state it is in: the row is afloat from the moment it pins, with the
 * reader demonstrably away from the top.
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

    let frame = 0;
    const read = () => {
      frame = 0;
      // Afloat is a thing that is so or is not, and the moment it is so is
      // the moment the row has finished arriving: pinned, with the list
      // running under it.
      setAfloat(panel.scrollTop >= travel);
    };
    // Once per animation frame, and all it does is read a number and hand
    // React a boolean it usually already has.
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(read);
    };

    read();
    panel.addEventListener('scroll', onScroll, { passive: true });

    // A rotation changes the band, and with it how far the row travels before
    // it pins.
    const observer = band
      ? new ResizeObserver(() => {
          travel = Math.max(band.offsetHeight, 1);
          read();
        })
      : null;
    if (band) observer?.observe(band);

    return () => {
      panel.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
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
