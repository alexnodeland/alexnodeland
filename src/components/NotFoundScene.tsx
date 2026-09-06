import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * The field behind the 404.
 *
 * Four scenes, each a small cousin of one of the site's backgrounds, and each
 * driven toward the same end: a "404" rasterised into a coarse grid, which
 * the scene reaches over about seven seconds and then holds, alive at the
 * edges. Nothing here is three.js — a 2D canvas at a cell size the eye can
 * read is the point, since what is drawn is a picture coming apart, not a
 * simulation to tune.
 *
 * `decay`        a Life-like automaton whose soup dies away everywhere except
 *                where the number is, and keeps being born there.
 * `interference` three summed sine waves whose amplitude is pulled toward the
 *                number until the field outside it goes dark.
 * `scatter`      a random graph whose nodes are drawn to positions sampled
 *                from the number; every edge stretched past its length
 *                breaks, and the graph is the number by the end.
 * `frontier`     a breadth-first search flooding out from random cells; what
 *                it explores fades again everywhere except inside the number,
 *                which stays lit.
 *
 * Reduced motion gets the end state, drawn once.
 */
export type NotFoundVariant = 'decay' | 'interference' | 'scatter' | 'frontier';

const VARIANTS: NotFoundVariant[] = [
  'decay',
  'interference',
  'scatter',
  'frontier',
];

export const pickNotFoundVariant = (): NotFoundVariant =>
  VARIANTS[Math.floor(Math.random() * VARIANTS.length)];

// How long the picture takes to come apart, in seconds.
const BREAKDOWN_S = 7;

// Palette — the same inks the backgrounds use.
const GREEN = [80, 220, 120] as const;
const AMBER = [200, 150, 60] as const;
const CYAN = [0, 212, 255] as const;
const MAGENTA = [255, 0, 128] as const;
const GOLD = [255, 210, 63] as const;

type RGB = readonly [number, number, number];
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

interface Grid {
  cols: number;
  rows: number;
  cell: number;
  /** 1 where the number is. */
  mask: Uint8Array;
  /** Indices of every cell in the number, for sampling. */
  inside: number[];
}

