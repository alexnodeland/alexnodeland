/**
 * PDE Solver Background Component
 *
 * The heat and wave equations, solved on a grid and drawn as the thing they
 * describe: a square membrane, lit, seen from above the bench it floats
 * over. The solver is pde-solver.ts and is untouched by any of this — what
 * is here is the drawing, the framing, and the one new term in the equation:
 * the reader's pointer.
 */

import React from 'react';
import * as THREE from 'three';
import { glyphCoverage, rasterizeGlyph } from '../../core/glyph';
import {
  NotFoundSequence,
  RESHAPE_SETTLE_MS,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { createFloor } from '../../core/stage/floor';
import {
  clamp01,
  easeIn,
  easeOut,
  PASSAGE_GLSL,
  presenceOf,
  smooth,
} from '../../core/stage/passage';
import { Pose } from '../../core/stage/rig';
import { STAGE_GROUND, StageOptions } from '../../core/stage/stage';
import { createReadout } from '../../core/stage/telemetry';
import {
  SceneContext,
  SceneHandle,
  StageSurface,
  useStageScene,
} from '../../core/stage/useStageScene';
import { AnimatedBackgroundProps } from '../../core/types';
import { PDESolverSettings } from './config';
import {
  advancePDESolver,
  applyBoundaryConditions,
  createInitialState,
} from './pde-solver';
import { PDESolverConfig, PDEState } from './types';

// The membrane is a PLANE_SIZE-square plate, flat on the world's ground
// plane, spinning slowly about the vertical.
export const PLANE_SIZE = 2;
const HALF = PLANE_SIZE / 2;
export const FOV_DEGREES = 32;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);
// How high above the horizon the camera rests, and where the bench is.
const REST_ELEVATION = 0.9;
const FLOOR_HEIGHT = -0.42;
const FLOOR_OPACITY = 0.2;
// How much of the plate the bench gives back.
const MIRROR_STRENGTH = 0.3;

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
// How long the camera takes to come round and face the number.
const READING_SECONDS = 1.6;

// The pointer, as a term in the equation. A stroke across the plate is laid
// down as a row of Gaussian marks one of these apart, so its depth does not
// depend on how fast it was drawn or on the frame rate; each is this many
// grid cells wide at a 128² grid, and scales with the grid.
const MARK_SPACING_CELLS = 1.6;
const MARK_SIGMA_CELLS = 2.4;
// Depths, as fractions of the initial amplitude: a pointer passing over, a
// press held, and a tap.
const HOVER_DEPTH = 0.1;
const PRESS_DEPTH = 0.42;
const TAP_HEIGHT = 0.9;
// What stops a reader from pumping the plate without limit. The wave
// equation at zero damping conserves whatever it is given, so a pointer that
// only ever adds would end with a plate of noise. Above this multiple of the
// initial condition's own energy the field is bled back, a little a frame.
// It is a ceiling on the pointer, not a term in the physics: left alone the
// plate never reaches it.
const ENERGY_CEILING = 1.8;
const ENERGY_BLEED = 0.985;

/**
 * How far away a camera at `elevation` has to be for the plate's inscribed
 * circle to reach every corner of a screen of this shape — the distance at
 * which the plate covers the view at every angle of its spin.
 *
 * A corner of the screen is a ray; where that ray lands on the plate's plane
 * is a point some distance from the plate's centre, proportional to how far
 * the camera is. The far corners land furthest, so they set it.
 */
export const coverDistance = (
  aspect: number,
  elevation: number = REST_ELEVATION
): number => {
  const se = Math.sin(elevation);
  const ce = Math.cos(elevation);
  let reach = 0;
  for (const y of [1, -1]) {
    const denominator = se - y * TAN_HALF_FOV * ce;
    // A ray at or above the horizon never lands: nothing covers that view.
    if (denominator <= 1e-6) return 0;
    const along = se / denominator;
    const x = along * aspect * TAN_HALF_FOV;
    const z = ce - along * (ce + y * TAN_HALF_FOV * se);
    reach = Math.max(reach, Math.hypot(x, z));
  }
  return HALF / reach;
};

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Where the camera rests.
 *
 * On a wide screen the plate is an object: a little wider than the window
 * that sits over it, so its edges show in the margins and its corners sweep
 * past them as it turns — a sheet of glass lying on a light table. A tall
 * screen cannot have that and be full-bleed, and full-bleed is what a phone
 * wants, so there the camera closes in until the plate covers the view.
 */
