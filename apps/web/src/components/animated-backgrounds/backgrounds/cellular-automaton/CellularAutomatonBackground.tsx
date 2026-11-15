import React from 'react';
import * as THREE from 'three';
import { rasterizeGlyph } from '../../core/glyph';
import { NotFoundSequence } from '../../core/notFoundSequence';
import { Pose } from '../../core/stage/rig';
import { STAGE_GROUND, StageOptions } from '../../core/stage/stage';
import { createReadout, formatCount } from '../../core/stage/telemetry';
import {
  SceneContext,
  SceneHandle,
  StageSurface,
  useStageScene,
} from '../../core/stage/useStageScene';
import { AnimatedBackgroundProps } from '../../core/types';
import {
  decayHeat,
  makeRuleTables,
  PATTERNS,
  population,
  stampPattern,
  stepLife,
  stirCells,
} from './automaton';
import { CellularAutomatonSettings, LIFE_RULES } from './config';

/**
 * A Life-like cellular automaton, standing up.
 *
 * The simulation is what it was: a state buffer, `current` holding this
 * generation and `next` computed from it by counting each cell's eight
 * neighbours on a wrapping torus and applying the birth/survival rule. All of
 * it runs on the CPU, one generation at a time, and nothing drawn here ever
 * invents state.
 *
 * What changed is that a cell has a height. The board lies flat and is seen
 * from above and to one side; a live cell is a block standing on it, and how
 * tall the block is is how long the cell has lived. A blinker flickers at
 * ankle height. A block that has sat still for twenty generations is a
 * tower. So the one thing the flat picture could only say with colour —
 * which structures have settled and which are still being worked out — is
 * the skyline.
 *
 * The board carries the rest: the links between live neighbours (the same
 * eight-cell neighbourhood the rule is evaluated over), and a trail that
 * fades where life has recently been, so a glider is seen to have come from
 * somewhere.
 */

// Keep the grid bounded regardless of viewport or cell size.
const MAX_CELLS = 40000;

// The board is larger than the screen. From straight overhead the screen is
// a grid of some columns by some rows; seen at an angle the same screen
// takes in more ground than that, further away. These are how much wider and
// deeper the board is than that overhead grid.
const SPREAD_X = 1.55;
const SPREAD_Z = 1.75;

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

export const FOV_DEGREES = 30;
// How high over the board the camera rests: high enough to read the
// pattern, low enough that a block has a side.
const REST_ELEVATION = 0.72;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);

// A block's height, in cells: what a newborn stands at, and what the
// longest-lived reach.
const HEIGHT_YOUNG = 0.34;
const HEIGHT_OLD = 2.3;

// The pointer. How far around it the soup is stirred each generation, how
// likely each cell there is to be switched on, and how long after it last
// moved it goes on stirring.
const STIR_RADIUS = 2.6;
const STIR_CHANCE = 0.22;
const STIR_LINGER_MS = 700;

const stageOptions = (): StageOptions => ({
  // The poses are the scene's to give: they are measured in cells, and how
  // many cells there are is not known until the grid is.
  rig: {
    base: () => ({
      target: [0, 0, 0],
      distance: 60,
      azimuth: 0,
      elevation: 0.78,
      fov: FOV_DEGREES,
    }),
    minElevation: 0.35,
    parallax: { azimuth: 0.06, elevation: 0.04, hiddenGain: 4 },
  },
  near: 0.5,
  far: 2000,
  bloom: { strength: 0.62, threshold: 0.74, knee: 0.55, radius: 0.7 },
  grade: { vignette: 0.4 },
});

