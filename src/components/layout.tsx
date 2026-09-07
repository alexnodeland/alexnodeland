import { Link } from 'gatsby';
import React from 'react';
import { getAllSocialLinks, siteConfig } from '../config';
import { EASE_IN, EASE_OUT } from '../config/motion';
import { holdNotFound, isNotFound, useNotFound } from '../lib/notFound';
import { prefersReducedMotion, scrollBehavior } from '../lib/utils/motion';
import '../styles/layout.scss';
import { useSettingsPanel } from './SettingsPanelContext';
import ChatIcon from './chat/ChatIcon';
import KeyboardShortcuts from './chat/KeyboardShortcuts';
import { heroKeyFor, NOT_FOUND_KEY, resolveHero } from './heroes';
import Shortcuts from './ShortcutsModal';
import { GitHubIcon } from './ui/EntryIcons';

// The modal carries the markdown renderer and the syntax highlighter, and
// neither is wanted until someone opens the panel — so the whole thing is
// fetched then, rather than shipped with every page.
const ChatModal = React.lazy(() => import('./chat/ChatModal'));

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

// The fold. As the window scrolls, the hero folds to a compact row above it
// and the window's frame rises to take the room — following the scroll
// exactly, both ways (see .site-hero.is-collapsible in layout.scss for the
// choreography and why nothing in it lays out).
//
// Where the browser can run the fold off the window's scroll timeline, the
// compositor reads the progress itself and nothing here runs on a scroll
// frame. Both features are needed as a pair: the timeline alone, without the
// scope that lets the hero — the scroller's sibling — name it, would leave
// the fold with no driver at all.
const supportsScrollDrivenFold = (): boolean =>
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('animation-timeline: scroll()') &&
  CSS.supports('timeline-scope: --window');

// The band the hero gives up: how far the window's box reaches up into the
// hero's. The stylesheet derives it (--fold-band) from the resting height
// measure() publishes; reading it back as geometry is simpler than parsing
// the calc.
const readBand = (region: HTMLElement, panel: HTMLElement): number =>
  Math.max(
    0,
    region.getBoundingClientRect().bottom - panel.getBoundingClientRect().top
  );

// The fold's progress, 0 → 1 across the band.
const readProgress = (panel: HTMLElement, band: number): number =>
  band > 0 ? Math.min(Math.max(panel.scrollTop / band, 0), 1) : 0;

// An element's layout top within an ancestor, summed up the offset chain —
// unaffected by any transform on the way, which is the point: the title is
// measured while it may be mid-fold.
const offsetTopWithin = (el: HTMLElement, ancestor: HTMLElement): number => {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
};

// How far into the fold the phone's tagline is gone (the stylesheet's
// hero-tagline-fade keyframe and its published-path expression carry the
// same fraction): past this the published path takes it out of hit-testing.
const TAGLINE_FADE = 0.2;

// The space left between the shrunken title and the tagline once the two
// share a row. The title's collapsed scale is the stylesheet's
// (`--collapsed-title-scale` on the hero, per breakpoint) and is read from it
// below, so the number lives in one place.
const COLLAPSED_GAP = 24;
const DEFAULT_TITLE_SCALE = 0.55;

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
// transition, and one direction: everything moves up through the frame. The
// curves are the stylesheet's own (see src/config/motion.ts): what arrives
// eases out, what leaves eases in on the reflected curve, so the two halves
// of a swap are one gesture.
const RISE_PX = 10;

// The incoming pieces all share these keyframes; only their timing differs.
const RISE_IN = [
  { opacity: 0, transform: `translateY(${RISE_PX}px)` },
  { opacity: 1, transform: 'none' },
];

const canAnimate = (el: Element | null | undefined): el is HTMLElement =>
  Boolean(el) && typeof (el as HTMLElement).animate === 'function';

