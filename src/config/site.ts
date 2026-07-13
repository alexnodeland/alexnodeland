export interface SiteConfig {
  // Basic site info
  siteName: string;
  siteUrl: string;
  description: string;
  author: string;

  // Contact information
  contact: {
    email: string;
    location: string;
    website: string;
  };

  // Social media links
  social: {
    linkedin: string;
    github: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };

  // External services
  services: {
    calendar: string;
    resume?: string;
  };

  // SEO and meta
  seo: {
    defaultTitle: string;
    defaultDescription: string;
    defaultImage: string;
  };

  // Navigation
  navigation: {
    main: Array<{
      name: string;
      href: string;
    }>;
  };

  // Animated background behavior
  animatedBackgrounds?: {
    // Total visible play time per background in ms (excludes fades)
    playDurationMs: number;
    // Fade duration in ms for both in and out
    fadeDurationMs: number;
    // Whether cycling is enabled
    cycleEnabled: boolean;
  };
}

export const siteConfig: SiteConfig = {
  // Basic site info
  siteName: 'alex nodeland',
  siteUrl: 'https://alexnodeland.com',
  description:
    'senior ai engineer & technical consultant specializing in ai system architecture, devops automation, and production-ready ai infrastructure.',
  author: 'alex nodeland',

  // Contact information
  contact: {
    email: 'alex@ournature.studio',
    location: 'upstate, new york, usa',
    website: 'alexnodeland.com',
  },

  // Social media links
  social: {
    linkedin: 'https://linkedin.com/in/alexnodeland',
    github: 'https://github.com/alexnodeland',
  },

  // External services
  services: {
    calendar: 'https://cal.com/alexnodeland',
  },

  // SEO and meta
  seo: {
    defaultTitle: 'alex nodeland',
    defaultDescription:
      'senior ai engineer & technical consultant specializing in ai system architecture, devops automation, and production-ready ai infrastructure.',
    defaultImage: '/images/icon.png',
  },

  // Navigation
  navigation: {
    main: [
      { name: 'blog', href: '/blog' },
      { name: 'projects', href: '/projects' },
      { name: 'cv', href: '/cv' },
    ],
  },
  // Animated background defaults
  animatedBackgrounds: {
    playDurationMs: 12000,
    fadeDurationMs: 1200,
    cycleEnabled: true,
  },
};
