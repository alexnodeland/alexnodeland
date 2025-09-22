import { siteConfig } from './site'

/**
 * Helper functions for working with site configuration
 */

// Get full URL for a given path
export const getFullUrl = (path: string = ''): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.siteUrl}${cleanPath}`
}

// Get social media URL by platform
export const getSocialUrl = (platform: keyof typeof siteConfig.social): string => {
  return siteConfig.social[platform]
}

// Get contact information
export const getContactInfo = () => siteConfig.contact

// Get navigation items
export const getNavigationItems = () => siteConfig.navigation.main

// Get SEO defaults
export const getSEODefaults = () => siteConfig.seo

// Format social media handle for display
export const formatSocialHandle = (platform: keyof typeof siteConfig.social): string => {
  const url = siteConfig.social[platform]
  if (!url) return ''
  
  // Extract handle from URL
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/)([^\/\?]+)/)
  return match ? match[1] : url
}

// Get all social links as an array for easy iteration
export const getAllSocialLinks = () => {
  return Object.entries(siteConfig.social)
    .filter(([_, url]) => url) // Filter out empty URLs
    .map(([platform, url]) => ({
      platform: platform as keyof typeof siteConfig.social,
      url,
      handle: formatSocialHandle(platform as keyof typeof siteConfig.social),
    }))
}

// Get CTA button URL based on action type
export const getCTAButtonURL = (action: 'email' | 'calendar' | 'url', customUrl?: string): string => {
  switch (action) {
    case 'email':
      return `mailto:${siteConfig.contact.email}`
    case 'calendar':
      return siteConfig.services.calendar
    case 'url':
      return customUrl || '#'
    default:
      return '#'
  }
}
