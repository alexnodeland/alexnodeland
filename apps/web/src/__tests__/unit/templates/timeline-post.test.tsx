import { render, screen } from '@testing-library/react';
import React from 'react';
import BlogPost from '../../../templates/timeline-post';

// No Layout mock: the shell wraps the page (wrapPageElement) rather than the
// template rendering it, and a post wears no hero — its title is inside the
// window with the rest of the article.
jest.mock('../../../components/seo', () => {
  return function MockSEO({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) {
    return (
      <div
        data-testid="seo"
        data-title={title}
        data-description={description}
      ></div>
    );
  };
});

// Mock SCSS
jest.mock('../../../styles/timeline.scss', () => ({}));

describe('BlogPost Template', () => {
  const mockData = {
    markdownRemark: {
      id: '1',
      html: '<p>Post content</p>',
      frontmatter: {
        title: 'My Post',
        date: '2024-02-01',
        description: 'Desc',
        category: 'Tech',
      },
      fields: { slug: '/my-post' },
    },
    older: {
      frontmatter: { title: 'The One Before' },
      fields: { slug: '/before' },
    },
    newer: {
      frontmatter: { title: 'The One After' },
      fields: { slug: '/after' },
    },
  };

  it('renders SEO and content', () => {
    const { container } = render(<BlogPost data={mockData as any} />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'My Post');
    expect(container.querySelector('.post-title')).toHaveTextContent('My Post');
    expect(container.querySelector('.post-description')).toHaveTextContent(
      'Desc'
    );
    expect(container.querySelector('.post-category')).toHaveTextContent('Tech');
    expect(container.querySelector('.post-content')?.innerHTML).toBe(
      '<p>Post content</p>'
    );
  });

  it('offers the way back at the top and at the foot', () => {
    const { container } = render(<BlogPost data={mockData as any} />);
    expect(container.querySelector('.post-return')).toHaveAttribute(
      'href',
      '/timeline'
    );
    expect(container.querySelector('.back-to-timeline')).toHaveAttribute(
      'href',
      '/timeline'
    );
  });

  it('links the neighbours either side of it in time', () => {
    const { container } = render(<BlogPost data={mockData as any} />);
    const older = container.querySelector('.post-nav-older');
    const newer = container.querySelector('.post-nav-newer');
    expect(older).toHaveAttribute('href', '/timeline/before');
    expect(older).toHaveTextContent('The One Before');
    expect(newer).toHaveAttribute('href', '/timeline/after');
    expect(newer).toHaveTextContent('The One After');
  });

  it('holds the column open at the ends of the run', () => {
    const { container } = render(
      <BlogPost data={{ ...mockData, older: null, newer: null } as any} />
    );
    expect(container.querySelector('.post-nav-older')).toBeNull();
    expect(container.querySelector('.post-nav-newer')).toBeNull();
    // Both cells are still there, so the way back stays on the centre line.
    expect(container.querySelectorAll('.post-nav-link.is-empty')).toHaveLength(
      2
    );
  });

  it('offers the typeset copy and the ways to pass it on', () => {
    const { container } = render(<BlogPost data={mockData as any} />);
    expect(container.querySelector('.post-download')).toHaveAttribute(
      'href',
      '/timeline/pdf/my-post.pdf'
    );
    expect(
      container
        .querySelector('[aria-label="share on linkedin"]')
        ?.getAttribute('href')
    ).toContain('linkedin.com/sharing/share-offsite/');
    expect(
      container
        .querySelector('[aria-label="share on bluesky"]')
        ?.getAttribute('href')
    ).toContain('bsky.app/intent/');
    expect(
      container.querySelector('[aria-label="share on mastodon"]')
    ).not.toBeNull();
  });

  it('tells the timeline which post the reader is on', () => {
    render(<BlogPost data={mockData as any} />);
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'timeline:view',
      expect.stringContaining('"slug":"/my-post"')
    );
  });
});
