import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import BlogPage from '../../../pages/blog';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
  SEO: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

// Mock SCSS
jest.mock('../../../styles/blog.scss', () => ({}));

const makePost = (
  id: string,
  title: string,
  date: string,
  description: string | undefined,
  category: string | undefined,
  excerpt: string,
  slug: string
) => ({
  id,
  frontmatter: { title, date, description, category },
  excerpt,
  fields: { slug },
  parent: { sourceInstanceName: 'blog' },
});

const mockData = {
  allMarkdownRemark: {
    nodes: [
      makePost(
        '1',
        'Zeta Post',
        '2024-02-01',
        'Desc Z',
        'Tech',
        'z excerpt',
        '/zeta'
      ),
      makePost(
        '2',
        'Alpha Post',
        '2023-12-15',
        'Desc A',
        'AI',
        'a excerpt',
        '/alpha'
      ),
      // Non-blog source should be filtered out
      {
        ...makePost('3', 'Hidden', '2023-01-01', 'x', 'Misc', 'x', '/hidden'),
        parent: { sourceInstanceName: 'other' },
      },
    ],
  },
};

describe('Blog Page', () => {
  it('renders layout, SEO, header and posts list', () => {
    render(<BlogPage data={mockData as any} />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'blog');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('blog');
    // two blog posts shown (non-blog source filtered out)
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Zeta Post')).toBeInTheDocument();
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
  });

  it('filters by search and category and sorts', () => {
    render(<BlogPage data={mockData as any} />);
    // search by title
    const search = screen.getByPlaceholderText(
      'search posts...'
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'alpha' } });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();

    // clear via button
    const clearBtn = screen.getByText('clear filters') as HTMLButtonElement;
    fireEvent.click(clearBtn);
    expect(screen.getAllByRole('article')).toHaveLength(2);

    // filter by category
    const aiBtn = screen.getByRole('button', { name: 'ai' });
    fireEvent.click(aiBtn);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();

    // sort order asc (oldest first)
    const sort = screen.getByLabelText('sort by date:');
    fireEvent.change(sort, { target: { value: 'asc' } });
    const articlesAsc = screen.getAllByRole('article');
    // with AI filter still active only one item remains
    expect(articlesAsc).toHaveLength(1);
  });
});
