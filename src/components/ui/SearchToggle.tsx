import React from 'react';

interface SearchToggleProps {
  open: boolean;
  onToggle: () => void;
  /** id of the search panel this chip shows and hides */
  controls: string;
  className?: string;
}

/**
 * The way to the search box on a phone. On a desktop the box sits in its own
 * panel under the control row and this chip is not drawn at all (see
 * .ui-search-toggle in controls.scss); below the phone breakpoint the panel
 * is folded away behind it, so the first screen of a list page is the list.
 */
const SearchToggle: React.FC<SearchToggleProps> = ({
  open,
  onToggle,
  controls,
  className = '',
}) => (
  <button
    type="button"
    className={`ui-chip-button ui-icon-chip ui-search-toggle${open ? ' is-active' : ''} ${className}`.trim()}
    aria-label={open ? 'hide search' : 'search'}
    aria-expanded={open}
    aria-controls={controls}
    onClick={onToggle}
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
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  </button>
);

export default SearchToggle;
