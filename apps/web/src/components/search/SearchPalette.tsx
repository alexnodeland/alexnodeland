import { navigate } from 'gatsby';
import React from 'react';
import { DURATION_FAST_MS, EASE_OUT } from '../../config/motion';
import { isTypingTarget } from '../../lib/utils/keys';
import { SearchIcon } from '../ui/EntryIcons';
import { prefersReducedMotion } from '../../lib/utils/motion';
import { KIND_LABELS, loadSearcher } from '../../lib/search';
import type { SearchDoc, Searcher } from '../../lib/search';
import '../../styles/search.scss';

/**
 * The site-wide search: ⌘K (Ctrl+K off a Mac), or `/`, from any page.
 *
 * One box over every page, post, project, app and CV role, in place of a
 * search on each list page — the lists are short enough to read, and the
 * question someone with a search box is asking is "where is the thing", not
 * "which of these twelve". It mounts once, in the shell, and fetches its
 * index the first time it opens (see src/lib/search.ts). The way to it for a
 * pointer or a thumb is the last segment of the capsule of page links.
 */

/** What anything that wants the search open dispatches; the palette listens. */
export const OPEN_SEARCH_EVENT = 'site-search:open';

export const openSearch = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
};

/** ⌘ on a Mac, ctrl everywhere else: the key the shortcut is actually on. */
export const useModifierLabel = (): string => {
  // The server renders the Mac's, and the browser corrects it after mount, so
  // the first paint and the hydrated tree agree.
  const [label, setLabel] = React.useState('⌘');
  React.useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } })
        .userAgentData?.platform ??
      navigator.platform ??
      '';
    if (!/mac|iphone|ipad/i.test(platform)) setLabel('ctrl');
  }, []);
  return label;
};

/**
 * The way to the search for a pointer or a thumb: the last segment of the
 * capsule of page links (see the nav in layout.tsx), on every page and at
 * every width. It used to be a pair of key caps at the foot of the field on a
 * desktop and a button of its own between the two launchers on a phone — one
 * control in two places, neither of them where anyone looks for a search. A
 * site's search goes with its navigation, and that is where this is.
 *
 * The chord is not drawn on it: the capsule is a row of words and one mark,
 * and the shortcut is in the list `?` opens. It is on the button all the
 * same — as its tooltip, and as `aria-keyshortcuts` for a screen reader.
 */
export const SearchButton: React.FC = () => {
  const modifier = useModifierLabel();
  return (
    <button
      type="button"
      className="nav-search"
      onClick={openSearch}
      aria-haspopup="dialog"
      aria-label="search the site"
      aria-keyshortcuts={modifier === '⌘' ? 'Meta+K' : 'Control+K'}
      title={`search (${modifier} K)`}
    >
      <SearchIcon />
    </button>
  );
};

type Status = 'idle' | 'loading' | 'ready' | 'error';

/** The path and fragment of a site URL, as `navigate` and the router see it. */
const split = (url: string): { path: string; hash: string } => {
  const at = url.indexOf('#');
  return at < 0
    ? { path: url, hash: '' }
    : { path: url.slice(0, at), hash: url.slice(at) };
};

const samePath = (a: string, b: string): boolean =>
  a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

