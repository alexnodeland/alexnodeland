import React from 'react'
import { Link } from 'gatsby'
import './layout.scss'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <nav className="nav">
          <div className="nav-brand">
            <Link to="/" className="nav-link">Alex Nodeland</Link>
          </div>
          <div className="nav-menu">
            <Link to="/" className="nav-link">home</Link>
            <Link to="/cv" className="nav-link">cv</Link>
          </div>
        </nav>
      </header>
      <main className="main">
        {children}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="mailto:alex@ournature.studio" className="footer-link">
              <span className="icon">✉</span>
            </a>
            <a href="https://linkedin.com/in/alexnodeland" className="footer-link" target="_blank" rel="noopener noreferrer">
              <span className="icon">💼</span>
            </a>
            <a href="https://github.com/alexnodeland" className="footer-link" target="_blank" rel="noopener noreferrer">
              <span className="icon">🐙</span>
            </a>
          </div>
          <p className="footer-copyright">© 2024 all rights reserved, alexander m. nodeland</p>
        </div>
      </footer>
    </div>
  )
}

export default Layout
