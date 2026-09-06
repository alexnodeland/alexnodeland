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
 */
let active = false;
const listeners = new Set<() => void>();

export const markNotFound = (on: boolean): void => {
  if (active === on) return;
  active = on;
  listeners.forEach(listener => listener());
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