const SearchPalette: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const [status, setStatus] = React.useState<Status>('idle');
  const [searcher, setSearcher] = React.useState<Searcher | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  const show = React.useCallback(() => {
    setOpen(already => {
      if (!already && typeof document !== 'undefined') {
        returnFocusRef.current = document.activeElement as HTMLElement | null;
      }
      return true;
    });
  }, []);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    // A load that failed is tried again on the next open, not before: the
    // error stays on screen until the reader closes it.
    setStatus(current => (current === 'error' ? 'idle' : current));
  }, []);

  // ⌘K and Ctrl+K toggle it from anywhere, a text field included: that is the
  // point of a chord. `/` opens it only from outside a field, where it is not
  // a character someone is typing. Escape closes. Capture phase, like the
  // shortcuts list, so an Escape that closes this is handled before anything
  // further out sees it.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const chord =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k';
      if (chord) {
        event.preventDefault();
        if (open) close();
        else show();
        return;
      }
      if (open) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        return;
      }
      if (
        event.key === '/' &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        show();
      }
    };
    const onOpen = () => show();
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, [open, show, close]);

  // The index arrives the first time the search opens, and stays.
  React.useEffect(() => {
    if (!open || status !== 'idle') return;
    setStatus('loading');
    loadSearcher()
      .then(loaded => {
        setSearcher(loaded);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [open, status]);

  // Focus into the box on open, and back where it came from on close.
  React.useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    const previous = returnFocusRef.current;
    returnFocusRef.current = null;
    if (previous && typeof previous.focus === 'function') previous.focus();
  }, [open]);

  // The same arrival the shortcuts list makes, and as quiet.
  React.useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel || typeof panel.animate !== 'function') return;
    if (prefersReducedMotion()) return;
    panel.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: DURATION_FAST_MS, easing: EASE_OUT }
    );
  }, [open]);

  // Nothing typed lists the pages: a search box opened with nothing in mind
  // is a way to go somewhere.
  const results: SearchDoc[] = React.useMemo(() => {
    if (!searcher) return [];
    const trimmed = query.trim();
    if (!trimmed) return searcher.docs.filter(doc => doc.kind === 'page');
    return searcher.search(trimmed, 8);
  }, [searcher, query]);

  React.useEffect(() => setActive(0), [query]);

  const go = React.useCallback(
    (doc: SearchDoc | undefined) => {
      if (!doc) return;
      close();
      const { path, hash } = split(doc.url);
      const here =
        typeof window !== 'undefined' &&
        samePath(window.location.pathname, path);
      navigate(doc.url);
      // The router moves the address without a hashchange, and a page that
      // is already showing does not remount to read it, so tell it.
      if (here && hash && typeof window !== 'undefined') {
        window.setTimeout(
          () => window.dispatchEvent(new HashChangeEvent('hashchange')),
          0
        );
      }
    },
    [close]
  );

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (results.length) setActive(i => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length)
        setActive(i => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    }
  };

  if (!open) return null;

  const optionId = (index: number) => `site-search-option-${index}`;
  const trimmed = query.trim();

  return (
    <div className="search-overlay" onMouseDown={close}>
      <div
        className="search-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="search the site"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="search-field">
          <svg
            className="search-field-glyph"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m20 20-4.2-4.2" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input-field"
            placeholder="search posts, projects, apps, the cv..."
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="site-search-results"
            aria-activedescendant={
              results.length ? optionId(active) : undefined
            }
            aria-autocomplete="list"
            aria-label="search the site"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="search-esc" aria-hidden="true">
            esc
          </kbd>
        </div>

        {status === 'loading' && <p className="search-status">loading...</p>}
        {status === 'error' && (
          <p className="search-status">
            the search could not load. close it and try again.
          </p>
        )}
        {status === 'ready' && trimmed && results.length === 0 && (
          <p className="search-status">
            nothing matches &quot;{trimmed}&quot;.
          </p>
        )}

        {results.length > 0 && (
          <ul
            id="site-search-results"
            className="search-results"
            role="listbox"
            aria-label={trimmed ? 'results' : 'pages'}
          >
            {results.map((doc, index) => (
              <li
                key={doc.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className={`search-result${index === active ? ' is-active' : ''}`}
                onMouseMove={() => setActive(index)}
                onClick={() => go(doc)}
              >
                <span className="search-result-head">
                  <span className="search-result-title">{doc.title}</span>
                  <span className="search-result-kind">
                    {KIND_LABELS[doc.kind]}
                    {doc.meta ? ` · ${doc.meta}` : ''}
                  </span>
                </span>
                {doc.summary && (
                  <span className="search-result-summary">{doc.summary}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SearchPalette;
