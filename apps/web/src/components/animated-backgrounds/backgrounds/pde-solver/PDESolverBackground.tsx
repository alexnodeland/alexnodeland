/**
 * PDE Solver Background Component
 *
 * Real-time visualization of Heat and Wave equations using Three.js
 * Displays the solution as a 3D height field with color mapping
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { glyphCoverage, rasterizeGlyph } from '../../core/glyph';
import {
  RESHAPE_SETTLE_MS,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { PDESolverSettings } from './config';
import {
  applyBoundaryConditions,
  createInitialState,
  advancePDESolver,
} from './pde-solver';
import { PDEState, PDESolverConfig } from './types';

// Framing constants. The height field is a PLANE_SIZE-square plate held very
// nearly face-on to the camera (its -30° tilt about x almost exactly matches
// the camera's elevation), and it spins in its own plane.
export const PLANE_SIZE = 2;
const CAMERA_POSITION: [number, number, number] = [0, 1.5, 2.5];
export const CAMERA_DISTANCE = Math.hypot(...CAMERA_POSITION);
export const BASE_FOV_DEGREES = 50;

// Solver steps per second at an animation speed of 1 (five per frame at 60fps,
// which is the rate this was tuned at), and a ceiling so a long frame or a
// backgrounded tab cannot come back and run thousands of steps at once.
const BASE_STEPS_PER_SECOND = 300;
const MAX_STEPS_PER_FRAME = 40;

// The 404 sequence: the number is the initial condition. It is applied again
// once the solution has stopped resembling it — its relief spread to this
// fraction of the number's, which the heat equation does to everything, or
// dispersed until its correlation with the number falls below this, which is
// what the wave equation does to it — and never within this many seconds of
// the last time. Both are judged about the field's mean: under Neumann or
// periodic boundaries heat conserves the mean, so a flat plate at the
// number's average height is the flat it goes to. And how quickly the plate
// comes back upright to show it.
const REAPPLY_BELOW = 0.2;
const REAPPLY_CORRELATION = 0.3;
const REAPPLY_INTERVAL_SECONDS = 4;
const RIGHTING_PER_SECOND = 1.5;

/**
 * Vertical FOV for a given viewport.
 *
 * Landscape keeps the designed framing: a plate floating against the page,
 * smaller than the window. Portrait cannot have that and be full-bleed, and
 * full-bleed is what a phone wants — the alternative is the plate's spinning
 * corners sweeping wedges of empty page across the screen.
 *
 * The plate covers a rotating square, so the guaranteed-covered region is its
 * inscribed circle, of world radius PLANE_SIZE / 2. Solve for the FOV that
 * projects that circle out to the screen's corners and the plate covers at
 * every angle of its spin. Never widens past the base FOV, so this only ever
 * zooms in.
 */
export const fovForViewport = (width: number, height: number): number => {
  if (width >= height) return BASE_FOV_DEGREES;

  // Half-height of the frustum at the plate, as a fraction of the world radius
  // we have to fill: screen half-diagonal over screen half-height.
  const cornerReach = Math.hypot(width, height) / height;
  const covering =
    2 *
    Math.atan(PLANE_SIZE / 2 / (CAMERA_DISTANCE * cornerReach)) *
    (180 / Math.PI);

  return Math.min(BASE_FOV_DEGREES, covering);
};

const PDESolverBackground: React.FC<
  AnimatedBackgroundProps<PDESolverSettings>
