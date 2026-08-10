import { render, screen } from '@testing-library/react';
import React from 'react';
import BlogPost from '../../../templates/blog-post';

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
jest.mock('../../../styles/blog.scss', () => ({}));

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
});