export const restPose = (aspect: number): Pose => {
  const object = 1.16 / (TAN_HALF_FOV * aspect);
  const covering = coverDistance(aspect);
  const wide = smoothstep(0.85, 1.3, aspect);
  return {
    target: [0, 0, 0],
    distance: covering + (object - covering) * wide,
    azimuth: 0,
    elevation: REST_ELEVATION,
    fov: FOV_DEGREES,
  };
};

/** With the page out of the way: stood back, lower, the whole plate in view. */
export const showPose = (aspect: number): Pose => ({
  target: [0, -0.08, 0],
  distance: (HALF * Math.SQRT2) / (0.78 * TAN_HALF_FOV * Math.min(aspect, 1.5)),
  azimuth: 0,
  elevation: 0.6,
  fov: FOV_DEGREES,
});

/**
 * Squared up for the number: straight overhead. On a wide screen the plate
 * fits across it with a little to spare; on a tall one the camera is where
 * the plate's inscribed circle reaches the screen's corners, which is the
 * width the number was set to (see buildNumber).
 */
export const readingPose = (aspect: number): Pose => ({
  target: [0, 0, 0],
  distance:
    aspect >= 1
      ? (HALF * 1.12) / (TAN_HALF_FOV * aspect)
      : HALF / (TAN_HALF_FOV * Math.hypot(1, aspect)),
  azimuth: 0,
  elevation: Math.PI / 2,
  fov: FOV_DEGREES,
});

// The passage's timetable, as fractions of the arrival and of the leaving.
// Arriving (two seconds): the sheet is lit almost at once and up by half
// way, the relief starts through it a sixth of the way in, and the bench
// follows.
const INTRO_SECONDS = 2;
const RISE_FROM = -0.24;
const RISE_UNTIL = 0.5;
const LIT_UNTIL = 0.18;
const SWELL_FROM = 0.16;
const BENCH_FROM = 0.24;
// Leaving (0.65 s asked for, 1.1 s on the cycle): slack by three fifths of
// the way, sinking from a third, dark over the last quarter.
const SLACK_UNTIL = 0.62;
const SINK_FROM = 0.3;
const DARK_FROM = 0.72;
const BENCH_DARK_FROM = 0.78;

const stageOptions = (): StageOptions => ({
  rig: {
    base: restPose,
    hidden: showPose,
    reading: readingPose,
    minElevation: 0.3,
  },
  bloom: { strength: 0.5, threshold: 0.8, knee: 0.55, radius: 0.7 },
  grade: { vignette: 0.36 },
  introSeconds: INTRO_SECONDS,
});

// How the membrane comes on and goes off (core/stage/passage.ts), as far as
// the plate itself goes. The field is the solver's and is never touched: what
// changes is how much of it the sheet is showing. Arriving, the sheet is
// flat and the relief swells up through it from the middle outward, a little
// past its mark and back, like a skin drawn taut and then struck. Leaving, it
// goes slack from the rim inward, and the last of the relief is the middle's.
// Both are one number a vertex — its distance from the centre is its place
// in the queue — so the whole of it is two uniforms.
const SWELL_SPAN = 0.5;
const SLACK_SPAN = 0.55;
// How far into its own change a vertex is when the ring passes over it.
const RING_LEAD = 0.12;

