import {
  SEARCH_INDEX_PATH,
  createSearcher,
  loadSearcher,
  resetSearcherForTests,
} from '../../../lib/search';
import type { SearchDoc } from '../../../lib/search';

const doc = (
  id: string,
  kind: SearchDoc['kind'],
  title: string,
  text: string,
  summary = ''
): SearchDoc => ({ id, kind, title, url: `/${id}/`, summary, text });

const DOCS: SearchDoc[] = [
  doc('projects', 'page', 'projects', 'open source libraries'),
  doc('fugue', 'project', 'fugue', 'probabilistic programming in rust'),
  doc('fugue-evo', 'project', 'fugue-evo', 'genetic algorithms built on fugue'),
  doc(
    'post-ppl',
    'post',
    'Notes on inference',
    'fugue fugue fugue makes probabilistic programming in rust pleasant',
    'a post that mentions fugue a lot'
  ),
  doc('quiver', 'project', 'quiver', 'modular synthesis in rust'),
];

describe('createSearcher', () => {
  const searcher = createSearcher(DOCS);
  const titles = (query: string, limit?: number) =>
    searcher.search(query, limit).map(d => d.title);

  it('finds nothing for an empty or blank query', () => {
    expect(searcher.search('')).toEqual([]);
    expect(searcher.search('   ')).toEqual([]);
  });

  it('puts the thing named above the things that mention it', () => {
    // The post says "fugue" three times; the project is called fugue.
    expect(titles('fugue')[0]).toBe('fugue');
    expect(titles('fugue')).toContain('Notes on inference');
  });

  it('matches the word still being typed by its beginning', () => {
    expect(titles('fug')[0]).toBe('fugue');
    expect(titles('quiv')).toEqual(['quiver']);
  });

  it('needs every typed word in the title for the title to count', () => {
    // "fugue evo" names fugue-evo, not fugue.
    expect(titles('fugue evo')[0]).toBe('fugue-evo');
  });

  it('searches the summary and the body as well as the title', () => {
    expect(titles('synthesis')).toEqual(['quiver']);
    expect(titles('mentions')).toEqual(['Notes on inference']);
  });

  it('keeps the index order between equal scores, and honours the limit', () => {
    const rust = titles('rust');
    expect(rust).toHaveLength(3);
    expect(titles('rust', 2)).toEqual(rust.slice(0, 2));
  });

  it('returns nothing for a word nobody wrote', () => {
    expect(searcher.search('zzzz-nothing')).toEqual([]);
  });
});

describe('loadSearcher', () => {
  beforeEach(() => resetSearcherForTests());

  const ok = (docs: SearchDoc[]) =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ version: 1, docs }),
    } as Response);

  it('fetches the index once and builds the searcher from it', async () => {
    const fetcher = jest.fn(() => ok(DOCS));
    const first = await loadSearcher(fetcher);
    const second = await loadSearcher(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(SEARCH_INDEX_PATH);
    expect(second).toBe(first);
    expect(first.search('quiver')[0].title).toBe('quiver');
  });

  it('forgets a failed fetch, so the next open tries again', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response)
      .mockImplementationOnce(() => ok(DOCS));
    await expect(loadSearcher(fetcher)).rejects.toThrow('HTTP 404');
    await expect(loadSearcher(fetcher)).resolves.toBeDefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
