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

// The navigation transition, in milliseconds.
//
// The two heroes pass like a reel: the outgoing one is kept on screen as a
// ghost and drifts up and out while the incoming one is already rising in
// underneath it, so there is never a frame with no hero. The region's height
// eases between what the two occupy, which is what makes the window below —
// `flex: 1` — grow or shrink rather than snap. The page's own content eases in
// inside a frame that does not move, because it is the same element it was.
//
// The numbers sit in the same band as the rest of the chrome (the rail
// capsules transition at 300ms): long enough to read as a move rather than a
// blink, short enough not to be in the way of the next click.
const HERO_OUT_MS = 160;
const HERO_IN_MS = 240;
// The tagline is the second beat. It starts after the title and runs a little
// longer, so the hero assembles rather than arriving as one slab.
const TAGLINE_DELAY_MS = 60;
const TAGLINE_IN_MS = 260;
const HERO_RESIZE_MS = 260;
const CONTENT_IN_MS = 240;
// The brand is the longest thread in the move, and the one the eye follows.
const BRAND_FLIP_MS = 380;

// How far anything travels on the way in or out. One distance for the whole
// transition, and one direction: everything moves up through the frame.
const RISE_PX = 10;

const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
// EASE_OUT reflected. What leaves accelerates away exactly as hard as what
// arrives decelerates in, so the two halves of a swap are one gesture instead
// of two easing families meeting in the middle.
const EASE_IN = 'cubic-bezier(0.7, 0, 0.84, 0)';

// The incoming pieces all share these keyframes; only their timing differs.
const RISE_IN = [
  { opacity: 0, transform: `translateY(${RISE_PX}px)` },
  { opacity: 1, transform: 'none' },
];

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const canAnimate = (el: Element | null | undefined): el is HTMLElement =>
  Boolean(el) && typeof (el as HTMLElement).animate === 'function';

// The collapse the stage is publishing right now. Read before a navigation
// zeroes it, and pinned onto the ghost, so a hero that was scrolled down when
// the reader clicked leaves looking exactly as it did.
const readCollapse = (stage: HTMLElement): string => {
  if (typeof window === 'undefined') return '0';
  if (typeof window.getComputedStyle !== 'function') return '0';
  const value = window
    .getComputedStyle(stage)
    .getPropertyValue('--hero-collapse')
    .trim();
  return value || '0';
};

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

// What the departing hero is measured for, so the arriving one can be animated
// off those numbers rather than off nothing.
interface HeroSnapshot {
  height: number;
  brand: DOMRect | null;
  ghostId: number;
}

// The outgoing hero, kept on screen for the length of its exit. It is rendered
// from the same registry as the live one — a second resolution of the path
// that is leaving — rather than cloned out of the DOM, so it is React's to
// mount and unmount like anything else.
interface HeroGhost {
  id: number;
  path: string;
  collapsible: boolean;
  style: React.CSSProperties;
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

  // The hero the shell is currently wearing. It follows the router in the same
  // frame — the outgoing one is held separately, as a ghost, rather than by
  // making the live hero wait for its own exit to finish.
  const [shownPath, setShownPath] = React.useState(pathname);
  const {
    key: heroKey,
    hero,
    collapsible,
  } = React.useMemo(() => resolveHero(shownPath), [shownPath]);
  const shouldCollapse = Boolean(hero) && collapsible;

  // The veil is there for the sticky control rows — the chips on blog,
  // projects and cv that content scrolls underneath. The home page has no
  // row, so the band up there was darkening a page nothing floats over: a
  // slab of shade on the field, protecting a collision that cannot happen.
  const wantsVeil = pathname.replace(/\/+$/, '') !== '';

  const previousPathRef = React.useRef<string | null>(null);
  const snapshotRef = React.useRef<HeroSnapshot | null>(null);
  const releaseHeightRef = React.useRef<(() => void) | null>(null);
  const ghostRef = React.useRef<HTMLElement>(null);
  const ghostIdRef = React.useRef(0);
  const ghostTimerRef = React.useRef(0);
  // The scroll-linked properties cache the last value they wrote, so after a
  // navigation puts the window back to the top they have to be told to forget
  // it and republish — otherwise the next scroll that lands on the same number
  // is skipped as "no change".
  const syncCollapseRef = React.useRef<(() => void) | null>(null);
  const syncVeilRef = React.useRef<(() => void) | null>(null);

  // The outgoing hero, held on screen while it leaves.
  const [ghost, setGhost] = React.useState<HeroGhost | null>(null);