> = ({ className, settings, frozen, notFound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<PDEState | null>(null);
  const configRef = useRef<PDESolverConfig | null>(null);
  const timeAccumulatorRef = useRef<number>(0);

  // Live view of the settings for the animation loop, which outlives the
  // render that created it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Draw one frame and hold — see AnimatedBackgroundProps.frozen. The loop
  // reads the ref each frame; the effect restarts it when the hold is lifted.
  const frozenRef = useRef(Boolean(frozen));
  frozenRef.current = Boolean(frozen);
  const resumeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!frozen) resumeRef.current?.();
  }, [frozen]);

  // The 404 sequence — see AnimatedBackgroundProps.notFound. Read off a ref
  // each frame like the settings; the effect nudges a frozen loop so it draws
  // the new state once.
  const notFoundRef = useRef(Boolean(notFound));
  notFoundRef.current = Boolean(notFound);
  useEffect(() => {
    resumeRef.current?.();
  }, [notFound]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      fovForViewport(window.innerWidth, window.innerHeight),
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create PDE solver configuration
    const config = createPDEConfig(settings);
    configRef.current = config;

    // Initialize PDE state
    const state = createInitialState(config, settings.equationType);
    stateRef.current = state;

    // The 404 sequence: the number as an initial condition, at the height the
    // configured one has, its edge softened over a cell or so — a step edge
    // is a stair in the lighting and a shock to the wave equation. The plate
    // is square and its rows run top to bottom the way the glyph's do. In
    // portrait the plate is zoomed until its inscribed circle reaches the
    // screen's corners (see fovForViewport), so only the middle of it is on
    // screen and the number is set to that width; it is set again when the
    // viewport changes shape.
    const numberField = new Float32Array(config.gridSizeX * config.gridSizeY);
    let glyphSize = { width: window.innerWidth, height: window.innerHeight };
    const buildNumber = () => {
      const { width, height } = glyphSize;
      const visible = width >= height ? 1 : width / Math.hypot(width, height);
      const glyph = rasterizeGlyph(config.gridSizeX, config.gridSizeY, {
        maxWidth: 0.8 * visible,
        maxHeight: 0.62,
      });
      for (let i = 0; i < numberField.length; i++) {
        numberField[i] = settings.initialAmplitude * glyphCoverage(glyph, i, 2);
      }
    };
    buildNumber();

    // Whether the state on the plate was last set from the number, its
    // height then, and how long ago — what the re-application is judged
    // against.
    let numberApplied = false;
    let appliedHeight = 0;
    let sinceApplied = 0;
    let numberMean = 0;
    let numberNorm = 0;

    /**
     * How the solution stands against the number, both taken about their
     * means: the tallest relief left, and the correlation, −1 → 1.
     */
    const measure = (u: Float32Array) => {
      let mean = 0;
      for (let i = 0; i < u.length; i++) mean += u[i];
      mean /= u.length;
      let dot = 0;
      let norm = 0;
      let peak = 0;
      for (let i = 0; i < u.length; i++) {
        const v = u[i] - mean;
        dot += v * (numberField[i] - numberMean);
        norm += v * v;
        const a = v < 0 ? -v : v;
        if (a > peak) peak = a;
      }
      const correlation = dot / Math.max(1e-9, Math.sqrt(norm) * numberNorm);
      return { peak, correlation };
    };

    /** Sets the number as the initial condition and restarts the clock. */
    const applyNumber = () => {
      const s = stateRef.current;
      if (!s) return;
      s.u = new Float32Array(numberField);
      applyBoundaryConditions(s.u, configRef.current ?? config);
      // At rest: the wave equation reads its initial velocity off uPrev.
      if (s.uPrev) s.uPrev = new Float32Array(s.u);
      s.time = 0;
      s.step = 0;
      numberApplied = true;
      sinceApplied = 0;
      let mean = 0;
      for (let i = 0; i < numberField.length; i++) mean += numberField[i];
      numberMean = mean / numberField.length;
      let norm = 0;
      let peak = 0;
      for (let i = 0; i < numberField.length; i++) {
        const v = numberField[i] - numberMean;
        norm += v * v;
        if (Math.abs(v) > peak) peak = Math.abs(v);
      }
      numberNorm = Math.max(1e-9, Math.sqrt(norm));
      appliedHeight = Math.max(1e-6, peak);
    };

    // Create geometry and mesh
    const { geometry, material } = createVisualizationMesh(state, settings);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 6;
    scene.add(mesh);
    meshRef.current = mesh;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Animation loop. Everything the loop reads per frame comes off
    // settingsRef, not the captured `settings`: this effect only re-runs for
    // the structural settings in its dep array, so a captured value would
    // leave height scale, colours, rotation and speed frozen at whatever they
    // were when the simulation was last rebuilt.
    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      const live = settingsRef.current;

      // The 404 sequence. The moment the flag goes up the number is the
      // initial condition; from there the equation has it. Once the solution
      // has stopped resembling it — flattened by the heat equation, or rung
      // apart by the wave equation — the initial condition is applied
      // again. When the flag drops the field simply carries on from where it
      // is: what the number became is what is there. A still is the one
      // exception: frozen, the number would sit on the plate for good, so a
      // still goes back to the configured initial condition, which is what
      // it shows everywhere else.
      const on = notFoundRef.current;
      if (on && stateRef.current) {
        if (!numberApplied) {
          applyNumber();
        } else {
          sinceApplied += deltaTime;
          if (sinceApplied >= REAPPLY_INTERVAL_SECONDS) {
            const { peak, correlation } = measure(stateRef.current.u);
            if (
              peak < appliedHeight * REAPPLY_BELOW ||
              correlation < REAPPLY_CORRELATION
            ) {
              applyNumber();
            }
          }
        }
      } else if (!on && numberApplied) {
        numberApplied = false;
        if (frozenRef.current && configRef.current) {
          stateRef.current = createInitialState(
            configRef.current,
            live.equationType
          );
        }
      }

      if (stateRef.current && configRef.current) {
        // Solver steps are whole, so bank the fractional part rather than
        // rounding it away — that is what makes speeds below 1 slow the
        // simulation down instead of doing nothing.
        timeAccumulatorRef.current +=
          deltaTime * live.globalTimeMultiplier * BASE_STEPS_PER_SECOND;
        const steps = Math.min(
          MAX_STEPS_PER_FRAME,
          Math.floor(timeAccumulatorRef.current)
        );
        timeAccumulatorRef.current -= steps;

        for (let i = 0; i < steps; i++) {
          advancePDESolver(
            stateRef.current,
            configRef.current,
            live.equationType
          );
        }

        // Update mesh geometry
        updateMeshGeometry(meshRef.current!, stateRef.current, live);

        // Auto-rotate camera. The number has to be read, so while it is up
        // the spin eases out and the plate comes to the nearest upright; the
        // spin picks up again when it is let go. Framing, not physics.
        if (meshRef.current) {
          const mesh = meshRef.current;
          if (live.autoRotate && !on) {
            mesh.rotation.z += live.rotationSpeed * 0.001 * deltaTime * 60;
          }
          if (on) {
            const turn = Math.PI * 2;
            const upright = Math.round(mesh.rotation.z / turn) * turn;
            const righting = frozenRef.current
              ? 1
              : 1 - Math.exp(-Math.min(deltaTime, 0.1) * RIGHTING_PER_SECOND);
            mesh.rotation.z += (upright - mesh.rotation.z) * righting;
          }
        }
      }

      renderer.render(scene, camera);
      if (frozenRef.current) {
        animationFrameRef.current = null;
        return;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    resumeRef.current = () => {
      if (animationFrameRef.current === null)
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Handle window resize, at most once per frame — a phone's URL bar fires
    // resize repeatedly over a single flick, and each raw call reallocates the
    // drawing buffer mid-scroll.
    let resizeFrame: number | null = null;
    let reshapeTimer = 0;
    const applyResize = () => {
      resizeFrame = null;
      if (cameraRef.current && rendererRef.current) {
        const { innerWidth, innerHeight } = window;
        cameraRef.current.aspect = innerWidth / innerHeight;
        cameraRef.current.fov = fovForViewport(innerWidth, innerHeight);
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(innerWidth, innerHeight);
      }
      // The number is set to the visible plate; set again once a real
      // resize has settled, not on every frame of a drag.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        window.clearTimeout(reshapeTimer);
        reshapeTimer = window.setTimeout(() => {
          glyphSize = size;
          buildNumber();
        }, RESHAPE_SETTLE_MS);
      }
    };
    const handleResize = () => {
      if (resizeFrame === null) {
        resizeFrame = requestAnimationFrame(applyResize);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      resumeRef.current = null;
      window.removeEventListener('resize', handleResize);
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      window.clearTimeout(reshapeTimer);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }

      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
    };
    // Deps are intentionally structural only — everything else the animation
    // loop needs is read live off settingsRef. Listing `settings` here would
    // tear the simulation down and re-seed it on every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.equationType,
    settings.gridSize,
    settings.initialConditionType,
    settings.initialAmplitude,
    settings.initialFrequency,
    settings.initialWidth,
    settings.numSources,
    settings.boundaryConditionX,
    settings.boundaryConditionY,
  ]);

  // Update settings that don't require recreation
  useEffect(() => {
    if (configRef.current) {
      configRef.current.alpha = settings.alpha;
      configRef.current.c = settings.waveSpeed;
      configRef.current.damping = settings.damping;
    }
  }, [settings.alpha, settings.waveSpeed, settings.damping]);

  // Update visualization settings
  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.wireframe = settings.showWireframe;
    }
  }, [settings.showWireframe]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: settings.opacity,
      }}
    />
  );
};

