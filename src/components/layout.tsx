import React from 'react';
import { Link } from 'gatsby';
import ThemeToggle from './ThemeToggle';
import { BackgroundManager } from './animated-backgrounds';
import { siteConfig, getAllSocialLinks } from '../config';
import { SettingsPanelProvider, useSettingsPanel } from '../contexts/SettingsPanelContext';
import './layout.scss';

interface LayoutProps {
  children: React.ReactNode;
}

// Inner Layout component that uses the settings panel context
const LayoutInner: React.FC<LayoutProps> = ({ children }) => {
  const { isSettingsPanelOpen, isClosingSettingsPanel } = useSettingsPanel();
  
  // Determine CSS classes based on settings panel state
  const headerContainerClasses = [
    'fixed-header-container',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing'
  ].filter(Boolean).join(' ');
  
  const layoutClasses = [
    'layout',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing'
  ].filter(Boolean).join(' ');

  return (
    <>
      <BackgroundManager />
      <div className={headerContainerClasses}>
        <div className="rainbow-border-fixed"></div>
        <header className="header-fixed">
          <nav className="nav">
            <div className="nav-brand">
              <Link to="/" className="nav-link">
                {siteConfig.siteName}
              </Link>
            </div>
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

// Main Layout component wrapped with context provider
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <SettingsPanelProvider>
      <LayoutInner>{children}</LayoutInner>
    </SettingsPanelProvider>
  );
};

export default Layout;
