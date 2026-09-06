import {
  fieldFromMask,
  glyphCoverage,
  glyphSpacingFor,
  glyphTexture,
  rasterizeGlyph,
  sampleGlyphPoints,
} from '../../../../../components/animated-backgrounds/core/glyph';

// A 9×9 grid with a 3×3 block in the middle: the smallest number worth
// measuring distances around.
const block = () => {
  const cols = 9;
  const rows = 9;
  const mask = new Uint8Array(cols * rows);
  for (let y = 3; y <= 5; y++)
    for (let x = 3; x <= 5; x++) mask[y * cols + x] = 1;
  return fieldFromMask(cols, rows, mask);
};

describe('glyph field', () => {
  it('measures a signed distance to the edge, negative inside', () => {
    const f = block();
    const at = (x: number, y: number) => f.dist[y * f.cols + x];
    // The centre of the block is deeper in than its rim.
    expect(at(4, 4)).toBeLessThan(at(3, 3));
    expect(at(3, 3)).toBeLessThan(0);
    // Outside grows with distance from the block, half a cell at the edge.
    expect(at(2, 4)).toBeCloseTo(0.5, 5);
    expect(at(1, 4)).toBeCloseTo(1.5, 5);
    expect(at(0, 4)).toBeCloseTo(2.5, 5);
    expect(at(0, 0)).toBeGreaterThan(at(0, 4));
    expect(f.inside).toHaveLength(9);
  });

  it('softens the edge into a coverage', () => {
    const f = block();
    expect(glyphCoverage(f, 4 * f.cols + 4)).toBe(1);
    expect(glyphCoverage(f, 0)).toBe(0);
    const rim = glyphCoverage(f, 4 * f.cols + 2);
    expect(rim).toBeGreaterThan(0);
    expect(rim).toBeLessThan(1);
  });

  it('samples points inside the number, no two closer than the spacing', () => {
    const f = block();
    let seed = 1;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const points = sampleGlyphPoints(f, 40, 1, rng);
    expect(points.length).toBeGreaterThan(3);
    for (const p of points) {
      expect(f.mask[Math.floor(p.y) * f.cols + Math.floor(p.x)]).toBe(1);
    }
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const d = Math.hypot(
          points[i].x - points[j].x,
          points[i].y - points[j].y
        );
        expect(d).toBeGreaterThanOrEqual(1);
      }
    }
    expect(glyphSpacingFor(f, 9)).toBeCloseTo(0.82, 5);
  });

  it('packs a texture bottom-up so uv (0,0) is the bottom of the screen', () => {
    const cols = 4;
    const rows = 3;
    const mask = new Uint8Array(cols * rows);
    mask[0] = 1; // top-left of the field
    const texture = glyphTexture(fieldFromMask(cols, rows, mask));
    expect(texture.image.width).toBe(cols);
    expect(texture.image.height).toBe(rows);
    const data = texture.image.data as Uint8Array;
    // Texture row 0 is the field's last row: nothing there.
    expect(data[0]).toBe(0);
    // Texture row 2 is the field's row 0: the mask, at x = 0. A lone cell
    // is mostly edge, so its coverage is well inside but not full.
    expect(data[(2 * cols + 0) * 4]).toBe(255);
    expect(data[(2 * cols + 0) * 4 + 1]).toBeGreaterThan(128);
    expect(data[(2 * cols + 1) * 4 + 1]).toBeLessThan(128);
    // The distance channel sits at 0.5 on the edge and rises outside it.
    expect(data[(2 * cols + 1) * 4 + 2]).toBeGreaterThan(128);
    expect(data[(2 * cols + 3) * 4 + 2]).toBeGreaterThan(
      data[(2 * cols + 1) * 4 + 2]
    );
    texture.dispose();
  });

  it('rasterises to an empty field where there is no canvas to read', () => {
    // jest-canvas-mock reads back an all-zero image: no number, no throw.
    const f = rasterizeGlyph(64, 32);
    expect(f.cols).toBe(64);
    expect(f.rows).toBe(32);
    expect(f.inside).toHaveLength(0);
    expect(sampleGlyphPoints(f, 10, 1)).toHaveLength(0);
    expect(f.dist[0]).toBeGreaterThan(0);
  });
});
