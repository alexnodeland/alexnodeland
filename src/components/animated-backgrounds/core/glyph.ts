import * as THREE from 'three';

/**
 * The number, as a field.
 *
 * Every background has a 404 sequence — a way of coming apart into the number
 * that is true to what the background already is (see `notFound` on
 * AnimatedBackgroundProps). What they share is the number itself: "404"
 * rasterised onto a coarse grid in the page's own type, with a signed
 * distance to its edge at every cell. An automaton reads the mask, a graph
 * samples points inside it, a shader samples the distance — but they are all
 * looking at the same glyph, so the number is the same number on every field.
 */
export interface GlyphField {
  cols: number;
  rows: number;
  /** 1 where the number is. */
  mask: Uint8Array;
  /**
   * Signed distance to the number's edge, in cells: negative inside, positive
   * outside. A chamfer approximation — within a few percent of Euclidean,
   * which is more than these fields need.
   */
  dist: Float32Array;
  /** Indices of every cell inside the number, for sampling. */
  inside: number[];
}

export interface GlyphPoint {
  /** Cell coordinates: 0..cols across, 0..rows down from the top. */
  x: number;
  y: number;
}

export interface RasterizeOptions {
  text?: string;
  /** The widest the text may run, as a fraction of the grid's width. */
  maxWidth?: number;
  /** The tallest, as a fraction of the grid's height. */
  maxHeight?: number;
  /** The typeface. Defaults to whatever the page body is set in. */
  fontFamily?: string;
}

export const GLYPH_TEXT = '404';

// The site's own stack, for when there is no body to read it from.
const FALLBACK_FAMILY =
  "'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Courier New', monospace";

const pageFontFamily = (): string => {
  if (typeof document === 'undefined' || !document.body) return FALLBACK_FAMILY;
  if (typeof getComputedStyle !== 'function') return FALLBACK_FAMILY;
  try {
    return getComputedStyle(document.body).fontFamily || FALLBACK_FAMILY;
  } catch {
    return FALLBACK_FAMILY;
  }
};

/**
 * Distance from every cell to the nearest cell where `inside` is set,
 * measured in cells. Two-pass 3-4 chamfer: forward over the grid then back,
 * each cell taking the cheapest route through an already-visited neighbour.
 */
const chamfer = (
  inside: (i: number) => boolean,
  cols: number,
  rows: number
): Float32Array => {
  const BIG = 1e9;
  const d = new Float32Array(cols * rows);
  for (let i = 0; i < d.length; i++) d[i] = inside(i) ? 0 : BIG;

  // Forward: up-left, up, up-right, left.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let v = d[i];
      if (v === 0) continue;
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - cols] + 3);
        if (x > 0) v = Math.min(v, d[i - cols - 1] + 4);
        if (x + 1 < cols) v = Math.min(v, d[i - cols + 1] + 4);
      }
      d[i] = v;
    }
  }
  // Backward: right, down-left, down, down-right.
  for (let y = rows - 1; y >= 0; y--) {
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      let v = d[i];
      if (v === 0) continue;
      if (x + 1 < cols) v = Math.min(v, d[i + 1] + 3);
      if (y + 1 < rows) {
        v = Math.min(v, d[i + cols] + 3);
        if (x > 0) v = Math.min(v, d[i + cols - 1] + 4);
        if (x + 1 < cols) v = Math.min(v, d[i + cols + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < d.length; i++)
    d[i] = d[i] >= BIG ? cols + rows : d[i] / 3;
  return d;
};

/**
 * Rasterise the number onto a `cols` × `rows` grid.
 *
 * The text is set as large as the grid allows within `maxWidth` and
 * `maxHeight`, centred, in the page's type — so it is the site's "404" and
 * not a generic one. Row 0 is the top. A grid with no drawable canvas (a test
 * environment, say) comes back empty rather than throwing: an empty number is
 * a field with nothing in it, and every consumer copes with that.
 */
export const rasterizeGlyph = (
  cols: number,
  rows: number,
  options: RasterizeOptions = {}
): GlyphField => {
  const text = options.text ?? GLYPH_TEXT;
  const maxWidth = options.maxWidth ?? 0.74;
  const maxHeight = options.maxHeight ?? 0.7;
  const family = options.fontFamily ?? pageFontFamily();

  cols = Math.max(1, Math.floor(cols));
  rows = Math.max(1, Math.floor(rows));
  const mask = new Uint8Array(cols * rows);

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      let size = rows * maxHeight;
      ctx.font = `bold ${size}px ${family}`;
      const measured = ctx.measureText(text).width || cols;
      if (measured > cols * maxWidth) size *= (cols * maxWidth) / measured;
      ctx.font = `bold ${size}px ${family}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Digits sit a touch high of the em box's middle in most faces.
      ctx.fillText(text, cols / 2, rows / 2 + size * 0.04);
      try {
        const data = ctx.getImageData(0, 0, cols, rows).data;
        for (let i = 0; i < cols * rows; i++) {
          if (data[i * 4 + 3] > 96) mask[i] = 1;
        }
      } catch {
        // A canvas that cannot be read back is an empty number.
      }
    }
  }

  return fieldFromMask(cols, rows, mask);
};

/**
 * A field from a mask already drawn: the distances and the index of what is
 * inside. What `rasterizeGlyph` finishes with, and the way to build a field
 * by hand.
 */
export const fieldFromMask = (
  cols: number,
  rows: number,
  mask: Uint8Array
): GlyphField => {
  const inside: number[] = [];
  for (let i = 0; i < cols * rows; i++) if (mask[i]) inside.push(i);

  const dist = new Float32Array(cols * rows);
  if (inside.length > 0 && inside.length < cols * rows) {
    const toInside = chamfer(i => mask[i] === 1, cols, rows);
    const toOutside = chamfer(i => mask[i] === 0, cols, rows);
    // The edge lies between the two cells, half a cell from each.
    for (let i = 0; i < dist.length; i++) {
      dist[i] = mask[i] ? -(toOutside[i] - 0.5) : toInside[i] - 0.5;
    }
  } else {
    const far = inside.length ? -(cols + rows) : cols + rows;
    dist.fill(far);
  }

  return { cols, rows, mask, dist, inside };
};

/**
 * Soft coverage at a cell, 0 → 1 across roughly `softness` cells centred on
 * the edge. What a shader wants instead of the hard mask.
 */
export const glyphCoverage = (
  field: GlyphField,
  i: number,
  softness = 1.5
): number => {
  const v = 0.5 - field.dist[i] / softness;
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * Up to `count` points inside the number, no two closer than `spacing`
 * cells, at random sub-cell positions. Rejection-sampled off a hash of the
 * points already placed, so a dense number fills evenly rather than clumping.
 * Fewer than `count` come back when the number cannot hold that many at that
 * spacing; none when the number is empty.
 */
export const sampleGlyphPoints = (
  field: GlyphField,
  count: number,
  spacing: number,
  random: () => number = Math.random
): GlyphPoint[] => {
  const points: GlyphPoint[] = [];
  const { inside, cols } = field;
  if (!inside.length || count <= 0) return points;

  const cell = Math.max(spacing, 1e-3);
  const buckets = new Map<string, GlyphPoint[]>();
  const key = (x: number, y: number) =>
    `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const crowded = (x: number, y: number) => {
    const bx = Math.floor(x / cell);
    const by = Math.floor(y / cell);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = buckets.get(`${bx + ox},${by + oy}`);
        if (!list) continue;
        for (const p of list) {
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy < spacing * spacing) return true;
        }
      }
    }
    return false;
  };

  const attempts = count * 40;
  for (let a = 0; a < attempts && points.length < count; a++) {
    const idx = inside[Math.floor(random() * inside.length)];
    const x = (idx % cols) + random();
    const y = Math.floor(idx / cols) + random();
    if (crowded(x, y)) continue;
    const p = { x, y };
    points.push(p);
    const k = key(x, y);
    const list = buckets.get(k);
    if (list) list.push(p);
    else buckets.set(k, [p]);
  }
  return points;
};

