import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShareIcon } from './EntryIcons';

/**
 * The way a post gets passed along: the reader's own share sheet.
 *
 * One chip, and what it opens is the sheet the device already has — every app
 * the reader owns, rather than the three networks a page picked for them.
 * `navigator.share` is there for something like nine in ten browsers by use;
 * the rest, which in practice means firefox on a desktop, get the address on
 * the clipboard and a line saying so.
 *
 * No SDK, no embedded button, no script from anyone else's domain, so nothing
 * here watches a reader who never presses it — which is also why there is no
 * count beside it: the number would have to be fetched from somewhere, and the
 * fetch is the tracking. The sheet contacts nobody until the reader has picked
 * a destination out of it.
 *
 * It is also the answer to the one thing three links could not solve. A filter
 * list hides a share button by the address inside it: the linkedin chip that
 * used to be here matched the rule
 * `##a[href^="https://www.linkedin.com/sharing/share-offsite/?"]` and was
 * hidden for every reader running Fanboy's Social Blocking List. There is no
 * address in this markup to match. It is a button, and the destination is one
 * the reader picks inside their own system rather than one the page puts in
 * front of them.
 *
 * The class names say `pass-along` and not `share`, and that is not taste.
 * Fanboy's list also carries the generic cosmetic rule `##.share-row`, which
 * hides an element of that class on every site there is. This row was one of
 * them: it was in the page and in the accessibility tree, and it was
 * `display: none` before a reader ever saw it. The rule matches a name, so the
 * fix is a name. Anything with `share` or `social` in it is spoken for
 * (`.post-share`, `.post-social` and `.social-row` are all on the same list);
 * this one is not.
 */

/** How long the line under the chip stays up, for the readers who get one. */
const SAID_MS = 2500;

interface ShareRowProps {
  /** The post's own address, absolute — this is what gets shared. */
  url: string;
  /** What the sheet puts at the top of itself. */
  title: string;
  className?: string;
}

const ShareRow: React.FC<ShareRowProps> = ({ url, title, className = '' }) => {
  const [said, setSaid] = useState('');
  const [hasSheet, setHasSheet] = useState(true);
  const timer = useRef<number | undefined>(undefined);

  // What the chip is called depends on what pressing it does, and that cannot
  // be known while the page is being built. It is asked for after the mount
  // instead, so the server's markup and the first render agree — and the
  // answer only ever narrows the label, never the behaviour.
  useEffect(() => {
    setHasSheet(typeof navigator !== 'undefined' && 'share' in navigator);
    return () => window.clearTimeout(timer.current);
  }, []);

  const say = useCallback((line: string) => {
    setSaid(line);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaid(''), SAID_MS);
  }, []);

  const passAlong = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the sheet is a decision, not a failure, and it is the one
        // thing that must not leave a line on the page behind it. Anything
        // else the sheet says went wrong falls through to the clipboard.
        if ((error as Error)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      say('link copied');
    } catch {
      // No sheet and no clipboard: an address bar is still an address bar.
      say('couldn’t copy — the link is in the address bar');
    }
  }, [say, title, url]);

  return (
    <div className={`pass-along ${className}`.trim()}>
      <button
        type="button"
        className="ui-chip-button ui-icon-chip pass-along-chip"
        onClick={passAlong}
        aria-label={hasSheet ? 'share this post' : 'copy a link to this post'}
        title="share"
      >
        <ShareIcon />
      </button>

      {/* Always in the page, so that what it says is announced when it says
          it rather than arriving as a new region nobody is listening to. It
          takes up no room in the row while it is empty (see .pass-along-said
          in timeline.scss). */}
      <span className="pass-along-said" role="status" aria-live="polite">
        {said}
      </span>
    </div>
  );
};

export default ShareRow;