const VERTEX = /* glsl */ `
  attribute float aValue;
  uniform float uSwell;
  uniform float uSlack;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vValue;
  varying float vRelief;
  ${PASSAGE_GLSL}

  void main() {
    vUv = uv;

    // 0 at the centre of the plate, 1 at its corners.
    float away = length(uv - 0.5) * 1.41421356;
    float up = passage(uSwell, away, ${SWELL_SPAN.toFixed(2)}) - 1.0;
    float swell = 1.0 + 2.2 * up * up * up + 1.2 * up * up;
    float down = passage(uSlack, 1.0 - away, ${SLACK_SPAN.toFixed(2)});
    float slack = down * down * (3.0 - 2.0 * down);
    float relief = swell * (1.0 - slack);
    vRelief = relief;

    vValue = aValue * relief;
    // The height is the plane's own z, and a height field's normal leans by
    // its slope — so less relief is the same normal, stood up by as much.
    vec4 world = modelMatrix * vec4(position.xy, position.z * relief, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * vec3(normal.xy * relief, normal.z));
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// The membrane's surface. It is drawn as what it is — a field of values —
// rather than as a material: the colour scale maps the value, the surface
// is dark where the field is at rest and a source where it is not, and the
// two sets of lines are the two things a reader might want to measure by:
// contours of equal height, and the grid the solver is working on.
const FRAGMENT = /* glsl */ `
  uniform sampler2D uScale;
  uniform float uInvRange;
  uniform float uContours;
  uniform float uCells;
  uniform float uGridEvery;
  uniform vec3 uLight;
  uniform vec3 uGround;
  uniform vec4 uProbe;
  uniform float uStrength;
  uniform float uFogFrom;
  uniform float uFogTo;
  uniform vec2 uMirror;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying float vValue;
  varying float vRelief;
  uniform float uSwell;
  uniform float uSlack;

  float lineOn(float coord, float weight) {
    float rate = max(fwidth(coord), 1e-5);
    return 1.0 - smoothstep(0.0, weight, abs(fract(coord - 0.5) - 0.5) / rate);
  }

  void main() {
    float s = clamp(vValue * uInvRange, -1.0, 1.0);
    float magnitude = abs(s);
    vec3 tint = texture2D(uScale, vec2(s * 0.5 + 0.5, 0.5)).rgb;

    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(cameraPosition - vWorld);
    float diffuse = max(dot(n, uLight), 0.0);
    float highlight = pow(max(dot(n, normalize(uLight + v)), 0.0), 34.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 4.0);

    // A sheet lying flat has no heights to draw lines of equal height
    // between: they come up with the relief.
    float contour = lineOn(s * uContours, 1.3) * min(vRelief, 1.0);

    vec2 cell = vUv * uCells / uGridEvery;
    vec2 cellRate = max(fwidth(cell), vec2(1e-5));
    vec2 toLine = abs(fract(cell - 0.5) - 0.5) / cellRate;
    float grid = (1.0 - min(min(toLine.x, toLine.y), 1.0))
      * (1.0 - smoothstep(0.25, 0.65, max(cellRate.x, cellRate.y)));

    float inset = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float frame = 1.0 - smoothstep(0.8, 2.2, inset / max(fwidth(inset), 1e-6));

    // At rest the surface is nearly the ground it floats over; what lights
    // it is the field. So a calm plate is dark, a crest is a source, and the
    // contours carry the shape in between.
    float lift = 0.25 + 0.75 * magnitude;
    vec3 color = tint * (0.05 + 0.3 * diffuse) * lift;
    color += tint * pow(magnitude, 2.4) * 2.4 * (0.5 + 0.75 * diffuse);
    color += tint * contour * (0.3 + 1.6 * magnitude);
    color += vec3(0.5, 0.6, 0.78) * grid * 0.045;
    color += mix(vec3(1.0), tint, 0.75) * highlight * (0.025 + 0.3 * magnitude);
    color += tint * rim * 0.4 * lift;
    color += vec3(0.72, 0.82, 1.0) * frame * 0.42;
    // The line the change arrives behind: a thin ring running out through
    // the sheet just ahead of the relief, as if it were what excites it, and
    // in from the rim just ahead of the slack. Where a vertex is that little
    // way into its own change is a radius (see the vertex shader), and that
    // radius is off the plate altogether once either is done.
    float outward = length(vUv - 0.5) * 1.41421356;
    float swellAt = (uSwell - ${(SWELL_SPAN * RING_LEAD).toFixed(4)}) / ${(1 - SWELL_SPAN).toFixed(3)};
    float slackAt = 1.0 - (uSlack - ${(SLACK_SPAN * RING_LEAD).toFixed(4)}) / ${(1 - SLACK_SPAN).toFixed(3)};
    vec2 off = (vec2(outward) - vec2(swellAt, slackAt)) / 0.016;
    float tension = exp(-off.x * off.x) * step(uSwell, 0.999)
      + exp(-off.y * off.y) * step(0.001, uSlack);
    color += vec3(0.72, 0.82, 1.0) * tension * 0.16;

    // The pointer's mark on the plate: a ring where its ray lands.
    vec2 fromProbe = (vUv - uProbe.xy) * 2.0;
    float distance = length(fromProbe);
    float ringRate = max(fwidth(distance), 1e-5);
    float ring = 1.0 - smoothstep(0.0, 1.6, abs(distance - uProbe.z) / ringRate);
    float halo = exp(-distance * distance / (uProbe.z * uProbe.z * 2.5));
    color += vec3(0.85, 0.92, 1.0) * (ring * 0.7 + halo * 0.12) * uProbe.w;

    // Depth: the far side of the plate sinks toward the ground it floats on.
    float away = smoothstep(uFogFrom, uFogTo, length(cameraPosition - vWorld));
    color = mix(color, uGround, away * 0.72);

    // The reflection thins with depth below the bench: what is close to the
    // surface it is reflected in shows, what is far from it does not.
    float sunk = uMirror.x * max(0.0, uMirror.y - vWorld.y);
    gl_FragColor = vec4(color * uStrength * exp(-sunk * 3.2), 1.0);
  }
