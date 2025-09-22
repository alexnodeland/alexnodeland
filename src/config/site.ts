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
}

export const siteConfig: SiteConfig = {
  // Basic site info
  siteName: 'Alex Nodeland',
  siteUrl: 'https://alexnodeland.com',
  description: 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.',
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
    calendar: 'https://cal.com/alexnodeland',
  },
  
  // SEO and meta
  seo: {
    defaultTitle: 'Alex Nodeland',
    defaultDescription: 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.',
    defaultImage: '/images/icon.png',
  },
  
  // Navigation
  navigation: {
    main: [
      { name: 'home', href: '/' },
      { name: 'blog', href: '/blog' },
      { name: 'cv', href: '/cv' },
    ],
  },
};
