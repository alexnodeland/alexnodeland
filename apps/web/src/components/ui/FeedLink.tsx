import React from 'react';
import { FeedIcon } from './EntryIcons';

interface FeedLinkProps {
  /** Where the feed is served from. */
  href: string;
  className?: string;
}

/**
 * The way to the feed: a segment of the control row's toolbar that is a link
 * rather than a control. It hangs at the row's far end, with the things that
 * can be taken away — the same posts, for a reader instead of a browser.
 * A plain anchor, not a router link: the feed is a static file the build
 * writes next to the pages, not a page of the site's own.
 */
const FeedLink: React.FC<FeedLinkProps> = ({ href, className = '' }) => (
  <a
    href={href}
    type="application/rss+xml"
    className={`ui-toolbar-item is-icon ${className}`.trim()}
    aria-label="rss feed"
    title="rss feed"
  >
    <FeedIcon />
  </a>
);

export default FeedLink;
