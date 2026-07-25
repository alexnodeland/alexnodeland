/**
 * Life-like cellular automaton core.
 *
 * Kept free of Three.js and React so the rule can be tested directly against
 * known Conway patterns (blinker, block, glider) rather than inspected on a
 * canvas.
 */
import { LIFE_RULES } from './config';

export interface RuleTables {
  /** birth[n] — a dead cell with n live neighbors becomes alive. */
  birth: boolean[];
  /** survival[n] — a live cell with n live neighbors stays alive. */
  survival: boolean[];
}

/**
 * Builds neighbor-count lookup tables for a rule id, falling back to Conway's
 * Life when the id is unknown.
 */
export const makeRuleTables = (ruleId: string): RuleTables => {
  const { birth, survival } = LIFE_RULES[ruleId] ?? LIFE_RULES.conway;
  return {
    birth: Array.from({ length: 9 }, (_, n) => birth.includes(n)),
    survival: Array.from({ length: 9 }, (_, n) => survival.includes(n)),
  };
};

/**
 * Advances the grid one generation, writing into `next`.
 *
 * The grid is a torus: column and row indices wrap, so gliders leaving one edge
 * re-enter on the opposite one and no cell is special-cased as a boundary.
 */
export const stepLife = (
  current: Uint8Array,
  next: Uint8Array,
  cols: number,
  rows: number,
  tables: RuleTables
): void => {
  for (let y = 0; y < rows; y++) {
    const yUp = ((y - 1 + rows) % rows) * cols;
    const yDown = ((y + 1) % rows) * cols;
    const yHere = y * cols;

    for (let x = 0; x < cols; x++) {
      const xLeft = (x - 1 + cols) % cols;
      const xRight = (x + 1) % cols;

      const n =
        current[yUp + xLeft] +
        current[yUp + x] +
        current[yUp + xRight] +
        current[yHere + xLeft] +
        current[yHere + xRight] +
        current[yDown + xLeft] +
        current[yDown + x] +
        current[yDown + xRight];

      const idx = yHere + x;
      next[idx] = (current[idx] === 1 ? tables.survival[n] : tables.birth[n])
        ? 1
        : 0;
    }
  }
};

/** Total live cells, used to detect a stalled grid. */
export const population = (grid: Uint8Array): number => {
  let live = 0;
  for (let i = 0; i < grid.length; i++) live += grid[i];
  return live;
};
