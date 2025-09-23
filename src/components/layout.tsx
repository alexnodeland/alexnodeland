import React from 'react';
import { Link } from 'gatsby';
import MDXProvider from './mdx/MDXProvider';
import ThemeToggle from './ThemeToggle';
import { BackgroundManager } from './animated-backgrounds';
import { siteConfig, getAllSocialLinks } from '../config';
import './layout.scss';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <MDXProvider>
      <BackgroundManager />
      <div className="layout">
        <header className="header">
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
    </MDXProvider>
  );
};

export default Layout;