`;

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

// How much of the plate's width, at each fixed edge, the initial condition is
// eased to that edge's value over.
const ATTACH_FRACTION = 0.07;

/**
 * Attach an initial condition to the edges that are held.
 *
 * A Dirichlet edge is a membrane pinned to its frame, and most of the initial
 * conditions on offer were written with no frame in mind: the interference
 * pattern arrives at the edge at whatever height it happens to have, and the
 * boundary then pins the outermost row to zero under it. That is a cliff one
 * cell wide. Seen from straight on it never showed; as relief it is a torn
 * edge, and to the wave equation it is a shock that rings at the grid's own
 * wavelength for the rest of the run. So the condition is eased down to the
 * held value over the outer few cells — initial data that satisfies its own
 * boundary conditions, which is what the equation assumed it was given. Free
 * and periodic edges are left exactly as they were.
 */
export function attachToFrame(state: PDEState, config: PDESolverConfig): void {
  const { gridSizeX, gridSizeY } = config;
  const heldX = config.boundaryX.type === 'dirichlet';
  const heldY = config.boundaryY.type === 'dirichlet';
  if (!heldX && !heldY) return;
  const ease = (cellsIn: number, size: number) => {
    const t = Math.min(1, cellsIn / Math.max(1, size * ATTACH_FRACTION));
    return t * t * (3 - 2 * t);
  };
  const { u, uPrev } = state;
  for (let j = 0; j < gridSizeY; j++) {
    const ty = heldY ? ease(Math.min(j, gridSizeY - 1 - j), gridSizeY) : 1;
    for (let i = 0; i < gridSizeX; i++) {
      const tx = heldX ? ease(Math.min(i, gridSizeX - 1 - i), gridSizeX) : 1;
      const hold = tx * ty;
      if (hold === 1) continue;
      const idx = i + j * gridSizeX;
      u[idx] *= hold;
      if (uPrev) uPrev[idx] *= hold;
    }
  }
}

/** The configured initial condition, on a plate attached to its frame. */
const freshState = (
  config: PDESolverConfig,
  equationType: PDESolverSettings['equationType']
): PDEState => {
  const state = createInitialState(config, equationType);
  attachToFrame(state, config);
  return state;
};

/** The root-mean-square of a field: what the ceiling is judged against. */
const rms = (u: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < u.length; i++) sum += u[i] * u[i];
  return Math.sqrt(sum / Math.max(1, u.length));
};

/**
 * Lay one Gaussian mark on the field, centred on a cell.
 *
 * `set` holds the field at the mark's height where it is lower — a probe at
 * a fixed temperature, which is what a pointer is to the heat equation and
 * which the maximum principle keeps bounded for free. Otherwise the mark is
 * added, to the current field and the previous one alike: a displacement
 * with no velocity of its own, which is a finger pressed into a membrane.
 * Adding it to the current field alone would be a blow instead, and a far
 * harder one than its depth suggests — the scheme reads the difference
 * between the two fields as velocity over one very small timestep.
 */
export function markField(
  state: PDEState,
  col: number,
  row: number,
  sigma: number,
  height: number,
  set = false
): void {
  const { u, uPrev, gridSizeX, gridSizeY } = state;
  const reach = Math.ceil(sigma * 3);
  const c0 = Math.round(col);
  const r0 = Math.round(row);
  const falloff = 1 / (2 * sigma * sigma);
  for (let j = r0 - reach; j <= r0 + reach; j++) {
    if (j < 0 || j >= gridSizeY) continue;
    for (let i = c0 - reach; i <= c0 + reach; i++) {
      if (i < 0 || i >= gridSizeX) continue;
      const dx = i - col;
      const dy = j - row;
      const mark = height * Math.exp(-(dx * dx + dy * dy) * falloff);
      const idx = i + j * gridSizeX;
      if (set) {
        if (u[idx] < mark) u[idx] = mark;
      } else {
        u[idx] += mark;
        if (uPrev) uPrev[idx] += mark;
      }
    }
  }
}

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<PDESolverSettings>): SceneHandle => {
  const initial = settings();
  const config = createPDEConfig(initial);
  let state = freshState(config, initial.equationType);
  const cells = config.gridSizeX;

  // ── The plate ────────────────────────────────────────────────────────────
  // PlaneGeometry stands in its own xy plane with z as its height, which is
  // how the solver's field is written into it; the mesh is laid flat, and
  // the group it sits in is what spins.
  const geometry = new THREE.PlaneGeometry(
    PLANE_SIZE,
    PLANE_SIZE,
    cells - 1,
    cells - 1
  );
  const values = new THREE.BufferAttribute(
    new Float32Array(geometry.attributes.position.count),
    1
  );
  geometry.setAttribute('aValue', values);

  const scaleTexture = new THREE.DataTexture(
    new Uint8Array(COLOR_STEPS * 4),
    COLOR_STEPS,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  // The colours are the ones the panel's swatches show, so they are read as
  // display colours and lit as linear ones.
  scaleTexture.colorSpace = THREE.SRGBColorSpace;
  scaleTexture.minFilter = THREE.LinearFilter;
  scaleTexture.magFilter = THREE.LinearFilter;
  scaleTexture.wrapS = THREE.ClampToEdgeWrapping;
  let scaleTable: Float32Array | null = null;

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uScale: { value: scaleTexture },
      uInvRange: { value: 1 },
      uContours: { value: 7 },
      uCells: { value: cells - 1 },
      uGridEvery: { value: 8 },
      uLight: { value: new THREE.Vector3(-0.45, 0.72, 0.52).normalize() },
      uGround: { value: new THREE.Color(STAGE_GROUND) },
      uProbe: { value: new THREE.Vector4(0.5, 0.5, 0.06, 0) },
      // How far the relief has swelled up through the sheet, and how far it
      // has drained out of it again: see VERTEX.
      uSwell: { value: 1 },
      uSlack: { value: 0 },
      uStrength: { value: 1 },
      uFogFrom: { value: 2 },
      uFogTo: { value: 5 },
      // x: 1 on the reflection, 0 on the plate. y: the bench's height.
      uMirror: { value: new THREE.Vector2(0, FLOOR_HEIGHT) },
    },
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.frustumCulled = false;
  const plate = new THREE.Group();
  plate.add(mesh);
  stage.scene.add(plate);

  // The bench is polished: the plate shows in it, faintly, upside down. It
  // is the same geometry drawn a second time, mirrored in the floor's plane
  // and added rather than laid over, so it is light on the bench and never
  // a second plate. What it buys is the gap — a thing with a reflection
  // under it is visibly above the surface it is reflected in.
  const mirrorMaterial = material.clone();
  mirrorMaterial.uniforms.uScale.value = scaleTexture;
  mirrorMaterial.uniforms.uMirror.value.set(1, FLOOR_HEIGHT);
  mirrorMaterial.transparent = true;
  mirrorMaterial.blending = THREE.AdditiveBlending;
  mirrorMaterial.depthWrite = false;
  const mirror = new THREE.Mesh(geometry, mirrorMaterial);
  mirror.rotation.x = -Math.PI / 2;
  mirror.scale.z = -1;
  mirror.frustumCulled = false;
  const reflection = new THREE.Group();
  reflection.add(mirror);
  reflection.position.y = 2 * FLOOR_HEIGHT;
  stage.scene.add(reflection);

  const floor = createFloor({
    height: FLOOR_HEIGHT,
    cell: 0.25,
    major: 4,
    reach: 2.9,
    opacity: FLOOR_OPACITY,
  });
  stage.scene.add(floor.mesh);

  // ── The 404 sequence ─────────────────────────────────────────────────────
  // The number as an initial condition, at the height the configured one
  // has, its edge softened over a cell or so — a step edge is a stair in the
  // lighting and a shock to the wave equation. The plate is square and its
  // rows run top to bottom the way the glyph's do. On a tall screen the
  // camera stands where the plate's inscribed circle reaches the screen's
  // corners (see readingPose), so only the middle of it is on screen and the
  // number is set to that width; it is set again when the viewport changes
  // shape.
  const numberField = new Float32Array(cells * cells);
  let glyphSize = { width: stage.width, height: stage.height };
  const buildNumber = () => {
    const { width, height } = glyphSize;
    const visible = width >= height ? 1 : width / Math.hypot(width, height);
    const glyph = rasterizeGlyph(cells, cells, {
      maxWidth: 0.8 * visible,
      maxHeight: 0.62,
    });
    for (let i = 0; i < numberField.length; i++) {
      numberField[i] = initial.initialAmplitude * glyphCoverage(glyph, i, 2);
    }
  };
  buildNumber();

  // Whether the state on the plate was last set from the number, its height
  // then, and how long ago — what the re-application is judged against.
  let numberApplied = false;
  let appliedHeight = 0;
  let sinceApplied = 0;
  let numberMean = 0;
  let numberNorm = 0;
  const sequence = new NotFoundSequence({ formSeconds: READING_SECONDS });

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
    state.u = new Float32Array(numberField);
    applyBoundaryConditions(state.u, config);
    // At rest: the wave equation reads its initial velocity off uPrev.
    if (state.uPrev) state.uPrev = new Float32Array(state.u);
    state.time = 0;
    state.step = 0;
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

  // ── The pointer ──────────────────────────────────────────────────────────
  // What the ceiling is measured against: the energy the plate was given to
  // begin with, or a floor where an initial condition is nearly flat.
  let restEnergy = Math.max(rms(state.u), 0.12 * initial.initialAmplitude);
  let framesSinceMeasure = 0;
  let overCeiling = false;

  const hit = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  // Where the pointer last was on the grid, so a stroke can be laid between
  // there and where it is now; null while it is off the plate.
  let lastCell: { col: number; row: number } | null = null;
  const sigma = (MARK_SIGMA_CELLS * cells) / 128;
  const spacing = (MARK_SPACING_CELLS * cells) / 128;

  /** The grid cell under a point on screen, or null if it misses the plate. */
  const cellAt = (ndcX: number, ndcY: number) => {
    if (!stage.groundPoint(ndcX, ndcY, 0, hit)) return null;
    hit.applyAxisAngle(up, -plate.rotation.y);
    const col = (hit.x / PLANE_SIZE + 0.5) * (cells - 1);
    const row = (hit.z / PLANE_SIZE + 0.5) * (cells - 1);
    if (col < 0 || row < 0 || col > cells - 1 || row > cells - 1) return null;
    return { col, row };
  };

  const applyPointer = (live: PDESolverSettings, reading: number) => {
    const pointer = stage.pointer.state;
    const heat = live.equationType === 'heat';
    const amplitude = live.initialAmplitude;
    const probe = material.uniforms.uProbe.value as THREE.Vector4;

    // A tap drops a pulse where it landed.
    for (const tap of stage.pointer.takeTaps()) {
      const at = cellAt(tap.x, tap.y);
      if (at && reading < 0.5) {
        markField(
          state,
          at.col,
          at.row,
          sigma * 1.5,
          amplitude * TAP_HEIGHT,
          heat
        );
      }
    }

    const at =
      pointer.present && reading < 0.5 ? cellAt(pointer.x, pointer.y) : null;
    const want = at ? 1 : 0;
    probe.w += (want - probe.w) * 0.18;
    if (!at) {
      lastCell = null;
      return;
    }
    probe.x = at.col / (cells - 1);
    probe.y = at.row / (cells - 1);
    probe.z = pointer.pressed ? 0.085 : 0.055;

    // The stroke since the last frame, as marks a fixed distance apart. A
    // pointer that has not moved lays nothing — except on the heat equation,
    // where a probe held still is still a probe.
    const from = lastCell ?? at;
    const length = Math.hypot(at.col - from.col, at.row - from.row);
    const depth =
      amplitude *
      (pointer.pressed ? PRESS_DEPTH : HOVER_DEPTH) *
      (heat ? 1 : -1);
    if (heat) {
      const marks = Math.max(1, Math.ceil(length / spacing));
      for (let k = 1; k <= marks; k++) {
        const t = k / marks;
        markField(
          state,
          from.col + (at.col - from.col) * t,
          from.row + (at.row - from.row) * t,
          sigma,
          Math.abs(depth) * 2.2,
          true
        );
      }
      lastCell = at;
    } else if (length >= spacing) {
      const marks = Math.min(48, Math.floor(length / spacing));
      for (let k = 1; k <= marks; k++) {
        const t = (k * spacing) / length;
        markField(
          state,
          from.col + (at.col - from.col) * t,
          from.row + (at.row - from.row) * t,
          sigma,
          depth
        );
      }
      const t = (marks * spacing) / length;
      lastCell = {
        col: from.col + (at.col - from.col) * t,
        row: from.row + (at.row - from.row) * t,
      };
    } else if (!lastCell) {
      lastCell = at;
    }
  };

  /** Holds the pointer's contribution under the ceiling. */
  const holdCeiling = () => {
    framesSinceMeasure += 1;
    if (framesSinceMeasure >= 8) {
      framesSinceMeasure = 0;
      overCeiling = rms(state.u) > restEnergy * ENERGY_CEILING;
    }
    if (!overCeiling) return;
    const { u, uPrev } = state;
    for (let i = 0; i < u.length; i++) u[i] *= ENERGY_BLEED;
    if (uPrev) for (let i = 0; i < uPrev.length; i++) uPrev[i] *= ENERGY_BLEED;
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  let stepBank = 0;
  let reshapeTimer = 0;

  const update: SceneHandle['update'] = frame => {
    const live = settings();
    const on = notFound();
    const { dt } = frame;

    // The physical parameters are read live: none of them rebuilds anything.
    config.alpha = live.alpha;
    config.c = live.waveSpeed;
    config.damping = live.damping;

    // The 404 sequence. The moment the flag goes up the number is the
    // initial condition; from there the equation has it. Once the solution
    // has stopped resembling it — flattened by the heat equation, or rung
    // apart by the wave equation — the initial condition is applied again.
    // When the flag drops the field simply carries on from where it is: what
    // the number became is what is there. A still is the one exception:
    // frozen, the number would sit on the plate for good, so a still goes
    // back to the configured initial condition, which is what it shows
    // everywhere else.
    const reading = frame.frozen
      ? sequence.settle(on)
      : sequence.advance(dt, on);
    stage.reading = reading;
    if (on) {
      if (!numberApplied) {
        applyNumber();
      } else {
        sinceApplied += dt;
        if (sinceApplied >= REAPPLY_INTERVAL_SECONDS) {
          const { peak, correlation } = measure(state.u);
          if (
            peak < appliedHeight * REAPPLY_BELOW ||
            correlation < REAPPLY_CORRELATION
          ) {
            applyNumber();
          }
        }
      }
    } else if (numberApplied) {
      numberApplied = false;
      if (frame.frozen) state = freshState(config, live.equationType);
      restEnergy = Math.max(rms(state.u), 0.12 * live.initialAmplitude);
    }

    if (!frame.frozen) {
      applyPointer(live, reading);

      // Solver steps are whole, so bank the fractional part rather than
      // rounding it away — that is what makes speeds below 1 slow the
      // simulation down instead of doing nothing.
      stepBank += dt * live.globalTimeMultiplier * BASE_STEPS_PER_SECOND;
      const steps = Math.min(MAX_STEPS_PER_FRAME, Math.floor(stepBank));
      stepBank -= steps;
      for (let i = 0; i < steps; i++) {
        advancePDESolver(state, config, live.equationType);
      }
      // The number is not the pointer's doing, and is not held to its limit.
      if (!on) holdCeiling();
    }

    const range = writeField(geometry, state, live.heightScale);
    material.uniforms.uInvRange.value = 1 / range;
    material.uniforms.uGridEvery.value = live.showWireframe ? 1 : 8;
    mirrorMaterial.uniforms.uInvRange.value = 1 / range;
    mirrorMaterial.uniforms.uGridEvery.value =
      material.uniforms.uGridEvery.value;

    const table = colorTableFor(geometry, live);
    if (table !== scaleTable) {
      scaleTable = table;
      const bytes = scaleTexture.image.data as Uint8Array;
      for (let i = 0; i < COLOR_STEPS; i++) {
        bytes[i * 4] = Math.round(Math.min(1, Math.max(0, table[i * 3])) * 255);
        bytes[i * 4 + 1] = Math.round(
          Math.min(1, Math.max(0, table[i * 3 + 1])) * 255
        );
        bytes[i * 4 + 2] = Math.round(
          Math.min(1, Math.max(0, table[i * 3 + 2])) * 255
        );
        bytes[i * 4 + 3] = 255;
      }
      scaleTexture.needsUpdate = true;
    }

    // The spin. The number has to be read, so while it is up the spin eases
    // out and the plate comes to the nearest upright; it picks up again when
    // the number is let go. Framing, not physics.
    if (live.autoRotate && !on && !frame.frozen) {
      plate.rotation.y += live.rotationSpeed * 0.001 * dt * 60;
    }
    if (on) {
      const turn = Math.PI * 2;
      const upright = Math.round(plate.rotation.y / turn) * turn;
      const righting = frame.frozen
        ? 1
        : 1 - Math.exp(-dt * RIGHTING_PER_SECOND);
      plate.rotation.y += (upright - plate.rotation.y) * righting;
    }

    // Coming on: a flat, unlit sheet rises into place, the relief swells up
    // through it from the middle, and the bench it stands over — its grid,
    // the reflection in it — arrives behind. Going off: the sheet goes slack
    // from the rim inward, then sinks into its own reflection, which meets it
    // at the bench, and the light goes out of both there. Every term is a
    // function of where the passage has got to and nothing else, so a leave
    // that is taken back plays the same film the other way.
    const { leave } = presenceOf(frame);
    const intro = frame.intro;
    const sinking = easeIn((leave - SINK_FROM) / (1 - SINK_FROM));
    const lit = 1 - smooth((leave - DARK_FROM) / (1 - DARK_FROM));
    plate.position.y =
      (1 - easeOut(intro / RISE_UNTIL)) * RISE_FROM + sinking * FLOOR_HEIGHT;
    reflection.position.y = 2 * FLOOR_HEIGHT - plate.position.y;
    reflection.rotation.y = plate.rotation.y;
    const swell = clamp01((intro - SWELL_FROM) / (1 - SWELL_FROM));
    const slack = clamp01(leave / SLACK_UNTIL);
    for (const each of [material, mirrorMaterial]) {
      each.uniforms.uSwell.value = swell;
      each.uniforms.uSlack.value = slack;
    }
    material.uniforms.uStrength.value = smooth(intro / LIT_UNTIL) * lit;
    // Nothing to reflect in from straight overhead, and the number is read
    // from there.
    mirrorMaterial.uniforms.uStrength.value =
      MIRROR_STRENGTH *
      smooth((intro - BENCH_FROM) / (1 - BENCH_FROM)) *
      lit *
      (1 - reading);
    const distance = stage.rig.pose.distance;
    for (const each of [material, mirrorMaterial]) {
      each.uniforms.uFogFrom.value = distance - 0.2;
      each.uniforms.uFogTo.value = distance + PLANE_SIZE * 1.6;
    }
    // The bench is the last thing left and the last to go.
    floor.material.uniforms.uOpacity.value =
      FLOOR_OPACITY *
      smooth((intro - BENCH_FROM) / (1 - BENCH_FROM)) *
      (1 - smooth((leave - BENCH_DARK_FROM) / (1 - BENCH_DARK_FROM))) *
      (1 - reading);

    readout.write(frame.now, () => {
      const kind = live.equationType === 'heat' ? 'heat' : 'wave';
      return `${kind} · t ${state.time.toFixed(3)} · rms ${rms(state.u).toFixed(2)}`;
    });
  };

  const resize = () => {
    // The number is set to the visible plate; set again once a real resize
    // has settled, not on every frame of a drag.
    const size = { width: stage.width, height: stage.height };
    if (viewportReshaped(glyphSize, size)) {
      window.clearTimeout(reshapeTimer);
      reshapeTimer = window.setTimeout(() => {
        glyphSize = size;
        buildNumber();
      }, RESHAPE_SETTLE_MS);
    }
  };

  return {
    update,
    resize,
    dispose() {
      window.clearTimeout(reshapeTimer);
      readout.clear();
      floor.dispose();
      geometry.dispose();
      material.dispose();
      mirrorMaterial.dispose();
      scaleTexture.dispose();
    },
  };
};

const PDESolverBackground: React.FC<
  AnimatedBackgroundProps<PDESolverSettings>
> = props => {
  const { className, settings } = props;
  // Structural only: these decide the grid and what is first put on it, so
  // changing one has to build the plate again. Everything else is read live.
  const containerRef = useStageScene(props, stageOptions, buildScene, [
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

  return (
    <StageSurface
      ref={containerRef}
      className={className}
      opacity={settings.opacity}
    />
  );
};

/**
 * Write the solver's field into the plate: each vertex's height and the
 * value it stands for, and then the normals that follow from the heights.
 * Returns the field's range — the largest magnitude on it — which is what
 * the colour scale and the contours are normalised by.
 *
 * This runs on every frame, over every vertex of the plate (16,384 of them at
 * the default grid), so it is written to do nothing but arithmetic on the
 * attributes' own arrays. The grid's cells and the plane's vertices are in
 * the same order (rows of gridSizeX), so the cell's index is the vertex's.
 */
export function writeField(
  geometry: THREE.PlaneGeometry,
  state: PDEState,
  heightScale: number
): number {
  const { u, gridSizeX, gridSizeY } = state;
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const values = geometry.attributes.aValue as THREE.BufferAttribute;

  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = 0; i < u.length; i++) {
    const value = u[i];
    if (value < minValue) minValue = value;
    if (value > maxValue) maxValue = value;
  }
  const range = Math.max(Math.abs(minValue), Math.abs(maxValue), 0.001);

  const position = positions.array as Float32Array;
  const value = values.array as Float32Array;
  const count = Math.min(gridSizeX * gridSizeY, positions.count);
  for (let idx = 0; idx < count; idx++) {
    const v = u[idx];
    position[idx * 3 + 2] = v * heightScale;
    value[idx] = v;
  }

  positions.needsUpdate = true;
  values.needsUpdate = true;
  writeVertexNormals(geometry);
  return range;
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
 * The colour scale as a table, which is what the plate's shader reads as a
 * texture: the scale is a function of one number that does not change from
 * one frame to the next, so it is worked out once per scale and looked up
 * per pixel after that.
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