// The fold's measured distances. They are properties of the rendered text —
// how far this title has to travel to reach the column's left edge, where its
// line box sits — so Layout writes them on the hero region itself rather than
// anywhere they would inherit from. The ghost is the region's sibling, not its
// child, so it has to be handed a copy (see the navigation's first half).
const FOLD_MEASURES = [
  '--title-shift',
  '--sub-shift',
  '--sub-scale',
  '--title-centre',
] as const;

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
  // The same octocat the project cards point out with (EntryIcons.tsx), so
  // the two never drift.
  github: <GitHubIcon />,
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
  pinned: boolean;
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
  const frameRef = React.useRef<HTMLDivElement>(null);
  const edgeRef = React.useRef<HTMLDivElement>(null);
  // The band the hero gives up, in pixels, as last measured — the fallback
  // publisher's reference for the scroll's progress.
  const bandRef = React.useRef(0);

  // A missing page is rendered at whatever address was typed, so it cannot
  // be told from its path; it raises a flag instead, and the shell resolves
  // the 404 hero from that for as long as the flag is up.
  const notFound = useNotFound();
  const pathname = notFound ? NOT_FOUND_KEY : (location?.pathname ?? '/');

  // The hero the shell is currently wearing. It follows the router in the same
  // frame — the outgoing one is held separately, as a ghost, rather than by
  // making the live hero wait for its own exit to finish.
  const [shownPath, setShownPath] = React.useState(pathname);
  const {
    key: heroKey,
    hero,
    collapsible,
    pinned,
  } = React.useMemo(() => resolveHero(shownPath), [shownPath]);
  const shouldCollapse = Boolean(hero) && collapsible;

  // The landscape control takes the whole stage down, the page with it. A
  // 404 lowers its flag as it unmounts, and the field would put its number
  // away the moment the chrome left it alone — so the shell holds the flag
  // for as long as the content is hidden. The hold goes up in the layout
  // phase, before the page's own cleanup runs, and comes down in the passive
  // phase after the returning page's effects have run: the flag never dips
  // in between, so the field plays one sequence across the whole hide.
  React.useLayoutEffect(() => {
    if (isContentHidden) holdNotFound(isNotFound());
  }, [isContentHidden]);
  React.useEffect(() => {
    if (!isContentHidden) holdNotFound(false);
  }, [isContentHidden]);

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
  // The pieces the arrival is animating: the incoming title and tagline, the
  // brand travelling between the two heroes, the page's own fade-in. Each of
  // them takes `transform` and `opacity` outright for the length of the move,
  // which outranks the fold — so a reader who scrolls in that window would see
  // the hero sit at rest above content already rising, and then snap. They are
  // held here and finished on the first scroll: the arrival is over, and the
  // hero belongs to the fold again.
  const entryRef = React.useRef<Animation[]>([]);
  const endEntry = React.useCallback(() => {
    const playing = entryRef.current;
    entryRef.current = [];
    for (const animation of playing) {
      // finish() lands each piece on the state it was travelling to, and a
      // non-filling animation stops applying there — so the fold takes the
      // element back at the value it already has.
      try {
        animation.finish();
      } catch {
        animation.cancel();
      }
    }
  }, []);
  const playEntry = React.useCallback(
    (
      el: HTMLElement,
      keyframes: Parameters<HTMLElement['animate']>[0],
      options: Parameters<HTMLElement['animate']>[1]
    ) => {
      const animation = el.animate(keyframes, options);
      entryRef.current.push(animation);
      return animation;
    },
    []
  );

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

    // Whatever the last arrival was still playing, this one supersedes.
    endEntry();

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
      // The fold's distances travel with the box. They live on the live
      // region and the ghost is its sibling, so without the copy a hero
      // caught mid-fold would spend its whole exit snapped back to the
      // resting, centred layout — the one thing the ghost exists to avoid.
      const measures: Record<string, string> = {};
      for (const name of FOLD_MEASURES) {
        const value = region.style.getPropertyValue(name);
        if (value) measures[name] = value;
      }
      setGhost({
        id: ghostId,
        path: shownPath,
        collapsible: shouldCollapse,
        pinned,
        style: {
          ...measures,
          top: box.top - stageBox.top,
          left: box.left - stageBox.left,
          width: box.width,
          height: box.height,
          // Pinned, so the ghost keeps the fold the reader was actually
          // looking at while the live region below it goes back to rest.
          '--hero-collapse': pinned
            ? '1'
            : panel
              ? String(readProgress(panel, bandRef.current))
              : '0',
        } as React.CSSProperties,
      });
    } else {
      setGhost(null);
    }

    // The window is one element across the whole site now, so it keeps its
    // scroll position between pages unless we put it back, and a new hero must
    // never arrive already folded.
    if (panel) {
      panel.scrollTop = 0;
    }
    syncCollapseRef.current?.();

    if (animating) snapshotRef.current = { height, brand, ghostId };

    // The swap is immediate: React flushes this before the browser paints, so
    // the ghost and the new hero land in the same frame.
    setShownPath(pathname);

    // The arrival ease is scoped to the content, not to the window: the frame
    // is the same panel it was a moment ago and blinking it would say
    // otherwise.
    if (!reduce && canAnimate(mainRef.current)) {
      playEntry(mainRef.current, RISE_IN, {
        duration: CONTENT_IN_MS,
        easing: EASE_OUT,
      });
    }
    // heroKey, shownPath and shouldCollapse all describe the page being left;
    // this effect is what replaces them, so re-running on them would restart
    // the transition halfway through its own swap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The arrival's handover to the fold. The window is put back to the top by
  // the navigation above, and at the top the two do not disagree — so the cue
  // is not the scroll event itself but the first one that leaves the top.
  React.useEffect(() => {
    const panel = windowRef.current;
    if (!panel) return;
    const onScroll = () => {
      if (panel.scrollTop > 0 && entryRef.current.length) endEntry();
    };
    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => panel.removeEventListener('scroll', onScroll);
  }, [endEntry]);

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
      playEntry(title, RISE_IN, { duration: HERO_IN_MS, easing: EASE_OUT });
    }
    const tagline = region.querySelector<HTMLElement>('p');
    if (canAnimate(tagline)) {
      playEntry(tagline, RISE_IN, {
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
          // The corner the move was measured from, carried in the keyframes
          // rather than written on the element: on the cover the anchor is
          // the title itself, whose own origin is the centre the fold scales
          // it about — and an inline one left behind after the flip folded
          // every later scroll about the wrong point.
          playEntry(
            anchor,
            [
              {
                transformOrigin: 'left top',
                transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
              },
              { transformOrigin: 'left top', transform: 'none' },
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
  }, [shownPath, playEntry]);

  // The fold's publisher, for browsers that cannot run it off the scroll
  // timeline. The page scrolls inside `.layout`, not the document, so this
  // reads that element's scrollTop once per animation frame and writes the
  // progress as --hero-collapse on the three elements that read it — the
  // hero region, the window's frame and its edge — and nowhere higher: a
  // custom property inherits, so a per-frame write on the stage or the window
  // would drag the whole page into every scroll frame's style invalidation.
  // Nothing that reads it lays out; the write costs a composite.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const region = heroRef.current;
    const panel = windowRef.current;
    const readers = [region, frameRef.current, edgeRef.current];
    if (!shouldCollapse || !region || !panel) return;
    // A pinned hero is folded by the stylesheet, for good.
    if (pinned) return;
    if (supportsScrollDrivenFold()) return;

    let frame = 0;
    let last = -1;

    // Three decimals: the title travels a few hundred pixels across the
    // band, so a hundredth was a 3px step and a slow drag moved it in
    // visible increments.
    const publish = () => {
      frame = 0;
      const progress =
        Math.round(readProgress(panel, bandRef.current) * 1000) / 1000;
      if (progress === last) return;
      last = progress;
      const value = String(progress);
      for (const reader of readers) {
        reader?.style.setProperty('--hero-collapse', value);
      }
      region.classList.toggle('is-folded', progress >= TAGLINE_FADE);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(publish);
    };

    // Wherever the effect lands it lands at once: mount is not motion.
    publish();

    // How the navigation hands the fold back: forget the last written value —
    // it describes a page that is gone — and republish from the real scroll.
    syncCollapseRef.current = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      last = -1;
      publish();
    };
    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      panel.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      syncCollapseRef.current = null;
      for (const reader of readers) {
        reader?.style.removeProperty('--hero-collapse');
      }
      region.classList.remove('is-folded');
    };
  }, [shouldCollapse, pinned]);

  // The page scrolls inside the window, not the document, so a wheel turned
  // over the field beside it — a fifth of a wide screen — used to do nothing,
  // and neither did PageDown on a fresh load. Both reach the window from
  // here. Anything with a scroll of its own (the window itself, the sidebars,
  // the shortcuts list, an open menu) keeps its native handling; the window
  // is focusable, so a click inside it hands the keyboard over natively too.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const panel = windowRef.current;
    if (!panel) return;

    const OWN_SCROLL =
      '.settings-sidebar, .chat-sidebar, .shortcuts-panel, .ui-dropdown-menu';
    const ownsScroll = (target: EventTarget | null) =>
      target instanceof Element &&
      (panel.contains(target) || target.closest(OWN_SCROLL) !== null);

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey) return; // pinch-zoom
      if (ownsScroll(event.target)) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? panel.clientHeight
            : 1;
      panel.scrollTop += event.deltaY * unit;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      // Only what actually owns these keys keeps them: a field or anything
      // editable, and anything with a scroll of its own — the window
      // included, which scrolls natively once a click has put focus in it.
      // Everything else leaves the page keys to the window. That last part
      // matters: the router moves focus to its own wrapper after every
      // client-side navigation, and it wraps the whole shell rather than
      // sitting inside the scroller — so treating "something is focused" as
      // "someone else will handle this" left the page unscrollable by
      // keyboard after every link, until a click put focus back in the
      // window.
      const active = document.activeElement;
      if (active instanceof Element) {
        if (
          active.matches(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
          )
        )
          return;
        if (panel.contains(active) || active.closest(OWN_SCROLL) !== null)
          return;
        // Space is a button's own activation key; the rest are not.
        if (event.key === ' ' && active.matches('button, [role="button"]'))
          return;
      }
      const page = panel.clientHeight * 0.85;
      const scrollTo = (top: number) => {
        if (typeof panel.scrollTo === 'function')
          panel.scrollTo({ top, behavior: scrollBehavior() });
        else panel.scrollTop = top;
      };
      let by: number;
      switch (event.key) {
        case 'PageDown':
          by = page;
          break;
        case 'PageUp':
          by = -page;
          break;
        case ' ':
          by = event.shiftKey ? -page : page;
          break;
        case 'ArrowDown':
          by = 48;
          break;
        case 'ArrowUp':
          by = -48;
          break;
        case 'Home':
          event.preventDefault();
          scrollTo(0);
          return;
        case 'End':
          event.preventDefault();
          scrollTo(panel.scrollHeight);
          return;
        default:
          return;
      }
      event.preventDefault();
      scrollTo(panel.scrollTop + by);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
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
    let lastHeight = '';
    const measure = () => {
      const stage = stageRef.current;
      const panel = windowRef.current;
      const h1 = el.querySelector('h1');
      const sub = el.querySelector('p');
      // The registry owns the element the two sit in, so that — not the hero
      // region, which is padded — is the column they travel across. A hero of
      // some other shape simply gets no split.
      const container = h1?.parentElement;
      if (!h1 || !sub || !container) return;

      const width = container.clientWidth;
      const subWidth = sub.offsetWidth;
      const subHeight = sub.offsetHeight;
      // Where the title's line box sits at rest, from the top of the screen
      // (the region is the offset parent, and it starts at the stage's top),
      // and where the nav capsule's centre line is. On a phone the fold
      // carries the one to the other, so both are real pixels rather than a
      // guess from the font: the cover's title and the crumb's have different
      // metrics, and an em-based rise put them on different lines.
      const titleCentre = offsetTopWithin(h1, el) + h1.offsetHeight / 2;
      const rail = document.querySelector<HTMLElement>('.nav');
      const railCentre = rail ? rail.offsetTop + rail.offsetHeight / 2 : null;
      const titleShift = (width - h1.offsetWidth) / 2;
      const subShift = (width - subWidth) / 2;
      const rowLift = (h1.offsetHeight + subHeight) / 2;
      // Whether the tagline actually fits beside the shrunken title. Most of
      // them do, and this is 1; the projects tagline is nearly the full column
      // wide, so it scales down — pinned to its right edge — by exactly the
      // amount it overruns rather than colliding with the title. The title's
      // collapsed scale is the stylesheet's own number for this width.
      const titleScale =
        (typeof window.getComputedStyle === 'function' &&
          parseFloat(
            window
              .getComputedStyle(el)
              .getPropertyValue('--collapsed-title-scale')
          )) ||
        DEFAULT_TITLE_SCALE;
      const room = width - h1.offsetWidth * titleScale - COLLAPSED_GAP;
      const scale = subWidth > 0 ? Math.min(1, room / subWidth) : 1;

      const key = `${titleShift}|${subShift}|${rowLift}|${scale}|${titleScale}|${titleCentre}|${railCentre}`;
      if (key !== lastKey) {
        lastKey = key;
        el.style.setProperty('--title-shift', `${titleShift}px`);
        el.style.setProperty('--sub-shift', `${subShift}px`);
        el.style.setProperty('--sub-scale', String(scale));
        el.style.setProperty('--title-centre', `${titleCentre}px`);
        if (railCentre !== null) {
          stage?.style.setProperty('--rail-centre', `${railCentre}px`);
        } else {
          stage?.style.removeProperty('--rail-centre');
        }
        // This lands on the stage rather than the hero: the window's frame
        // reads the band it makes, and it is not in the hero's subtree. A
        // write there restyles the page, which is why it happens here — on a
        // change of text or column — and never on a scroll frame.
        stage?.style.setProperty('--row-lift', `${rowLift}px`);
      }

      // The hero's resting box, which the stylesheet turns into the band the
      // window reaches up by — and the band is what the hero's negative bottom
      // margin gives back, so the window's top edge holds still only while the
      // two describe the same box. That is why this is the region as it stands
      // rather than the height it is settling at: during a navigation the
      // region eases between two heroes, and a band fixed at the destination
      // would step the window's edge down by the difference and then walk it
      // back over the transition.
      //
      // It is also the one number here that moves while that ease runs, so it
      // is published on its own: the text-derived distances above are the same
      // on every frame of it and must not be rewritten for a height that is.
      //
      // The real box, unrounded, rather than the offset height. The
      // cancellation above is what pins the window's edge, and it cancels
      // exactly only if the band is the height the region actually occupies:
      // rounded, each hero leaked its own fraction into that edge, so the drawn
      // hairline sat at a slightly different place per page (76.45 on the
      // cover, 75.98 on the blog at a 2.75 pixel ratio) and shifted as one gave
      // way to the other. Rounding it back to hundredths left a tenth of that;
      // the raw reading is already snapped to the device's own grid.
      const restHeight = `${el.getBoundingClientRect().height}px`;
      if (restHeight !== lastHeight) {
        lastHeight = restHeight;
        stage?.style.setProperty('--hero-rest-height', restHeight);
      }
      // The band, read back as geometry for the fallback publisher. It can
      // move without the text moving — the stage resizing under a sidebar —
      // so it is read on every observation, after the numbers above land. A
      // pinned hero has already given its band up, so its scroll starts at
      // the frame's finished edge.
      if (panel) bandRef.current = pinned ? 0 : readBand(el, panel);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      bandRef.current = 0;
    };
  }, [shouldCollapse, heroKey, pinned]);

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
  const stageClasses = [
    'stage',
    ...(shouldCollapse ? ['has-fold'] : []),
    ...(pinned ? ['is-pinned'] : []),
    ...panelState,
  ].join(' ');
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
                }${ghost.pinned ? ' is-pinned' : ''}`}
                ref={ghostRef}
                style={ghost.style}
                aria-hidden="true"
              >
                {resolveHero(ghost.path).hero}
              </section>
            )}
            {/* The window, in three layers (see .window in layout.scss): the
                frame carrying the material, clipped from the top by the fold
                so its edge rises with the content; the top hairline riding
                that clip; and the transparent scroller over both. */}
            <div className="window">
              <div className="window-frame" ref={frameRef} aria-hidden="true" />
              <div className="window-edge" ref={edgeRef} aria-hidden="true" />
              {/* Focusable so a click inside hands it the keyboard: PageDown
                  and the arrows then scroll it natively. Not in the tab order
                  — the links inside it are. */}
              <div className="layout" ref={windowRef} tabIndex={-1}>
                {/* The room the hero occupies at rest. The content starts
                    under it, and the first band's worth of scroll carries it
                    up to the frame's finished edge. */}
                <div className="window-band" aria-hidden="true" />
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
      {(isChatPanelOpen || isClosingChatPanel) && (
        <React.Suspense fallback={null}>
          <ChatModal />
        </React.Suspense>
      )}
      <KeyboardShortcuts />
    </>
  );
};

export default LayoutInner;
