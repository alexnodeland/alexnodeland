import React from 'react';

interface FeedLinkProps {
  /** Where the feed is served from. */
  href: string;
  className?: string;
}

/**
 * The way to the feed: a chip in the control row's chrome that is a link
 * rather than a control. It sits with the pickers because it is about the
 * same list they shape — the same posts, for a reader instead of a browser.
 * A plain anchor, not a router link: the feed is a static file the build
 * writes next to the pages, not a page of the site's own.
 */
const FeedLink: React.FC<FeedLinkProps> = ({ href, className = '' }) => (
  <a
    href={href}
    type="application/rss+xml"
    className={`ui-chip-button ui-icon-chip ${className}`.trim()}
    aria-label="rss feed"
    title="rss feed"
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
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  </a>
);

export default FeedLink;
