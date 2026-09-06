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

// The 404 sequence: the number's cells are switched on over this many
// seconds, in a random order, and held — and let go of again, in the same
// order, on the shared release; the fewest columns the number can be read
// across, which a phone at the default cell size falls short of, so the
// grid is refined for it there.
const WRITE_SECONDS = 4;
const MIN_GLYPH_COLS = 48;
// Generations a reduced-motion still is run on past the number being put
// down, so that it shows the number settled rather than the moment of
// writing.
const STILL_GENERATIONS = 60;

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
  // each frame; the effect nudges a frozen loop so it draws the new state
  // once.
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

    // The 404 sequence: the number as fixed cells. A cell in `held` is
    // clamped alive every generation — a boundary condition, the way the
    // PDE's Dirichlet edges are fixed values — and the rule runs honestly
    // around it: the number's edge is a wall of live cells, and Life births
    // and kills against a wall without rest, so the digits boil at their
    // rims and throw off what they throw off. The cells are switched on one
    // by one over a few seconds, in the order `writeOrder` gives, the way a
    // pattern is put down on a grid; let go, the clamp lifts the same way
    // and the rule takes the number apart on its own terms. How far along
    // the writing is comes off the shared sequence clock.
    let mask: Uint8Array = new Uint8Array(0);
    let held: Uint8Array = new Uint8Array(0);
    let writeOrder: Uint32Array = new Uint32Array(0);
    let written = 0;
    const sequence = new NotFoundSequence({ formSeconds: WRITE_SECONDS });

    /** Fills the grid with random soup at the configured density. Held cells stay. */
    const seed = () => {
      for (let i = 0; i < current.length; i++) {
        current[i] = held[i] || Math.random() < initialDensity ? 1 : 0;
        age[i] = current[i];
      }
      previous.set(current);
    };

    /** Rasterises the number onto the grid and shuffles the order it is written in. */
    const buildMask = () => {
      const field = rasterizeGlyph(cols, rows, { maxHeight: 0.72 });
      // The texture's rows run bottom-up; the field's run top-down.
      mask = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) {
        mask.set(
          field.mask.subarray((rows - 1 - y) * cols, (rows - y) * cols),
          y * cols
        );
      }
      const order: number[] = [];
      for (let i = 0; i < mask.length; i++) if (mask[i]) order.push(i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      writeOrder = Uint32Array.from(order);
      held = new Uint8Array(cols * rows);
      // A grid rebuilt mid-sequence keeps as much of the number as was down.
      const keep = Math.min(written, writeOrder.length);
      for (let k = 0; k < keep; k++) held[writeOrder[k]] = 1;
      written = keep;
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
      }

      buildMask();
      if (!prev) seed();

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

      // The fixed cells, applied after the rule like any boundary condition.
      for (let k = 0; k < written; k++) next[writeOrder[k]] = 1;

      previous.set(current);
      for (let i = 0; i < next.length; i++) {
        // Age saturates at 255 so long-lived structures stop shifting color.
        age[i] = next[i] === 1 ? Math.min(255, age[i] + 1) : 0;
        current[i] = next[i];
      }
    };

    /**
     * Advances the writing of the number by `dt` seconds toward the flag:
     * cells go down while it is up and are let go of, last down first,
     * once it drops. What is written is held from the next generation on.
     */
    const writeNumber = (dt: number, on: boolean) => {
      if (frozenRef.current) sequence.settle(on);
      else sequence.advance(dt, on);
      const target = Math.round(sequence.raw * writeOrder.length);
      for (; written < target; written++) {
        const i = writeOrder[written];
        held[i] = 1;
        // Put down now rather than at the next generation, so the number
        // is seen being written rather than appearing a step at a time —
        // and in the generation before as well, since the shader eases each
        // cell in from that one and a still gets no second frame.
        current[i] = 1;
        previous[i] = 1;
      }
      for (; written > target; written--) held[writeOrder[written - 1]] = 0;
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

    const animate = (now: number) => {
      const elapsed = now - lastStep;
      // Clamped so a tab coming back from the background plays one long
      // frame rather than the whole time it was away.
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
      lastFrame = now;

      const wasWriting = written > 0;
      syncGrid();
      writeNumber(dt, notFoundRef.current);
      // A still gets one frame, and the frame the number was put down in is
      // not the one to hold: every cell on the grid is the same age, and the
      // soup still fills the digits' counters. What a still shows is the
      // grid some generations on — the number aged into its own colour, the
      // rule having worked the soup around it. Let go, a still would keep
      // the number's cells for good, so it goes back to fresh soup, which is
      // what a still shows everywhere else.
      if (frozenRef.current && written > 0 !== wasWriting) {
        if (written > 0) {
          for (let i = 0; i < STILL_GENERATIONS; i++) step();
        } else {
          seed();
        }
      }
      // The number arriving, or leaving, is worth a frame of its own.
      if (written > 0 !== wasWriting || written < writeOrder.length) {
        uploadState();
      }

      if (elapsed >= stepIntervalMs) {
        step();
        uploadState();
        lastStep = now;

        // A grid whose population stops changing has converged on still lifes
        // and short oscillators; reseed rather than sit on a frozen frame.
        // Held cells count too, and a held number never stalls: its rim is
        // always being born against.
        const live = population(current);
        stalledFor = live === lastPopulation ? stalledFor + 1 : 0;
        lastPopulation = live;
        if (stalledFor >= STALL_GENERATIONS || live === 0) {
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