  // ── The navigation, half one ────────────────────────────────────────────
  // The page inside the window has already swapped by the time this runs (it
  // is the same commit). What is left is the shell's half: read the hero that
  // is leaving, hand it to a ghost, put the window back to the top, and swap
  // the live hero in the same flush — so the two exist together and nothing
  // ever shows an empty hero.
  React.useLayoutEffect(() => {
    const previous = previousPathRef.current;
    previousPathRef.current = pathname;
    // First mount renders plainly — a cold load is not a transition.
    if (previous === null || previous === pathname) return;

    const region = heroRef.current;
    const stage = stageRef.current;
    const panel = windowRef.current;
    const reduce = prefersReducedMotion();
    const heroChanged = heroKeyFor(pathname) !== heroKey;

    // Read the outgoing hero exactly as it stands — collapsed if the reader
    // had scrolled — before anything below disturbs the layout. Its box, its
    // brand's box and the collapse it is wearing are the whole starting state.
    const height = region ? region.getBoundingClientRect().height : 0;
    const brand =
      region
        ?.querySelector<HTMLElement>('[data-brand-anchor]')
        ?.getBoundingClientRect() ?? null;

    const animating = !reduce && heroChanged && canAnimate(region);
    // There is only something to see out if the outgoing page had a hero at
    // all; arriving from a blog post, the incoming one simply rises in.
    const seeingOut = animating && region.childElementCount > 0;

    const ghostId = ++ghostIdRef.current;
    if (seeingOut && stage) {
      const box = region.getBoundingClientRect();
      const stageBox = stage.getBoundingClientRect();
      setGhost({
        id: ghostId,
        path: shownPath,
        collapsible: shouldCollapse,
        style: {
          top: box.top - stageBox.top,
          left: box.left - stageBox.left,
          width: box.width,
          height: box.height,
          // Pinned, so the ghost keeps the geometry the reader was actually
          // looking at while the live region below it goes back to rest.
          '--hero-collapse': readCollapse(stage),
        } as React.CSSProperties,
      });
    } else {
      setGhost(null);
    }

    // The window is one element across the whole site now, so it keeps its
    // scroll position between pages unless we put it back, and a new hero must
    // never arrive already collapsed.
    if (panel) {
      panel.scrollTop = 0;
      // The veil belongs to a scroll that no longer exists. It has its own
      // short opacity transition, so writing 0 fades it rather than cutting.
      panel.style.setProperty('--veil-strength', '0');
    }
    stage?.style.setProperty('--hero-collapse', '0');
    syncCollapseRef.current?.();
    syncVeilRef.current?.();

    if (animating) snapshotRef.current = { height, brand, ghostId };

    // The swap is immediate: React flushes this before the browser paints, so
    // the ghost and the new hero land in the same frame.
    setShownPath(pathname);

    // The arrival ease is scoped to the content, not to the window: the frame
    // is the same panel it was a moment ago and blinking it would say
    // otherwise.
    if (!reduce && canAnimate(mainRef.current)) {
      mainRef.current.animate(RISE_IN, {
        duration: CONTENT_IN_MS,
        easing: EASE_OUT,
      });
    }
    // heroKey, shownPath and shouldCollapse all describe the page being left;
    // this effect is what replaces them, so re-running on them would restart
    // the transition halfway through its own swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── The navigation, half two ────────────────────────────────────────────
  // Both heroes are in the DOM. Run the move: the region's height eases from
  // what the old one occupied to what this one does (the window is `flex: 1`,
  // so that one transition is what resizes it), the new hero assembles title
  // first and tagline second, the brand travels between the two at full ink,
  // and the ghost drifts up and out from under it.
  React.useLayoutEffect(() => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const region = heroRef.current;
    if (!snapshot || !region) return;

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

    // The incoming hero, in two beats rather than as one block. What fades is
    // everything except the brand: on a crumb title that is the wrapped tail
    // ("→ blog"), on the cover there is nothing but the brand, so the title
    // does not fade at all and only travels.
    const anchor = region.querySelector<HTMLElement>('[data-brand-anchor]');
    const h1 = region.querySelector<HTMLElement>('h1');
    const title =
      region.querySelector<HTMLElement>('.hero-crumb-rest') ??
      (anchor && h1?.contains(anchor) ? null : h1);
    if (canAnimate(title)) {
      title.animate(RISE_IN, { duration: HERO_IN_MS, easing: EASE_OUT });
    }
    const tagline = region.querySelector<HTMLElement>('p');
    if (canAnimate(tagline)) {
      tagline.animate(RISE_IN, {
        duration: TAGLINE_IN_MS,
        easing: EASE_OUT,
        delay: TAGLINE_DELAY_MS,
        // Held at the first keyframe through the delay, so the tagline waits
        // its turn instead of showing and then fading in.
        fill: 'backwards',
      });
    }

    // Brand continuity. "alex" is in both heroes — as the cover title on the
    // homepage, as the crumb everywhere else — so it neither fades out with
    // the ghost (the stylesheet hides the ghost's copy) nor fades in with the
    // rest: it is the one thing on screen that simply travels, at full ink,
    // from the box it held to the box it now holds. Measured in this component
    // rather than stashed by gatsby-browser, since the shell outlives the
    // navigation and can hold the reading itself.
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
            { duration: BRAND_FLIP_MS, easing: EASE_OUT }
          );
        }
      }
    }

    // The ghost leaves in the same direction everything else is travelling.
    const { ghostId } = snapshot;
    const drop = () =>
      setGhost(current => (current && current.id === ghostId ? null : current));
    const ghostEl = ghostRef.current;
    // Set here rather than in the JSX: React 18 drops unknown boolean props,
    // and `inert` — which is what actually takes the ghost's links out of the
    // tab order — is one.
    ghostEl?.setAttribute('inert', '');
    if (canAnimate(ghostEl)) {
      const exit = ghostEl.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: `translateY(-${RISE_PX}px)` },
        ],
        { duration: HERO_OUT_MS, easing: EASE_IN, fill: 'forwards' }
      );
      if (exit.finished) exit.finished.then(drop, () => {});
      else exit.onfinish = drop;
      // A tab backgrounded mid-exit never resolves `finished`, and a ghost is
      // not something to leave lying on the field.
      window.clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = window.setTimeout(drop, HERO_OUT_MS + 400);
    } else {
      drop();
    }

    return () => {
      releaseHeightRef.current?.();
      window.clearTimeout(ghostTimerRef.current);
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
      const o =
        Math.round(Math.min(Math.max(panel.scrollTop / 90, 0), 1) * 20) / 20;
      if (o === last) return;
      last = o;
      panel.style.setProperty('--veil-strength', String(o));
      // At rest the veil is invisible but its backdrop blur was still a live
      // filter surface the compositor had to keep resolving — over a canvas
      // that repaints every frame. The class lets the stylesheet take the
      // whole layer out (visibility) whenever there is nothing to veil.
      panel.classList.toggle('veil-live', o > 0);
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
      panel.classList.remove('veil-live');
    };
  }, []);

  // The window's top edge is dynamic now — it sits below the hero and rises
  // as the hero collapses — so its live position is published for the two
  // sidebars, whose height must match the window's at all times. A
  // ResizeObserver catches every cause of movement (collapse, hero swap,
  // viewport resize), since each one changes the flex-sized panel's height.
  //
  // Published only while a sidebar exists to read it. The property lives on
  // the document root — the sidebars render in other subtrees — so each write
  // invalidates style for the whole document, and the collapse moves this
  // edge on every scroll frame; running the publisher permanently taxed every
  // scroll on every page for two panels that are usually closed. A layout
  // effect, so the value is in place before a freshly opened panel's first
  // paint.
  const sidebarVisible =
    isSettingsPanelOpen ||
    isClosingSettingsPanel ||
    isChatPanelOpen ||
    isClosingChatPanel;
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const panel = windowRef.current;
    if (!panel || !sidebarVisible) return;
    let frame = 0;
    let last = '';
    const publish = () => {
      frame = 0;
      const top = `${Math.round(panel.getBoundingClientRect().top)}px`;
      if (top === last) return;
      last = top;
      document.documentElement.style.setProperty('--window-top', top);
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
  }, [sidebarVisible]);

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

    // The observer fires on every frame of the hero's height ease (the region
    // is the thing being resized), but the widths the split depends on only
    // change when the text or the column does — so identical readings are
    // dropped before they turn into style writes, which would otherwise
    // invalidate the hero's subtree once per animation frame.
    let lastKey = '';
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
      const titleShift = (width - h1.offsetWidth) / 2;
      const subShift = (width - subWidth) / 2;
      const rowLift = (h1.offsetHeight + sub.offsetHeight) / 2;
      // Whether the tagline actually fits beside the shrunken title. Most of
      // them do, and this is 1; the projects tagline is nearly the full column
      // wide, so it scales down — pinned to its right edge — by exactly the
      // amount it overruns rather than colliding with the title.
      const room = width - h1.offsetWidth * TITLE_SCALE - COLLAPSED_GAP;
      const scale = subWidth > 0 ? Math.min(1, room / subWidth) : 1;

      const key = `${titleShift}|${subShift}|${rowLift}|${scale}`;
      if (key === lastKey) return;
      lastKey = key;
      el.style.setProperty('--title-shift', `${titleShift}px`);
      el.style.setProperty('--sub-shift', `${subShift}px`);
      el.style.setProperty('--row-lift', `${rowLift}px`);
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
            {/* The hero that is leaving, parked at the box it occupied and
                animated out from under the one arriving. It is a real
                .site-hero so the collapse choreography still applies to it —
                pinned, via the inline --hero-collapse — and it is hidden from
                assistive tech and the pointer, because it is a picture of a
                page that is already gone. */}
            {ghost && (
              <section
                key={ghost.id}
                className={`site-hero hero-ghost${
                  ghost.collapsible ? ' is-collapsible' : ''
                }`}
                ref={ghostRef}
                style={ghost.style}
                aria-hidden="true"
              >
                {resolveHero(ghost.path).hero}
              </section>
            )}
            <div className="layout" ref={windowRef}>
              {/* A tapered blur pinned to the window's visible top edge:
                  content dissolves as it scrolls out instead of colliding with
                  whatever floats up there (the cv's sticky controls). Skipped
                  where nothing floats — see `wantsVeil`. */}
              {wantsVeil && <div className="window-veil" aria-hidden="true" />}
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
                    {/* The line runs to two on the narrowest phones, and the
                        only break it must not take is the one inside the name
                        — "alex" left on one line and "nodeland" on the next
                        reads as two people. */}
                    <span className="footer-copyright-name">
                      {siteConfig.author.toLowerCase()}
                    </span>
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
