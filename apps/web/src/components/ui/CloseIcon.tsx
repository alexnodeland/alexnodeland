import React from 'react';

/**
 * The one close glyph. Every panel and dialog on the site is put away with
 * the same mark in the same box (`icon-button` in mixins.scss draws the box
 * at 16px), so this is drawn once: the site's 24 viewBox, a 2 stroke in
 * `currentColor`, round caps.
 */
const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default CloseIcon;