/**
 * Create PDE solver configuration from settings
 */
// Internal constants for spatial/temporal discretization. The domain is fixed
// and dx follows from the grid, not the other way round: with dx pinned, each
// resolution step doubled the physical size of the sheet instead of resolving
// the same scene more finely, and shoved the initial disturbance — placed at a
// fraction of the domain — off toward one corner.
const DOMAIN_SIZE = 1.28;
const TIME_STEP = 0.0001;

function createPDEConfig(settings: PDESolverSettings): PDESolverConfig {
  const gridSize = settings.gridSize;
  const spatialStep = DOMAIN_SIZE / gridSize;

  return {
    gridSizeX: gridSize,
    gridSizeY: gridSize,
    dx: spatialStep,
    dy: spatialStep,
    dt: TIME_STEP,
    alpha: settings.alpha,
    c: settings.waveSpeed,
    damping: settings.damping,
    boundaryX: {
      type: settings.boundaryConditionX,
      value: 0,
      derivative: 0,
    },
    boundaryY: {
      type: settings.boundaryConditionY,
      value: 0,
      derivative: 0,
    },
    initialCondition: {
      type: settings.initialConditionType,
      amplitude: settings.initialAmplitude,
      frequency: settings.initialFrequency,
      width: settings.initialWidth,
      centerX: 0.5,
      centerY: 0.5,
      numSources: settings.numSources,
    },
  };
}

