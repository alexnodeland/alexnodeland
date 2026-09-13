import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { graphql, Link } from 'gatsby';
import Dropdown from '../components/ui/Dropdown';
import { ArrowOutIcon } from '../components/ui/EntryIcons';
import FeedLink from '../components/ui/FeedLink';
import SearchToggle from '../components/ui/SearchToggle';
import SEO from '../components/seo';
import { DropdownOption } from '../components/ui/Dropdown';
import { formatMonthDay, yearOf } from '../lib/utils/dates';
import { readTimelineView, saveTimelineView } from '../lib/timelineView';
import { TimelinePageProps } from '../types';
import '../styles/timeline.scss';

// Newest-first is the default, so it is the one the trigger reads on arrival.
const SORT_OPTIONS: DropdownOption[] = [
  { value: 'desc', label: 'newest first' },
  { value: 'asc', label: 'oldest first' },
];

// The tag filter's "no filter" option. A null category is what the rest of
// the page tests for; the dropdown needs a string, so this is the stand-in.
const ALL_TAGS = '__all__';

// The page scrolls inside the shell's window rather than the document (see
// .layout in layout.scss), so the thing to put back is that element's offset.
// The page is handed it by the DOM rather than by a prop: the scroller is the
// shell's, and the shell mounts once for the whole site.
const scrollerOf = (el: Element | null): HTMLElement | null =>
  (el?.closest('.layout') as HTMLElement | null) ?? null;

/**
 * How far a card sits down the scroller's own content, which is the coordinate
 * the restore below has to work in.
 *
 * Not the difference between two bounding rects. The shell is mid-navigation
 * when this runs — the hero region is easing from the height the post wore to
 * the height the list wears, and the window is `flex: 1` under it — so the
 * panel's box is still moving, and a scroll offset derived from where the box
 * was for one frame lands the card a hero's worth of pixels off. Offsets up
 * the chain do not move: the content has already laid out, whatever is
 * happening to the frame around it.
 */
const offsetWithin = (
  el: HTMLElement,
  scroller: HTMLElement
): number | null => {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== scroller) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  // The walk ran out of ancestors before reaching the scroller, so the two are
  // not in one offset chain and the number would be meaningless.
  return node === scroller ? top : null;
};

