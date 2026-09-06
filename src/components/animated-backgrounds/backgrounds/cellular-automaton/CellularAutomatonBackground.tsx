import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { rasterizeGlyph } from '../../core/glyph';
import { NotFoundSequence } from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { makeRuleTables, population, stepLife } from './automaton';
import { CellularAutomatonSettings } from './config';

// Keep the grid bounded regardless of viewport or cell size.
const MAX_CELLS = 40000;

// Generations of unchanged population before the grid is treated as stalled.
const STALL_GENERATIONS = 24;

// The fewest columns the number can be drawn across and still be read. A
// phone at the default cell size has under twenty, so the 404 sequence
// refines the grid until it has at least this many.
const MIN_GLYPH_COLS = 48;

// Generations the reduced-motion still is run for before it is drawn: enough
// for the soup outside the number to die back and the number to fill.
const SETTLE_GENERATIONS = 30;

/**
 * Renders a Life-like cellular automaton.
 *
 * The simulation is a genuine state buffer: `current` holds this generation,
 * `next` is computed from it by counting each cell's eight neighbors on a
 * wrapping torus and applying the birth/survival rule. The result is uploaded
 * to a DataTexture each generation and the shader only draws it — the shader
 * never invents state.
 *
 * Texture channels per cell: R = alive now, G = alive last generation,
 * B = age (generations survived, saturating), A = unused.
 */
const CellularAutomatonBackground: React.FC<
  AnimatedBackgroundProps<CellularAutomatonSettings>
