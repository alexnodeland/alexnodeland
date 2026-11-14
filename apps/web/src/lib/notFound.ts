import { useSyncExternalStore } from 'react';

/**
 * Whether the page on screen is the 404.
 *
 * The shell resolves its hero from the path, and a missing page has no path
 * of its own — it is rendered at whatever address the visitor typed. So the
 * 404 page raises this flag while it is mounted, and the shell wears the 404
 * hero for as long as it is up. Deliberately not in the SSR markup: the flag
 * is only ever raised after mount, so the hero arrives through the same
 * transition every other hero does.
 *
 * The flag has two sources. The page marks it while mounted. The shell holds
 * it while the site's content is hidden — the landscape control unmounts the
 * page along with everything else, and without the hold the page's unmount
 * would lower the flag and the field would put its number away the moment
 * the chrome left it alone. Either source keeps it up; both have to let go.
 */
let marked = false;
let held = false;
let active = false;
const listeners = new Set<() => void>();

const publish = () => {
  const next = marked || held;
  if (active === next) return;
  active = next;
  listeners.forEach(listener => listener());
};

export const markNotFound = (on: boolean): void => {
  marked = on;
  publish();
};

export const holdNotFound = (on: boolean): void => {
  held = on;
  publish();
};

export const isNotFound = (): boolean => active;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useNotFound = (): boolean =>
  useSyncExternalStore(subscribe, isNotFound, isNotFound);

/**
 * The mark on the document while the 404 is up — what the chrome's
 * stylesheet is keyed off (src/styles/404.scss). The page sets it as it
 * mounts; the 404's own document is served already carrying it (below).
 */
export const NOT_FOUND_ATTRIBUTE = 'data-not-found';

/**
 * Whether a path is the 404's own document. Gatsby builds the page at both
 * of these, and a host serves the first for every address that is not a
 * page — so this is the markup a visitor to a missing page is sent, whatever
 * they typed. It is how the build knows to mark that document from its first
 * byte: without it the frame of an empty window is drawn, and then taken
 * away once the page has mounted and said what it is.
 */
export const isNotFoundPath = (pathname = ''): boolean =>
  /^\/404(\.html|\/)?$/.test(pathname);
