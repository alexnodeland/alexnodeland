# 🎨 Customization Guide

This guide covers how to customize the Alex Nodeland website to match your personal brand and content.

## 📋 Table of Contents

- [Content Customization](#content-customization)
- [Design Customization](#design-customization)
- [Component Customization](#component-customization)
- [Advanced Customization](#advanced-customization)

## 📝 Content Customization

### Homepage Content

Edit `src/pages/index.mdx` to customize the homepage:

```mdx
---
title: "Your Name"
description: "Your personal description"
---

import Layout from '../components/layout'
import SEO from '../components/seo'
import '../styles/index.scss'

<Layout>
  <SEO title="Home" />
  <div className="home">
    <section className="hero">
      <h1>Your Name</h1>
      <p className="hero-subtitle">
        Your personal introduction here...
      </p>
    </section>
    
    {/* Add more sections as needed */}
  </div>
</Layout>
```

### CV/Resume Content

Edit `src/pages/cv.mdx` to customize your resume:

```mdx
---
title: "CV - Your Name"
description: "Your resume and CV"
---

import Layout from '../components/layout'
import SEO from '../components/seo'
import '../styles/cv.scss'

<Layout>
  <SEO title="CV" />
  <div className="cv">
    <header className="cv-header">
      <h1>Your Name</h1>
      <div className="cv-contact">
        <p><strong>Location:</strong> Your Location</p>
        <p><strong>Email:</strong> your@email.com</p>
        <p><strong>LinkedIn:</strong> linkedin.com/in/yourprofile</p>
        <p><strong>Website:</strong> yourwebsite.com</p>
      </div>
    </header>
    
    {/* Add your experience, education, etc. */}
  </div>
</Layout>
```

### SEO and Meta Tags

Update `src/components/seo.tsx` for your site:

```typescript
const SEO: React.FC<SEOProps> = ({ 
  title = 'Your Name', 
  description = 'Your personal description',
  image = '/images/your-og-image.jpg',
  url = 'https://yourwebsite.com'
}) => {
  // ... rest of component
}
```

## 🎨 Design Customization

### Color Scheme

Edit `src/styles/global.scss` to change the color scheme:

```scss
:root {
  // Primary colors
  --primary-color: #your-primary-color;
  --primary-dark: #your-primary-dark;
  --secondary-color: #your-secondary-color;
  --accent-color: #your-accent-color;
  
  // Text colors
  --text-primary: #your-text-primary;
  --text-secondary: #your-text-secondary;
  --text-muted: #your-text-muted;
  
  // Background colors
  --bg-primary: #your-bg-primary;
  --bg-secondary: #your-bg-secondary;
  --bg-accent: #your-bg-accent;
  
  // Border and shadow colors
  --border-color: #your-border-color;
}
```

### Typography

Update the font family in `src/styles/global.scss`:

```scss
html {
  font-family: 'Your Font', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}
```

**Popular font combinations:**

- Inter + system fonts
- Poppins + system fonts
- Roboto + system fonts
- Custom Google Fonts

### Layout and Spacing

Adjust spacing and layout in `src/components/layout.scss`:

```scss
.layout {
  // Adjust margins and padding
  margin: 1rem; // Change to 0 for full-width
  
  // Adjust border radius
  border-radius: var(--radius-xl);
  
  // Adjust shadows
  box-shadow: var(--shadow-xl);
}
```

### Background and Gradients

Customize the background in `src/styles/global.scss`:

```scss
body {
  // Solid color background
  background: #your-color;
  
  // Gradient background
  background: linear-gradient(135deg, #color1, #color2);
  
  // Image background
  background: url('/images/your-bg.jpg') center/cover;
}
```

## 🧩 Component Customization

### Navigation

Edit `src/components/layout.tsx` to customize navigation:

```typescript
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <header className="header">
        <nav className="nav">
          <div className="nav-brand">
            <Link to="/" className="nav-link">Your Name</Link>
          </div>
          <div className="nav-menu">
            <Link to="/" className="nav-link">home</Link>
            <Link to="/cv" className="nav-link">cv</Link>
            <Link to="/blog" className="nav-link">blog</Link> {/* Add new pages */}
          </div>
        </nav>
      </header>
      {/* ... rest of layout */}
    </div>
  )
}
```

### Footer

Customize the footer in `src/components/layout.tsx`:

```typescript
<footer className="footer">
  <div className="footer-content">
    <div className="footer-links">
      <a href="mailto:your@email.com" className="footer-link">
        <span className="icon">✉</span>
      </a>
      <a href="https://linkedin.com/in/yourprofile" className="footer-link">
        <span className="icon">💼</span>
      </a>
      <a href="https://github.com/yourusername" className="footer-link">
        <span className="icon">🐙</span>
      </a>
      <a href="https://twitter.com/yourusername" className="footer-link">
        <span className="icon">🐦</span>
      </a>
    </div>
    <p className="footer-copyright">© 2024 all rights reserved, your name</p>
  </div>
</footer>
```

### MDX Components

Create custom components in `src/components/mdx/`:

```typescript
// src/components/mdx/ProjectCard.tsx
import React from 'react'

interface ProjectCardProps {
  title: string
  description: string
  link: string
  image?: string
}

const ProjectCard: React.FC<ProjectCardProps> = ({ title, description, link, image }) => {
  return (
    <div className="project-card">
      {image && <img src={image} alt={title} />}
      <h3>{title}</h3>
      <p>{description}</p>
      <a href={link} className="project-link">View Project</a>
    </div>
  )
}

export default ProjectCard
```

Then use it in your MDX files:

```mdx
import ProjectCard from '../components/mdx/ProjectCard'

<ProjectCard
  title="My Project"
  description="Project description"
  link="https://github.com/username/project"
  image="/images/project.jpg"
/>
```

## 🔧 Advanced Customization

### Adding New Pages

1. **Create the page file:**

```bash
# Create a new MDX page
touch src/pages/blog.mdx
```

2. **Add the page content:**

```mdx
---
title: "Blog"
description: "My blog posts"
---

import Layout from '../components/layout'
import SEO from '../components/seo'

<Layout>
  <SEO title="Blog" />
  <div className="blog">
    <h1>My Blog</h1>
    {/* Add your blog content */}
  </div>
</Layout>
```

3. **Add navigation link:**

Update `src/components/layout.tsx` to include the new page in navigation.

### Adding Dark Mode

1. **Update CSS variables:**

```scss
:root {
  // Light mode variables (existing)
  --primary-color: #6366f1;
  // ... other variables
}

[data-theme="dark"] {
  --primary-color: #818cf8;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  // ... other dark mode variables
}
```

2. **Add theme toggle component:**

```typescript
// src/components/ThemeToggle.tsx
import React from 'react'

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState('light')
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }
  
  return (
    <button onClick={toggleTheme} className="theme-toggle">
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}

export default ThemeToggle
```

### Adding Analytics

1. **Install analytics package:**

```bash
npm install gatsby-plugin-google-analytics
```

2. **Update gatsby-config.js:**

```javascript
module.exports = {
  plugins: [
    // ... other plugins
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: "YOUR_GA_TRACKING_ID",
      },
    },
  ],
}
```

### Adding a Blog

1. **Install blog dependencies:**

```bash
npm install gatsby-transformer-remark gatsby-source-filesystem
```

2. **Update gatsby-config.js:**

```javascript
module.exports = {
  plugins: [
    // ... other plugins
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `blog`,
        path: `${__dirname}/content/blog`,
      },
    },
    `gatsby-transformer-remark`,
  ],
}
```

3. **Create blog posts:**

```bash
mkdir -p content/blog
touch content/blog/my-first-post.md
```

## 📚 Resources

- [Gatsby Documentation](https://www.gatsbyjs.com/docs/)
- [MDX Documentation](https://mdxjs.com/)
- [SCSS Documentation](https://sass-lang.com/documentation)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

## 🆘 Support

Need help with customization?

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [GitHub Issues](https://github.com/alexnodeland/alexnodeland/issues)
3. Create a new issue with your question
4. Contact [Alex Nodeland](mailto:alex@ournature.studio)
