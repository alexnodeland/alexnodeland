import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import BlogPage from '../../../pages/blog';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components', () => ({
  // No Layout here: the shell wraps the page (wrapPageElement) rather than the
  // page rendering it, and the hero it wears is resolved from the path — both
  // are covered by the Layout tests. A page renders only its own content now.
  SEO: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
  // The real dropdown — the controls under test are the shared component, so
  // mocking it here would test nothing.
  Dropdown: jest.requireActual('../../../components/ui/Dropdown').default,
  // The glyph that opens every post's title row.
  PostIcon: jest.requireActual('../../../components/ui/EntryIcons').PostIcon,
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
  it('renders SEO and the posts list, and no hero of its own', () => {
    render(<BlogPage data={mockData as any} />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'blog');
    // The "alex → blog" title and its tagline live in the hero registry the
    // shell reads, not here.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    // two blog posts shown (non-blog source filtered out)
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Zeta Post')).toBeInTheDocument();
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
  });

  const tagTrigger = () =>
    screen.getByRole('button', { name: 'Filter posts by tag' });
  const sortTrigger = () =>
    screen.getByRole('button', { name: 'Sort posts by date' });
  const clearChip = () => screen.getByRole('button', { name: 'clear filters' });

  const pick = async (
    user: ReturnType<typeof userEvent.setup>,
    trigger: HTMLElement,
    optionName: string
  ) => {
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: optionName }));
  };

  const titlesInOrder = () =>
    screen.getAllByRole('article').map(article => {
      const heading = article.querySelector('h2, h3');
      return heading?.textContent ?? '';
    });

  it('offers the tags the posts actually carry, and no others', async () => {
    const user = userEvent.setup();
    render(<BlogPage data={mockData as any} />);

    // The old row of filter buttons and the native select are both gone.
    expect(document.querySelector('select')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'ai' })
    ).not.toBeInTheDocument();

    expect(tagTrigger()).toHaveTextContent('all');
    await user.click(tagTrigger());
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'all',
      'tech',
      'ai',
    ]);
  });

  it('filters by tag through the dropdown', async () => {
    const user = userEvent.setup();
    render(<BlogPage data={mockData as any} />);

    await pick(user, tagTrigger(), 'ai');

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
    expect(tagTrigger()).toHaveTextContent('ai');

    // And back to everything.
    await pick(user, tagTrigger(), 'all');
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('sorts by date through the dropdown', async () => {
    const user = userEvent.setup();
    render(<BlogPage data={mockData as any} />);

    // Newest first is the default and the trigger says so.
    expect(sortTrigger()).toHaveTextContent('newest first');
    expect(titlesInOrder()).toEqual(['Zeta Post', 'Alpha Post']);

    await pick(user, sortTrigger(), 'oldest first');

    expect(sortTrigger()).toHaveTextContent('oldest first');
    expect(titlesInOrder()).toEqual(['Alpha Post', 'Zeta Post']);
  });

  it('still filters by search, from its own panel', () => {
    render(<BlogPage data={mockData as any} />);

    const search = screen.getByPlaceholderText(
      'search posts...'
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'alpha' } });

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
  });

  it('enables the clear chip only when something is filtered, and resets everything', async () => {
    const user = userEvent.setup();
    render(<BlogPage data={mockData as any} />);

    expect(clearChip()).toBeDisabled();

    await pick(user, tagTrigger(), 'ai');
    await pick(user, sortTrigger(), 'oldest first');
    fireEvent.change(screen.getByPlaceholderText('search posts...'), {
      target: { value: 'alpha' },
    });
    expect(clearChip()).toBeEnabled();

    await user.click(clearChip());

    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(tagTrigger()).toHaveTextContent('all');
    expect(sortTrigger()).toHaveTextContent('newest first');
    expect(
      (screen.getByPlaceholderText('search posts...') as HTMLInputElement).value
    ).toBe('');
    expect(clearChip()).toBeDisabled();
  });

  it('drives the pickers from the keyboard', async () => {
    const user = userEvent.setup();
    render(<BlogPage data={mockData as any} />);

    tagTrigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toHaveFocus();

    // all → tech → ai, then take it.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(tagTrigger()).toHaveFocus();
    expect(tagTrigger()).toHaveTextContent('ai');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
