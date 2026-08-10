import { Link } from 'gatsby';
import React from 'react';
import { getAllSocialLinks, siteConfig } from '../config';
import '../styles/layout.scss';
import { useSettingsPanel } from './SettingsPanelContext';
import { ChatIcon, ChatModal, KeyboardShortcuts } from './chat';
import { heroKeyFor, resolveHero } from './heroes';
import Shortcuts from './ShortcutsModal';

interface LayoutProps {
  children: React.ReactNode;
  /**
   * The router's location, handed down by `wrapPageElement`. Layout mounts
   * once for the whole site and only the page inside the window swaps, so
   * this — not a prop from the page — is what tells the shell which hero to
   * wear and when a navigation has happened.
   */
  location?: { pathname?: string };
}

// How far the window has to scroll before the hero is fully collapsed. Short
// on purpose: the subtitle should be gone by the time the first card clears
// the top of the frame, not halfway down the page.
const HERO_COLLAPSE_RANGE = 160;

// What the title is scaled to at full collapse, and the space left between it
// and the tagline once the two share a row. Both are duplicated in the
// stylesheet (the 0.45 the h1's scale() counts down by is 1 - TITLE_SCALE);
// they live here too because the fit calculation below needs numbers, and CSS
// cannot measure text.
const TITLE_SCALE = 0.55;
const COLLAPSED_GAP = 24;

// The navigation transition, in milliseconds. The old hero peels first, the
// new one is written in its place, and the hero region's height eases between
// the two so the window below it grows or shrinks instead of snapping. The
// page's own content eases in inside the window — the frame itself never
// moves, because it is the same element it was before the navigation.
const HERO_OUT_MS = 120;
const HERO_IN_MS = 160;
const HERO_RESIZE_MS = 200;
const CONTENT_IN_MS = 200;

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const canAnimate = (el: Element | null | undefined): el is HTMLElement =>
  Boolean(el) && typeof (el as HTMLElement).animate === 'function';

// The footer marks, drawn as one monoline set rather than collected: the
// vendor logos were a mix of outline and solid and read as five unrelated
// stickers. One viewBox, one stroke weight, `currentColor`, so they inherit
// the footer's ink and its hover the way any other control on the site does.
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  email: (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  ),
  github: (
    <svg {...iconProps}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  ),
  linkedin: (
    <svg {...iconProps}>
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4V9h4v1.5A6 6 0 0 1 16 8z" />
    </svg>
  ),
  instagram: (
    <svg {...iconProps}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  ),
  youtube: (
    <svg {...iconProps}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9.5l5 2.5-5 2.5z" />
    </svg>
  ),
  twitter: (
    <svg {...iconProps}>
      <path d="M22 4.5a8.3 8.3 0 0 1-2.4.7 4.2 4.2 0 0 0 1.8-2.3 8.4 8.4 0 0 1-2.6 1A4.15 4.15 0 0 0 11.6 7a11.8 11.8 0 0 1-8.6-4.3 4.15 4.15 0 0 0 1.3 5.5A4.1 4.1 0 0 1 2.4 7.7v.05a4.15 4.15 0 0 0 3.3 4.1 4.2 4.2 0 0 1-1.9.07 4.15 4.15 0 0 0 3.9 2.9A8.3 8.3 0 0 1 2 16.5a11.75 11.75 0 0 0 6.3 1.85c7.6 0 11.8-6.3 11.8-11.75l-.02-.53A8.2 8.2 0 0 0 22 4.5z" />
    </svg>
  ),
};

// A platform the config grows later still gets a mark rather than an empty
// box: a plain link glyph in the same grammar.
const FALLBACK_ICON = (
  <svg {...iconProps}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
);

const socialIcon = (platform: string): React.ReactNode =>
  SOCIAL_ICONS[platform] ?? FALLBACK_ICON;

// What the hero peel measures before it runs, so the swap can put it back.
interface HeroSnapshot {
  height: number;
  brand: DOMRect | null;
}

