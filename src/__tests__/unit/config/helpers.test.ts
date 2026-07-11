import {
  formatSocialHandle,
  getAllSocialLinks,
  getCTAButtonURL,
  getFullUrl,
  getNavigationItems,
  getSocialUrl,
} from '../../../config/helpers';
import { siteConfig } from '../../../config/site';

describe('Configuration Helper Functions', () => {
  describe('getFullUrl', () => {
    it('should return full URL with path', () => {
      expect(getFullUrl('/about')).toBe('https://alexnodeland.com/about');
    });

    it('should add leading slash if missing', () => {
      expect(getFullUrl('about')).toBe('https://alexnodeland.com/about');
    });

    it('should return base URL for empty path', () => {
      expect(getFullUrl('')).toBe('https://alexnodeland.com/');
    });

    it('should return base URL for undefined path', () => {
      expect(getFullUrl()).toBe('https://alexnodeland.com/');
    });

    it('should handle root path correctly', () => {
      expect(getFullUrl('/')).toBe('https://alexnodeland.com/');
    });

    it('should handle nested paths', () => {
      expect(getFullUrl('/blog/post-1')).toBe(
        'https://alexnodeland.com/blog/post-1'
      );
    });
  });

  describe('getSocialUrl', () => {
    it('should return LinkedIn URL', () => {
      expect(getSocialUrl('linkedin')).toBe(
        'https://linkedin.com/in/alexnodeland'
      );
    });

    it('should return GitHub URL', () => {
      expect(getSocialUrl('github')).toBe('https://github.com/alexnodeland');
    });

    it('should return empty string for non-existent platform', () => {
      expect(getSocialUrl('twitter' as any)).toBe('');
    });

    it('should return empty string for undefined platform', () => {
      expect(getSocialUrl('instagram' as any)).toBe('');
    });
  });

  describe('getNavigationItems', () => {
    it('should return navigation items', () => {
      const navItems = getNavigationItems();

      expect(navItems).toEqual([
        { name: 'blog', href: '/blog' },
        { name: 'projects', href: '/projects' },
        { name: 'cv', href: '/cv' },
      ]);
    });

    it('should return the same array reference', () => {
      const navItems1 = getNavigationItems();
      const navItems2 = getNavigationItems();

      expect(navItems1).toBe(navItems2);
    });
  });

  describe('formatSocialHandle', () => {
    it('should extract LinkedIn handle from URL', () => {
      expect(formatSocialHandle('linkedin')).toBe('alexnodeland');
    });

    it('should extract GitHub handle from URL', () => {
      expect(formatSocialHandle('github')).toBe('alexnodeland');
    });

    it('should return empty string for non-existent platform', () => {
      expect(formatSocialHandle('twitter' as any)).toBe('');
    });

    it('should return empty string for empty URL', () => {
      // Mock siteConfig.social to have empty URL
      const originalSocial = siteConfig.social;
      siteConfig.social = { ...originalSocial, linkedin: '' };

      expect(formatSocialHandle('linkedin')).toBe('');

      // Restore original
      siteConfig.social = originalSocial;
    });

    it('should return original URL if no match found', () => {
      // Mock siteConfig.social to have non-standard URL
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        ...originalSocial,
        linkedin: 'https://example.com/profile',
      };

      expect(formatSocialHandle('linkedin')).toBe(
        'https://example.com/profile'
      );

      // Restore original
      siteConfig.social = originalSocial;
    });

    it('should handle URLs without protocol', () => {
      // Mock siteConfig.social to have URL without protocol
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        ...originalSocial,
        linkedin: 'linkedin.com/in/testuser',
      };

      expect(formatSocialHandle('linkedin')).toBe('testuser');

      // Restore original
      siteConfig.social = originalSocial;
    });

    it('should handle URLs with www', () => {
      // Mock siteConfig.social to have URL with www
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        ...originalSocial,
        linkedin: 'https://www.linkedin.com/in/testuser',
      };

      expect(formatSocialHandle('linkedin')).toBe('testuser');

      // Restore original
      siteConfig.social = originalSocial;
    });
  });

  describe('getAllSocialLinks', () => {
    it('should return all social links with handles', () => {
      const socialLinks = getAllSocialLinks();

      expect(socialLinks).toEqual([
        {
          platform: 'linkedin',
          url: 'https://linkedin.com/in/alexnodeland',
          handle: 'alexnodeland',
        },
        {
          platform: 'github',
          url: 'https://github.com/alexnodeland',
          handle: 'alexnodeland',
        },
      ]);
    });

    it('should filter out empty URLs', () => {
      // Mock siteConfig.social to have empty URL
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        ...originalSocial,
        linkedin: 'https://linkedin.com/in/alexnodeland',
        github: '',
        twitter: 'https://twitter.com/alexnodeland',
      };

      const socialLinks = getAllSocialLinks();

      expect(socialLinks).toHaveLength(2);
      expect(
        socialLinks.find(link => link.platform === 'github')
      ).toBeUndefined();
      expect(
        socialLinks.find(link => link.platform === 'linkedin')
      ).toBeDefined();
      expect(
        socialLinks.find(link => link.platform === 'twitter')
      ).toBeDefined();

      // Restore original
      siteConfig.social = originalSocial;
    });

    it('should return empty array when all URLs are empty', () => {
      // Mock siteConfig.social to have all empty URLs
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        linkedin: '',
        github: '',
      };

      const socialLinks = getAllSocialLinks();

      expect(socialLinks).toEqual([]);

      // Restore original
      siteConfig.social = originalSocial;
    });
  });

  describe('getCTAButtonURL', () => {
    it('should return email URL for email action', () => {
      expect(getCTAButtonURL('email')).toBe('mailto:alex@ournature.studio');
    });

    it('should return calendar URL for calendar action', () => {
      expect(getCTAButtonURL('calendar')).toBe('https://cal.com/alexnodeland');
    });

    it('should return custom URL for url action', () => {
      expect(getCTAButtonURL('url', 'https://example.com')).toBe(
        'https://example.com'
      );
    });

    it('should return default URL for url action without custom URL', () => {
      expect(getCTAButtonURL('url')).toBe('#');
    });

    it('should return default URL for unknown action', () => {
      expect(getCTAButtonURL('unknown' as any)).toBe('#');
    });

    it('should handle undefined custom URL', () => {
      expect(getCTAButtonURL('url', undefined)).toBe('#');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed URLs in getFullUrl', () => {
      expect(getFullUrl('//malformed')).toBe(
        'https://alexnodeland.com//malformed'
      );
    });

    it('should handle special characters in paths', () => {
      expect(getFullUrl('/path with spaces')).toBe(
        'https://alexnodeland.com/path with spaces'
      );
      expect(getFullUrl('/path-with-dashes')).toBe(
        'https://alexnodeland.com/path-with-dashes'
      );
      expect(getFullUrl('/path_with_underscores')).toBe(
        'https://alexnodeland.com/path_with_underscores'
      );
    });

    it('should handle query parameters in paths', () => {
      expect(getFullUrl('/search?q=test')).toBe(
        'https://alexnodeland.com/search?q=test'
      );
    });

    it('should handle hash fragments in paths', () => {
      expect(getFullUrl('/page#section')).toBe(
        'https://alexnodeland.com/page#section'
      );
    });

    it('should handle complex URLs in formatSocialHandle', () => {
      // Mock siteConfig.social to have complex URL
      const originalSocial = siteConfig.social;
      siteConfig.social = {
        ...originalSocial,
        linkedin: 'https://www.linkedin.com/in/test-user-123?trk=profile',
      };

      expect(formatSocialHandle('linkedin')).toBe('test-user-123');

      // Restore original
      siteConfig.social = originalSocial;
    });
  });
});
