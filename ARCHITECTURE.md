# Project Architecture

This document outlines the organizational structure and architectural decisions for the Alex Nodeland portfolio website.

## Directory Structure

```
src/
├── components/          # Reusable React components
│   ├── index.ts        # Barrel exports for components
│   ├── layout.tsx      # Main layout component
│   ├── layout.scss     # Layout-specific styles
│   ├── seo.tsx         # SEO component
│   ├── ThemeToggle.tsx # Theme toggle component
│   ├── mdx/            # MDX-specific components
│   │   ├── MDXProvider.tsx
│   │   ├── CTASection.tsx
│   │   ├── ExperienceItem.tsx
│   │   ├── EducationItem.tsx
│   │   └── ExternalLink.tsx
│   └── resume/         # Resume-specific components
│       ├── ResumeHeader.tsx
│       ├── ExperienceSection.tsx
│       ├── EducationSection.tsx
│       ├── SkillsSection.tsx
│       └── ExportButtons.tsx
├── config/             # Configuration files
│   ├── index.ts        # Barrel exports for config
│   ├── site.ts         # Site configuration
│   ├── resume.ts       # Resume data and types
│   ├── homepage.ts     # Homepage configuration
│   └── helpers.ts      # Configuration helper functions
├── constants/          # Application constants
│   └── index.ts        # All constants
├── content/            # Content files
│   └── blog/           # Blog posts (MDX files)
├── hooks/              # Custom React hooks
│   ├── index.ts        # Barrel exports for hooks
│   └── useTheme.ts     # Theme management hook
├── images/             # Static images
├── pages/              # Gatsby pages
│   ├── index.mdx       # Homepage
│   ├── blog.tsx        # Blog listing page
│   ├── cv.mdx          # CV page
│   └── 404.tsx         # 404 page
├── styles/             # SCSS stylesheets
│   ├── index.ts        # Barrel exports for styles
│   ├── global.scss     # Global styles and imports
│   ├── variables.scss  # CSS custom properties
│   ├── mixins.scss     # SCSS mixins
│   ├── animations.scss # Animation keyframes
│   ├── index.scss      # Homepage styles
│   ├── blog.scss       # Blog styles
│   ├── cv.scss         # CV styles
│   └── layout.scss     # Layout styles
├── templates/          # Gatsby page templates
│   └── blog-post.tsx   # Blog post template
├── types/              # TypeScript type definitions
│   ├── index.ts        # Barrel exports for types
│   ├── common.ts       # Common types
│   ├── resume.ts       # Resume types (re-exports)
│   └── blog.ts         # Blog types
└── utils/              # Utility functions
    ├── index.ts        # Barrel exports for utils
    └── exportResume.ts # Resume export utilities
```

## Architectural Principles

### 1. Barrel Exports
All major directories use barrel exports (`index.ts`) to provide clean, organized imports:
- `import { Layout, SEO } from '../components'`
- `import { siteConfig, resumeData } from '../config'`
- `import { BlogPost } from '../types'`

### 2. Separation of Concerns
- **Components**: Pure UI components with minimal business logic
- **Config**: All configuration and data in dedicated files
- **Types**: Centralized type definitions for better maintainability
- **Hooks**: Custom React hooks for reusable state logic
- **Utils**: Pure utility functions
- **Constants**: Application-wide constants

### 3. SCSS Organization
- **Variables**: CSS custom properties in `variables.scss`
- **Mixins**: Reusable SCSS patterns in `mixins.scss`
- **Animations**: All keyframes in `animations.scss`
- **Global**: Base styles and imports in `global.scss`
- **Component-specific**: Styles co-located with components

### 4. TypeScript Best Practices
- Strict typing throughout the application
- Centralized type definitions
- Proper interface definitions for all components
- Type-safe configuration objects

### 5. Modern React Patterns
- Functional components with hooks
- Custom hooks for reusable logic
- Proper prop interfaces
- Clean component composition

## File Naming Conventions

- **Components**: PascalCase (e.g., `ThemeToggle.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useTheme.ts`)
- **Types**: camelCase (e.g., `common.ts`)
- **Styles**: kebab-case (e.g., `global.scss`)
- **Pages**: kebab-case (e.g., `blog.tsx`)
- **Config**: camelCase (e.g., `site.ts`)

## Import Organization

1. React and external libraries
2. Internal barrel exports (components, config, types)
3. Relative imports
4. Styles (always last)

Example:
```typescript
import React from 'react'
import { graphql } from 'gatsby'
import { Layout, SEO } from '../components'
import { siteConfig } from '../config'
import { BlogPost } from '../types'
import '../styles/blog.scss'
```

## Benefits of This Structure

1. **Maintainability**: Clear separation of concerns makes code easy to find and modify
2. **Scalability**: Barrel exports and organized structure support growth
3. **Developer Experience**: Clean imports and consistent patterns
4. **Type Safety**: Centralized types prevent errors and improve IDE support
5. **Performance**: Optimized imports and clean component structure
6. **Testing**: Isolated components and utilities are easier to test