const LayoutInner: React.FC<LayoutProps> = ({ children, location }) => {
  const {
    isSettingsPanelOpen,
    isClosingSettingsPanel,
    isChatPanelOpen,
    isClosingChatPanel,
    isContentHidden,
  } = useSettingsPanel();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);
  const heroRef = React.useRef<HTMLElement>(null);

  const pathname = location?.pathname ?? '/';

  // The hero the shell is currently wearing. It lags the router by the length
  // of the peel — the outgoing hero has to still be on screen to fade out —
  // and catches up the moment that finishes.
  const [shownPath, setShownPath] = React.useState(pathname);
  const {
    key: heroKey,
    hero,
    collapsible,
  } = React.useMemo(() => resolveHero(shownPath), [shownPath]);
  const shouldCollapse = Boolean(hero) && collapsible;

  const previousPathRef = React.useRef<string | null>(null);
  const snapshotRef = React.useRef<HeroSnapshot | null>(null);
  const peelRef = React.useRef<Animation | null>(null);
  const releaseHeightRef = React.useRef<(() => void) | null>(null);
  // While a hero is peeling, the scroll-linked properties stop being written:
  // the departure has to look exactly like what was on screen, and putting the
  // window back to the top would otherwise snap a collapsed hero open under
  // the fade. The two `sync` refs are how the transition hands the link back —
  // they re-zero each effect's change cache and republish from the real
  // scrollTop, so nothing is left stale.
  const scrollLinkFrozenRef = React.useRef(false);
  const syncCollapseRef = React.useRef<(() => void) | null>(null);
  const syncVeilRef = React.useRef<(() => void) | null>(null);

  // ── The navigation, half one ────────────────────────────────────────────
  // The page inside the window has already swapped by the time this runs (it
  // is the same commit), so what is left is the shell's half: put the window
  // back to the top, ease the new content in, and peel the outgoing hero —
  // from wherever the hero actually was, collapsed or not.
  React.useLayoutEffect(() => {
    const previous = previousPathRef.current;
    previousPathRef.current = pathname;
    // First mount renders plainly — a cold load is not a transition.
    if (previous === null || previous === pathname) return;

    const region = heroRef.current;
    const panel = windowRef.current;
    const reduce = prefersReducedMotion();
    const heroChanged = heroKeyFor(pathname) !== heroKey;

    // A hero that has not finished its last peel would otherwise fade from
    // wherever it stopped.
    peelRef.current?.cancel();
    peelRef.current = null;
    // A navigation that interrupts another one inherits nothing from it.
    scrollLinkFrozenRef.current = false;

    // Read the outgoing hero exactly as it stands — collapsed if the reader
    // had scrolled — before anything below disturbs the layout. These two
    // numbers are the transition's starting state.
    const height = region ? region.getBoundingClientRect().height : 0;
    const brand =
      region
        ?.querySelector<HTMLElement>('[data-brand-anchor]')
        ?.getBoundingClientRect() ?? null;

    const animating = !reduce && heroChanged && canAnimate(region);
    // There is only something to peel if the outgoing page had a hero at all;
    // arriving from a blog post, the incoming one simply grows in.
    const peeling = animating && region.childElementCount > 0;

    // Hold --hero-collapse where it is for the length of the peel. The scroll
    // reset on the next line would otherwise zero it instantly and the
    // outgoing hero would spring back open as it faded.
    if (peeling) scrollLinkFrozenRef.current = true;

    // The window is one element across the whole site now, so it keeps its
    // scroll position between pages unless we put it back.
    if (panel) {
      panel.scrollTop = 0;
      // The veil belongs to a scroll that no longer exists. It has its own
      // short opacity transition, so writing 0 fades it rather than cutting.
      panel.style.setProperty('--veil-strength', '0');
    }

    if (!animating) {
      // Nothing to protect: put the hero back to its resting state with the
      // page and let the scroll link resume immediately.
      stageRef.current?.style.setProperty('--hero-collapse', '0');
      syncCollapseRef.current?.();
      syncVeilRef.current?.();
      setShownPath(pathname);
      if (!reduce && canAnimate(mainRef.current)) animateContentIn();
      return;
    }

    snapshotRef.current = { height, brand };

    // The arrival ease is scoped to the content, not to the window: the frame
    // is the same panel it was a moment ago and blinking it would say
    // otherwise.
    if (canAnimate(mainRef.current)) animateContentIn();

    if (!peeling) {
      setShownPath(pathname);
      return;
    }

    const peel = region.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-4px)' },
      ],
      { duration: HERO_OUT_MS, easing: 'ease-in', fill: 'forwards' }
    );
    peelRef.current = peel;

    let abandoned = false;
    const swap = () => {
      if (!abandoned) setShownPath(pathname);
    };
    if (peel.finished) {
      peel.finished.then(swap, () => {});
    } else {
      peel.onfinish = swap;
    }
    return () => {
      abandoned = true;
    };

    function animateContentIn() {
      mainRef.current?.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: CONTENT_IN_MS, easing: 'ease-out' }
      );
    }
    // heroKey is derived from shownPath, which this effect drives; re-running
    // on it would restart the transition halfway through its own swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── The navigation, half two ────────────────────────────────────────────
  // The new hero is in the DOM. Write it in, and ease the region's height from
  // what the old one occupied to what this one does — the window is `flex: 1`,
  // so that one transition is what makes it resize rather than jump.
  React.useLayoutEffect(() => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const region = heroRef.current;
    if (!snapshot || !region) return;

    // Release the hold before anything forces layout: the new hero has to
    // resolve its style at --hero-collapse 0 the first time, or the collapse
    // transitions in the stylesheet would run it open in front of the reader.
    scrollLinkFrozenRef.current = false;
    stageRef.current?.style.setProperty('--hero-collapse', '0');
    syncCollapseRef.current?.();
    syncVeilRef.current?.();

    peelRef.current?.cancel();
    peelRef.current = null;

    // Measure the new hero at its natural height with any leftover lock
    // lifted, then put the old height back and transition off it.
    releaseHeightRef.current?.();
    const to = region.getBoundingClientRect().height;
    if (Math.abs(to - snapshot.height) > 1) {
      region.style.overflow = 'hidden';
      region.style.transition = 'none';
      region.style.height = `${snapshot.height}px`;
      // Force the start height to take before the transition is armed.
      void region.offsetHeight;
      region.style.transition = `height ${HERO_RESIZE_MS}ms ${EASE_OUT}`;
      region.style.height = `${to}px`;

      const release = () => {
        window.clearTimeout(timer);
        region.removeEventListener('transitionend', onEnd);
        region.style.removeProperty('height');
        region.style.removeProperty('overflow');
        region.style.removeProperty('transition');
        releaseHeightRef.current = null;
      };
      const onEnd = (event: TransitionEvent) => {
        if (event.target === region && event.propertyName === 'height')
          release();
      };
      // transitionend does not fire if the transition is interrupted, and the
      // region must never be left with a hard height on it.
      const timer = window.setTimeout(release, HERO_RESIZE_MS + 120);
      region.addEventListener('transitionend', onEnd);
      releaseHeightRef.current = release;
    }

    if (canAnimate(region) && region.childElementCount > 0) {
      region.animate(
        [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: HERO_IN_MS, easing: 'ease-out' }
      );
    }

    // Brand continuity. "alex" is in both heroes — as the cover title on the
    // homepage, as the crumb everywhere else — so it does not fade with the
    // rest: it travels from the box it occupied on the outgoing page to the
    // one it occupies here. Measured in this component rather than stashed by
    // gatsby-browser, since the shell now outlives the navigation and can hold
    // the reading itself.
    const anchor = region.querySelector<HTMLElement>('[data-brand-anchor]');
    if (snapshot.brand && canAnimate(anchor)) {
      const from = snapshot.brand;
      const box = anchor.getBoundingClientRect();
      if (box.height > 0) {
        const scale = from.height / box.height;
        const dx = from.left - box.left;
        const dy = from.top - box.top;
        const moved =
          Math.abs(dx) >= 2 || Math.abs(dy) >= 2 || Math.abs(scale - 1) >= 0.05;
        if (moved) {
          anchor.style.transformOrigin = 'left top';
          anchor.animate(
            [
              { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
              { transform: 'none' },
            ],
            { duration: 380, easing: EASE_OUT }
          );
        }
      }
    }

    return () => {
      releaseHeightRef.current?.();
    };
  }, [shownPath]);

  // Scroll-linked hero collapse. The page scrolls inside `.layout`, not the
  // document, so this reads that element's scrollTop and publishes it as a 0→1
  // progress custom property on the stage. The interpolation itself is CSS —
  // React only ever writes one number, and only when it has actually changed.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const stage = stageRef.current;
    const panel = windowRef.current;
    if (!shouldCollapse || !stage || !panel) return;

    let frame = 0;
    let last = -1;

    const apply = () => {
      frame = 0;
      // Mid-transition the hero is whatever the departing page left on
      // screen; the link resumes when the new one is in.
      if (scrollLinkFrozenRef.current) return;
      const progress = Math.min(
        Math.max(panel.scrollTop / HERO_COLLAPSE_RANGE, 0),
        1
      );
      // Two decimals is finer than a pixel of travel and keeps the style
      // write (and the paint it triggers) off most frames.
      const rounded = Math.round(progress * 100) / 100;
      if (rounded === last) return;
      last = rounded;
      stage.style.setProperty('--hero-collapse', String(rounded));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    // How the transition hands the link back: forget the last written value —
    // it describes a page that is gone — and republish from the real scroll.
    syncCollapseRef.current = () => {
      last = -1;
      apply();
    };
    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      panel.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      syncCollapseRef.current = null;
      stage.style.removeProperty('--hero-collapse');
    };
  }, [shouldCollapse]);

  // The veil only exists once something is actually under it: opacity tracks
  // the window's scroll over its first ~90px, so page tops read at full
  // strength at rest and the overscroll bounce never drags a gradient along.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const panel = windowRef.current;
    if (!panel) return;
    let frame = 0;
    let last = -1;
    const apply = () => {
      frame = 0;
      if (scrollLinkFrozenRef.current) return;
      const o =
        Math.round(Math.min(Math.max(panel.scrollTop / 90, 0), 1) * 20) / 20;
      if (o === last) return;
      last = o;
      panel.style.setProperty('--veil-strength', String(o));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };
    apply();
    syncVeilRef.current = () => {
      last = -1;
      apply();
    };
    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      panel.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      syncVeilRef.current = null;
    };
  }, []);

  // The window's top edge is dynamic now — it sits below the hero and rises
  // as the hero collapses — so its live position is published for the two
  // sidebars, whose height must match the window's at all times. A
  // ResizeObserver catches every cause of movement (collapse, hero swap,
  // viewport resize), since each one changes the flex-sized panel's height.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const panel = windowRef.current;
    if (!panel) return;
    let frame = 0;
    const publish = () => {
      frame = 0;
      const top = Math.round(panel.getBoundingClientRect().top);
      document.documentElement.style.setProperty('--window-top', `${top}px`);
    };
    const request = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(publish);
    };
    publish();
    const observer = new ResizeObserver(request);
    observer.observe(panel);
    window.addEventListener('resize', request);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', request);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty('--window-top');
    };
  }, []);

  // The collapse choreography needs real widths: at full collapse the title
  // parks on the left edge and the tagline on the right, each travelling half
  // of its leftover space, and the tagline rises to the title's centerline.
  // CSS can't measure text, so the distances are published here as pixel
  // custom properties and the stylesheet scales them by --hero-collapse. The
  // hero's identity is a dep: a new hero is new text, and new text is new
  // distances.
  React.useLayoutEffect(() => {
    const el = heroRef.current;
    if (!shouldCollapse || !el) return;

    const measure = () => {
      const h1 = el.querySelector('h1');
      const sub = el.querySelector('p');
      // The registry owns the element the two sit in, so that — not the hero
      // region, which is padded — is the column they travel across. A hero of
      // some other shape simply gets no split.
      const container = h1?.parentElement;
      if (!h1 || !sub || !container) return;

      const width = container.clientWidth;
      const subWidth = sub.offsetWidth;
      el.style.setProperty(
        '--title-shift',
        `${(width - h1.offsetWidth) / 2}px`
      );
      el.style.setProperty('--sub-shift', `${(width - subWidth) / 2}px`);
      el.style.setProperty(
        '--row-lift',
        `${(h1.offsetHeight + sub.offsetHeight) / 2}px`
      );
      // Whether the tagline actually fits beside the shrunken title. Most of
      // them do, and this is 1; the projects tagline is nearly the full column
      // wide, so it scales down — pinned to its right edge — by exactly the
      // amount it overruns rather than colliding with the title.
      const room = width - h1.offsetWidth * TITLE_SCALE - COLLAPSED_GAP;
      const scale = subWidth > 0 ? Math.min(1, room / subWidth) : 1;
      el.style.setProperty('--sub-scale', String(scale));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldCollapse, heroKey]);

  // Panel-state classes. The stage carries them for the hero and the window,
  // which move as one block when a sidebar opens; the nav capsule carries its
  // own copy because it is no longer inside the stage — it floats on the field
  // with the pills.
  const panelState = [
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing',
    isChatPanelOpen && 'chat-panel-open',
    isClosingChatPanel && 'chat-panel-closing',
  ].filter(Boolean);
  const stageClasses = ['stage', ...panelState].join(' ');
  const navClasses = ['nav', ...panelState].join(' ');

  return (
    <>
      {!isContentHidden && (
        <>
          {/* The page links, as one capsule floating top-right. It is the same
              control as the chat pill in the opposite corner — same housing,
              same footprint, same viewport offset — so the two read as one
              right-hand rail on the field rather than as page chrome. The way
              home is not in it: that is the breadcrumb in the hero title. */}
          <nav className={navClasses}>
            <div className="nav-menu">
              {siteConfig.navigation.main.map(item => (
                // partiallyActive keeps the segment lit on subpages
                // (a blog post still lights "blog").
                <Link
                  key={item.name}
                  to={item.href}
                  className="nav-link"
                  activeClassName="active"
                  partiallyActive
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
          <div className={stageClasses} ref={stageRef}>
            {/* A <section> rather than a <div>: the heroes are still <header>
                elements, and a <header> outside a sectioning element would
                claim a `banner` landmark for what is only a page title. It is
                rendered on every page, empty on the ones with no hero, because
                it is the element whose height the navigation transition eases
                — and, empty, it is what holds the window clear of the rail. */}
            <section
              className={`site-hero${shouldCollapse ? ' is-collapsible' : ''}`}
              ref={heroRef}
            >
              {hero}
            </section>
            <div className="layout" ref={windowRef}>
              {/* A tapered blur pinned to the window's visible top edge:
                  content dissolves as it scrolls out instead of colliding with
                  whatever floats up there (the cv's sticky controls). */}
              <div className="window-veil" aria-hidden="true" />
              <main className="main" ref={mainRef}>
                {children}
              </main>
              <footer className="footer">
                <div className="footer-content">
                  <div className="footer-links">
                    <a
                      href={`mailto:${siteConfig.contact.email}`}
                      className="footer-link"
                      data-platform="email"
                      aria-label="email"
                    >
                      <span className="icon">{socialIcon('email')}</span>
                    </a>
                    {getAllSocialLinks().map(({ platform, url }) => {
                      return (
                        <a
                          key={platform}
                          href={url}
                          className="footer-link"
                          data-platform={platform}
                          aria-label={platform}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="icon">{socialIcon(platform)}</span>
                        </a>
                      );
                    })}
                  </div>
                  <p className="footer-copyright">
                    © {new Date().getFullYear()} all rights reserved,{' '}
                    {siteConfig.author.toLowerCase()}
                  </p>
                </div>
              </footer>
            </div>
          </div>
          {/* The one place the site's shortcuts are written down, plus the
              quiet line on the field that says so. It lives in the shell, so
              it is reachable from every page and mounts once. */}
          <Shortcuts />
        </>
      )}

      {/* Chat Components. They live inside the shell, which mounts once for
          the whole site, so the pill's entry animation plays on arrival and
          never again. */}
      <ChatIcon />
      <ChatModal />
      <KeyboardShortcuts />
    </>
  );
};

export default LayoutInner;
