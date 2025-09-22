// Site configuration for Gatsby (JavaScript version)
const siteConfig = {
  siteName: 'Alex Nodeland',
  description: 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.',
  author: 'Alex Nodeland',
  siteUrl: 'https://alexnodeland.github.io/alexnodeland',
  
  contact: {
    email: 'alex@ournature.studio',
    location: 'Upstate, New York, USA',
    website: 'www.alexnodeland.com',
  },
  
  social: {
    linkedin: 'https://linkedin.com/in/alexnodeland',
    github: 'https://github.com/alexnodeland',
  },
  
  services: {
    calendar: 'https://cal.com/alexnodeland',
  },
  
  seo: {
    defaultTitle: 'Alex Nodeland',
    defaultDescription: 'Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and startup development.',
    defaultImage: '/images/icon.png',
  },
  
  navigation: {
    main: [
      { name: 'home', href: '/' },
      { name: 'cv', href: '/cv' },
    ],
  },
};

module.exports = { siteConfig };