const FLOOR_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// The board. It samples the same state the blocks are built from — alive
// now, alive last generation, age, and the trail — and draws what lies flat:
// the lattice, the links, the glow a live cell throws on the ground it
// stands on, and where life has been.
const FLOOR_FRAGMENT = /* glsl */ `
  uniform sampler2D uState;
  uniform vec2 uGrid;
  uniform vec2 uGlide;
  uniform float uStep;
  uniform float uLinkWidth;
  uniform float uIntensity;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform vec3 uBackground;
  uniform vec3 uLink;
  uniform vec3 uGround;
  uniform vec4 uFade;
  uniform vec4 uProbe;
  uniform float uStrength;
  varying vec3 vWorld;

  vec4 stateAt(vec2 cell) {
    return texture2D(uState, (cell + 0.5) / uGrid);
  }

  float aliveAt(vec2 cell) {
    vec4 s = stateAt(cell);
    return mix(s.g, s.r, uStep);
  }

  float segmentDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  vec3 ageColor(float age) {
    vec3 c = mix(uSecondary, uPrimary, smoothstep(0.0, 0.13, age));
    return mix(c, uAccent, smoothstep(0.5, 1.0, age));
  }

  void main() {
    vec2 gridPos = vec2(vWorld.x + uGrid.x * 0.5, uGrid.y * 0.5 - vWorld.z) - uGlide;
    vec2 cell = floor(gridPos);
    vec2 local = fract(gridPos) - 0.5;

    vec4 state = stateAt(cell);
    float alive = mix(state.g, state.r, uStep);
    float heat = state.a;

    vec3 color = uBackground * 0.5;

    // The lattice: a point at every cell, so an empty board is still a
    // board, and the grid the rule runs on can be counted.
    float rate = max(fwidth(gridPos.x), fwidth(gridPos.y));
    float dotSize = 0.055 + rate * 0.6;
    float lattice = (1.0 - smoothstep(dotSize * 0.6, dotSize, length(local)))
      * (1.0 - smoothstep(0.12, 0.45, rate));
    color += uLink * lattice * 0.5;

    // Where life has been. Squared, so the trail is a tail and not a smear.
    float trail = heat * heat * heat * (1.0 - alive);
    float pool = 1.0 - smoothstep(0.08, 0.36, length(local));
    color += mix(uSecondary, uPrimary, 0.6) * trail * pool * 0.2;

    // Links between live neighbours — the neighbourhood the rule counts.
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
        float neighbour = aliveAt(cell + off);
        float dist = segmentDist(local, vec2(0.0), off * 0.5);
        float line = 1.0 - smoothstep(0.0, uLinkWidth, dist);
        links = max(links, line * neighbour * alive);
      }
      color += uLink * links * 0.9;
    }

    // The light a live cell throws on the ground under it.
    float under = (1.0 - smoothstep(0.2, 0.56, length(local))) * alive;
    color += ageColor(state.b) * under * 0.2;

    color *= uIntensity;

    // The pointer's mark on the board: a ring, and a pool of light in it.
    vec2 fromProbe = gridPos + uGlide - uProbe.xy;
    float d = length(fromProbe);
    float ring = 1.0 - smoothstep(0.0, 1.6, abs(d - uProbe.z) / max(fwidth(d), 1e-5));
    float pooled = exp(-d * d / (uProbe.z * uProbe.z * 1.6));
    color += vec3(0.85, 0.95, 0.9) * (ring * 0.6 + pooled * 0.09) * uProbe.w;

    // The board runs out into the dark rather than to an edge.
    float away = length((vWorld.xz - uFade.xy) / uFade.zw);
    color = mix(color, uGround, smoothstep(0.55, 1.0, away));

    gl_FragColor = vec4(mix(uGround, color, uStrength), 1.0);
  }
`;

