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
  // Use window.location to determine current page (client-side)
  const [isHomePage, setIsHomePage] = React.useState(false);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const windowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      setIsHomePage(
        pathname === '/' ||
          pathname === '/alexnodeland/' ||
          pathname === '/alexnodeland'
      );
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
            <nav className="nav">
              {!isHomePage && (
                <div className="nav-brand">
                  {/* Narrow viewports swap in the short form so the nav stays
                      on one row; both spellings are in the DOM so the width
                      actually collapses rather than just going transparent.
                      The label lives on the link because whichever span is
                      hidden at the current width is out of the accessibility
                      tree with it — leaving the link unnamed on mobile. */}
                  <Link
                    to="/"
                    className="nav-link"
                    aria-label={siteConfig.siteName}
                  >
                    <span className="nav-brand-full" aria-hidden="true">
                      {siteConfig.siteName}
                    </span>
                    <span className="nav-brand-short" aria-hidden="true">
                      {siteConfig.siteName.split(' ')[0]}
                    </span>
                  </Link>
                </div>
              )}
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