> = ({ className, settings, frozen, notFound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Cosmetic settings are pushed straight to uniforms so that changing a color
  // does not restart the simulation.
  const { colors, connectionLineWidth, cellScale, activityIntensity, opacity } =
    settings;

  // Structural settings that require rebuilding the grid.
  const { rule, cellSize, generationsPerSecond, initialDensity } = settings;
  const { globalTimeMultiplier } = settings;
  const perturbationRate = settings.perturbationRate;
  const perturbationRef = useRef(perturbationRate);
  perturbationRef.current = perturbationRate;

  // Draw one frame and hold — see AnimatedBackgroundProps.frozen. The loop
  // reads the ref each frame; the effect restarts it when the hold is lifted.
  const frozenRef = useRef(Boolean(frozen));
  frozenRef.current = Boolean(frozen);
  const resumeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!frozen) resumeRef.current?.();
  }, [frozen]);

  // The 404 sequence — see AnimatedBackgroundProps.notFound. Read off a ref
  // each generation; the effect nudges a frozen loop so it draws the new
  // state once.
  const notFoundRef = useRef(Boolean(notFound));
  notFoundRef.current = Boolean(notFound);
  useEffect(() => {
    resumeRef.current?.();
  }, [notFound]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());
    container.appendChild(renderer.domElement);

    const tables = makeRuleTables(rule);

    let cols = 0;
    let rows = 0;
    let current = new Uint8Array(0);
    let next = new Uint8Array(0);
    let age = new Uint8Array(0);
    let previous = new Uint8Array(0);
    let texture: THREE.DataTexture | null = null;
    let pixels = new Uint8Array(0);

    // The 404 sequence: the number as a mask on this grid, and how far along
    // the picture is in coming apart into it. The mask is rasterised with
    // the grid, so it is always the grid's own shape.
    let mask: Uint8Array = new Uint8Array(0);
    const sequence = new NotFoundSequence();
    let progress = 0;

    /** Fills the grid with random soup at the configured density. */
    const seed = () => {
      for (let i = 0; i < current.length; i++) {
        current[i] = Math.random() < initialDensity ? 1 : 0;
        age[i] = current[i];
      }
      previous.set(current);
    };

    /** Grid dimensions the current viewport calls for, within the cell budget. */
    const gridForViewport = () => {
      // While the number is on the grid it needs columns enough to be read.
      const finest = notFoundRef.current
        ? window.innerWidth / MIN_GLYPH_COLS
        : Infinity;
      const px = Math.max(4, Math.min(cellSize, finest));
      let c = Math.max(8, Math.ceil(window.innerWidth / px));
      let r = Math.max(8, Math.ceil(window.innerHeight / px));

      // Preserve aspect while staying under the cell budget.
      if (c * r > MAX_CELLS) {
        const scale = Math.sqrt(MAX_CELLS / (c * r));
        c = Math.max(8, Math.floor(c * scale));
        r = Math.max(8, Math.floor(r * scale));
      }

      return { cols: c, rows: r };
    };

    /**
     * (Re)builds the grid and its texture for the current viewport.
     *
     * `carryOver` keeps the running simulation across a resize: every cell the
     * two grids share keeps its state and age, and only the newly exposed strip
     * is seeded. Mobile browsers fire a resize each time the URL bar collapses
     * or expands — which is to say on nearly every scroll, and reliably on the
     * scroll back to the top of the page — so rebuilding from fresh soup there
     * wipes the automaton out from under the reader.
     */
    const buildGrid = (carryOver = false) => {
      const prev =
        carryOver && current.length > 0 ? { cols, rows, current, age } : null;

      const { cols: c, rows: r } = gridForViewport();
      cols = c;
      rows = r;
      const size = cols * rows;
      current = new Uint8Array(size);
      next = new Uint8Array(size);
      age = new Uint8Array(size);
      previous = new Uint8Array(size);
      pixels = new Uint8Array(size * 4);

      if (prev) {
        const sharedCols = Math.min(prev.cols, cols);
        const sharedRows = Math.min(prev.rows, rows);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const to = y * cols + x;
            if (y < sharedRows && x < sharedCols) {
              const from = y * prev.cols + x;
              current[to] = prev.current[from];
              age[to] = prev.age[from];
            } else {
              current[to] = Math.random() < initialDensity ? 1 : 0;
              age[to] = current[to];
            }
          }
        }
        previous.set(current);
      } else {
        seed();
      }

      // The state texture's first row is drawn at the bottom of the screen,
      // and the glyph's first row is its top.
      const glyph = rasterizeGlyph(cols, rows, { maxHeight: 0.72 }).mask;
      mask = new Uint8Array(size);
      for (let y = 0; y < rows; y++) {
        mask.set(
          glyph.subarray((rows - 1 - y) * cols, (rows - y) * cols),
          y * cols
        );
      }

      texture?.dispose();
      texture = new THREE.DataTexture(
        pixels,
        cols,
        rows,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
      );
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    };

    /** Advances the automaton exactly one generation. */
    const step = () => {
      stepLife(current, next, cols, rows, tables);

      // Random soup under most rules settles into still lifes and oscillators.
      // A small perturbation keeps the background moving; set the rate to zero
      // to let it stall honestly.
      const rate = perturbationRef.current;
      if (rate > 0) {
        // Round stochastically rather than down. A typical grid is a few
        // thousand cells and the slider steps in 0.0002, so flooring made the
        // first couple of steps above zero flip nothing at all — a dead zone
        // at the bottom of the control. Carrying the fractional part as a
        // probability gives the right rate on average at any grid size.
        const exact = next.length * rate;
        let flips = Math.floor(exact);
        if (Math.random() < exact - flips) flips += 1;
        for (let i = 0; i < flips; i++) {
          next[Math.floor(Math.random() * next.length)] = 1;
        }
      }

      // The 404 sequence, as a bias on the rule. Outside the number life
      // fails, more surely the further along the sequence is; inside it,
      // deaths are suppressed and births encouraged, until at the end the
      // number stands solid — a block Conway's count would otherwise churn.
      // What keeps it alive at rest: a flicker inside, sparks outside, and
      // the rule itself still working the edge.
      const p = progress;
      if (p > 0) {
        const birth = 0.04 + 0.42 * p;
        const die = 0.05 + 0.5 * p;
        const spark = 0.0012 * (1 - p) + 0.0002;
        for (let i = 0; i < next.length; i++) {
          if (mask[i]) {
            if (next[i]) {
              if (p >= 1 && Math.random() < 0.012) next[i] = 0;
            } else if (current[i] && Math.random() < p) {
              next[i] = 1;
            } else if (Math.random() < birth) {
              next[i] = 1;
            }
          } else if (next[i]) {
            // A birth outside the number is the rule working its edge and
            // filling its counters; those are refused outright by the end,
            // or the digits blur into a block.
            const born = !current[i];
            if (Math.random() < (born ? Math.max(die, p) : die)) next[i] = 0;
          } else if (Math.random() < spark) {
            next[i] = 1;
          }
        }
      }

      previous.set(current);
      for (let i = 0; i < next.length; i++) {
        // Age saturates at 255 so long-lived structures stop shifting color.
        age[i] = next[i] === 1 ? Math.min(255, age[i] + 1) : 0;
        current[i] = next[i];
      }
    };

    /** Copies simulation state into the texture the shader samples. */
    const uploadState = () => {
      for (let i = 0; i < current.length; i++) {
        const o = i * 4;
        pixels[o] = current[i] * 255;
        pixels[o + 1] = previous[i] * 255;
        pixels[o + 2] = Math.min(255, age[i] * 12);
        pixels[o + 3] = 255;
      }
      if (texture) texture.needsUpdate = true;
    };

    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // The shader is a pure renderer: it samples cell state and draws it. All
    // evolution happens on the CPU in step().
    const fragmentShader = `
      uniform sampler2D uState;
      uniform vec2 uGrid;
      uniform float uStepProgress;
      uniform float uCellScale;
      uniform float uLinkWidth;
      uniform float uActivityIntensity;
      uniform vec3 uColorPrimary;
      uniform vec3 uColorSecondary;
      uniform vec3 uColorAccent;
      uniform vec3 uColorBackground;
      uniform vec3 uColorGrid;

      varying vec2 vUv;

      // Alive-ness of a cell, eased between the previous and current
      // generation so births fade in and deaths fade out.
      float cellAlpha(vec2 cell) {
        vec2 uv = (cell + 0.5) / uGrid;
        vec4 s = texture2D(uState, uv);
        return mix(s.g, s.r, uStepProgress);
      }

      float cellAge(vec2 cell) {
        vec2 uv = (cell + 0.5) / uGrid;
        return texture2D(uState, uv).b;
      }

      // Distance from p to the segment ab, used to draw neighbor links.
      float segmentDist(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      void main() {
        vec2 gridPos = vUv * uGrid;
        vec2 cell = floor(gridPos);
        vec2 local = fract(gridPos) - 0.5;

        float alpha = cellAlpha(cell);
        float age = cellAge(cell);

        // Young cells read as the newborn color and mature toward primary,
        // with the longest-lived structures tinted by the accent color.
        vec3 cellColor = mix(uColorSecondary, uColorPrimary, smoothstep(0.0, 0.25, age));
        cellColor = mix(cellColor, uColorAccent, smoothstep(0.5, 1.0, age));

        // Soft square for the cell body. ('half' is reserved in GLSL.)
        float halfSize = max(0.05, uCellScale * 0.5);
        vec2 d = abs(local) - vec2(halfSize);
        float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        float body = 1.0 - smoothstep(0.0, 0.08, sdf);

        vec3 color = uColorBackground;
        float intensity = body * alpha;

        // Links between live neighbors. These reflect the same eight-cell
        // neighborhood the rule is evaluated over.
        if (uLinkWidth > 0.0) {
          float links = 0.0;
          for (int i = 0; i < 8; i++) {
            vec2 off = vec2(0.0);
            if (i == 0) off = vec2( 1.0,  0.0);
            if (i == 1) off = vec2(-1.0,  0.0);
            if (i == 2) off = vec2( 0.0,  1.0);
            if (i == 3) off = vec2( 0.0, -1.0);
            if (i == 4) off = vec2( 1.0,  1.0);
            if (i == 5) off = vec2(-1.0,  1.0);
            if (i == 6) off = vec2( 1.0, -1.0);
            if (i == 7) off = vec2(-1.0, -1.0);

            float na = cellAlpha(cell + off);
            float dist = segmentDist(local, vec2(0.0), off * 0.5);
            float line = 1.0 - smoothstep(0.0, uLinkWidth, dist);
            links = max(links, line * na * alpha);
          }
          color = mix(color, uColorGrid, links);
          intensity = max(intensity, links * 0.55);
        }

        color = mix(color, cellColor, body * alpha);
        gl_FragColor = vec4(color * uActivityIntensity, intensity);
      }
    `;

    const stateTexture = buildGrid();
    uploadState();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: stateTexture },
        uGrid: { value: new THREE.Vector2(cols, rows) },
        uStepProgress: { value: 1 },
        uCellScale: { value: cellScale },
        uLinkWidth: { value: connectionLineWidth },
        uActivityIntensity: { value: activityIntensity },
        uColorPrimary: { value: new THREE.Vector3(...colors.primary) },
        uColorSecondary: { value: new THREE.Vector3(...colors.secondary) },
        uColorAccent: { value: new THREE.Vector3(...colors.accent) },
        uColorBackground: { value: new THREE.Vector3(...colors.background) },
        uColorGrid: { value: new THREE.Vector3(...colors.grid) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    // Animation Speed is a master multiplier over this background's own rate,
    // so it means the same thing here as it does everywhere else.
    const stepIntervalMs =
      1000 / Math.max(0.1, generationsPerSecond * globalTimeMultiplier);
    let lastStep = performance.now();
    let lastFrame = 0;
    let lastPopulation = -1;
    let stalledFor = 0;
    let frameId: number | null = null;

    /**
     * Rebuilds the grid when the viewport — or the 404 sequence, which asks
     * for a finer grid on a narrow screen — calls for a different shape.
     * Everything the two grids share carries over.
     */
    const syncGrid = () => {
      const target = gridForViewport();
      if (target.cols === cols && target.rows === rows) return;
      const rebuilt = buildGrid(true);
      uploadState();
      material.uniforms.uState.value = rebuilt;
      material.uniforms.uGrid.value.set(cols, rows);
    };

    // The reduced-motion still: the end of the sequence, reached at once.
    const settle = () => {
      progress = sequence.settle(true);
      for (let i = 0; i < SETTLE_GENERATIONS; i++) step();
      uploadState();
    };

    const animate = (now: number) => {
      const elapsed = now - lastStep;
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;

      const on = notFoundRef.current;
      if (frozenRef.current) {
        if (on && sequence.raw < 1) {
          syncGrid();
          settle();
        } else if (!on) {
          progress = sequence.settle(false);
        }
      } else {
        progress = sequence.advance(dt, on);
        syncGrid();
      }

      if (elapsed >= stepIntervalMs) {
        step();
        uploadState();
        lastStep = now;

        // A grid whose population stops changing has converged on still lifes
        // and short oscillators; reseed rather than sit on a frozen frame.
        // Not while the number is on it — standing still is the point then.
        const live = population(current);
        stalledFor = live === lastPopulation ? stalledFor + 1 : 0;
        lastPopulation = live;
        if (
          !sequence.active &&
          (stalledFor >= STALL_GENERATIONS || live === 0)
        ) {
          seed();
          uploadState();
          stalledFor = 0;
          lastPopulation = -1;
        }
      }

      material.uniforms.uStepProgress.value = Math.min(
        1,
        (now - lastStep) / stepIntervalMs
      );
      renderer.render(scene, camera);
      if (frozenRef.current) {
        frameId = null;
        return;
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    resumeRef.current = () => {
      if (frameId === null) frameId = requestAnimationFrame(animate);
    };

    // A URL bar sliding in and out can fire resize many times over a single
    // flick, so collapse the burst into one rebuild per frame.
    let resizeFrame: number | null = null;

    const applyResize = () => {
      resizeFrame = null;
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(getRenderPixelRatio());

      // Most of those resizes are a few pixels of browser chrome and leave the
      // grid the same shape, in which case there is nothing to rebuild at all.
      syncGrid();
    };

    const handleResize = () => {
      if (resizeFrame === null)
        resizeFrame = requestAnimationFrame(applyResize);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resumeRef.current = null;
      if (frameId !== null) cancelAnimationFrame(frameId);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      texture?.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      materialRef.current = null;
    };
    // Cosmetic settings seed the uniforms here but are deliberately excluded
    // from the dependency list — the effect below updates them in place so that
    // nudging a color slider does not restart the simulation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rule,
    cellSize,
    generationsPerSecond,
    initialDensity,
    globalTimeMultiplier,
  ]);

  // Cosmetic updates go straight to uniforms, leaving the simulation running.
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uCellScale.value = cellScale;
    material.uniforms.uLinkWidth.value = connectionLineWidth;
    material.uniforms.uActivityIntensity.value = activityIntensity;
    material.uniforms.uColorPrimary.value.set(...colors.primary);
    material.uniforms.uColorSecondary.value.set(...colors.secondary);
    material.uniforms.uColorAccent.value.set(...colors.accent);
    material.uniforms.uColorBackground.value.set(...colors.background);
    material.uniforms.uColorGrid.value.set(...colors.grid);
  }, [cellScale, connectionLineWidth, activityIntensity, colors]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity,
      }}
    />
  );
};

export default CellularAutomatonBackground;