// A live cell: a block, as tall as the cell is old, risen from the board on
// the generation it was born and sunk back into it on the one it died.
const CELL_VERTEX = /* glsl */ `
  attribute vec4 aCell;
  attribute float aAge;
  uniform vec2 uGrid;
  uniform vec2 uGlide;
  uniform float uStep;
  uniform float uCellScale;
  uniform vec2 uHeights;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vAge;
  varying float vAlive;

  void main() {
    // Eased between the last generation and this one: births rise, deaths
    // sink, and what merely survived stands still.
    float t = uStep * uStep * (3.0 - 2.0 * uStep);
    float alive = mix(aCell.w, aCell.z, t);
    float height = mix(uHeights.x, uHeights.y, smoothstep(0.0, 0.85, aAge)) * alive;
    float width = uCellScale * (0.55 + 0.45 * alive);

    vec2 p = mod(aCell.xy + 0.5 + uGlide, uGrid);
    vec3 world = vec3(
      p.x - uGrid.x * 0.5 + position.x * width,
      position.y * height,
      uGrid.y * 0.5 - p.y + position.z * width
    );

    vLocal = position;
    vNormal = normal;
    vWorld = world;
    vAge = aAge;
    vAlive = alive;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const CELL_FRAGMENT = /* glsl */ `
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform vec3 uGround;
  uniform vec3 uLight;
  uniform vec4 uFade;
  uniform float uIntensity;
  uniform float uStrength;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying float vAge;
  varying float vAlive;

  void main() {
    // The newborn colour is for the newborn: a cell that has lasted a few
    // generations is already the primary, and the longest-lived structures
    // drift on toward the accent.
    vec3 base = mix(uSecondary, uPrimary, smoothstep(0.0, 0.13, vAge));
    base = mix(base, uAccent, smoothstep(0.5, 1.0, vAge));

    // Clamped: at a block's silhouette a multisampled pixel is shaded from
    // just outside the face, where these run a hair past their ends.
    float rise = clamp(vLocal.y, 0.0, 1.0);
    float alive = clamp(vAlive, 0.0, 1.0);

    vec3 color;
    if (vNormal.y > 0.5) {
      // The top is the light: a lit tile, brightest along its edge, and
      // brighter the longer the cell has stood.
      float edge = clamp(max(abs(vLocal.x), abs(vLocal.z)) * 2.0, 0.0, 1.0);
      color = base * (0.62 + 0.5 * vAge + 0.8 * smoothstep(0.74, 1.0, edge));
    } else {
      // The sides are glass: dark at the foot, lit where they meet the top,
      // and a little brighter on the faces turned to the light.
      float facing = 0.5 + 0.5 * max(dot(vNormal, uLight), 0.0);
      color = base * (0.05 + 0.42 * rise * rise + 0.75 * smoothstep(0.9, 1.0, rise)) * facing;
    }
    color *= uIntensity * (0.25 + 0.75 * alive);

    float away = length((vWorld.xz - uFade.xy) / uFade.zw);
    color = mix(color, uGround, smoothstep(0.55, 1.0, away));

    gl_FragColor = vec4(color * uStrength, 1.0);
  }
