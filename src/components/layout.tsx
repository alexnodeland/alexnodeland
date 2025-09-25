import { Link } from 'gatsby';
import React from 'react';
import { getAllSocialLinks, siteConfig } from '../config';
import '../styles/layout.scss';
import { useSettingsPanel } from './SettingsPanelContext';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

// Inner Layout component that uses the settings panel context
const LayoutInner: React.FC<LayoutProps> = ({ children }) => {
  const { isSettingsPanelOpen, isClosingSettingsPanel } = useSettingsPanel();
  // Use window.location to determine current page (client-side)
  const [isHomePage, setIsHomePage] = React.useState(false);

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

  // Determine CSS classes based on settings panel state
  const headerContainerClasses = [
    'fixed-header-container',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing',
  ]
    .filter(Boolean)
    .join(' ');

  const layoutClasses = [
    'layout',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className={headerContainerClasses}>
        <header className="header-fixed">
          <nav className="nav">
            {!isHomePage && (
              <div className="nav-brand">
                <Link to="/" className="nav-link">
                  {siteConfig.siteName}
                </Link>
              </div>
            )}
            <div className="nav-menu">
              {siteConfig.navigation.main.map(item => (
                <Link key={item.name} to={item.href} className="nav-link">
                  {item.name}
                </Link>
              ))}
              <ThemeToggle />
            </div>
          </nav>
        </header>
      </div>
      <div className={layoutClasses}>
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
    </>
  );
};

export default LayoutInner;
