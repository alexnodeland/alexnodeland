import { siteConfig } from './site';

/**
 * Helper functions for working with site configuration
 */

// Get full URL for a given path
export const getFullUrl = (path: string = ''): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig?.siteUrl || 'https://alexnodeland.com'}${cleanPath}`;
};

// Get social media URL by platform
export const getSocialUrl = (
  platform: 'linkedin' | 'github' | 'twitter' | 'instagram' | 'youtube'
): string => {
  return siteConfig?.social?.[platform] || '';
};

// Get contact information
export const getContactInfo = () => siteConfig?.contact || {
  email: 'alex@ournature.studio',
  location: 'Upstate, New York, USA',
  website: 'alexnodeland.com',
};

// Get navigation items
export const getNavigationItems = () => siteConfig?.navigation?.main || [
  { name: 'blog', href: '/blog' },
  { name: 'cv', href: '/cv' },
];

// Get SEO defaults
export const getSEODefaults = () => siteConfig?.seo || {
  defaultTitle: 'Alex Nodeland',
  defaultDescription: 'Senior AI Engineer & Technical Consultant specializing in AI system architecture, DevOps automation, and production-ready AI infrastructure.',
  defaultImage: '/images/icon.png',
};

// Format social media handle for display
export const formatSocialHandle = (
  platform: 'linkedin' | 'github' | 'twitter' | 'instagram' | 'youtube'
): string => {
  const url = siteConfig?.social?.[platform];
  if (!url) return '';

  // Extract handle from URL
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)([^/?]+)/
  );
  return match ? match[1] : url;
};

// Get all social links as an array for easy iteration
export const getAllSocialLinks = () => {
  const social = siteConfig?.social || {
    linkedin: 'https://linkedin.com/in/alexnodeland',
    github: 'https://github.com/alexnodeland',
  };
  
  return Object.entries(social)
    .filter(([_, url]) => url) // Filter out empty URLs
    .map(([platform, url]) => ({
      platform: platform as keyof typeof social,
      url,
      handle: formatSocialHandle(platform as keyof typeof social),
    }));
};

// Get CTA button URL based on action type
export const getCTAButtonURL = (
  action: 'email' | 'calendar' | 'url',
  customUrl?: string
): string => {
  switch (action) {
    case 'email':
      return `mailto:${siteConfig?.contact?.email || 'alex@ournature.studio'}`;
    case 'calendar':
      return siteConfig?.services?.calendar || 'https://cal.com/alexnodeland';
    case 'url':
      return customUrl || '#';
    default:
      return '#';
  }
};
