# ⚙️ Configuration Guide

This guide explains how to manage site configuration and update social links, contact information, and other site-wide settings.

## 📋 Table of Contents

- [Configuration File](#configuration-file)
- [Updating Social Links](#updating-social-links)
- [Updating Contact Information](#updating-contact-information)
- [Adding New Social Platforms](#adding-new-social-platforms)
- [Helper Functions](#helper-functions)
- [Best Practices](#best-practices)

## 📁 Configuration File

All site configuration is centralized in `src/config/site.ts`. This file contains:

- **Basic site info** (name, URL, description)
- **Contact information** (email, location, website)
- **Social media links** (LinkedIn, GitHub, Twitter, etc.)
- **External services** (Calendly, resume links)
- **SEO defaults** (titles, descriptions, images)
- **Navigation items** (menu structure)

### Example Configuration

```typescript
export const siteConfig: SiteConfig = {
  // Basic site info
  siteName: 'Alex Nodeland',
  siteUrl: 'https://alexnodeland.com',
  description: 'Experienced engineer and mathematician...',
  author: 'Alex Nodeland',
  
  // Contact information
  contact: {
    email: 'alex@ournature.studio',
    location: 'Upstate, New York, USA',
    website: 'www.alexnodeland.com',
  },
  
  // Social media links
  social: {
    linkedin: 'https://linkedin.com/in/alexnodeland',
    github: 'https://github.com/alexnodeland',
  },
  
  // External services
  services: {
    calendar: 'https://calendly.com/alexnodeland',
  },
  
  // Navigation
  navigation: {
    main: [
      { name: 'home', href: '/' },
      { name: 'cv', href: '/cv' },
    ],
  },
}
```

## 🔗 Updating Social Links

### Adding a New Social Platform

1. **Update the config file:**
```typescript
// In src/config/site.ts
social: {
  linkedin: 'https://linkedin.com/in/alexnodeland',
  github: 'https://github.com/alexnodeland',
  twitter: 'https://twitter.com/alexnodeland',
  instagram: 'https://instagram.com/alexnodeland', // Add new platform
  youtube: 'https://youtube.com/@alexnodeland',   // Add another platform
},
```

2. **Add the icon mapping:**
```typescript
// In src/components/layout.tsx
const icons: Record<string, string> = {
  linkedin: '💼',
  github: '🐙',
  twitter: '🐦',
  instagram: '📷',  // Add icon for new platform
  youtube: '📺',    // Add icon for another platform
}
```

### Updating Existing Links

Simply update the URL in `src/config/site.ts`:

```typescript
social: {
  linkedin: 'https://linkedin.com/in/newusername', // Updated URL
  github: 'https://github.com/newusername',        // Updated URL
  // ... other platforms
},
```

## 📧 Updating Contact Information

Update contact information in the `contact` section:

```typescript
contact: {
  email: 'newemail@example.com',        // Update email
  location: 'New City, State, Country', // Update location
  website: 'www.newwebsite.com',       // Update website
},
```

## 🎯 Adding New Social Platforms

### Step 1: Update TypeScript Interface

```typescript
// In src/config/site.ts
export interface SiteConfig {
  // ... existing fields
  social: {
    linkedin: string;
    github: string;
    instagram?: string;  // Add new optional field
    youtube?: string;    // Add another optional field
    tiktok?: string;     // Add more platforms as needed
  };
}
```

### Step 2: Add to Configuration

```typescript
social: {
  linkedin: 'https://linkedin.com/in/alexnodeland',
  github: 'https://github.com/alexnodeland',
  instagram: 'https://instagram.com/alexnodeland', // Add new platform
  youtube: 'https://youtube.com/@alexnodeland',   // Add another platform
},
```

### Step 3: Add Icon Mapping

```typescript
// In src/components/layout.tsx
const icons: Record<string, string> = {
  linkedin: '💼',
  github: '🐙',
  instagram: '📷',  // Add icon
  youtube: '📺',    // Add icon
  tiktok: '🎵',     // Add more icons
}
```

## 🛠️ Helper Functions

The configuration includes helper functions in `src/config/helpers.ts`:

### Available Helpers

```typescript
import { 
  getFullUrl, 
  getSocialUrl, 
  getContactInfo, 
  getNavigationItems,
  getAllSocialLinks 
} from '../config/helpers'

// Get full URL for a path
const homeUrl = getFullUrl('/') // https://alexnodeland.com/
const aboutUrl = getFullUrl('/about') // https://alexnodeland.com/about

// Get specific social URL
const linkedinUrl = getSocialUrl('linkedin')

// Get all contact info
const contact = getContactInfo()

// Get navigation items
const navItems = getNavigationItems()

// Get all social links with metadata
const socialLinks = getAllSocialLinks()
```

### Using Helpers in Components

```typescript
import { getSocialUrl, getContactInfo } from '../config/helpers'

const MyComponent = () => {
  const contact = getContactInfo()
  const linkedinUrl = getSocialUrl('linkedin')
  
  return (
    <div>
      <a href={`mailto:${contact.email}`}>Email me</a>
      <a href={linkedinUrl}>LinkedIn</a>
    </div>
  )
}
```

## 📝 Best Practices

### 1. **Single Source of Truth**
- Always update the config file instead of hardcoding values
- Use helper functions when possible
- Avoid duplicating URLs or contact info

### 2. **Type Safety**
- Use the TypeScript interfaces for type safety
- Add new fields to the interface when adding new platforms
- Use optional fields (`?`) for platforms that might not be used

### 3. **Consistency**
- Use consistent URL formats (with or without `https://`)
- Use consistent naming conventions
- Keep social platform names lowercase

### 4. **Testing Changes**
- Test all links after updating
- Verify social icons display correctly
- Check that all components update properly

### 5. **Documentation**
- Update this guide when adding new configuration options
- Document any new helper functions
- Keep examples up to date

## 🔄 Common Updates

### Changing Email Address

```typescript
// In src/config/site.ts
contact: {
  email: 'newemail@example.com', // Update here
  // ... rest stays the same
},
```

### Adding Instagram

```typescript
// 1. Update interface (if not already optional)
social: {
  // ... existing platforms
  instagram?: string; // Add this line
}

// 2. Add to config
social: {
  // ... existing platforms
  instagram: 'https://instagram.com/username',
}

// 3. Add icon in layout.tsx
const icons = {
  // ... existing icons
  instagram: '📷',
}
```

### Updating Site Name

```typescript
// In src/config/site.ts
export const siteConfig: SiteConfig = {
  siteName: 'New Name', // Update here
  // ... rest stays the same
}
```

## 🆘 Troubleshooting

### Links Not Updating
- Clear browser cache
- Restart development server
- Check for typos in URLs

### TypeScript Errors
- Ensure new fields are added to the interface
- Check that optional fields use `?` syntax
- Verify import statements are correct

### Icons Not Showing
- Check that the platform name matches the icon key
- Ensure the icon is added to the icons object
- Verify the social link is not empty

## 📚 Related Files

- `src/config/site.ts` - Main configuration file
- `src/config/helpers.ts` - Helper functions
- `src/components/layout.tsx` - Uses config for footer and navigation
- `src/components/seo.tsx` - Uses config for SEO defaults
- `gatsby-config.js` - Uses config for site metadata

For more help, see the [Development Guide](./development.md) or [Contributing Guide](./contributing.md).
