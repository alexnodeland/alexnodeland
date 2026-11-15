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

/**
 * Where life has been: a trail that is full wherever a cell is alive and
 * fades, a fraction a generation, once it is not. It is not part of the
 * rule and nothing reads it but the drawing — it is the automaton's recent
 * past, kept so that a glider can be seen to have come from somewhere.
 */
export const decayHeat = (
  heat: Uint8Array,
  alive: Uint8Array,
  keep = 0.84
): void => {
  for (let i = 0; i < heat.length; i++) {
    heat[i] = alive[i] === 1 ? 255 : Math.floor(heat[i] * keep);
  }
};

/** A small pattern, as the cells it switches on: [column, row] offsets. */
export type Pattern = ReadonlyArray<readonly [number, number]>;

/**
 * What a tap puts down. Each is a classic of Conway's rule for a reason a
 * reader can watch: the glider and the spaceship travel, and the
 * R-pentomino — five cells — takes over a thousand generations to settle.
 * Under the other rules they are simply seeds.
 */
export const PATTERNS: Record<string, Pattern> = {
  glider: [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  rPentomino: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  spaceship: [
    [1, 0],
    [4, 0],
    [0, 1],
    [0, 2],
    [4, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
};

/**
 * Switch a pattern's cells on, centred near (col, row), on the same wrapping
 * torus the rule runs on. `turns` rotates it by quarter turns, so a glider
 * can be sent in any of its four directions.
 */
export const stampPattern = (
  grid: Uint8Array,
  cols: number,
  rows: number,
  col: number,
  row: number,
  pattern: Pattern,
  turns = 0
): void => {
  for (const [px, py] of pattern) {
    let x = px - 1;
    let y = py - 1;
    for (let t = 0; t < ((turns % 4) + 4) % 4; t++) [x, y] = [-y, x];
    const cx = (((Math.round(col) + x) % cols) + cols) % cols;
    const cy = (((Math.round(row) + y) % rows) + rows) % rows;
    grid[cy * cols + cx] = 1;
  }
};

/**
 * Switch on cells at random within `radius` of a point, each with
 * probability `chance`: the pointer, as a place where the soup is stirred.
 */
export const stirCells = (
  grid: Uint8Array,
  cols: number,
  rows: number,
  col: number,
  row: number,
  radius: number,
  chance: number,
  random: () => number = Math.random
): void => {
  const reach = Math.ceil(radius);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      if (random() >= chance) continue;
      const cx = (((Math.round(col) + dx) % cols) + cols) % cols;
      const cy = (((Math.round(row) + dy) % rows) + rows) % rows;
      grid[cy * cols + cx] = 1;
    }
  }
};
