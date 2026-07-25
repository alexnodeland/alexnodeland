import {
  makeRuleTables,
  population,
  stepLife,
} from '../../../../../components/animated-backgrounds/backgrounds/cellular-automaton/automaton';

const COLS = 8;
const ROWS = 8;

/** Builds a grid from a picture, '#' meaning alive. */
const grid = (rows: string[]): Uint8Array => {
  const g = new Uint8Array(COLS * ROWS);
  rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      g[y * COLS + x] = ch === '#' ? 1 : 0;
    });
  });
  return g;
};

/** Renders a grid back to a picture for readable assertions. */
const draw = (g: Uint8Array): string[] =>
  Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => (g[y * COLS + x] ? '#' : '.')).join(
      ''
    )
  );

const advance = (start: Uint8Array, rule = 'conway', generations = 1) => {
  const tables = makeRuleTables(rule);
  let current = start;
  for (let i = 0; i < generations; i++) {
    const next = new Uint8Array(current.length);
    stepLife(current, next, COLS, ROWS, tables);
    current = next;
  }
  return current;
};

const BLANK = '........';

describe('stepLife', () => {
  it('oscillates a blinker with period 2', () => {
    const horizontal = [
      BLANK,
      BLANK,
      BLANK,
      '..###...',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ];
    const vertical = [
      BLANK,
      BLANK,
      '...#....',
      '...#....',
      '...#....',
      BLANK,
      BLANK,
      BLANK,
    ];

    expect(draw(advance(grid(horizontal)))).toEqual(vertical);
    expect(draw(advance(grid(horizontal), 'conway', 2))).toEqual(horizontal);
  });

  it('leaves a block still life untouched', () => {
    const block = [
      BLANK,
      '..##....',
      '..##....',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ];
    expect(draw(advance(grid(block), 'conway', 4))).toEqual(block);
  });

  it('translates a glider one cell diagonally every four generations', () => {
    const glider = grid([
      '.#......',
      '..#.....',
      '###.....',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    const moved = grid([
      BLANK,
      '..#.....',
      '...#....',
      '.###....',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    expect(draw(advance(glider, 'conway', 4))).toEqual(draw(moved));
  });

  it('wraps around the torus rather than clipping at the edge', () => {
    // A blinker straddling the right edge stays a blinker.
    const straddling = grid([
      BLANK,
      BLANK,
      BLANK,
      '#.....##',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    expect(population(advance(straddling))).toBe(3);
  });

  it('kills every cell under Seeds, which has no survival counts', () => {
    const soup = grid([
      '.##.....',
      '.##.....',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    const after = advance(soup, 'seeds');
    // The original block cannot survive (S is empty); only births remain.
    expect(after[1 * COLS + 1]).toBe(0);
    expect(after[1 * COLS + 2]).toBe(0);
  });

  it('falls back to Conway for an unknown rule id', () => {
    const blinker = grid([
      BLANK,
      BLANK,
      BLANK,
      '..###...',
      BLANK,
      BLANK,
      BLANK,
      BLANK,
    ]);
    expect(draw(advance(blinker, 'nonsense'))).toEqual(
      draw(advance(blinker, 'conway'))
    );
  });
});

describe('population', () => {
  it('counts live cells', () => {
    expect(population(grid(['##......', ...Array(7).fill(BLANK)]))).toBe(2);
  });
});
