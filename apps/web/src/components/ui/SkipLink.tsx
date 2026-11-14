import React from 'react';

/** The id the window's <main> wears, and the link below points at. */
export const MAIN_ID = 'main';

/**
 * The way past the chrome for someone on a keyboard: the first thing Tab
 * lands on, on every page, and invisible until it does. Without it the page's
 * own first link is six stops in, behind the background pill, the four page
 * links and the crumb home — on every page, every time.
 *
 * A real link to a real fragment, so it works before the bundle has loaded.
 * Once it has, the click is handled here instead: the fragment would be left
 * in the address bar as though it were somewhere a visitor had gone, and
 * moving focus is all that was asked for. Focus lands on <main>, which sits
 * inside the window — so the arrow keys and the page keys scroll it natively
 * from there.
 */
const SkipLink: React.FC = () => (
  <a
    className="skip-link"
    href={`#${MAIN_ID}`}
    onClick={event => {
      const main = document.getElementById(MAIN_ID);
      if (!main) return;
      event.preventDefault();
      main.focus();
    }}
  >
    skip to content
  </a>
);

export default SkipLink;
