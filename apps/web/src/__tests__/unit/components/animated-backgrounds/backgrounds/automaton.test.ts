import {
  decayHeat,
  makeRuleTables,
  PATTERNS,
  population,
  stampPattern,
  stepLife,
  stirCells,
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

// What the pointer puts down, and the trail life leaves behind it.
describe('the trail', () => {
  it('is full wherever a cell is alive and fades once it is not', () => {
    const alive = new Uint8Array([1, 0, 0, 0]);
    const heat = new Uint8Array([0, 255, 100, 0]);
    decayHeat(heat, alive, 0.5);
    expect(Array.from(heat)).toEqual([255, 127, 50, 0]);
  });

  it('is gone in the end: a glider is seen to have come from somewhere, not everywhere', () => {
    const alive = new Uint8Array(1);
    const heat = new Uint8Array([255]);
    for (let i = 0; i < 60; i++) decayHeat(heat, alive);
    expect(heat[0]).toBe(0);
  });
});

describe('what a tap puts down', () => {
  it('stamps each pattern with the cells it has', () => {
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      const board = new Uint8Array(COLS * ROWS);
      stampPattern(board, COLS, ROWS, 4, 4, pattern);
      expect([name, population(board)]).toEqual([name, pattern.length]);
    }
  });

  it('stamps a glider that glides', () => {
    const board = new Uint8Array(COLS * ROWS);
    stampPattern(board, COLS, ROWS, 3, 3, PATTERNS.glider);
    // Four generations on, a glider is itself again, one cell along each way.
    const later = advance(board, 'conway', 4);
    const shifted = new Uint8Array(COLS * ROWS);
    stampPattern(shifted, COLS, ROWS, 4, 4, PATTERNS.glider);
    expect(draw(later)).toEqual(draw(shifted));
  });

  it('turns a pattern by quarter turns, so a glider can be sent four ways', () => {
    const headings = [0, 1, 2, 3].map(turns => {
      const board = new Uint8Array(COLS * ROWS);
      stampPattern(board, COLS, ROWS, 4, 4, PATTERNS.glider, turns);
      return draw(board).join('\n');
    });
    expect(new Set(headings).size).toBe(4);
    // Four quarter turns is no turn.
    const whole = new Uint8Array(COLS * ROWS);
    stampPattern(whole, COLS, ROWS, 4, 4, PATTERNS.glider, 4);
    expect(draw(whole).join('\n')).toBe(headings[0]);
  });

  it('wraps at the edge, on the same torus the rule runs on', () => {
    const board = new Uint8Array(COLS * ROWS);
    stampPattern(board, COLS, ROWS, 0, 0, PATTERNS.glider);
    expect(population(board)).toBe(PATTERNS.glider.length);
    // Something landed on the far side.
    const last = draw(board)[ROWS - 1];
    expect(last.includes('#')).toBe(true);
  });
});

describe('the pointer, stirring', () => {
  it('wakes cells inside its reach and none outside it', () => {
    const board = new Uint8Array(COLS * ROWS);
    stirCells(board, COLS, ROWS, 4, 4, 1.5, 1, () => 0);
    // Every cell within a cell and a half of the centre: a 3×3 block.
    expect(draw(board)).toEqual([
      BLANK,
      BLANK,
      BLANK,
      '...###..',
      '...###..',
      '...###..',
      BLANK,
      BLANK,
    ]);
  });

  it('wakes them by chance', () => {
    const never = new Uint8Array(COLS * ROWS);
    stirCells(never, COLS, ROWS, 4, 4, 3, 0.2, () => 0.9);
    expect(population(never)).toBe(0);

    const always = new Uint8Array(COLS * ROWS);
    stirCells(always, COLS, ROWS, 4, 4, 3, 0.2, () => 0.1);
    expect(population(always)).toBeGreaterThan(20);
  });

  it('never puts a cell out', () => {
    const board = new Uint8Array(COLS * ROWS).fill(1);
    stirCells(board, COLS, ROWS, 4, 4, 3, 0.5, () => 0.9);
    expect(population(board)).toBe(COLS * ROWS);
  });

  it('wraps at the edge', () => {
    const board = new Uint8Array(COLS * ROWS);
    stirCells(board, COLS, ROWS, 0, 0, 1, 1, () => 0);
    // A plus of five cells, four of them round the edges.
    expect(population(board)).toBe(5);
    expect(board[0]).toBe(1);
    expect(board[COLS - 1]).toBe(1);
    expect(board[(ROWS - 1) * COLS]).toBe(1);
  });
});
