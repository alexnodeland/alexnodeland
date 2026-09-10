import React from 'react';
import SEO from '../components/seo';
import { markNotFound } from '../lib/notFound';
import '../styles/404.scss';

// A missing page has no path of its own to resolve a hero from — it is
// rendered at whatever address was typed — so it raises a flag while it is
// up and the shell wears the 404 hero for it (src/lib/notFound.ts).
//
// The same flag reaches the background. Every simulation has a 404 sequence
// — a way of coming apart into the number that is true to what it is (see
// `notFound` on AnimatedBackgroundProps) — and whichever one is on screen
// plays it: the one the reader was looking at if they came from inside the
// site, the one the visit drew if they landed here cold. Nothing is drawn
// over the field; the field itself becomes the number. Meanwhile the window
// drifts off it (404.scss, keyed off `data-not-found` on the root), leaving
// the hero and the page's one line.
//
// There are no ways out drawn here. The hero's crumb already leads home and
// the nav capsule already lists the sections, so a second set of the same
// links inside the window was the page saying everything twice.
const NotFoundPage: React.FC = () => {
  // The address that was typed, read after mount: the server render has no
  // address, and the page has to hydrate against what it shipped.
  const [address, setAddress] = React.useState<string | null>(null);

  React.useEffect(() => {
    markNotFound(true);
    return () => markNotFound(false);
  }, []);

  React.useEffect(() => {
    setAddress(window.location.pathname);

    // How the chrome comes apart is drawn once per visit: which way the
    // window slides, and how far.
    const root = document.documentElement;
    const sign = Math.random() < 0.5 ? -1 : 1;
    const drop = Math.round(window.innerHeight * (0.1 + Math.random() * 0.06));
    root.dataset.notFound = '';
    root.style.setProperty(
      '--nf-dx',
      `${sign * Math.round(16 + Math.random() * 28)}px`
    );
    root.style.setProperty('--nf-dy', `${drop}px`);
    return () => {
      delete root.dataset.notFound;
      root.style.removeProperty('--nf-dx');
      root.style.removeProperty('--nf-dy');
    };
  }, []);

  return (
    <>
      <SEO title="404" noindex />
      <div className="not-found">
        {address && (
          <p className="not-found-address" aria-label="the address requested">
            <code>{address}</code>
          </p>
        )}
        <p>
          there is no page at this address. the rest of the site is where it
          was.
        </p>
      </div>
    </>
  );
};

export default NotFoundPage;
