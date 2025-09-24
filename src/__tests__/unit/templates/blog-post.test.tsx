import { render, screen } from '@testing-library/react';
import React from 'react';
import BlogPost from '../../../templates/blog-post';

// Mock Layout and SEO
jest.mock('../../../components/layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});
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

  it('renders layout, SEO and content', () => {
    const { container } = render(<BlogPost data={mockData as any} />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
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
