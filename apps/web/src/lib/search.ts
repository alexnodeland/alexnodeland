import {
  bm25 as untypedBm25,
  buildLexicalIndex,
  tokenize,
} from './chat/retrieval.mjs';

// retrieval.mjs is plain JavaScript, and TypeScript reads `weights = null` as
// a parameter that can only ever be null. It takes one weight per term.
const bm25 = untypedBm25 as (
  lex: ReturnType<typeof buildLexicalIndex>,
  terms: string[],
  weights?: number[] | null
) => Float32Array;

/**
 * The site-wide search (⌘K): ranking over `static/search-index.json`.
 *
 * It ranks with the chat's own BM25 and tokenizer, so a word the chat finds a
 * passage by is a word the search finds the page by. Two things are added for
 * a person typing rather than a question arriving whole: the word still being
 * typed matches every indexed term it begins ("fug" is already fugue), and a
 * document whose title carries every word typed goes to the top, because when
 * someone types the name of a thing, that thing is what they want.
 */

export type SearchKind =
  'page' | 'post' | 'project' | 'app' | 'experiment' | 'role';

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  url: string;
  summary: string;
  meta?: string;
  text: string;
}

export interface SearchIndexPayload {
  version: number;
  docs: SearchDoc[];
}

/** The word a result row wears for what kind of thing it is. */
export const KIND_LABELS: Record<SearchKind, string> = {
  page: 'page',
  post: 'post',
  project: 'project',
  app: 'app',
  experiment: 'experiment',
  role: 'cv',
};

export const SEARCH_INDEX_PATH = '/search-index.json';

/** How far the unfinished word reaches, and how hard it pulls. */
const MAX_EXPANSIONS = 40;
const EXPANSION_WEIGHT = 0.7;

/**
 * What a title carrying every typed word is worth on top of its BM25 score:
 * more than any body match, so the thing named outranks the things that
 * mention it.
 */
const TITLE_BONUS = 25;

/**
 * And on top of that, how much of the title the typed words are: "fugue"
 * names fugue outright and fugue-evo only in part, so the whole name outranks
 * the longer one that begins with it.
 */
const COVERAGE_BONUS = 10;

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter(Boolean);

export interface Searcher {
  docs: SearchDoc[];
  /** The best matches for `query`, best first; nothing for an empty query. */
  search: (query: string, limit?: number) => SearchDoc[];
}

export function createSearcher(docs: SearchDoc[]): Searcher {
  const lex = buildLexicalIndex(
    docs.map(doc => ({
      title: doc.title,
      text: `${doc.summary} ${doc.meta ?? ''} ${doc.text}`,
    }))
  );
  const vocabulary: string[] = [...lex.postings.keys()];
  const titleWords = docs.map(doc => words(doc.title));

  const search = (query: string, limit = 8): SearchDoc[] => {
    const typed = words(query);
    if (typed.length === 0) return [];

    const terms: string[] = tokenize(query);
    const last = typed[typed.length - 1];
    const expansions =
      last.length >= 2
        ? vocabulary
            .filter(term => term.startsWith(last) && !terms.includes(term))
            .slice(0, MAX_EXPANSIONS)
        : [];
    const all = [...terms, ...expansions];
    const weights = [
      ...terms.map(() => 1),
      ...expansions.map(() => EXPANSION_WEIGHT),
    ];
    const scores: Float32Array = bm25(lex, all, weights);

    titleWords.forEach((title, i) => {
      if (typed.every(word => title.some(t => t.startsWith(word)))) {
        scores[i] +=
          TITLE_BONUS +
          COVERAGE_BONUS * Math.min(1, typed.length / title.length);
      }
    });

    return (
      docs
        .map((doc, i) => ({ doc, score: scores[i], i }))
        .filter(entry => entry.score > 0)
        // Ties keep the index's order: pages, then the work, then the writing.
        .sort((a, b) => b.score - a.score || a.i - b.i)
        .slice(0, limit)
        .map(entry => entry.doc)
    );
  };

  return { docs, search };
}

let loading: Promise<Searcher> | null = null;

/**
 * The searcher, built once per visit from the index fetched on first use. A
 * failed fetch is forgotten, so the next open tries again rather than
 * remembering the failure for the rest of the visit.
 */
export function loadSearcher(
  // `window.fetch`, never a bare `fetch`: Gatsby's server-side bundle swaps
  // a bare `fetch` for node-fetch, which drags whatwg-url and Node's
  // deprecated punycode into every page's render, for a call that only ever
  // happens in a browser.
  fetcher: typeof fetch = (...args) => window.fetch(...args)
): Promise<Searcher> {
  if (!loading) {
    loading = fetcher(SEARCH_INDEX_PATH)
      .then(res => {
        if (!res.ok) throw new Error(`search index: HTTP ${res.status}`);
        return res.json() as Promise<SearchIndexPayload>;
      })
      .then(payload => createSearcher(payload.docs))
      .catch(err => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/** Forgets the loaded index. For tests. */
export function resetSearcherForTests(): void {
  loading = null;
}
