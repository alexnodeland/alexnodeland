import React from 'react';
import SEO from '../components/seo';
import { NOT_FOUND_ATTRIBUTE, markNotFound } from '../lib/notFound';
import { FONT_WEIGHT_STRONG, whenFontReady } from '../lib/utils/fonts';
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
// over the field; the field itself becomes the number.
//
// The page has no content. It had a line and the address that was asked for,
// and both were the hero saying the same thing twice: the title already reads
// "alex → 404" and the line under it already says the page came apart. The
// address is in the address bar, where the visitor typed it.
//
// So there is no window either. A frame is drawn around a page, and here it
// was a box around nothing, laid over the one thing there is to look at. The
// document is marked while the page is up and the chrome's stylesheet takes
// the frame away (404.scss); the footer, which lives in the window on every
// other page, is left standing on the field at its foot.
//
// There are no ways out drawn here either. The hero's crumb leads home and the
// nav capsule lists the sections, so a second set of the same links was the
// page saying everything twice as well.
const NotFoundPage: React.FC = () => {
  // The flag waits for the cut of the typeface the number is drawn in. The
  // field rasterises "404" onto a canvas the moment the flag goes up, and a
  // canvas draws in whatever is loaded just then: without the wait the number
  // was set in the visitor's fallback face on a cold load and in the site's
  // own everywhere else. Already loaded — any visit after the first — this
  // runs at once.
  React.useEffect(() => {
    const cancel = whenFontReady(FONT_WEIGHT_STRONG, '404', () =>
      markNotFound(true)
    );
    return () => {
      cancel();
      markNotFound(false);
    };
  }, []);

  // The mark the chrome is restyled by. The 404's own document arrives
  // carrying it; a reader who walked into a missing page from inside the site
  // gets it here.
  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute(NOT_FOUND_ATTRIBUTE, '');
    return () => root.removeAttribute(NOT_FOUND_ATTRIBUTE);
  }, []);

  return <SEO title="404" noindex />;
};

export default NotFoundPage;
