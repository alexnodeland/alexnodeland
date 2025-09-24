// Site configuration for Gatsby build process
// This is a CommonJS module for Node.js compatibility

const siteConfig = {
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

module.exports = { siteConfig };
