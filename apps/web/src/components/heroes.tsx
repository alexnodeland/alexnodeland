import { Link } from 'gatsby';
import React from 'react';
import { homepageConfig, projectsConfig } from '../config';

/**
 * The page heroes, in one place.
 *
 * The shell (nav, hero region, window, chat) mounts once for the whole site
 * and only the page content inside the window swaps, so the hero can no
 * longer be a prop a page hands up — the page that would hand it over is the
 * thing being replaced. Instead the heroes live here, keyed by path, and
 * Layout resolves its own from `location.pathname`.
 *
 * Class names are unchanged (`hero`, `blog-header`, `projects-header`,
 * `cv-page-header`, `hero-crumb`, `data-brand-anchor`): the collapse
 * choreography, the split measurement and the brand FLIP all key off them.
 */
export interface ResolvedHero {
  /**
   * Stable identity for whatever the path resolves to. Layout uses it to tell
   * "the hero changed" from "only the page under it did", and as the dep that
   * re-measures the split.
   */
  key: string;
  hero: React.ReactNode | null;
  /**
   * Whether the hero compresses as the window scrolls. Every hero the site
   * has does.
   */
  collapsible: boolean;
  /**
   * Whether the hero is worn folded from the start and never opens — the
   * brand alone on a page with no title of its own (a post), so the way home
   * is on every page, on the line it folds to everywhere else.
   */
  pinned: boolean;
}

// The way home lives in the title: "alex → blog". The crumb is a real link and
// carries the brand anchor, so it is the thing the FLIP lands on.
//
// Everything after the crumb is wrapped rather than left as loose nodes: on a
// navigation the word "alex" travels between the two heroes at full ink while
// the rest of the title fades in around it, and the rest has to be one
// animatable box for that to be possible.
const crumbTitle = (label: string) => (
  <h1>
    <Link to="/" className="hero-crumb" data-brand-anchor>
      alex
    </Link>
    {/* The space lives between the two boxes, not inside the second: leading
        whitespace at the start of an inline-block collapses, which is how the
        title used to render as "alex→ blog". */}{' '}
    <span className="hero-crumb-rest">
      <span className="hero-crumb-sep">→ </span>
      {label}
    </span>
  </h1>
);

/**
 * The key the shell resolves while the 404 page is up. Not a path, so no
 * address a visitor could type resolves to it by accident — the page itself
 * asks for it (see src/lib/notFound.ts).
 */
export const NOT_FOUND_KEY = '404:';

// Each entry is built on demand rather than held as a module constant: the
// elements are cheap, and a fresh tree per resolution keeps the outgoing and
// incoming heroes from ever sharing a node during a swap.
const HEROES: Record<string, () => React.ReactNode> = {
  '/': () => (
    <section className="hero">
      <h1 data-brand-anchor>{homepageConfig.hero.title}</h1>
      {/* The subtitle is also the map of the projects page: each segment
          links to its section anchor there. */}
      <p className="hero-subtitle">
        {homepageConfig.hero.subtitleLinks.map((link, index) => (
          <React.Fragment key={link.href}>
            {index > 0 && ' → '}
            <Link to={link.href} className="hero-subtitle-link">
              {link.label}
            </Link>
          </React.Fragment>
        ))}
      </p>
    </section>
  ),
  '/blog': () => (
    <header className="blog-header">
      {crumbTitle('blog')}
      <p>things built, played, and written about.</p>
    </header>
  ),
  '/projects': () => (
    <header className="projects-header">
      {crumbTitle(projectsConfig.title)}
      <p>{projectsConfig.subtitle}</p>
    </header>
  ),
  '/cv': () => (
    <header className="cv-page-header">
      {crumbTitle('cv')}
      <p>roles, research, and skills.</p>
    </header>
  ),
  [NOT_FOUND_KEY]: () => (
    <header className="not-found-header">
      {crumbTitle('404')}
      <p>nothing here. the page came apart.</p>
    </header>
  ),
};

// What a path with no hero of its own resolves to — blog posts, and any
// address that is not a page until the 404 raises its flag: the brand alone,
// worn folded. The crumb without its tail, so the FLIP that carries "alex"
// between heroes has the same anchor to land on; the blank tagline keeps the
// header's second line so the folded row's geometry is the crumb pages'.
const NO_HERO = 'brand';

const brandHero = () => (
  <header className="brand-header">
    <h1>
      <Link to="/" className="hero-crumb" data-brand-anchor>
        alex
      </Link>
    </h1>
    <p className="hero-tagline-blank" aria-hidden="true">
      &nbsp;
    </p>
  </header>
);

/**
 * Trailing-slash tolerant exact match. Gatsby serves `/blog` and `/blog/` as
 * the same page and hands whichever one the link was written with to
 * `location.pathname`, so the lookup has to see one spelling.
 */
const normalize = (pathname: string): string => {
  const trimmed = (pathname || '/').replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

/**
 * The hero's identity for a path, without building it. Layout compares this
 * across a navigation to decide whether the hero has to peel at all.
 */
export const heroKeyFor = (pathname: string): string => {
  const path = normalize(pathname);
  return path in HEROES ? path : NO_HERO;
};

export const resolveHero = (pathname: string): ResolvedHero => {
  const key = heroKeyFor(pathname);
  if (key === NO_HERO)
    return { key, hero: brandHero(), collapsible: true, pinned: true };
  return { key, hero: HEROES[key](), collapsible: true, pinned: false };
};

export default resolveHero;
