import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../core/types';
import { makeRuleTables, population, stepLife } from './automaton';
import { CellularAutomatonSettings } from './config';

// Keep the grid bounded regardless of viewport or cell size.
const MAX_CELLS = 40000;

// Generations of unchanged population before the grid is treated as stalled.
const STALL_GENERATIONS = 24;

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
> = ({ className, settings }) => {
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    /** Fills the grid with random soup at the configured density. */
    const seed = () => {
      for (let i = 0; i < current.length; i++) {
        current[i] = Math.random() < initialDensity ? 1 : 0;
        age[i] = current[i];
      }
      previous.set(current);
    };

    /** (Re)builds the grid and its texture for the current viewport. */
    const buildGrid = () => {
      const px = Math.max(4, cellSize);
      let c = Math.max(8, Math.ceil(window.innerWidth / px));
      let r = Math.max(8, Math.ceil(window.innerHeight / px));

      // Preserve aspect while staying under the cell budget.
      if (c * r > MAX_CELLS) {
        const scale = Math.sqrt(MAX_CELLS / (c * r));
        c = Math.max(8, Math.floor(c * scale));
        r = Math.max(8, Math.floor(r * scale));
      }

      cols = c;
      rows = r;
      const size = cols * rows;
      current = new Uint8Array(size);
      next = new Uint8Array(size);
      age = new Uint8Array(size);
      previous = new Uint8Array(size);
      pixels = new Uint8Array(size * 4);
      seed();

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
    let lastPopulation = -1;
    let stalledFor = 0;
    let frameId: number | null = null;

    const animate = (now: number) => {
      const elapsed = now - lastStep;

      if (elapsed >= stepIntervalMs) {
        step();
        uploadState();
        lastStep = now;

        // A grid whose population stops changing has converged on still lifes
        // and short oscillators; reseed rather than sit on a frozen frame.
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
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const rebuilt = buildGrid();
      uploadState();
      material.uniforms.uState.value = rebuilt;
      material.uniforms.uGrid.value.set(cols, rows);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
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