const TimelinePage: React.FC<TimelinePageProps> = ({ data, location }) => {
  // Filter for blog posts only
  const allPosts = data.allMarkdownRemark.nodes.filter(
    post => post.parent && post.parent.sourceInstanceName === 'blog'
  );

  // State for search, filtering, and sorting
  const [searchTerm, setSearchTerm] = useState('');
  // Phone only: whether the search panel is folded out. Desktop ignores it.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  // Focus follows the reader's own hand on the chip, and only that. The panel
  // also opens on arrival when there is a restored search term to show, and
  // focusing then would both steal the caret and scroll the field into view —
  // which is the one thing the restore below is trying to decide.
  const openedByReader = useRef(false);
  useEffect(() => {
    if (searchOpen && openedByReader.current) searchInputRef.current?.focus();
    openedByReader.current = false;
  }, [searchOpen]);
  const toggleSearch = useCallback(() => {
    openedByReader.current = true;
    setSearchOpen(open => !open);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  // Whether the session's view has been read back yet. Nothing is written to
  // the store before it flips, or the defaults of the first render would
  // overwrite the very thing being restored.
  const [restored, setRestored] = useState(false);

  // ── Coming back ─────────────────────────────────────────────────────────
  // The pickers first, in the layout phase: React flushes the state this sets
  // before the browser paints, so the list is the reader's own list from the
  // first frame rather than the default one for a frame and then theirs.
  useLayoutEffect(() => {
    const saved = readTimelineView();
    if (saved) {
      setSelectedCategory(saved.tag);
      setSortOrder(saved.sort);
      setSearchTerm(saved.search);
      // A filter the reader cannot see is a page that looks broken, so a
      // restored term brings its panel back out with it.
      if (saved.search) setSearchOpen(true);
    }
    setRestored(true);
  }, []);

  // Then the place in the column, in the commit after it — by which time the
  // restored list is the one on screen and the card being looked for is in it.
  // The shell puts its window back to the top on every navigation (see the
  // layout effect on `pathname` in layout.tsx); that runs in the commit above
  // this one, so this is the last word rather than a fight with it.
  useLayoutEffect(() => {
    if (!restored) return;
    const saved = readTimelineView();
    const panel = scrollerOf(pageRef.current);
    if (!saved || !panel) return;

    // The card they were last on, wherever the current sort has put it. The
    // pixel offset is only the fallback: it means nothing after a rotation, a
    // resize, or a walk down the older/newer chain at the foot of a post.
    const cards = Array.from(
      pageRef.current?.querySelectorAll<HTMLElement>('[data-slug]') ?? []
    );
    const card = saved.slug
      ? cards.find(el => el.dataset.slug === saved.slug)
      : undefined;

    const top = card ? offsetWithin(card, panel) : null;
    if (top !== null) {
      // Clear of the sticky row of pickers, which would otherwise sit over the
      // top of the card the reader was just reading.
      const row = pageRef.current?.querySelector<HTMLElement>(
        '.timeline-control-bar'
      );
      panel.scrollTop = Math.max(0, top - (row?.offsetHeight ?? 0));
    } else if (saved.scrollTop > 0) {
      panel.scrollTop = saved.scrollTop;
    }
  }, [restored]);

  // ── Leaving ─────────────────────────────────────────────────────────────
  // The pickers, as they are changed.
  useEffect(() => {
    if (!restored) return;
    saveTimelineView({
      tag: selectedCategory,
      sort: sortOrder,
      search: searchTerm,
    });
  }, [restored, selectedCategory, sortOrder, searchTerm]);

  // The offset, once — on the way out. A write per scroll frame would be a
  // JSON round trip per frame for a number that is only ever read after the
  // page is gone, so the listener keeps it in hand and the store hears about
  // it when the page unmounts or the tab is put away.
  useEffect(() => {
    const panel = scrollerOf(pageRef.current);
    if (!panel) return;
    let last = panel.scrollTop;
    const onScroll = () => {
      last = panel.scrollTop;
    };
    // The offset, and the post anchor cleared with it. The anchor belongs to a
    // reader who left the list *for a post* — the post sets it again on the
    // way in, a beat after this runs — and leaving it behind would strand
    // someone who went to the projects page and came back at whatever card
    // they last read rather than where they had scrolled to.
    const persist = () => saveTimelineView({ scrollTop: last, slug: null });
    panel.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', persist);
    return () => {
      panel.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', persist);
      persist();
    };
  }, []);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = allPosts
      .map(post => post.frontmatter.category)
      .filter((cat): cat is string => Boolean(cat))
      .filter((cat, index, arr) => arr.indexOf(cat) === index);
    return cats;
  }, [allPosts]);

  // Filter and sort posts based on search term, category, and sort order
  const filteredPosts = useMemo(() => {
    const filtered = allPosts.filter(post => {
      const matchesSearch =
        searchTerm === '' ||
        post.frontmatter.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        post.frontmatter.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === null ||
        post.frontmatter.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Sort by date
    return filtered.sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();

      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [allPosts, searchTerm, selectedCategory, sortOrder]);

  // Which card a year break falls above: the first of each run of them, in
  // whatever order the list is currently in. Derived from the sorted list
  // rather than stored on a post, so flipping the sort re-cuts the breaks on
  // the way past — the years run down under `newest first` and back up under
  // `oldest first`, and each one still opens its own run.
  const yearMarks = useMemo(() => {
    const marks = new Map<string, string>();
    let previous = '';
    for (const post of filteredPosts) {
      const year = yearOf(post.frontmatter.date);
      if (year !== previous) {
        marks.set(post.id, year);
        previous = year;
      }
    }
    return marks;
  }, [filteredPosts]);

  // The list used to light whichever post was at the reading line. It is gone:
  // on a page whose only job is a list of links, a highlight that moves with
  // the scroll is the page reacting to something the reader never asked for.
  // The pointer is the only thing that marks a card now.

  // "all" plus one option per tag the posts actually carry, so the menu can
  // never offer a filter that would empty the list.
  const tagOptions: DropdownOption[] = useMemo(
    () => [
      { value: ALL_TAGS, label: 'all' },
      ...categories.map(category => ({
        value: category,
        label: category.toLowerCase(),
      })),
    ],
    [categories]
  );

  const tagLabel =
    tagOptions.find(option => option.value === (selectedCategory ?? ALL_TAGS))
      ?.label ?? 'all';

  const sortLabel =
    SORT_OPTIONS.find(option => option.value === sortOrder)?.label ??
    'newest first';

  return (
    <>
      <SEO title="timeline" pathname={location?.pathname} />
      <div className="timeline-page" ref={pageRef}>
        {/* The two pickers and the feed, left, and the way to the search box
            at the far end: the one row every list page carries (see the cv
            and projects). Each picker resets itself through its own "all" or
            default option, so there is no separate reset. */}
        <div className="timeline-control-bar">
          <Dropdown
            ariaLabel="Filter posts by tag"
            triggerLabel={tagLabel}
            options={tagOptions}
            value={selectedCategory ?? ALL_TAGS}
            onSelect={value =>
              setSelectedCategory(value === ALL_TAGS ? null : value)
            }
            className="timeline-tag-dropdown"
          />

          <Dropdown
            ariaLabel="Sort posts by date"
            triggerLabel={sortLabel}
            options={SORT_OPTIONS}
            value={sortOrder}
            onSelect={value => setSortOrder(value as 'desc' | 'asc')}
            className="timeline-sort-dropdown"
          />

          {/* The feed, beside the pickers: the same list, for a reader. */}
          <FeedLink href="/rss.xml" className="timeline-feed-link" />

          <SearchToggle
            open={searchOpen}
            onToggle={toggleSearch}
            controls="timeline-search"
          />
        </div>

        {/* Somewhere to type rather than a piece of chrome, so it keeps its
            own panel below the row, folded away behind the chip above until
            it is asked for. */}
        <div
          id="timeline-search"
          className={`ui-search-panel timeline-search-panel${
            searchOpen ? ' is-open' : ''
          }`}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="search posts..."
            aria-label="Search posts"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="timeline-content">
          {filteredPosts.length === 0 ? (
            <div className="no-posts">
              <p>
                {allPosts.length === 0
                  ? 'nothing here yet.'
                  : 'no posts match. clear the search or pick another category.'}
              </p>
            </div>
          ) : (
            /* The rail is drawn by the list and its cards rather than by
               elements of its own: a hairline down the list's left edge and a
               dot per card (see .posts-list in timeline.scss). A dot belongs
               to its card, so a filter or a change of sort carries it along
               and the line re-forms underneath whatever is left. The years are
               the one thing in the column that is a row of its own. */
            <div className="posts-list">
              {filteredPosts.map(post => (
                <React.Fragment key={post.id}>
                  {/* The year that starts here: a line of plain text between
                      the cards rather than a mark on either of them, so every
                      card in the list is the same card. Hidden from assistive
                      tech — each card's own date says the same thing in full,
                      a few lines further down. */}
                  {yearMarks.has(post.id) && (
                    <p className="year-break" aria-hidden="true">
                      {yearMarks.get(post.id)}
                    </p>
                  )}
                  <article
                    className="post-preview"
                    // The tag is what the filter above keys on; it is carried
                    // here as data rather than drawn as a chip, since the row
                    // of pickers has already said which tag the list is
                    // showing.
                    data-category={post.frontmatter.category}
                    // What a reader coming back from a post is scrolled to.
                    data-slug={post.fields.slug}
                  >
                    {/* The title row carries the way in at its far end, the
                      body follows, and the date closes it. No glyph marks what
                      kind of thing the card is: the page already has. */}
                    <div className="post-header">
                      <h2 className="post-title">
                        <Link to={`/timeline${post.fields.slug}`}>
                          {post.frontmatter.title}
                        </Link>
                      </h2>
                      <Link
                        to={`/timeline${post.fields.slug}`}
                        className="read-more"
                        aria-label={`read ${post.frontmatter.title}`}
                      >
                        <ArrowOutIcon />
                      </Link>
                    </div>
                    {post.frontmatter.description && (
                      <p className="post-description">
                        {post.frontmatter.description}
                      </p>
                    )}
                    <p className="post-excerpt">{post.excerpt}</p>
                    {/* The date, and only the date. Its year is the break
                      above it — carrying it here as well would print the same
                      four digits twice inside one screenful. */}
                    <div className="post-meta">
                      <time dateTime={post.frontmatter.date}>
                        {formatMonthDay(post.frontmatter.date)}
                      </time>
                    </div>
                  </article>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const query = graphql`
  query TimelinePageQuery {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        id
        frontmatter {
          title
          date
          description
          category
        }
        excerpt(pruneLength: 160)
        fields {
          slug
        }
        parent {
          ... on File {
            sourceInstanceName
          }
        }
      }
    }
  }
`;

export default TimelinePage;
