import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import TimelinePage from '../../../pages/timeline';

// Mock components barrel to avoid animated backgrounds
jest.mock('../../../components/seo', () => ({
  __esModule: true,
  default: ({ title }: { title?: string }) => (
    <div data-testid="seo" data-title={title} />
  ),
}));

// Mock SCSS
jest.mock('../../../styles/timeline.scss', () => ({}));

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

describe('Timeline Page', () => {
  it('renders SEO and the posts list, and no hero of its own', () => {
    render(<TimelinePage data={mockData as any} />);
    expect(screen.getByTestId('seo')).toHaveAttribute('data-title', 'timeline');
    // The "alex → timeline" title and its tagline live in the hero registry the
    // shell reads, not here.
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    // two posts shown (non-blog source filtered out)
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByText('Zeta Post')).toBeInTheDocument();
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
  });

  const tagTrigger = () =>
    screen.getByRole('button', { name: 'Filter posts by tag' });
  const sortTrigger = () =>
    screen.getByRole('button', { name: 'Sort posts by date' });

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
    render(<TimelinePage data={mockData as any} />);

    // The old row of filter buttons and the native select are both gone.
    expect(document.querySelector('select')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'ai' })
    ).not.toBeInTheDocument();

    // The row is the two pickers and the search: no reset chip. Each picker
    // resets itself through its own "all" or default option.
    expect(
      screen.queryByRole('button', { name: 'clear filters' })
    ).not.toBeInTheDocument();

    expect(tagTrigger()).toHaveTextContent('all');
    await user.click(tagTrigger());
    expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual([
      'all',
      'tech',
      'ai',
    ]);
  });

  it('marks the list up as an h-feed of h-entries', () => {
    const { container } = render(<TimelinePage data={mockData as any} />);
    const feed = container.querySelector('.posts-list');
    expect(feed).toHaveClass('h-feed');
    const entries = container.querySelectorAll('.h-entry');
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBe(
      container.querySelectorAll('.post-preview').length
    );
    const first = entries[0];
    expect(first.querySelector('a.p-name.u-url')).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/timeline\//)
    );
    expect(first.querySelector('time.dt-published')).toHaveAttribute(
      'datetime'
    );
    expect(first.querySelector('.p-summary')).toBeInTheDocument();
    expect(first.querySelector('data.p-category')).toHaveAttribute(
      'value',
      expect.stringMatching(/^[a-z]+$/)
    );
  });

  it('links to the feed from the control row, beside the pickers', () => {
    render(<TimelinePage data={mockData as any} />);
    const feed = screen.getByRole('link', { name: 'rss feed' });
    expect(feed).toHaveAttribute('href', '/rss.xml');
    expect(feed).toHaveAttribute('type', 'application/rss+xml');
    // In the row, in the chips' chrome, right after the sort picker.
    const row = document.querySelector('.timeline-control-bar') as HTMLElement;
    expect(row).toContainElement(feed);
    expect(feed).toHaveClass('ui-chip-button');
    const sort = row.querySelector('.timeline-sort-dropdown') as HTMLElement;
    expect(sort.nextElementSibling).toBe(feed);
  });

  it('filters by tag through the dropdown', async () => {
    const user = userEvent.setup();
    render(<TimelinePage data={mockData as any} />);

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
    render(<TimelinePage data={mockData as any} />);

    // Newest first is the default and the trigger says so.
    expect(sortTrigger()).toHaveTextContent('newest first');
    expect(titlesInOrder()).toEqual(['Zeta Post', 'Alpha Post']);

    await pick(user, sortTrigger(), 'oldest first');

    expect(sortTrigger()).toHaveTextContent('oldest first');
    expect(titlesInOrder()).toEqual(['Alpha Post', 'Zeta Post']);
  });

  it('still filters by search, from its own panel', () => {
    render(<TimelinePage data={mockData as any} />);

    const search = screen.getByPlaceholderText(
      'search posts...'
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'alpha' } });

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByText('Alpha Post')).toBeInTheDocument();
  });

  it('drives the pickers from the keyboard', async () => {
    const user = userEvent.setup();
    render(<TimelinePage data={mockData as any} />);

    tagTrigger().focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toHaveFocus();

    // all → tech → ai, then take it.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(tagTrigger()).toHaveFocus();
    expect(tagTrigger()).toHaveTextContent('ai');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
  // The break is a row of its own between the cards, so the thing to read is
  // the order of the list's children rather than anything on a card.
  const listInOrder = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.year-break, .post-preview')).map(
      el =>
        el.classList.contains('year-break')
          ? el.textContent
          : el.querySelector('h2')?.textContent
    );

  it('breaks the list with a year above the run it opens, and re-cuts it on a\n     change of sort', async () => {
    const user = userEvent.setup();
    const { container } = render(<TimelinePage data={mockData as any} />);

    expect(listInOrder(container)).toEqual([
      '2024',
      'Zeta Post',
      '2023',
      'Alpha Post',
    ]);

    await pick(user, sortTrigger(), 'oldest first');

    expect(listInOrder(container)).toEqual([
      '2023',
      'Alpha Post',
      '2024',
      'Zeta Post',
    ]);
  });

  it('leaves every card alike — the year is never on one', () => {
    const { container } = render(<TimelinePage data={mockData as any} />);
    expect(container.querySelector('.post-preview .year-break')).toBeNull();
  });

  it("carries each card's slug, which is what a reader is scrolled back to", () => {
    const { container } = render(<TimelinePage data={mockData as any} />);
    expect(
      Array.from(container.querySelectorAll('article')).map(card =>
        card.getAttribute('data-slug')
      )
    ).toEqual(['/zeta', '/alpha']);
  });

  it('keeps the view in the session as the pickers are changed', async () => {
    const user = userEvent.setup();
    render(<TimelinePage data={mockData as any} />);

    await pick(user, tagTrigger(), 'ai');

    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'timeline:view',
      expect.stringContaining('"tag":"AI"')
    );
  });

  // The page scrolls inside the shell's window, which it finds by class; the
  // tests stand one in so there is a scrollTop to read back.
  const renderInWindow = () => {
    const panel = document.createElement('div');
    panel.className = 'layout';
    document.body.appendChild(panel);
    render(<TimelinePage data={mockData as any} />, { container: panel });
    return panel;
  };

  it('comes back to where it was when the reader left it for a post', () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ scrollTop: 400, slug: '/zeta' })
    );

    const panel = renderInWindow();

    expect(panel.scrollTop).toBe(400);
  });

  it('starts at the top when the reader comes from anywhere but a post', () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ scrollTop: 400, slug: null })
    );

    const panel = renderInWindow();

    expect(panel.scrollTop).toBe(0);
  });

  it('comes back to the tag and the order it was left on', () => {
    (window.sessionStorage.getItem as jest.Mock).mockReturnValue(
      JSON.stringify({ tag: 'AI', sort: 'asc', search: '', scrollTop: 0 })
    );

    render(<TimelinePage data={mockData as any} />);

    expect(sortTrigger()).toHaveTextContent('oldest first');
    expect(tagTrigger()).toHaveTextContent('ai');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
