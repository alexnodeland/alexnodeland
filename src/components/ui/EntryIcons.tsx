import React from 'react';

/**
 * The glyphs that open a list entry's title row — one per kind of thing the
 * site keeps lists of. The projects page has carried a repo mark beside every
 * card title for a while; these are its counterparts for the blog and the cv,
 * so the three list pages open their cards the same way.
 *
 * One grammar, the site's: a 24 viewBox, no fill, a 1.75 stroke in
 * `currentColor` with round caps and joins — the same set of numbers the
 * footer's social marks are drawn to (see SOCIAL_ICONS in layout.tsx). They
 * inherit their ink from the row they sit in, so there is nothing to theme.
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
