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
      defaultImage: '/images/social-card.png',
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

    // The social card, made absolute for the crawlers.
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    expect(ogImage).toHaveAttribute(
      'content',
      'https://alexnodeland.com/images/social-card.png'
    );
    expect(twitterImage).toHaveAttribute(
      'content',
      'https://alexnodeland.com/images/social-card.png'
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

    expect(ogImage).toHaveAttribute(
      'content',
      'https://alexnodeland.com/custom/image.png'
    );
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

  it('emits Dublin Core beside the Open Graph tags, with the schemes declared', () => {
    render(<SEO title="A Page" description="About it" pathname="/page/" />);

    expect(document.querySelector('link[rel="schema.DC"]')).toHaveAttribute(
      'href',
      'http://purl.org/dc/elements/1.1/'
    );
    expect(
      document.querySelector('link[rel="schema.DCTERMS"]')
    ).toHaveAttribute('href', 'http://purl.org/dc/terms/');
    const dc = (name: string) => document.querySelector(`meta[name="${name}"]`);
    expect(dc('DC.title')).toHaveAttribute('content', 'A Page');
    expect(dc('DC.description')).toHaveAttribute('content', 'About it');
    expect(dc('DC.identifier')).toHaveAttribute(
      'content',
      'https://alexnodeland.com/page/'
    );
    expect(dc('DC.identifier')).toHaveAttribute('scheme', 'DCTERMS.URI');
    expect(dc('DC.language')).toHaveAttribute('content', 'en');
    expect(dc('DC.type')).toHaveAttribute('content', 'Text');
    expect(dc('DC.rights')?.getAttribute('content')).toMatch(
      /all rights reserved/
    );
    // No date, no issued.
    expect(dc('DCTERMS.issued')).toBeNull();
    expect(dc('DC.subject')).toBeNull();
  });

  it('dates an article and files it under its keywords', () => {
    render(
      <SEO
        title="A Post"
        type="article"
        published="2026-09-13"
        keywords={['projects']}
      />
    );
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article'
    );
    expect(
      document.querySelector('meta[property="article:published_time"]')
    ).toHaveAttribute('content', '2026-09-13');
    expect(
      document.querySelector('meta[name="DCTERMS.issued"]')
    ).toHaveAttribute('content', '2026-09-13');
    expect(document.querySelector('meta[name="DC.subject"]')).toHaveAttribute(
      'content',
      'projects'
    );
    // The rights line carries the year of publication, not of the build.
    expect(
      document.querySelector('meta[name="DC.rights"]')?.getAttribute('content')
    ).toMatch(/^© 2026 /);
  });

  it('links every page to its author', () => {
    render(<SEO />);
    expect(document.querySelector('link[rel="author"]')).toHaveAttribute(
      'href',
      'https://alexnodeland.com/'
    );
  });

  it('offers the alternates it is given, as alternate unless told otherwise', () => {
    render(
      <SEO
        alternates={[
          { href: 'https://alexnodeland.com/me.ttl', type: 'text/turtle' },
          {
            href: 'https://alexnodeland.com/foaf.rdf',
            type: 'application/rdf+xml',
            rel: 'meta',
            title: 'FOAF',
          },
        ]}
      />
    );
    expect(
      document.querySelector('link[rel="alternate"][type="text/turtle"]')
    ).toHaveAttribute('href', 'https://alexnodeland.com/me.ttl');
    const foaf = document.querySelector('link[rel="meta"]');
    expect(foaf).toHaveAttribute('type', 'application/rdf+xml');
    expect(foaf).toHaveAttribute('title', 'FOAF');
  });

  it('passes a JSON-LD document through as it is', () => {
    render(
      <SEO jsonLd={{ '@context': 'https://schema.org', '@type': 'Thing' }} />
    );
    expect(
      JSON.parse(
        document.querySelector('script[type="application/ld+json"]')!
          .textContent!
      )
    ).toEqual({ '@context': 'https://schema.org', '@type': 'Thing' });
  });

  it('wraps a list of nodes as one JSON-LD graph', () => {
    render(
      <SEO
        jsonLd={[
          { '@id': 'https://alexnodeland.com/#me', '@type': 'Person' },
          { '@id': 'https://alexnodeland.com/#website', '@type': 'WebSite' },
        ]}
      />
    );
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(JSON.parse(script!.textContent!)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        { '@id': 'https://alexnodeland.com/#me', '@type': 'Person' },
        { '@id': 'https://alexnodeland.com/#website', '@type': 'WebSite' },
      ],
    });
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

  it('should leave the icon links to gatsby-plugin-manifest', () => {
    render(<SEO />);

    // The manifest plugin injects the favicon and apple-touch-icon links; a
    // second rel="icon" from here would override its set.
    expect(document.querySelector('link[rel="icon"]')).toBeNull();
    expect(document.querySelector('link[rel="apple-touch-icon"]')).toBeNull();
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
    expect(ogImage).toHaveAttribute(
      'content',
      'https://alexnodeland.com/images/about-hero.jpg'
    );
    expect(ogUrl).toHaveAttribute('content', 'https://alexnodeland.com/about');
  });

  it('should handle empty string props gracefully', () => {
    render(<SEO title="" description="" />);

    expect(document.title).toBe('| alex nodeland'); // Empty title results in "| siteName" format

    const metaDescription = document.querySelector('meta[name="description"]');
    expect(metaDescription).toHaveAttribute('content', '');
  });
});
