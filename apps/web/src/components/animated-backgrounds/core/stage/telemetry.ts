import { useSyncExternalStore } from 'react';

/**
 * What the simulation on screen has to say for itself, in a line.
 *
 * The fields are simulations and not video, and the cheapest way to say so
 * is to let one report: a generation count that climbs, a temperature that
 * falls, a frontier that grows and collapses. The scene writes a short line
 * here a few times a second and the chrome beside the backgrounds' pill reads
 * it — a store rather than React state, because the writer is an animation
 * loop that must not re-render anything it does not have to.
 */
let line = '';
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const read = () => line;
const readOnServer = () => '';

export const setReadout = (next: string): void => {
  if (next === line) return;
  line = next;
  listeners.forEach(listener => listener());
};

export const useReadout = (): string =>
  useSyncExternalStore(subscribe, read, readOnServer);

/**
 * A scene's own writer: asked every frame, it only works the line out — and
 * only publishes it — a few times a second. A count that changes sixty times
 * a second is a blur, and one string a frame is garbage for the collector.
 */
export const createReadout = (intervalMs = 240) => {
  let last = -Infinity;
  return {
    write(now: number, compose: () => string): void {
      if (now - last < intervalMs) return;
      last = now;
      setReadout(compose());
    },
    clear(): void {
      setReadout('');
    },
  };
};

/** A count the way the readout sets one: grouped in threes by a thin space. */
export const formatCount = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
