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
