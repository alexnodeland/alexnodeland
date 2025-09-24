# 🛠️ Development Guide

This guide covers everything you need to know about developing and contributing to the Alex Nodeland website.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Git**: For version control

### Installation

```bash
# Clone the repository
git clone https://github.com/alexnodeland/alexnodeland.git
cd alexnodeland

# Install dependencies
npm install

# Start development server
npm run develop
```

The development server will start at `http://localhost:8000`.

## 📁 Project Structure

```text
src/
├── components/          # Reusable React components
│   ├── layout.tsx      # Main layout wrapper
│   ├── layout.scss     # Layout styles
│   ├── seo.tsx         # SEO component
│   └── mdx/            # MDX-specific components
│       ├── ExperienceItem.tsx
│       ├── EducationItem.tsx
│       ├── CTASection.tsx
│       └── MDXProvider.tsx
├── pages/              # Gatsby pages (MDX format)
│   ├── index.mdx       # Homepage
│   ├── cv.mdx          # CV/Resume page
│   └── 404.tsx         # 404 error page
├── styles/             # Stylesheets
│   ├── global.scss     # Global CSS variables & reset
│   ├── index.scss      # Homepage styles
│   └── cv.scss         # CV page styles
└── images/             # Static assets
```

## 🔄 Development Workflow

### 1. Content Updates

**Homepage Content:**

```bash
# Edit the homepage
vim src/pages/index.mdx
```

**CV Content:**

```bash
# Edit the CV page
vim src/pages/cv.mdx
```

### 2. Styling Changes

**Global Styles:**

```bash
# Edit global styles and CSS variables
vim src/styles/global.scss
```

**Page-Specific Styles:**

```bash
# Edit homepage styles
vim src/styles/index.scss

# Edit CV page styles
vim src/styles/cv.scss
```

### 3. Component Development

**Layout Components:**

```bash
# Edit main layout
vim src/components/layout.tsx
vim src/components/layout.scss
```

**MDX Components:**

```bash
# Edit MDX-specific components
vim src/components/mdx/ExperienceItem.tsx
```

### 4. Testing Changes

```bash
# Start development server
npm run develop

# Build for production
npm run build

# Serve production build
npm run serve
```

## 🎨 Code Style

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all props
- Use functional components with hooks
- Prefer `const` over `let`

```typescript
interface ComponentProps {
  title: string;
  description?: string;
}

const MyComponent: React.FC<ComponentProps> = ({ title, description }) => {
  return <div>{title}</div>;
};
```

### SCSS

- Use CSS custom properties for theming
- Follow BEM methodology for class names
- Use nested selectors sparingly
- Group related styles together

```scss
.component {
  // Use CSS variables
  color: var(--text-primary);
  background: var(--bg-primary);
  
  // BEM modifiers
  &--large {
    font-size: 1.5rem;
  }
  
  // Nested elements
  &__title {
    font-weight: 600;
  }
}
```

### MDX

- Use frontmatter for metadata
- Keep JSX minimal and readable
- Use components for repeated patterns

```mdx
---
title: "Page Title"
description: "Page description"
---

import Layout from '../components/layout'
import SEO from '../components/seo'

<Layout>
  <SEO title="Page Title" />
  <div className="page">
    <h1>Hello World</h1>
  </div>
</Layout>
```

## 🧪 Testing

### Manual Testing

1. **Responsive Design**: Test on different screen sizes
2. **Performance**: Check Lighthouse scores
3. **Accessibility**: Use screen readers and keyboard navigation
4. **Cross-browser**: Test in Chrome, Firefox, Safari, Edge

### Build Testing

```bash
# Clean build
npm run clean
npm run build

# Test production build
npm run serve
```

## 🐛 Troubleshooting

### Common Issues

**Development Server Won't Start:**

```bash
# Clear cache and restart
npm run clean
npm run develop
```

**Build Failures:**

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for SCSS errors
npx sass src/styles/global.scss --no-source-map
```

**MDX Issues:**

- Ensure proper imports
- Check component availability in MDXProvider
- Verify frontmatter syntax

### Performance Issues

**Large Bundle Size:**

- Check for unused imports
- Optimize images
- Use dynamic imports for heavy components

**Slow Builds:**

- Clear Gatsby cache: `npm run clean`
- Check for circular dependencies
- Optimize SCSS compilation

## 📚 Resources

- [Gatsby Documentation](https://www.gatsbyjs.com/docs/)
- [MDX Documentation](https://mdxjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [SCSS Documentation](https://sass-lang.com/documentation)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For more details, see our [Contributing Guide](./contributing.md).