// The number, rasterised onto the cell grid. Drawn with the page's own type
// so it is the site's "404" and not a generic one.
const buildGrid = (width: number, height: number): Grid => {
  const cell = Math.max(7, Math.round(Math.min(width, height) / 64));
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const mask = new Uint8Array(cols * rows);
  const inside: number[] = [];
  const off = document.createElement('canvas');
  off.width = cols;
  off.height = rows;
  const ctx = off.getContext('2d');
  if (ctx) {
    const family =
      (typeof getComputedStyle === 'function' &&
        getComputedStyle(document.body).fontFamily) ||
      'monospace';
    let size = rows * 0.72;
    ctx.font = `bold ${size}px ${family}`;
    const measured = ctx.measureText('404').width || cols;
    if (measured > cols * 0.74) size *= (cols * 0.74) / measured;
    ctx.font = `bold ${size}px ${family}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('404', cols / 2, rows / 2 + size * 0.05);
    const data = ctx.getImageData(0, 0, cols, rows).data;
    for (let i = 0; i < cols * rows; i++) {
      if (data[i * 4 + 3] > 96) {
        mask[i] = 1;
        inside.push(i);
      }
    }
  }
  return { cols, rows, cell, mask, inside };
};

interface Scene {
  /** Advance by `dt` seconds; `p` is breakdown progress, 0 → 1. */
  step(dt: number, p: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

// ── decay ────────────────────────────────────────────────────────────────────
const makeDecay = (g: Grid): Scene => {
  const n = g.cols * g.rows;
  let alive = new Uint8Array(n);
  let next = new Uint8Array(n);
  const age = new Uint16Array(n);
  for (let i = 0; i < n; i++) alive[i] = Math.random() < 0.32 ? 1 : 0;
  let acc = 0;
  const STEP = 0.09;
  const at = (x: number, y: number) =>
    alive[((y + g.rows) % g.rows) * g.cols + ((x + g.cols) % g.cols)];
  const tick = (p: number) => {
    for (let y = 0; y < g.rows; y++) {
      for (let x = 0; x < g.cols; x++) {
        const i = y * g.cols + x;
        const nb =
          at(x - 1, y - 1) +
          at(x, y - 1) +
          at(x + 1, y - 1) +
          at(x - 1, y) +
          at(x + 1, y) +
          at(x - 1, y + 1) +
          at(x, y + 1) +
          at(x + 1, y + 1);
        // Conway, then the bias: outside the number life fails; inside it
        // life is born, and the rule itself gives way as the breakdown
        // completes — a solid block is overcrowded by Conway's count, so
        // left to the rule the number would churn rather than stand.
        let v = alive[i] ? (nb === 2 || nb === 3 ? 1 : 0) : nb === 3 ? 1 : 0;
        if (g.mask[i]) {
          if (Math.random() < p) v = alive[i];
          if (!v && Math.random() < 0.06 + 0.45 * p) v = 1;
          if (v && p >= 1 && Math.random() < 0.015) v = 0; // a flicker at rest
        } else {
          if (v && Math.random() < 0.04 + 0.4 * p) v = 0;
          if (!v && Math.random() < 0.002 * (1 - p) + 0.0004) v = 1; // sparks
        }
        next[i] = v;
        age[i] = v ? (alive[i] ? Math.min(age[i] + 1, 400) : 0) : 0;
      }
    }
    const t = alive;
    alive = next;
    next = t;
  };
  return {
    step(dt, p) {
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        tick(p);
      }
    },
    draw(ctx) {
      const c = g.cell;
      const gap = Math.max(1, Math.round(c * 0.18));
      ctx.lineWidth = 1;
      for (let y = 0; y < g.rows; y++) {
        for (let x = 0; x < g.cols; x++) {
          const i = y * g.cols + x;
          if (!alive[i]) continue;
          const a = Math.min(age[i], 60) / 60;
          const col = mix(GREEN, AMBER, a);
          // The links the automaton draws between live neighbours.
          ctx.strokeStyle = rgba(col, 0.25);
          if (x + 1 < g.cols && alive[i + 1]) {
            ctx.beginPath();
            ctx.moveTo(x * c + c / 2, y * c + c / 2);
            ctx.lineTo((x + 1) * c + c / 2, y * c + c / 2);
            ctx.stroke();
          }
          if (y + 1 < g.rows && alive[i + g.cols]) {
            ctx.beginPath();
            ctx.moveTo(x * c + c / 2, y * c + c / 2);
            ctx.lineTo(x * c + c / 2, (y + 1) * c + c / 2);
            ctx.stroke();
          }
          ctx.fillStyle = rgba(col, g.mask[i] ? 0.95 : 0.75);
          ctx.fillRect(x * c + gap / 2, y * c + gap / 2, c - gap, c - gap);
        }
      }
    },
  };
};

// ── interference ─────────────────────────────────────────────────────────────
const makeInterference = (g: Grid): Scene => {
  const off = document.createElement('canvas');
  off.width = g.cols;
  off.height = g.rows;
  const octx = off.getContext('2d');
  const image = octx ? octx.createImageData(g.cols, g.rows) : null;
  const DARK: RGB = [6, 9, 14];
  const MID: RGB = [0, 90, 115];
  const BRIGHT: RGB = [0, 230, 140];
  let t = 0;
  const f = 0.45;
  return {
    step(dt) {
      t += dt;
    },
    draw(ctx) {
      if (!octx || !image) return;
      const d = image.data;
      const p = clamp01(t / BREAKDOWN_S);
      for (let y = 0; y < g.rows; y++) {
        for (let x = 0; x < g.cols; x++) {
          const i = y * g.cols + x;
          const v =
            (Math.sin(x * f + t * 0.9) +
              Math.sin(y * f * 0.8 - t * 0.7) +
              Math.sin((x + y) * f * 0.6 + t * 0.5) +
              3) /
            6;
          // The number pulls the field: inside it toward full amplitude,
          // outside it toward a faint residue of the wave.
          const target = g.mask[i] ? 0.82 + 0.18 * v : v * 0.22;
          const value = v + (target - v) * p;
          const col =
            value < 0.5
              ? mix(DARK, MID, value * 2)
              : mix(MID, BRIGHT, (value - 0.5) * 2);
          d[i * 4] = col[0];
          d[i * 4 + 1] = col[1];
          d[i * 4 + 2] = col[2];
          d[i * 4 + 3] = 255;
        }
      }
      octx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, 0, 0, g.cols * g.cell, g.rows * g.cell);
    },
  };
};

// ── scatter ──────────────────────────────────────────────────────────────────
interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  hue: RGB;
}
interface Edge {
  a: number;
  b: number;
  rest: number;
  /** 1 intact; falls to 0 once broken. */
  life: number;
}
const makeScatter = (g: Grid): Scene => {
  const W = g.cols * g.cell;
  const H = g.rows * g.cell;
  const count = Math.min(420, Math.max(120, Math.floor(g.inside.length / 3)));
  const nodes: Node[] = [];
  const hues: RGB[] = [CYAN, MAGENTA, GOLD];
  for (let i = 0; i < count; i++) {
    const cellIndex = g.inside.length
      ? g.inside[Math.floor(Math.random() * g.inside.length)]
      : 0;
    const cx = (cellIndex % g.cols) * g.cell;
    const cy = Math.floor(cellIndex / g.cols) * g.cell;
    // Three clusters, one per glyph — coloured by which third of the number
    // the target falls in.
    const hue = hues[Math.min(2, Math.floor((cx / W - 0.13) / 0.25))] ?? CYAN;
    nodes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0,
      vy: 0,
      tx: cx + Math.random() * g.cell,
      ty: cy + Math.random() * g.cell,
      hue,
    });
  }
  // Each node to its two nearest neighbours at rest — a sparse web, like the
  // scheduling graph's inter-cluster links.
  const edges: Edge[] = [];
  const seen = new Set<string>();
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: (m.x - n.x) ** 2 + (m.y - n.y) ** 2 }))
      .filter(e => e.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    near.forEach(({ j, d }) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ a: i, b: j, rest: Math.sqrt(d), life: 1 });
    });
  });
  let t = 0;
  return {
    step(dt, p) {
      t += dt;
      const pull = 0.4 + 5 * p * p;
      const noise = 60 * (1 - p) + 6;
      nodes.forEach(n => {
        n.vx += (n.tx - n.x) * pull * dt + (Math.random() - 0.5) * noise * dt;
        n.vy += (n.ty - n.y) * pull * dt + (Math.random() - 0.5) * noise * dt;
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx * dt * 8;
        n.y += n.vy * dt * 8;
      });
      edges.forEach(e => {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const len = Math.hypot(a.x - b.x, a.y - b.y);
        if (e.life >= 1 && len > e.rest * 1.6 + 12) e.life = 0.999;
        if (e.life < 1) e.life = Math.max(0, e.life - dt * 0.8);
      });
    },
    draw(ctx) {
      ctx.lineWidth = 1;
      edges.forEach(e => {
        if (e.life <= 0) return;
        const a = nodes[e.a];
        const b = nodes[e.b];
        // An intact link is quiet cyan; a breaking one flares magenta as it goes.
        const col = e.life >= 1 ? CYAN : MAGENTA;
        ctx.strokeStyle = rgba(col, (e.life >= 1 ? 0.3 : 0.8) * e.life);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      const s = Math.max(3, g.cell * 0.45);
      nodes.forEach((n, i) => {
        const pulse = 0.75 + 0.25 * Math.sin(t * 2 + i);
        ctx.fillStyle = rgba(n.hue, pulse);
        ctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      });
    },
  };
};

// ── frontier ─────────────────────────────────────────────────────────────────
const makeFrontier = (g: Grid): Scene => {
  const n = g.cols * g.rows;
  const explored = new Float32Array(n).fill(-1); // time explored, or -1
  let lit = new Float32Array(n); // how lit a number cell is, 0..1
  let frontier: number[] = [];
  let acc = 0;
  let t = 0;
  const STEP = 0.045;
  const seed = () => {
    explored.fill(-1);
    frontier = [];
    for (let k = 0; k < 3; k++) {
      const i = Math.floor(Math.random() * n);
      explored[i] = t;
      frontier.push(i);
    }
  };
  seed();
  const expand = () => {
    const next: number[] = [];
    frontier.forEach(i => {
      const x = i % g.cols;
      const y = (i - x) / g.cols;
      const around = [
        x > 0 ? i - 1 : -1,
        x + 1 < g.cols ? i + 1 : -1,
        y > 0 ? i - g.cols : -1,
        y + 1 < g.rows ? i + g.cols : -1,
      ];
      around.forEach(j => {
        if (j < 0 || explored[j] >= 0) return;
        explored[j] = t;
        next.push(j);
      });
    });
    frontier = next;
    if (!frontier.length) seed();
  };
  return {
    step(dt, p) {
      t += dt;
      acc += dt;
      while (acc >= STEP) {
        acc -= STEP;
        expand();
      }
      // The search lights what it passes through; inside the number that
      // light stays, and stays a little brighter the further along we are.
      for (let i = 0; i < n; i++) {
        if (!g.mask[i]) continue;
        const since = explored[i] >= 0 ? t - explored[i] : Infinity;
        if (since < 0.3) lit[i] = Math.min(1, lit[i] + 0.35 + 0.65 * p);
        lit[i] = Math.max(lit[i] * (1 - dt * 0.05 * (1 - p)), 0);
      }
    },
    draw(ctx) {
      const c = g.cell;
      const gap = Math.max(1, Math.round(c * 0.2));
      for (let i = 0; i < n; i++) {
        const x = i % g.cols;
        const y = (i - x) / g.cols;
        let a = 0;
        let col: RGB = GOLD;
        if (g.mask[i] && lit[i] > 0.02) {
          a = 0.35 + 0.6 * lit[i];
          col = mix(CYAN, [120, 240, 255], lit[i]);
        }
        if (explored[i] >= 0) {
          const since = t - explored[i];
          if (since < 1.6) {
            const f = 1 - since / 1.6;
            const fa = (since < 0.12 ? 1 : 0.55) * f * f;
            if (fa > a) {
              a = fa;
              col = since < 0.12 ? [255, 240, 150] : GOLD;
            }
          }
        }
        if (a <= 0.02) continue;
        ctx.fillStyle = rgba(col, a);
        ctx.fillRect(x * c + gap / 2, y * c + gap / 2, c - gap, c - gap);
      }
      void lit;
    },
  };
};

const SCENES: Record<NotFoundVariant, (g: Grid) => Scene> = {
  decay: makeDecay,
  interference: makeInterference,
  scatter: makeScatter,
  frontier: makeFrontier,
};

interface NotFoundSceneProps {
  variant: NotFoundVariant;
}

const NotFoundScene: React.FC<NotFoundSceneProps> = ({ variant }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let scene: Scene | null = null;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let elapsed = 0;

    const build = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = SCENES[variant](buildGrid(width, height));
      elapsed = 0;
      last = 0;
    };

    const paint = () => {
      if (!scene) return;
      ctx.clearRect(0, 0, width, height);
      scene.draw(ctx);
    };

    const tick = (now: number) => {
      frame = 0;
      if (!scene) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      elapsed += dt;
      scene.step(dt, clamp01(elapsed / BREAKDOWN_S));
      paint();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    // The end of the story, told at once: run the breakdown to completion
    // off-screen and draw that single frame.
    const settle = () => {
      const s = scene;
      if (!s) return;
      for (let i = 0; i < 160; i++)
        s.step(0.05, clamp01((i * 0.05) / BREAKDOWN_S));
      paint();
    };

    build();
    if (reduce) settle();
    else start();

    // The same courtesies the backgrounds extend: stop when the tab is
    // hidden, rebuild once per frame at most on resize.
    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) stop();
      else start();
    };
    let resizeFrame = 0;
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        const keep = elapsed;
        build();
        elapsed = keep;
        if (reduce) settle();
      });
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
    return () => {
      stop();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
    };
  }, [variant]);

  // Portalled to the body: the page sits inside the window, and the window's
  // backdrop blur would make a fixed canvas here its own — this has to sit on
  // the field, under the stage and over the background.
  return createPortal(
    <canvas
      ref={canvasRef}
      className="not-found-scene"
      data-variant={variant}
      aria-hidden="true"
    />,
    document.body
  );
};

export default NotFoundScene;
