import React from 'react'
import { Link } from 'gatsby'
import MDXProvider from './mdx/MDXProvider'
import ThemeToggle from './ThemeToggle'
import { siteConfig } from '../config/site'
import { getAllSocialLinks } from '../config/helpers'
import './layout.scss'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <MDXProvider>
      <div className="layout">
        <header className="header">
          <nav className="nav">
            <div className="nav-brand">
              <Link to="/" className="nav-link">{siteConfig.siteName}</Link>
            </div>
          <div className="nav-menu">
            {siteConfig.navigation.main.map((item) => (
              <Link key={item.name} to={item.href} className="nav-link">
                {item.name}
              </Link>
            ))}
            <ThemeToggle />
          </div>
          </nav>
        </header>
        <main className="main">
          {children}
        </main>
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-links">
              <a href={`mailto:${siteConfig.contact.email}`} className="footer-link">
                <span className="icon">✉</span>
              </a>
              {getAllSocialLinks().map(({ platform, url }) => {
                const icons: Record<string, string> = {
                  linkedin: '💼',
                  github: '🐙',
                  instagram: '📷',
                  youtube: '📺',
                }
                return (
                  <a key={platform} href={url} className="footer-link" target="_blank" rel="noopener noreferrer">
                    <span className="icon">{icons[platform] || '🔗'}</span>
                  </a>
                )
              })}
            </div>
            <p className="footer-copyright">© 2025 all rights reserved, {siteConfig.author.toLowerCase()}</p>
          </div>
        </footer>
      </div>
    </MDXProvider>
  )
}

export default Layout