`;

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<CellularAutomatonSettings>): SceneHandle => {
  const initial = settings();
  const { rule, cellSize, initialDensity } = initial;
  const tables = makeRuleTables(rule);

  // The grid the screen is, seen from straight overhead (`view`), and the
  // board the rule runs on, which is that and the ground around it.
  let view = { cols: 0, rows: 0 };
  let cols = 0;
  let rows = 0;
  let current = new Uint8Array(0);
  let next = new Uint8Array(0);
  let age = new Uint8Array(0);
  let previous = new Uint8Array(0);
  let heat = new Uint8Array(0);
  let pixels = new Uint8Array(0);
  let texture: THREE.DataTexture | null = null;
  let generation = 0;

  // The 404 sequence: the number as fixed cells. A cell in `held` is clamped
  // alive every generation — a boundary condition, the way the PDE's
  // Dirichlet edges are fixed values — and the rule runs honestly around it:
  // the number's edge is a wall of live cells, and Life births and kills
  // against a wall without rest, so the digits boil at their rims and throw
  // off what they throw off. The cells are switched on one by one over a few
  // seconds, in the order `writeOrder` gives, the way a pattern is put down
  // on a grid; let go, the clamp lifts the same way and the rule takes the
  // number apart on its own terms. How far along the writing is comes off
  // the shared sequence clock.
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

  /**
   * Rasterises the number onto the middle of the board — the part the
   * screen is from overhead, which is where it will be read from — and
   * shuffles the order it is written in.
   */
  const buildMask = () => {
    const field = rasterizeGlyph(view.cols, view.rows, { maxHeight: 0.72 });
    const left = Math.floor((cols - view.cols) / 2);
    const bottom = Math.floor((rows - view.rows) / 2);
    const order: number[] = [];
    // The board's rows run from the near edge away; the field's run from the
    // top of the screen down, which is the far edge first.
    for (let y = 0; y < view.rows; y++) {
      const from = (view.rows - 1 - y) * view.cols;
      for (let x = 0; x < view.cols; x++) {
        if (field.mask[from + x]) order.push((bottom + y) * cols + left + x);
      }
    }
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

  /** The overhead grid the current viewport calls for, within the budget. */
  const viewForViewport = () => {
    // While the number is on the grid it needs columns enough to be read.
    const finest = notFound() ? stage.width / MIN_GLYPH_COLS : Infinity;
    const px = Math.max(4, Math.min(cellSize, finest));
    let c = Math.max(8, Math.ceil(stage.width / px));
    let r = Math.max(8, Math.ceil(stage.height / px));

    // Preserve aspect while keeping the whole board under the cell budget.
    const budget = MAX_CELLS / (SPREAD_X * SPREAD_Z);
    if (c * r > budget) {
      const scale = Math.sqrt(budget / (c * r));
      c = Math.max(8, Math.floor(c * scale));
      r = Math.max(8, Math.floor(r * scale));
    }
    return { cols: c, rows: r };
  };

  /**
   * (Re)builds the board and its texture for the current viewport.
   *
   * `carryOver` keeps the running simulation across a resize: every cell the
   * two boards share — counted from their centres, since the centre is what
   * the camera looks at — keeps its state and age, and only newly exposed
   * ground is seeded. Mobile browsers fire a resize each time the URL bar
   * collapses or expands, which is to say on nearly every scroll, so
   * rebuilding from fresh soup there wipes the automaton out from under the
   * reader.
   */
  const buildGrid = (carryOver = false) => {
    const prev =
      carryOver && current.length > 0
        ? { cols, rows, current, age, heat }
        : null;

    view = viewForViewport();
    cols = Math.ceil(view.cols * SPREAD_X);
    rows = Math.ceil(view.rows * SPREAD_Z);
    const size = cols * rows;
    current = new Uint8Array(size);
    next = new Uint8Array(size);
    age = new Uint8Array(size);
    previous = new Uint8Array(size);
    heat = new Uint8Array(size);
    pixels = new Uint8Array(size * 4);

    if (prev) {
      const dx = Math.floor((prev.cols - cols) / 2);
      const dy = Math.floor((prev.rows - rows) / 2);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const to = y * cols + x;
          const fx = x + dx;
          const fy = y + dy;
          if (fx >= 0 && fy >= 0 && fx < prev.cols && fy < prev.rows) {
            const from = fy * prev.cols + fx;
            current[to] = prev.current[from];
            age[to] = prev.age[from];
            heat[to] = prev.heat[from];
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
    // The board is a torus: off one edge is on at the other.
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  };

  // The pointer's cell on the board, or null while it is off it.
  let pointerCell: { col: number; row: number } | null = null;
  let pointerMovedAt = -Infinity;

  /** Advances the automaton exactly one generation. */
  const step = (now: number) => {
    const live = settings();
    stepLife(current, next, cols, rows, tables);

    // Random soup under most rules settles into still lifes and oscillators.
    // A small perturbation keeps the background moving; set the rate to zero
    // to let it stall honestly.
    const rate = live.perturbationRate;
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

    // The pointer is a perturbation with an address: while it is moving over
    // the board, the soup under it is stirred.
    if (pointerCell && now - pointerMovedAt < STIR_LINGER_MS) {
      stirCells(
        next,
        cols,
        rows,
        pointerCell.col,
        pointerCell.row,
        STIR_RADIUS,
        STIR_CHANCE
      );
    }

    // The fixed cells, applied after the rule like any boundary condition.
    for (let k = 0; k < written; k++) next[writeOrder[k]] = 1;

    previous.set(current);
    for (let i = 0; i < next.length; i++) {
      // Age saturates at 255 so long-lived structures stop shifting color.
      age[i] = next[i] === 1 ? Math.min(255, age[i] + 1) : 0;
      current[i] = next[i];
    }
    decayHeat(heat, current);
    generation += 1;
  };

  /**
   * Advances the writing of the number by `dt` seconds toward the flag:
   * cells go down while it is up and are let go of, last down first,
   * once it drops. What is written is held from the next generation on.
   */
  const writeNumber = (dt: number, on: boolean, frozen: boolean) => {
    if (frozen) sequence.settle(on);
    else sequence.advance(dt, on);
    const target = Math.round(sequence.raw * writeOrder.length);
    for (; written < target; written++) {
      const i = writeOrder[written];
      held[i] = 1;
      // Put down now rather than at the next generation, so the number is
      // seen being written rather than appearing a step at a time — and in
      // the generation before as well, since each block eases in from that
      // one and a still gets no second frame.
      current[i] = 1;
      previous[i] = 1;
    }
    for (; written > target; written--) held[writeOrder[written - 1]] = 0;
  };

  // ── What is drawn ────────────────────────────────────────────────────────
  const asColor = (rgb: [number, number, number]) =>
    new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  const ground = new THREE.Color(STAGE_GROUND);
  const colorUniforms = {
    uPrimary: { value: asColor(initial.colors.primary) },
    uSecondary: { value: asColor(initial.colors.secondary) },
    uAccent: { value: asColor(initial.colors.accent) },
    uBackground: { value: asColor(initial.colors.background) },
    uLink: { value: asColor(initial.colors.grid) },
  };
  // Shared between the board and the blocks, so the two can never disagree
  // about where a cell is or how far along a generation is.
  const shared = {
    uGrid: { value: new THREE.Vector2(1, 1) },
    uGlide: { value: new THREE.Vector2(0, 0) },
    uStep: { value: 1 },
    uIntensity: { value: initial.activityIntensity },
    uGround: { value: ground },
    // Where the board fades from, and over what radii: x, z, rx, rz.
    uFade: { value: new THREE.Vector4(0, 0, 1, 1) },
    uStrength: { value: 0 },
  };

  const stateTexture = buildGrid();

  const floorMaterial = new THREE.ShaderMaterial({
    vertexShader: FLOOR_VERTEX,
    fragmentShader: FLOOR_FRAGMENT,
    uniforms: {
      ...shared,
      ...colorUniforms,
      uState: { value: stateTexture },
      uLinkWidth: { value: initial.connectionLineWidth },
      uProbe: { value: new THREE.Vector4(0, 0, STIR_RADIUS, 0) },
    },
  });
  const floorGeometry = new THREE.PlaneGeometry(1, 1);
  floorGeometry.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.frustumCulled = false;
  stage.scene.add(floor);

  // One box, drawn once per live cell. Its base is on the board and its
  // height is one, so the vertex shader can stand it up by the cell's age.
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const cells = new THREE.InstancedBufferGeometry();
  cells.index = box.index;
  cells.setAttribute('position', box.attributes.position);
  cells.setAttribute('normal', box.attributes.normal);
  let capacity = 0;
  let cellData = new Float32Array(0);
  let ageData = new Float32Array(0);
  let cellAttribute: THREE.InstancedBufferAttribute | null = null;
  let ageAttribute: THREE.InstancedBufferAttribute | null = null;

  const cellMaterial = new THREE.ShaderMaterial({
    vertexShader: CELL_VERTEX,
    fragmentShader: CELL_FRAGMENT,
    uniforms: {
      ...shared,
      ...colorUniforms,
      uCellScale: { value: initial.cellScale },
      uHeights: { value: new THREE.Vector2(HEIGHT_YOUNG, HEIGHT_OLD) },
      uLight: { value: new THREE.Vector3(-0.5, 0.3, 0.8).normalize() },
    },
  });
  const blocks = new THREE.Mesh(cells, cellMaterial);
  blocks.frustumCulled = false;
  stage.scene.add(blocks);

  /** Room in the instance buffers for every cell the board could hold. */
  const sizeBuffers = () => {
    if (cols * rows <= capacity) return;
    capacity = cols * rows;
    cellData = new Float32Array(capacity * 4);
    ageData = new Float32Array(capacity);
    cellAttribute = new THREE.InstancedBufferAttribute(cellData, 4);
    ageAttribute = new THREE.InstancedBufferAttribute(ageData, 1);
    cellAttribute.setUsage(THREE.DynamicDrawUsage);
    ageAttribute.setUsage(THREE.DynamicDrawUsage);
    cells.setAttribute('aCell', cellAttribute);
    cells.setAttribute('aAge', ageAttribute);
  };

  /**
   * Copies the simulation's state to where it is drawn from: the texture
   * the board samples, and one instance for each cell that is alive or was a
   * generation ago — the ones dying are still on their way down.
   */
  const publish = () => {
    let count = 0;
    for (let i = 0; i < current.length; i++) {
      const o = i * 4;
      const now = current[i];
      const before = previous[i];
      const aged = Math.min(255, age[i] * 12);
      pixels[o] = now * 255;
      pixels[o + 1] = before * 255;
      pixels[o + 2] = aged;
      pixels[o + 3] = heat[i];
      if (now === 1 || before === 1) {
        const at = count * 4;
        cellData[at] = i % cols;
        cellData[at + 1] = (i - (i % cols)) / cols;
        cellData[at + 2] = now;
        cellData[at + 3] = before;
        ageData[count] = aged / 255;
        count += 1;
      }
    }
    cells.instanceCount = count;
    if (texture) texture.needsUpdate = true;
    if (cellAttribute) cellAttribute.needsUpdate = true;
    if (ageAttribute) ageAttribute.needsUpdate = true;
  };

  /** Everything that depends on the board's shape, set from it. */
  const fitBoard = () => {
    sizeBuffers();
    shared.uGrid.value.set(cols, rows);
    floorMaterial.uniforms.uState.value = texture;
    // The floor is far larger than the board: the board is a torus, so the
    // ground simply carries on, and the fade takes it before it repeats.
    floor.scale.set(cols * 3, 1, rows * 3);
  };
  fitBoard();
  publish();

  // ── The camera ───────────────────────────────────────────────────────────
  // Measured in cells: from straight overhead, half the view's rows fill
  // half the screen. Everything else is that distance, tilted.
  const overhead = () => view.rows / 2 / TAN_HALF_FOV;
  const restPose = (aspect: number): Pose => ({
    // The view at this tilt takes in more ground beyond its target than
    // before it; the target sits forward so the board is centred in it.
    target: [0, 0, view.rows * 0.15],
    distance: overhead() * (aspect < 1 ? 0.92 : 0.82),
    azimuth: 0,
    elevation: REST_ELEVATION,
    fov: FOV_DEGREES,
  });
  stage.rig.config = {
    ...stage.rig.config,
    base: restPose,
    hidden: aspect => ({
      target: [0, 0, view.rows * 0.2],
      distance: overhead() * (aspect < 1 ? 1 : 0.9),
      azimuth: 0,
      elevation: 0.6,
      fov: FOV_DEGREES,
    }),
    reading: () => ({
      target: [0, 0, 0],
      distance: overhead(),
      azimuth: 0,
      elevation: Math.PI / 2,
      fov: FOV_DEGREES,
    }),
  };

  // ── The glide ────────────────────────────────────────────────────────────
  // The board is a torus, so it has no edge to arrive at: the camera can
  // travel over it for as long as it likes. The cells are what move — toward
  // the viewer, wrapping at the board's edge, out in the dark where the wrap
  // is not seen.
  const glide = shared.uGlide.value;

  // ── The pointer ──────────────────────────────────────────────────────────
  const hit = new THREE.Vector3();
  let lastPaint: { col: number; row: number } | null = null;

  /** The board cell under a point on screen. */
  const cellAt = (ndcX: number, ndcY: number) => {
    if (!stage.groundPoint(ndcX, ndcY, 0, hit)) return null;
    const col = hit.x + cols / 2 - glide.x;
    const row = rows / 2 - hit.z - glide.y;
    // Only on the part of the board that is in the light.
    if (Math.abs(hit.x) > cols * 0.5 || Math.abs(hit.z) > rows * 0.5) {
      return null;
    }
    return { col: col - 0.5, row: row - 0.5 };
  };

  const applyPointer = (now: number, reading: number) => {
    const pointer = stage.pointer.state;
    const probe = floorMaterial.uniforms.uProbe.value as THREE.Vector4;
    const quiet = reading > 0.5;
    let changed = false;

    // A tap puts a pattern down: something that travels, or something that
    // takes a thousand generations to finish what it starts.
    for (const tap of stage.pointer.takeTaps()) {
      const at = quiet ? null : cellAt(tap.x, tap.y);
      if (!at) continue;
      const names = Object.keys(PATTERNS);
      const pattern = PATTERNS[names[Math.floor(Math.random() * names.length)]];
      stampPattern(
        current,
        cols,
        rows,
        at.col,
        at.row,
        pattern,
        Math.floor(Math.random() * 4)
      );
      changed = true;
    }

    const at = !quiet && pointer.present ? cellAt(pointer.x, pointer.y) : null;
    probe.w += ((at ? 1 : 0) - probe.w) * 0.2;
    if (!at) {
      pointerCell = null;
      lastPaint = null;
      return changed;
    }
    if (
      !pointerCell ||
      Math.abs(pointerCell.col - at.col) > 0.3 ||
      Math.abs(pointerCell.row - at.row) > 0.3
    ) {
      pointerMovedAt = now;
    }
    pointerCell = at;
    probe.x = at.col + 0.5 + glide.x;
    probe.y = at.row + 0.5 + glide.y;
    probe.z = pointer.pressed ? 1.3 : STIR_RADIUS;

    // A press draws: every cell the stroke crosses is switched on, now.
    if (pointer.pressed) {
      const from = lastPaint ?? at;
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(at.col - from.col, at.row - from.row))
      );
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const cx = Math.round(from.col + (at.col - from.col) * t);
        const cy = Math.round(from.row + (at.row - from.row) * t);
        const index =
          (((cy % rows) + rows) % rows) * cols + (((cx % cols) + cols) % cols);
        if (current[index] === 0) {
          current[index] = 1;
          changed = true;
        }
      }
      lastPaint = at;
      pointerMovedAt = now;
    } else {
      lastPaint = null;
    }
    return changed;
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  let sinceStep = 0;
  let lastPopulation = -1;
  let stalledFor = 0;
  let live = population(current);

  /**
   * Rebuilds the board when the viewport — or the 404 sequence, which asks
   * for a finer grid on a narrow screen — calls for a different shape.
   * Everything the two boards share carries over.
   */
  const syncGrid = () => {
    const target = viewForViewport();
    if (target.cols === view.cols && target.rows === view.rows) return false;
    buildGrid(true);
    fitBoard();
    publish();
    return true;
  };

  const update: SceneHandle['update'] = frame => {
    const now = settings();
    const on = notFound();
    const { dt } = frame;

    // Animation Speed is a master multiplier over this background's own
    // rate, so it means the same thing here as it does everywhere else.
    const interval =
      1 / Math.max(0.1, now.generationsPerSecond * now.globalTimeMultiplier);

    const wasWriting = written > 0;
    syncGrid();
    writeNumber(dt, on, frame.frozen);
    const reading = sequence.value;
    stage.reading = reading;
    let dirty = false;

    // A still of soup that has never been stepped is a picture of nothing
    // yet: every cell the same age, the same colour and the same height. So
    // a still is drawn some generations in, where the board has a skyline.
    if (frame.frozen && generation === 0) {
      for (let i = 0; i < STILL_GENERATIONS; i++) step(frame.now);
      dirty = true;
    }

    // A still gets one frame, and the frame the number was put down in is
    // not the one to hold: every cell on the grid is the same age, and the
    // soup still fills the digits' counters. What a still shows is the grid
    // some generations on — the number aged into its own colour, the rule
    // having worked the soup around it. Let go, a still would keep the
    // number's cells for good, so it goes back to fresh soup, which is what
    // a still shows everywhere else.
    if (frame.frozen && written > 0 !== wasWriting) {
      if (written > 0) {
        for (let i = 0; i < STILL_GENERATIONS; i++) step(frame.now);
      } else {
        seed();
      }
      dirty = true;
    }
    // The number arriving, or leaving, is worth a frame of its own.
    if (written > 0 !== wasWriting || written < writeOrder.length) dirty = true;

    if (!frame.frozen) {
      if (applyPointer(frame.now, reading)) dirty = true;

      sinceStep += dt;
      if (sinceStep >= interval) {
        // One generation a frame at most: a long frame is a late
        // generation, not a burst of them.
        sinceStep = Math.min(sinceStep - interval, interval);
        step(frame.now);
        dirty = true;

        // A grid whose population stops changing has converged on still
        // lifes and short oscillators; reseed rather than sit on a frozen
        // frame. Held cells count too, and a held number never stalls: its
        // rim is always being born against.
        live = population(current);
        stalledFor = live === lastPopulation ? stalledFor + 1 : 0;
        lastPopulation = live;
        if (stalledFor >= STALL_GENERATIONS || live === 0) {
          seed();
          stalledFor = 0;
          lastPopulation = -1;
        }
      }

      // The glide stands down for the number, and the board comes back to
      // where the number was written on it.
      const drift = now.glideSpeed * now.globalTimeMultiplier * (1 - reading);
      glide.y = (((glide.y - drift * dt) % rows) + rows) % rows;
      if (reading > 0) {
        const home = glide.y > rows / 2 ? rows : 0;
        glide.y += (home - glide.y) * Math.min(1, dt * 2.5) * reading;
      }
    } else {
      glide.set(0, 0);
    }

    if (dirty) publish();

    const arrive = frame.intro * frame.intro * (3 - 2 * frame.intro);
    shared.uStep.value = frame.frozen ? 1 : Math.min(1, sinceStep / interval);
    shared.uIntensity.value = now.activityIntensity;
    shared.uStrength.value = arrive;
    // The light falls off around where the camera is looking; from overhead
    // it covers the whole of what is seen.
    const pose = stage.rig.pose;
    const wide = 1 + reading * 2;
    shared.uFade.value.set(
      pose.target[0],
      // Centred nearer the viewer than the camera's target: the far ground
      // is what falls into the dark, which is also where the page's title
      // is.
      pose.target[2] + view.rows * 0.1 * (1 - reading),
      view.cols * 0.78 * wide,
      view.rows * 0.72 * wide
    );
    floorMaterial.uniforms.uLinkWidth.value = now.connectionLineWidth;
    cellMaterial.uniforms.uCellScale.value = now.cellScale;
    // The blocks rise out of the board as the scene arrives.
    cellMaterial.uniforms.uHeights.value.set(
      HEIGHT_YOUNG * arrive,
      HEIGHT_OLD * arrive
    );
    colorUniforms.uPrimary.value.setRGB(
      ...now.colors.primary,
      THREE.SRGBColorSpace
    );
    colorUniforms.uSecondary.value.setRGB(
      ...now.colors.secondary,
      THREE.SRGBColorSpace
    );
    colorUniforms.uAccent.value.setRGB(
      ...now.colors.accent,
      THREE.SRGBColorSpace
    );
    colorUniforms.uBackground.value.setRGB(
      ...now.colors.background,
      THREE.SRGBColorSpace
    );
    colorUniforms.uLink.value.setRGB(...now.colors.grid, THREE.SRGBColorSpace);

    readout.write(frame.now, () => {
      const { birth, survival } = LIFE_RULES[rule] ?? LIFE_RULES.conway;
      return `gen ${formatCount(generation)} · pop ${formatCount(live)} · b${birth.join('')}/s${survival.join('')}`;
    });
  };

  return {
    update,
    // Most resizes are a few pixels of browser chrome and leave the grid the
    // same shape, in which case there is nothing to rebuild at all.
    resize: () => {
      syncGrid();
    },
    dispose() {
      readout.clear();
      texture?.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      box.dispose();
      cells.dispose();
      cellMaterial.dispose();
    },
  };
};

const CellularAutomatonBackground: React.FC<
  AnimatedBackgroundProps<CellularAutomatonSettings>
> = props => {
  const { className, settings } = props;
  // Structural settings: the rule, the grid and what it is seeded with.
  // Everything else is a uniform, or a rate read each frame, so that nudging
  // a colour or a speed does not restart the simulation.
  const containerRef = useStageScene(props, stageOptions, buildScene, [
    settings.rule,
    settings.cellSize,
    settings.initialDensity,
  ]);

  return (
    <StageSurface
      ref={containerRef}
      className={className}
      opacity={settings.opacity}
    />
  );
};

export default CellularAutomatonBackground;
