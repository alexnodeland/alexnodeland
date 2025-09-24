import React from 'react';
import { render } from '@testing-library/react';
import SEO from '../../../components/seo';

// Mock the config
jest.mock('../../../config', () => ({
  siteConfig: {
    siteName: 'alex nodeland',
    siteUrl: 'https://alexnodeland.com',
    seo: {
      defaultTitle: 'alex nodeland',
      defaultDescription:
        'Senior AI Engineer & Technical Consultant specializing in AI system architecture, DevOps automation, and production-ready AI infrastructure.',
      defaultImage: '/images/icon.png',
    },
  },
}));

describe('SEO Component', () => {
  beforeEach(() => {
    // Clear document head before each test
    document.head.innerHTML = '';
  });

  it('should render with default values', () => {
    render(<SEO />);

    expect(document.title).toBe('alex nodeland');

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute(
      'content',
      'Senior AI Engineer & Technical Consultant specializing in AI system architecture, DevOps automation, and production-ready AI infrastructure.'
    );
  });

  it('should render with custom title', () => {
    render(<SEO title="Custom Page Title" />);

    expect(document.title).toBe('Custom Page Title | alex nodeland');
  });

  it('should not append site name if title matches site name', () => {
    render(<SEO title="alex nodeland" />);

    expect(document.title).toBe('alex nodeland');
  });

  it('should render with custom description', () => {
    render(<SEO description="Custom description for this page" />);

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute(
      'content',
      'Custom description for this page'
    );
  });

  it('should render with custom image and url', () => {
    render(
      <SEO
        image="/custom/image.png"
        url="https://alexnodeland.com/custom-page"
      />
    );

    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');

    expect(ogImage).toHaveAttribute('content', '/custom/image.png');
    expect(ogUrl).toHaveAttribute(
      'content',
      'https://alexnodeland.com/custom-page'
    );
  });

  it('should render Open Graph meta tags', () => {
    render(<SEO title="Test Page" description="Test description" />);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    const ogType = document.querySelector('meta[property="og:type"]');

    expect(ogTitle).toHaveAttribute('content', 'Test Page | alex nodeland');
    expect(ogDescription).toHaveAttribute('content', 'Test description');
    expect(ogType).toHaveAttribute('content', 'website');
  });

  it('should render Twitter Card meta tags', () => {
    render(<SEO title="Test Page" description="Test description" />);

    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector(
      'meta[name="twitter:description"]'
    );

    expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
    expect(twitterTitle).toHaveAttribute(
      'content',
      'Test Page | alex nodeland'
    );
    expect(twitterDescription).toHaveAttribute('content', 'Test description');
  });

  it('should render link tags for icons', () => {
    render(<SEO />);

    const iconLink = document.querySelector('link[rel="icon"]');
    const touchIconLink = document.querySelector(
      'link[rel="apple-touch-icon"]'
    );

    expect(iconLink).toHaveAttribute('href', '/images/icon.png');
    expect(touchIconLink).toHaveAttribute('href', '/images/icon.png');
  });

  it('should handle all custom props together', () => {
    const customProps = {
      title: 'About Us',
      description: 'Learn more about our company',
      image: '/images/about-hero.jpg',
      url: 'https://alexnodeland.com/about',
    };

    render(<SEO {...customProps} />);

    expect(document.title).toBe('About Us | alex nodeland');

    const metaDescription = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');

    expect(metaDescription).toHaveAttribute(
      'content',
      'Learn more about our company'
    );
    expect(ogTitle).toHaveAttribute('content', 'About Us | alex nodeland');
    expect(ogDescription).toHaveAttribute(
      'content',
      'Learn more about our company'
    );
    expect(ogImage).toHaveAttribute('content', '/images/about-hero.jpg');
    expect(ogUrl).toHaveAttribute('content', 'https://alexnodeland.com/about');
  });

  it('should handle empty string props gracefully', () => {
    render(<SEO title="" description="" />);

    expect(document.title).toBe('| alex nodeland'); // Empty title results in "| siteName" format

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', '');
  });
});
