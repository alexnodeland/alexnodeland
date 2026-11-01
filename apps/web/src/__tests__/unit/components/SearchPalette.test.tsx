import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate } from 'gatsby';
import React from 'react';
import SearchPalette, {
  SearchHint,
  openSearch,
} from '../../../components/search/SearchPalette';
import { resetSearcherForTests } from '../../../lib/search';
import type { SearchDoc } from '../../../lib/search';

jest.mock('../../../styles/search.scss', () => ({}));

const DOCS: SearchDoc[] = [
  {
    id: 'page:projects',
    kind: 'page',
    title: 'projects',
    url: '/projects/',
    summary: 'libraries, systems, and a few experiments.',
    text: '',
  },
  {
    id: 'page:apps',
    kind: 'page',
    title: 'apps',
    url: '/apps/',
    summary: 'small tools.',
    text: '',
  },
  {
    id: 'project:fugue',
    kind: 'project',
    title: 'fugue',
    url: '/projects/#project-fugue',
    summary: 'a probabilistic programming library for rust.',
    meta: 'rust',
    text: 'probabilistic programming rust',
  },
  {
    id: 'project:quiver',
    kind: 'project',
    title: 'quiver',
    url: '/projects/#project-quiver',
    summary: 'modular synthesis.',
    text: 'synthesis rust',
  },
];

const fetchMock = jest.fn();

beforeEach(() => {
  resetSearcherForTests();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ version: 1, docs: DOCS }),
  });
  (global as unknown as { fetch: typeof fetch }).fetch =
    fetchMock as unknown as typeof fetch;
  (navigate as jest.Mock).mockClear();
});

const box = () => screen.getByRole('combobox', { name: 'search the site' });
const options = () =>
  screen.queryAllByRole('option').map(option => option.textContent);

/** Open it with ⌘K and wait for the index to arrive. */
const openWithChord = async (
  init: { metaKey?: boolean; ctrlKey?: boolean } = { metaKey: true }
) => {
  fireEvent.keyDown(window, { key: 'k', ...init });
  await screen.findAllByRole('option');
};

describe('SearchPalette', () => {
  it('is closed until asked for, and fetches nothing until then', () => {
    render(<SearchPalette />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens on ⌘K and on Ctrl+K, focused, listing the pages', async () => {
    render(<SearchPalette />);
    await openWithChord({ metaKey: true });
    expect(
      screen.getByRole('dialog', { name: 'search the site' })
    ).toBeInTheDocument();
    expect(box()).toHaveFocus();
    // Nothing typed: the pages, as a way to go somewhere.
    expect(options().map(text => text?.split('page')[0])).toEqual([
      'projects',
      'apps',
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/search-index.json');

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openWithChord({ ctrlKey: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens on / outside a text field, and not inside one', async () => {
    render(
      <>
        <input aria-label="elsewhere" />
        <SearchPalette />
      </>
    );
    const elsewhere = screen.getByLabelText('elsewhere');
    elsewhere.focus();
    fireEvent.keyDown(elsewhere, { key: '/' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: '/' });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens from the hint, the way a phone gets to it', async () => {
    render(
      <>
        <SearchHint />
        <SearchPalette />
      </>
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'search the site' })
    );
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('searches as you type, and says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<SearchPalette />);
    await openWithChord();

    await user.type(box(), 'fug');
    expect(options()).toHaveLength(1);
    expect(options()[0]).toContain('fugue');
    expect(options()[0]).toContain('project · rust');

    await user.clear(box());
    await user.type(box(), 'zzzz');
    expect(options()).toHaveLength(0);
    expect(screen.getByText('nothing matches "zzzz".')).toBeInTheDocument();
  });

  it('moves with the arrows and goes with Enter, closing behind it', async () => {
    const user = userEvent.setup();
    render(<SearchPalette />);
    await openWithChord();

    await user.type(box(), 'rust');
    const [first, second] = screen.getAllByRole('option');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(box()).toHaveAttribute('aria-activedescendant', first.id);

    await user.keyboard('{ArrowDown}');
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(box()).toHaveAttribute('aria-activedescendant', second.id);

    // Past the end comes back round to the start.
    await user.keyboard('{ArrowDown}');
    expect(first).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');

    await user.keyboard('{Enter}');
    expect(navigate).toHaveBeenCalledWith('/projects/#project-quiver');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('goes where a click says', async () => {
    const user = userEvent.setup();
    render(<SearchPalette />);
    await openWithChord();
    await user.click(screen.getByText('apps'));
    expect(navigate).toHaveBeenCalledWith('/apps/');
  });

  it('closes on Escape and on a click outside, handing focus back', async () => {
    render(
      <>
        <button type="button">before</button>
        <SearchPalette />
      </>
    );
    const before = screen.getByRole('button', { name: 'before' });
    before.focus();
    await openWithChord();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(before).toHaveFocus();

    act(() => openSearch());
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.querySelector('.search-overlay') as Element);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says so when the index will not load, and tries again next time', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    render(<SearchPalette />);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(
      await screen.findByText(/the search could not load/)
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await openWithChord();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
