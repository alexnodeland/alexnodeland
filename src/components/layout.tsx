import { Link } from 'gatsby';
import React from 'react';
import { getAllSocialLinks, siteConfig } from '../config';
import '../styles/layout.scss';
import { useSettingsPanel } from './SettingsPanelContext';
import { ChatIcon, ChatModal, KeyboardShortcuts } from './chat';

interface LayoutProps {
  children: React.ReactNode;
  /**
   * The page's hero — its title and tagline. It renders above the content
   * window, on the bare field, rather than scrolling inside the window with
   * the rest of the page. Pages that have no hero (404) simply omit it.
   */
  hero?: React.ReactNode;
  /**
   * Whether the hero compresses as the window scrolls. The homepage hero is
   * the site's one splash moment and stays put; the blog / projects / cv
   * titles are signposts, so they give their room back to the content.
   */
  collapsibleHero?: boolean;
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

// Inner Layout component that uses the settings panel context
const LayoutInner: React.FC<LayoutProps> = ({
  children,
  hero,
  collapsibleHero = false,
}) => {
  const {
    isSettingsPanelOpen,
    isClosingSettingsPanel,
    isChatPanelOpen,
    isClosingChatPanel,
    isContentHidden,
  } = useSettingsPanel();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);
  const heroRef = React.useRef<HTMLElement>(null);

  // Brand continuity. gatsby-browser stashes the outgoing page's brand-anchor
  // box at the moment the route changes; if we mount shortly after with our
  // own anchor, FLIP it from that box to where it now lives — the same "alex"
  // sliding and scaling between the cover title and the breadcrumb, instead of
  // two unrelated pages swapping.
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    interface BrandStash {
      rect: DOMRect;
      at: number;
    }
    const stash = (window as unknown as Record<string, unknown>)
      .__brandAnchorRect as BrandStash | undefined;
    if (!stash || Date.now() - stash.at > 800) return;
    (window as unknown as Record<string, unknown>).__brandAnchorRect =
      undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.querySelector<HTMLElement>('[data-brand-anchor]');
    if (!el || typeof el.animate !== 'function') return;
    const to = el.getBoundingClientRect();
    if (to.height === 0) return;
    const scale = stash.rect.height / to.height;
    const dx = stash.rect.left - to.left;
    const dy = stash.rect.top - to.top;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && Math.abs(scale - 1) < 0.05)
      return;
    el.style.transformOrigin = 'left top';
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
        { transform: 'none' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
  }, []);

  // The rest of the arrival. The brand carries the continuity; everything
  // else on the incoming page eases in behind it instead of popping — the
  // window rises a few pixels as it fades, the tagline follows. Only on
  // client-side navigations: a cold load renders plainly.
  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const navAt = (window as unknown as Record<string, unknown>).__navAt as
      | number
      | undefined;
    if (!navAt || Date.now() - navAt > 800) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ease = { duration: 280, easing: 'ease-out' } as const;
    const panel = windowRef.current;
    if (panel && typeof panel.animate === 'function') {
      panel.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        ease
      );
    }
    const tagline = heroRef.current?.querySelector('p');
    if (
      tagline &&
      typeof tagline.animate === 'function' &&
      !tagline.closest('[data-brand-anchor]')
    ) {
      tagline.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 240,
        easing: 'ease-out',
        delay: 60,
        fill: 'backwards',
      });
    }
  }, []);

  // Scroll-linked hero collapse. The page scrolls inside `.layout`, not the
  // document, so this reads that element's scrollTop and publishes it as a 0→1
  // progress custom property on the stage. The interpolation itself is CSS —
  // React only ever writes one number, and only when it has actually changed.
  const shouldCollapse = Boolean(hero) && collapsibleHero;
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
    panel.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      panel.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      stage.style.removeProperty('--hero-collapse');
    };
  }, [shouldCollapse]);

  // The collapse choreography needs real widths: at full collapse the title
  // parks on the left edge and the tagline on the right, each travelling half
  // of its leftover space, and the tagline rises to the title's centerline.
  // CSS can't measure text, so the distances are published here as pixel
  // custom properties and the stylesheet scales them by --hero-collapse.
  React.useLayoutEffect(() => {
    const el = heroRef.current;
    if (!shouldCollapse || !el) return;

    const measure = () => {
      const h1 = el.querySelector('h1');
      const sub = el.querySelector('p');
      // The page owns the element the two sit in, so that — not the hero
      // region, which is padded — is the column they travel across. A page is
      // free to pass a hero of some other shape; it just gets no split.
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
  }, [shouldCollapse]);

  // Determine CSS classes based on panel states. The stage carries them for
  // everything now: header, hero and window move as one block when a sidebar
  // opens, so there is a single copy of the geometry rather than three.
  const stageClasses = [
    'stage',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing',
    isChatPanelOpen && 'chat-panel-open',
    isClosingChatPanel && 'chat-panel-closing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {!isContentHidden && (
        <div className={stageClasses} ref={stageRef}>
          <header className="header-fixed">
            {/* The way home is the breadcrumb in each page's hero title, so
                the nav is just the one capsule of page links. */}
            <nav className="nav">
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
          </header>
          {/* A <section> rather than a <div>: the page heroes are still
              <header> elements, and a <header> that is not inside a sectioning
              element would claim a second `banner` landmark next to the nav. */}
          {hero && (
            <section
              className={`site-hero${shouldCollapse ? ' is-collapsible' : ''}`}
              ref={heroRef}
            >
              {hero}
            </section>
          )}
          <div className="layout" ref={windowRef}>
            <main className="main">{children}</main>
            <footer className="footer">
              <div className="footer-content">
                <div className="footer-links">
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="footer-link"
                    data-platform="email"
                  >
                    <span className="icon"></span>
                  </a>
                  {getAllSocialLinks().map(({ platform, url }) => {
                    return (
                      <a
                        key={platform}
                        href={url}
                        className="footer-link"
                        data-platform={platform}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="icon"></span>
                      </a>
                    );
                  })}
                </div>
                <p className="footer-copyright">
                  © 2025 all rights reserved, {siteConfig.author.toLowerCase()}
                </p>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Chat Components */}
      <ChatIcon />
      <ChatModal />
      <KeyboardShortcuts />
    </>
  );
};

export default LayoutInner;
