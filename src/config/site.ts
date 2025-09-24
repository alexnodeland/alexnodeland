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
  siteName: 'Alex Nodeland',
  siteUrl: 'https://alexnodeland.com',
  description:
    'Senior AI Engineer & Technical Consultant specializing in AI system architecture, DevOps automation, and production-ready AI infrastructure.',
  author: 'Alex Nodeland',

  // Contact information
  contact: {
    email: 'alex@ournature.studio',
    location: 'Upstate, New York, USA',
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
    defaultTitle: 'Alex Nodeland',
    defaultDescription:
      'Senior AI Engineer & Technical Consultant specializing in AI system architecture, DevOps automation, and production-ready AI infrastructure.',
    defaultImage: '/images/icon.png',
  },

  // Navigation
  navigation: {
    main: [
      { name: 'blog', href: '/blog' },
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
