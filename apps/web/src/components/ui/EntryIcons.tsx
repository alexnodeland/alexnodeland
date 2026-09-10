import React from 'react';

/**
 * The marks a card's footer uses to point out of itself: the arrow into a
 * post, the chain out to a project's own site, and the octocat out to a repo. (The glyphs that said what *kind* of
 * thing a card was — a page, a book, a case, a mortarboard, a seal — are
 * gone. They opened every title row on the site, then sat in every corner,
 * and in both places they were a picture restating what the section heading
 * had already said.)
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

/** An arrow pointing up and out: the way into a post. */
export const ArrowOutIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

/**
 * A chain of two links: the way out to a project's own site. Drawn at the
 * octocat's weight and on its grid, since the two sit side by side in a card's
 * footer and a heavier chain would read as the louder of the two ways out.
 */
export const LinkIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M10.5 13.5a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M13.5 10.5a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
  </svg>
);

/** The octocat, in outline: the way out to a repo on github. */
export const GitHubIcon: React.FC = () => (
  <svg {...iconProps}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);