/**
 * Create visualization mesh for PDE state
 */
function createVisualizationMesh(
  state: PDEState,
  settings: PDESolverSettings
): { geometry: THREE.PlaneGeometry; material: THREE.MeshStandardMaterial } {
  const { gridSizeX, gridSizeY } = state;

  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(
    PLANE_SIZE,
    PLANE_SIZE,
    gridSizeX - 1,
    gridSizeY - 1
  );

  // Create material
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    wireframe: settings.showWireframe,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  // Initialize vertex colors and positions
  updateGeometryFromState(geometry, state, settings);

  return { geometry, material };
}

/**
 * Update mesh geometry from PDE state
 */
function updateMeshGeometry(
  mesh: THREE.Mesh,
  state: PDEState,
  settings: PDESolverSettings
): void {
  const geometry = mesh.geometry as THREE.PlaneGeometry;
  updateGeometryFromState(geometry, state, settings);
}

/**
 * Update geometry vertices and colors from PDE state.
 *
 * This runs on every frame, over every vertex of the plate (16,384 of them at
 * the default grid), so it is written to do nothing but arithmetic on the
 * attributes' own arrays. It used to build a `THREE.Color` per vertex per
 * frame — a million short-lived objects a second for the collector to chase —
 * work the colour scale out afresh for each, write each height and colour
 * through an accessor call, and then hand the whole mesh to
 * `computeVertexNormals`, which walks it a `Vector3` at a time. Between them
 * they were most of a frame on a desktop and two or three frames on a phone,
 * on the main thread, under whatever the reader was trying to scroll. What
 * it draws is the same.
 */
function updateGeometryFromState(
  geometry: THREE.PlaneGeometry,
  state: PDEState,
  settings: PDESolverSettings
): void {
  const { u, gridSizeX, gridSizeY } = state;
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  let colors = geometry.attributes.color as THREE.BufferAttribute | undefined;
  if (!colors) {
    colors = new THREE.BufferAttribute(
      new Float32Array(positions.count * 3),
      3
    );
    geometry.setAttribute('color', colors);
  }

  // Find the range for normalization
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = 0; i < u.length; i++) {
    const value = u[i];
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }
  const range = Math.max(Math.abs(minValue), Math.abs(maxValue), 0.001);

  // Heights and colours, written straight into the attributes' arrays. The
  // grid's cells and the plane's vertices are in the same order (rows of
  // gridSizeX), so the cell's index is the vertex's. A value is somewhere in
  // −range → range, which is the scale's whole run, so its colour is the
  // table's nearest entry.
  const position = positions.array as Float32Array;
  const color = colors.array as Float32Array;
  const table = colorTableFor(geometry, settings);
  const toEntry = (COLOR_STEPS - 1) / (2 * range);
  const count = Math.min(gridSizeX * gridSizeY, positions.count);
  const { heightScale } = settings;
  for (let idx = 0; idx < count; idx++) {
    const value = u[idx];
    const at = idx * 3;
    position[at + 2] = value * heightScale;
    // `| 0` rather than Math.round: a field that has blown up to NaN then
    // lands on an entry instead of off the end of the table.
    const from = (((value + range) * toEntry + 0.5) | 0) * 3;
    color[at] = table[from];
    color[at + 1] = table[from + 1];
    color[at + 2] = table[from + 2];
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  writeVertexNormals(geometry);
}

