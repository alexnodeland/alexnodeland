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
// the hero.
//
// The page has no content. It had a line and the address that was asked for,
// and both were the hero saying the same thing twice: the title already reads
// "alex → 404" and the line under it already says the page came apart. The
// address is in the address bar, where the visitor typed it. What is left is
// the window itself, drifting off empty, which is the one part of it that was
// never prose.
//
// There are no ways out drawn here either. The hero's crumb leads home and the
// nav capsule lists the sections, so a second set of the same links inside the
// window was the page saying everything twice as well.
const NotFoundPage: React.FC = () => {
  React.useEffect(() => {
    markNotFound(true);
    return () => markNotFound(false);
  }, []);

  React.useEffect(() => {
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

  return <SEO title="404" noindex />;
};

export default NotFoundPage;
