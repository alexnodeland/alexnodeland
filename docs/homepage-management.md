# Homepage Content Management

This guide explains how to easily update and manage the homepage content using the centralized configuration system.

## 📝 Quick Start

All homepage content is managed in `src/config/homepage.ts`. Simply edit this file to update any text, links, or content on the homepage.

## 🏗️ Configuration Structure

### Hero Section
```typescript
hero: {
  title: "Alex Nodeland",           // Main heading
  subtitle: "Hi, I'm Alex..."       // Subtitle text
}
```

### About Section
```typescript
about: {
  paragraphs: [                     // Array of paragraph text
    "First paragraph...",
    "Second paragraph...",
    "Third paragraph..."
  ]
}
```

### Consulting Section
```typescript
consulting: {
  title: "Technical Consulting",    // Section heading
  description: "As a technical...", // Description text
  ctaButtons: {
    primary: {
      text: "Get in Touch",         // Button text
      action: "email"               // Action type: 'email', 'calendar', 'url'
    },
    secondary: {
      text: "Schedule a Call",
      action: "calendar"
    }
  }
}
```

### Expertise Section
```typescript
expertise: {
  title: "Areas of Expertise",
  items: [
    {
      icon: "🚀",                   // Emoji icon
      title: "Emerging Technologies",
      description: "Adoption and integration..."
    }
    // Add more items as needed
  ]
}
```

### Side Projects Section
```typescript
sideProjects: {
  title: "Side Projects",
  description: "In my free time..."
}
```

### Press Section
```typescript
press: {
  title: "In the Press",
  links: [
    {
      text: "Article Title",
      url: "https://example.com"    // Link URL
    }
    // Add more links as needed
  ]
}
```

## 🔧 Common Updates

### Update Hero Text
```typescript
// In src/config/homepage.ts
hero: {
  title: "Your New Title",
  subtitle: "Your new subtitle text..."
}
```

### Add New Expertise Item
```typescript
// In src/config/homepage.ts
expertise: {
  items: [
    // ... existing items
    {
      icon: "🎨",
      title: "Creative Technology",
      description: "Your new expertise description"
    }
  ]
}
```

### Update CTA Buttons
```typescript
// In src/config/homepage.ts
consulting: {
  ctaButtons: {
    primary: {
      text: "Contact Me",
      action: "email"  // Will use email from site config
    },
    secondary: {
      text: "Book Meeting",
      action: "calendar"  // Will use calendar URL from site config
    }
  }
}
```

### Add Press Links
```typescript
// In src/config/homepage.ts
press: {
  links: [
    // ... existing links
    {
      text: "New Article Title",
      url: "https://news-site.com/article"
    }
  ]
}
```

## 🎯 CTA Button Actions

The CTA buttons support three action types:

- **`email`**: Creates a `mailto:` link using the email from site config
- **`calendar`**: Links to the calendar URL from site config
- **`url`**: Links to a custom URL (requires `url` property)

## 📱 Responsive Design

All content automatically adapts to different screen sizes. The configuration system maintains the same responsive behavior as the original hardcoded content.

## 🔄 Auto-Update

Changes to the configuration file automatically update the homepage without requiring any other file modifications. The system uses:

- **TypeScript**: Type safety and autocomplete
- **Centralized config**: Single source of truth
- **Helper functions**: Automatic URL generation for buttons
- **Dynamic rendering**: Content updates automatically

## 🎨 Customization

### Adding New Sections
1. Add the section to the `HomepageConfig` interface
2. Add the data to the `homepageConfig` object
3. Update the MDX file to use the new configuration

### Modifying Styling
- Edit `src/styles/index.scss` for visual changes
- The configuration system doesn't affect styling
- All existing CSS classes remain the same

## 🚀 Benefits

- **Easy Updates**: Change content without touching MDX files
- **Type Safety**: TypeScript prevents configuration errors
- **Consistency**: All content follows the same structure
- **Maintainability**: Single file for all homepage content
- **Flexibility**: Easy to add/remove sections and content

## 📋 Example: Complete Update

```typescript
// Update multiple sections at once
export const homepageConfig: HomepageConfig = {
  hero: {
    title: "John Doe",
    subtitle: "Full-stack developer and technical consultant"
  },
  about: {
    paragraphs: [
      "Your new about paragraph 1...",
      "Your new about paragraph 2..."
    ]
  },
  consulting: {
    title: "Development Services",
    description: "I provide custom web development solutions...",
    ctaButtons: {
      primary: {
        text: "Start Project",
        action: "email"
      },
      secondary: {
        text: "View Portfolio",
        action: "url",
        url: "/portfolio"
      }
    }
  }
  // ... rest of config
}
```

This system makes the homepage incredibly easy to maintain and update!
