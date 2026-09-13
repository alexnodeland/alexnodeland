import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The three places a post gets passed along to, at the foot of the article.
 *
 * Each one is a plain link to that service's own compose screen, opened in a
 * tab of its own — no SDK, no embedded button, no script from anyone else's
 * domain, so nothing here watches a reader who never clicks it. Which is also
 * why there is no count beside them: the number would have to be fetched from
 * somewhere, and the fetch is the tracking.
 *
 * Mastodon is the odd one, and the inline field is why. There is no mastodon
 * to post to — there are thousands of servers, and a share link only works
 * against the reader's own — so the chip asks which one, once, and remembers
 * the answer in this browser for next time.
 */

const HOST_KEY = 'share:mastodon-host';

const icons = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** The in-square, drawn at the same weight as the footer's copy of it. */
const LinkedInIcon: React.FC = () => (
  <svg {...icons}>
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5A6 6 0 0 1 16 8z" />
  </svg>
);

/** The butterfly, in outline. */
const BlueskyIcon: React.FC = () => (
  <svg {...icons}>
    <path d="M12 10.8C10.9 8.6 7.9 4.5 5.1 3.1 2.4 1.7 1.4 3.1 1.4 5.2c0 2 1.1 8.3 1.8 9.3.9 1.4 2.6 1.6 4.2 1.3-2.7.5-3.4 2-2 3.6 2.7 3 4.5-.4 5-1.6l.6-1.6.6 1.6c.5 1.2 2.3 4.6 5 1.6 1.4-1.6.7-3.1-2-3.6 1.6.3 3.3.1 4.2-1.3.7-1 1.8-7.3 1.8-9.3 0-2.1-1-3.5-3.7-2.1-2.8 1.4-5.8 5.5-6.9 7.7z" />
  </svg>
);

/** The elephant's trunk, as the mark is usually drawn in outline. */
const MastodonIcon: React.FC = () => (
  <svg {...icons}>
    <path d="M20.5 14.3c-.3 1.6-2.7 3.3-5.5 3.6-1.7.2-3.4.4-5.2.3-2.9-.1-5.2-.7-5.2-.7 0 .3 0 .6.1.8.4 2.6 2.6 2.8 4.7 2.9 2.2.1 4.1-.5 4.1-.5l.1 2s-1.5.8-4.2.9c-1.5.1-3.4-.1-5.5-.6C.7 21.7.1 16.6 0 11.4c0-1.5 0-3 .1-4.2C.3 2.9 3.1 1.7 3.1 1.7 4.5 1.1 7 .8 9.5.8h.1c2.5 0 5 .3 6.4.9 0 0 2.8 1.2 3 5.5 0 0 .1 1.3.1 2.8" />
    <path d="M16.8 9.2v5h-2v-4.8c0-1-.4-1.6-1.3-1.6-1 0-1.5.6-1.5 1.9v2.7h-2V9.7c0-1.3-.5-1.9-1.5-1.9-.9 0-1.3.5-1.3 1.6v4.8h-2v-5c0-1 .3-1.8.8-2.4.5-.6 1.2-.9 2.1-.9 1 0 1.8.4 2.3 1.2l.5.9.5-.9c.5-.8 1.3-1.2 2.3-1.2.9 0 1.6.3 2.1.9.6.6.9 1.4.9 2.4" />
  </svg>
);

interface ShareRowProps {
  /** The post's own address, absolute — this is what gets shared. */
  url: string;
  /** What goes in the box beside it. */
  title: string;
  className?: string;
}

const ShareRow: React.FC<ShareRowProps> = ({ url, title, className = '' }) => {
  const [asking, setAsking] = useState(false);
  const [host, setHost] = useState('');
  const hostInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asking) hostInputRef.current?.focus();
  }, [asking]);

  const text = `${title} ${url}`;
  const open = (href: string) => {
    // noopener, and a named-tab-less window: the compose screen has no reason
    // to hold a handle on the page that opened it.
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const shareToMastodon = useCallback(() => {
    let saved = '';
    try {
      saved = window.localStorage.getItem(HOST_KEY) ?? '';
    } catch {
      // A locked store just means being asked again.
    }
    if (saved) {
      open(`https://${saved}/share?text=${encodeURIComponent(text)}`);
      return;
    }
    // A second press on the chip puts the question away again.
    setAsking(asked => !asked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const submitHost = (event: React.FormEvent) => {
    event.preventDefault();
    // Whatever they typed, reduced to a hostname: "@me@hachyderm.io",
    // "https://hachyderm.io/" and "hachyderm.io" are all the same server.
    const cleaned = host
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^@?[^@/]*@/, '')
      .replace(/\/.*$/, '');
    if (!cleaned) return;
    try {
      window.localStorage.setItem(HOST_KEY, cleaned);
    } catch {
      // Not remembering is survivable; not sharing is not.
    }
    setAsking(false);
    open(`https://${cleaned}/share?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className={`share-row ${className}`.trim()}>
      <a
        className="ui-chip-button ui-icon-chip share-chip"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="share on linkedin"
        title="linkedin"
      >
        <LinkedInIcon />
      </a>

      <a
        className="ui-chip-button ui-icon-chip share-chip"
        href={`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="share on bluesky"
        title="bluesky"
      >
        <BlueskyIcon />
      </a>

      <button
        type="button"
        className="ui-chip-button ui-icon-chip share-chip"
        onClick={shareToMastodon}
        aria-label="share on mastodon"
        aria-expanded={asking}
        title="mastodon"
      >
        <MastodonIcon />
      </button>

      {asking && (
        <form className="share-host" onSubmit={submitHost}>
          <input
            ref={hostInputRef}
            type="text"
            className="search-input share-host-input"
            value={host}
            onChange={event => setHost(event.target.value)}
            placeholder="your mastodon server"
            aria-label="your mastodon server"
            spellCheck={false}
            autoCapitalize="none"
          />
          <button type="submit" className="ui-chip-button share-host-go">
            go
          </button>
        </form>
      )}
    </div>
  );
};

export default ShareRow;