/**
 * The plate's vertex normals: for each vertex, the area-weighted mean of the
 * normals of the faces around it — what `computeVertexNormals` works out,
 * here in one pass with nothing to accumulate.
 *
 * The plate is a height field over a regular grid, so every face covers the
 * same half-cell of ground and its normal is (−∂z/∂x, −∂z/∂y, 1) to scale,
 * the two slopes read off its two axis-aligned edges. Summing those over the
 * faces that meet at a vertex is then a matter of adding height differences:
 * no cross products, and no second walk to normalise what a first one
 * gathered. `PlaneGeometry` cuts each cell along the diagonal from its
 * bottom-left corner to its top-right, which is where the lopsided counts
 * come from — a vertex is a corner of one face in the cells to its
 * south-east and north-west, and of two in the cells to its north-east and
 * south-west. At an edge of the plate the cells that are not there simply
 * do not add in.
 */
export function writeVertexNormals(geometry: THREE.PlaneGeometry): void {
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const normals = geometry.attributes.normal as
    THREE.BufferAttribute | undefined;
  const { width, height, widthSegments, heightSegments } =
    geometry.parameters ?? {};
  const cols = widthSegments + 1;
  const rows = heightSegments + 1;
  if (
    !geometry.index ||
    !normals ||
    normals.count !== positions.count ||
    positions.count !== cols * rows
  ) {
    // Not the plane this was written for: let three do it its way.
    geometry.computeVertexNormals();
    return;
  }

  const position = positions.array as Float32Array;
  const normal = normals.array as Float32Array;
  const cellX = width / widthSegments;
  const cellY = height / heightSegments;
  // A row of the grid, as a distance through the position array; and from a
  // vertex's x to its height.
  const rowStride = cols * 3;
  const Z = 2;

  for (let row = 0; row < rows; row++) {
    // Rows run from the top of the plate down, so north is the row before.
    const north = row > 0;
    const south = row < rows - 1;
    for (let col = 0; col < cols; col++) {
      const west = col > 0;
      const east = col < cols - 1;
      const at = (row * cols + col) * 3;
      const z = position[at + Z];

      // Rise to the east and to the north, summed over the faces here, and
      // how many faces that was.
      let slopeX = 0;
      let slopeY = 0;
      let faces = 0;
      if (south && east) {
        slopeX += position[at + 3 + Z] - z;
        slopeY += z - position[at + rowStride + Z];
        faces += 1;
      }
      if (north && east) {
        const zN = position[at - rowStride + Z];
        const zE = position[at + 3 + Z];
        const zNE = position[at - rowStride + 3 + Z];
        slopeX += zNE - zN + (zE - z);
        slopeY += zN - z + (zNE - zE);
        faces += 2;
      }
      if (north && west) {
        slopeX += z - position[at - 3 + Z];
        slopeY += position[at - rowStride + Z] - z;
        faces += 1;
      }
      if (south && west) {
        const zS = position[at + rowStride + Z];
        const zW = position[at - 3 + Z];
        const zSW = position[at + rowStride - 3 + Z];
        slopeX += z - zW + (zS - zSW);
        slopeY += zW - zSW + (z - zS);
        faces += 2;
      }

      const x = -slopeX * cellY;
      const y = -slopeY * cellX;
      const up = faces * cellX * cellY;
      const length = Math.sqrt(x * x + y * y + up * up) || 1;
      normal[at] = x / length;
      normal[at + 1] = y / length;
      normal[at + 2] = up / length;
    }
  }

  normals.needsUpdate = true;
}

// How finely a colour scale is tabulated. The steepest of the scales climbs
// a channel about twice over the run, so at this many entries the nearest one
// is within a quarter of the smallest step a screen can show: the table is
// the scale, as far as a display is concerned.
export const COLOR_STEPS = 2048;

