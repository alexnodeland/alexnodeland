import React from 'react';

/**
 * The glyphs that mark what kind of thing a list entry is — one per kind of
 * thing the site keeps lists of: a post, a repo, a role, a degree, a
 * certification. They used to open each card's title row; they sit in the
 * card's top-right corner now (see `EntryKind` below and `.entry-kind` in
 * cards.scss), out of the title's way, where every card type had the room.
 *
 * Alongside them, the two marks a card's footer uses to point out of itself:
 * the arrow into a post and the octocat out to a repo.
 *
 * One grammar, the site's: a 24 viewBox, no fill, a 1.75 stroke in
 * `currentColor` with round caps and joins — the same set of numbers the
 * footer's social marks are drawn to (see SOCIAL_ICONS in layout.tsx). They
 * inherit their ink from wherever they sit, so there is nothing to theme.
 */
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A written page: the blog's entries. */
export const PostIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
  </svg>
);

/** A bound book: a repository on the projects page. */
export const RepoIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M6 19V4a2 2 0 0 1 2-2h10v15H8a2 2 0 0 0-2 2a2 2 0 0 0 2 2h10" />
    <path d="M10 17v5l1.5-1 1.5 1v-5" />
  </svg>
);

/** A case: a role on the cv. */
export const BriefcaseIcon: React.FC = () => (
  <svg {...iconProps}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 12h18" />
  </svg>
);

/** A mortarboard: a degree on the cv. */
export const GraduationIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M12 4 2 9l10 5 10-5z" />
    <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
  </svg>
);

/** A sealed sheet: a certification on the cv. */
export const CertificateIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M6 3h9l3 3v8H6z" />
    <path d="M9 7h6" />
    <path d="M9 10.5h4" />
    <circle cx="12" cy="17.5" r="3" />
    <path d="M10 20.2V23l2-1.2 2 1.2v-2.8" />
  </svg>
);

/** An arrow pointing up and out: the way into a post. */
export const ArrowOutIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

/** The octocat, in outline: the way out to a repo on github. */
export const GitHubIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

/**
 * The corner mark. A card's kind glyph, pinned to the card's top-right corner
 * by `.entry-kind` (cards.scss); the card has to be a positioning context,
 * which every card on the site already is. Decorative — the section the card
 * is in has already said what kind of thing it is.
 */
export const EntryKind: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <span className="entry-kind" aria-hidden="true">
    {children}
  </span>
);