/**
 * How far apart `count` points would sit if spread evenly over the number,
 * in cells. The spacing to hand `sampleGlyphPoints` for an even fill.
 */
export const glyphSpacingFor = (field: GlyphField, count: number): number =>
  count > 0 ? Math.sqrt(field.inside.length / count) * 0.82 : 1;

/** Distance-field range, in cells, that the texture's blue channel spans. */
export const GLYPH_TEXTURE_RANGE = 32;

/**
 * The field as a texture a fragment shader can sample by uv.
 *
 *   r  the hard mask
 *   g  soft coverage, anti-aliased over about a cell and a half
 *   b  signed distance, 0.5 at the edge, ±GLYPH_TEXTURE_RANGE cells at 0 and 1
 *
 * Rows are packed bottom-up so that uv (0,0) is the bottom-left of the
 * screen, the way three's plane uvs run; the field's own row 0 is the top.
 */
export const glyphTexture = (field: GlyphField): THREE.DataTexture => {
  const { cols, rows, mask, dist } = field;
  const data = new Uint8Array(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    const src = (rows - 1 - y) * cols;
    for (let x = 0; x < cols; x++) {
      const i = src + x;
      const o = (y * cols + x) * 4;
      const d = dist[i];
      const signed = 0.5 + d / (2 * GLYPH_TEXTURE_RANGE);
      data[o] = mask[i] ? 255 : 0;
      data[o + 1] = Math.round(glyphCoverage(field, i) * 255);
      data[o + 2] = Math.round(Math.max(0, Math.min(1, signed)) * 255);
      data[o + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(
    data,
    cols,
    rows,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
};

/**
 * GLSL for reading the texture back: the soft coverage and the signed
 * distance in cells. Pasted into the shaders that take the number.
 */
export const GLYPH_GLSL = `
  uniform sampler2D uGlyph;
  uniform float uNotFound;

  // Soft coverage of the number at a uv, 0 outside → 1 inside.
  float glyphCover(vec2 uv) {
    return texture2D(uGlyph, uv).g;
  }

  // Signed distance to the number's edge at a uv, in grid cells: negative
  // inside, positive outside.
  float glyphDist(vec2 uv) {
    return (texture2D(uGlyph, uv).b - 0.5) * ${(2 * GLYPH_TEXTURE_RANGE).toFixed(1)};
  }
`;