/** A colour scale laid out as COLOR_STEPS colours, −1 at one end → 1 at the other. */
interface ColorTable {
  scale: PDESolverSettings['colorScale'];
  stops: number[];
  rgb: Float32Array;
}

// One table a plate, kept beside it rather than on it, and built again only
// when the scale or the colours it runs between change.
const colorTables = new WeakMap<THREE.BufferGeometry, ColorTable>();

/** The nine numbers a scale runs between, one at a time: no array a frame. */
const stopAt = (colors: PDESolverSettings['colors'], i: number): number =>
  (i < 3 ? colors.negative : i < 6 ? colors.zero : colors.positive)[i % 3];

const isTableFor = (table: ColorTable, settings: PDESolverSettings) => {
  if (table.scale !== settings.colorScale) return false;
  for (let i = 0; i < table.stops.length; i++) {
    if (table.stops[i] !== stopAt(settings.colors, i)) return false;
  }
  return true;
};

/**
 * The colour scale as a table: the per-vertex loop's whole cost for a colour
 * is then three reads. Working a colour out is a branch on the scale, a few
 * multiplies and a call into three for each of sixteen thousand vertices,
 * every frame, to get a function of one number that does not change from one
 * frame to the next.
 */
export function colorTableFor(
  geometry: THREE.BufferGeometry,
  settings: PDESolverSettings
): Float32Array {
  const known = colorTables.get(geometry);
  if (known && isTableFor(known, settings)) return known.rgb;

  const rgb = new Float32Array(COLOR_STEPS * 3);
  const color = new THREE.Color();
  for (let step = 0; step < COLOR_STEPS; step++) {
    writeColorForValue((step / (COLOR_STEPS - 1)) * 2 - 1, 1, settings, color);
    rgb[step * 3] = color.r;
    rgb[step * 3 + 1] = color.g;
    rgb[step * 3 + 2] = color.b;
  }
  colorTables.set(geometry, {
    scale: settings.colorScale,
    stops: Array.from({ length: 9 }, (_, i) => stopAt(settings.colors, i)),
    rgb,
  });
  return rgb;
}

/**
 * Write the color for a given value, on the configured color scale, into
 * `out`.
 */
function writeColorForValue(
  value: number,
  range: number,
  settings: PDESolverSettings,
  out: THREE.Color
): void {
  const normalized = value / range; // -1 to 1

  switch (settings.colorScale) {
    case 'rainbow': {
      // Rainbow: blue -> cyan -> green -> yellow -> red
      const hue = (1 - (normalized + 1) / 2) * 0.7; // 0.7 to 0 (blue to red)
      out.setHSL(hue, 0.8, 0.5);
      return;
    }

    case 'thermal': {
      // Thermal: black -> red -> yellow -> white
      const t = (normalized + 1) / 2; // 0 to 1
      if (t < 0.25) {
        out.setRGB(t * 4, 0, 0);
      } else if (t < 0.5) {
        out.setRGB(1, (t - 0.25) * 4, 0);
      } else if (t < 0.75) {
        out.setRGB(1, 1, (t - 0.5) * 4);
      } else {
        out.setRGB(1, 1, 1);
      }
      return;
    }

    case 'wave': {
      // Wave: blue (negative) -> dark (zero) -> red (positive)
      const [posR, posG, posB] = settings.colors.positive;
      const [negR, negG, negB] = settings.colors.negative;
      const [zeroR, zeroG, zeroB] = settings.colors.zero;

      if (normalized > 0) {
        // Interpolate from zero to positive
        const t = normalized;
        out.setRGB(
          zeroR + (posR - zeroR) * t,
          zeroG + (posG - zeroG) * t,
          zeroB + (posB - zeroB) * t
        );
      } else {
        // Interpolate from negative to zero
        const t = 1 + normalized; // 0 to 1
        out.setRGB(
          negR + (zeroR - negR) * t,
          negG + (zeroG - negG) * t,
          negB + (zeroB - negB) * t
        );
      }
      return;
    }

    case 'monochrome': {
      // Grayscale
      const intensity = (normalized + 1) / 2;
      out.setRGB(intensity, intensity, intensity);
      return;
    }

    default:
      out.setRGB(0.5, 0.5, 0.5);
  }
}

export default PDESolverBackground;
