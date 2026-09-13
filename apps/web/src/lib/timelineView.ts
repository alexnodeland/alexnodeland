/**
 * What the timeline was showing, for as long as the tab is open.
 *
 * The list is a page with state on it — a tag, an order, something typed into
 * the search, and a place a long way down a column — and every way back to it
 * used to hand the reader the top of an unfiltered list instead: the browser's
 * own back button, the capsule in the corner, the link at the foot of a post,
 * all three. This is what they get back now, and it is the same thing whichever
 * of the three they take.
 *
 * sessionStorage rather than the URL. The state is a reading position, not an
 * address worth sharing: hanging it off every card's link would put a dozen
 * spellings of the same list in front of a crawler, and it would outlive the
 * session in anyone's history. Every access is fenced — Safari's private mode
 * throws on the property rather than returning null — and a timeline that
 * cannot remember its filters is still a timeline, so nothing here ever throws
 * upward.
 */

const KEY = 'timeline:view';

export interface TimelineView {
  /** The tag filter, or null for no filter. */
  tag: string | null;
  sort: 'desc' | 'asc';
  search: string;
  /** Where the scroller was, as the fallback when the anchor below is gone. */
  scrollTop: number;
  /**
   * The post the reader was last on, or null when they left the list for
   * somewhere that is not a post. The anchor proper while it is set: it
   * survives a resize, a rotation and a walk along the older/newer chain,
   * none of which leave the pixel offset meaning what it meant when it was
   * written. The list clears it on the way out and a post sets it on the way
   * in, in that order, so it only ever says "a post is what you left for".
   */
  slug: string | null;
}

const EMPTY: TimelineView = {
  tag: null,
  sort: 'desc',
  search: '',
  scrollTop: 0,
  slug: null,
};

const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * The stored view, or null if there is nothing to restore. Every field is
 * checked rather than trusted: this is parsed JSON from a store the reader can
 * edit, and a `sort` of "sideways" would otherwise reach the dropdown.
 */
export const readTimelineView = (): TimelineView | null => {
  const storage = store();
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<TimelineView>;
    return {
      tag: typeof saved.tag === 'string' ? saved.tag : null,
      sort: saved.sort === 'asc' ? 'asc' : 'desc',
      search: typeof saved.search === 'string' ? saved.search : '',
      scrollTop: typeof saved.scrollTop === 'number' ? saved.scrollTop : 0,
      slug: typeof saved.slug === 'string' ? saved.slug : null,
    };
  } catch {
    return null;
  }
};

/**
 * Merge, never replace. The list writes the filters and the offset; a post
 * writes which post it is. Neither knows about the other's half, and a whole
 * write from either would drop it.
 */
export const saveTimelineView = (patch: Partial<TimelineView>): void => {
  const storage = store();
  if (!storage) return;
  try {
    const next = { ...(readTimelineView() ?? EMPTY), ...patch };
    storage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or locked store is not worth a broken page.
  }
};

/**
 * Called by a post as it opens. It is the post page, not the card that was
 * clicked, that records this: a reader who walks from one post to the next
 * along the row at the foot should come back to where they finished, and one
 * who arrived from a search engine should still be put somewhere sensible by
 * the link out to the list.
 */
export const rememberPost = (slug: string | null): void =>
  saveTimelineView({ slug });
