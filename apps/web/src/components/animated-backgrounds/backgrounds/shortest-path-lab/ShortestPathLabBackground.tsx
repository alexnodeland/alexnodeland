import React from 'react';
import * as THREE from 'three';
import { glyphGraphFor } from '../../core/glyph';
import { advanceMorph, beginMorph, Morph } from '../../core/lines';
import {
  NotFoundSequence,
  RESHAPE_SETTLE_MS,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { createFloor } from '../../core/stage/floor';
import { clamp01, easeOutBack, smooth } from '../../core/stage/passage';
import { createRibbons } from '../../core/stage/ribbons';
import { Pose } from '../../core/stage/rig';
import { createSprites } from '../../core/stage/sprites';
import { StageOptions } from '../../core/stage/stage';
import { createReadout } from '../../core/stage/telemetry';
import {
  SceneContext,
  SceneHandle,
  StageSurface,
  useStageScene,
} from '../../core/stage/useStageScene';
import { AnimatedBackgroundProps } from '../../core/types';
import { ShortestPathLabSettings } from './config';

/**
 * A shortest-path search, drawn as the landscape it is searching.
 *
 * Dijkstra's algorithm and A* both work by settling, for one node after
 * another, the cost of the cheapest way there from the start. That cost is a
 * number at every node the search has reached — a field over the graph — and
 * here it is the node's height. The graph starts flat on the bench. As the
 * search reaches a node it rises to its cost, so the explored region lifts
 * into a bowl with the start at the bottom of it, and the shape of that bowl
 * is the algorithm: a round one for Dijkstra, which explores every direction
 * alike, and a trough stretched toward the goal as the heuristic's weight
 * goes up.
 *
 * The shortest path is then the one thing it always was on such a surface:
 * the way down. When the goal is reached the route back is the line a marble
 * would take from the goal to the start, and the marble is drawn taking it.
 */

// The 404 sequence. The search runs at least this fast through the number,
// since two hundred nodes at four steps a second is a minute, and the dot
// walks the path this much faster than usual.
const GLYPH_MIN_STEPS_PER_SECOND = 22;
const GLYPH_WALK_BOOST = 3;
// Room for either graph the lab draws, and for the marble.
const NODE_CAPACITY = 320;
const EDGE_CAPACITY = 3600;
// How long the nodes take to fly into the number, to re-settle when it is
// laid out again, to scatter once the page is left, and to move from one
// random graph to the next.
const MORPH_IN_MS = 2200;
const MORPH_AGAIN_MS = 700;
const MORPH_OUT_MS = 1600;
const MORPH_NEXT_MS = 900;

export const FOV_DEGREES = 36;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);

// World height per unit of path cost, at a relief of one. A long path on
// these graphs costs two or three units, so at the default relief the far
// rim of the bowl stands about half a unit off the bench: tall enough to
// read, low enough to stay in the picture.
const HEIGHT_PER_COST = 0.36;
// How quickly a node rises to its cost, or settles back, per second.
const RISE_RATE = 5;
// How close to a node the pointer has to be to have it, in screen heights.
const REACH = 0.14;
const FLOOR_OPACITY = 0.13;
// How far the layout's plane is spread across the bench, front to back.
const SPREAD_DEPTH = 2.1;

// How far the floor's grid reaches once the scene is all there.
const FLOOR_REACH = 2.1;

// ── Coming on and going off ────────────────────────────────────────────────
// The map is surveyed before it is searched. A front spreads from the start
// node across the bench: a node is found when the front reaches it and
// swells up out of nothing, an edge is drawn from its nearer end as the
// front runs along it, and the ruled floor spreads out underneath from the
// same place. It is the search's own shape — everything in order of its
// distance from the start — at a speed a search is never run at.
//
// Leaving is the same front going home. First the landscape is let down:
// every node that had risen to its cost sinks back to the bench. Then the
// map is rolled up from its far side, edges drawn back in, nodes going out,
// until the start is the last thing there and then it is not.
//
// One number does both: where the front is, in the same units as a node's
// place in the survey (0 at the start, 1 at the farthest node).

/** How much of the survey a node takes to swell up once the front has it. */
export const SURVEY_WIDTH = 0.2;
// The least of the survey an edge takes to be drawn, however short it is.
const EDGE_MIN_SPAN = 0.06;
// The arrival this scene asks the stage for, and how much of it has passed
// before the search is let go: the map is surveyed first.
const INTRO_SECONDS = 2.2;
const SEARCH_FROM = 0.55;
// The share of a leaving the landscape takes to come down, and the point
// in it at which the rolling-up starts.
const LET_DOWN = 0.45;
const ROLL_FROM = 0.14;

/**
 * Each node's place in the survey into `out`: its distance from the start
 * across the bench, as a share of the farthest node's.
 */
export const surveyOrder = (
  nodes: ReadonlyArray<{ position: { x: number; y: number } }>,
  start: number,
  spreadX: number,
  spreadZ: number,
  out: Float32Array
): Float32Array => {
  const origin = nodes[start]?.position ?? { x: 0, y: 0 };
  let farthest = 0;
  const count = Math.min(nodes.length, out.length);
  for (let i = 0; i < count; i++) {
    const d = Math.hypot(
      (nodes[i].position.x - origin.x) * spreadX,
      (nodes[i].position.y - origin.y) * spreadZ
    );
    out[i] = d;
    if (d > farthest) farthest = d;
  }
  if (farthest > 0) for (let i = 0; i < count; i++) out[i] /= farthest;
  return out;
};

// How far past the last node the front ends up: clear of it, so that
// "everything is there" is exact rather than a rounding away from it.
const SURVEY_MARGIN = 0.05;

/**
 * Where the front is: −SURVEY_WIDTH with nothing found, a little past
 * 1 + SURVEY_WIDTH with everything there. It runs out as the scene arrives
 * and back as it leaves, and whichever has it further in wins — so a leaving
 * taken back runs out again from where it had got to.
 */
export const surveyFront = (intro: number, outro: number): number => {
  // Nearly a steady walk, easing only as it reaches the far side: a front
  // that sprinted and then crawled would be an explosion, not a survey.
  const x = clamp01((intro - 0.03) / 0.87);
  const out = x * (1.4 - 0.4 * x);
  const back = smooth((outro - ROLL_FROM) / (0.97 - ROLL_FROM));
  const reach = Math.min(out, 1 - back);
  return -SURVEY_WIDTH + reach * (1 + 2 * SURVEY_WIDTH + SURVEY_MARGIN);
};

/** How far a node at `order` has swelled, 0 → 1, with the front at `front`. */
export const surveyed = (front: number, order: number): number =>
  clamp01((front - order) / SURVEY_WIDTH);

/**
 * How much of an edge is drawn, from its nearer end: none until the front
 * reaches that end, all of it as the front reaches the farther one.
 */
export const drawnShare = (front: number, near: number, far: number): number =>
  clamp01((front - near) / Math.max(far - near, EDGE_MIN_SPAN));

/** How much of its height the landscape still has, `outro` into leaving. */
export const standing = (outro: number): number => 1 - smooth(outro / LET_DOWN);

type Vector2 = { x: number; y: number };

interface LabNode {
  id: number;
  position: Vector2;
}

interface LabEdge {
  source: number;
  target: number;
  weight: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomGraph(
  totalNodes: number,
  edgeDensity: number,
  rng: () => number
): { nodes: LabNode[]; edges: LabEdge[] } {
  const nodes: LabNode[] = [];
  for (let i = 0; i < totalNodes; i++) {
    nodes.push({
      id: i,
      position: {
        x: (rng() - 0.5) * 1.8,
        y: (rng() - 0.5) * 1.0,
      },
    });
  }

  const edges: LabEdge[] = [];
  for (let i = 0; i < totalNodes; i++) {
    for (let j = i + 1; j < totalNodes; j++) {
      if (rng() < edgeDensity) {
        // Weight is Euclidean distance
        const dx = nodes[i].position.x - nodes[j].position.x;
        const dy = nodes[i].position.y - nodes[j].position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        edges.push({ source: i, target: j, weight: dist });
      }
    }
  }
  return { nodes, edges };
}

export function reconstructPath(
  prev: Map<number, number>,
  goal: number
): number[] {
  const path: number[] = [];
  let current: number | undefined = goal;
  while (current !== undefined) {
    path.push(current);
    current = prev.get(current);
  }
  return path.reverse();
}

function heuristic(a: LabNode, b: LabNode): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The number as a graph, for the 404 sequence: the shared construction (see
 * glyphGraph), with each edge weighted by its length — the same Euclidean
 * weight the random graph's edges carry, so the search is the same search.
 * Null when the number cannot be drawn (no canvas to rasterise it on).
 */
function generateGlyphGraph(
  width: number,
  height: number,
  rng: () => number
): { nodes: LabNode[]; edges: LabEdge[] } | null {
  const graph = glyphGraphFor(width, height, rng);
  if (!graph) return null;
  return {
    nodes: graph.points.map((p, id) => ({ id, position: { x: p.x, y: p.y } })),
    edges: graph.edges.map(e => ({
      source: e.a,
      target: e.b,
      weight: e.length,
    })),
  };
}

/**
 * Where a search through the number runs from and to. The first one crosses
 * the whole number, end to end; later ones pick a far-apart pair at random.
 */
function pickGlyphEndpoints(
  nodes: LabNode[],
  rng: () => number,
  first: boolean
): [number, number] {
  let start = 0;
  let goal = 0;
  if (first) {
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].position.x < nodes[start].position.x) start = i;
      if (nodes[i].position.x > nodes[goal].position.x) goal = i;
    }
    return [start, goal];
  }
  start = Math.floor(rng() * nodes.length);
  const far: number[] = [];
  let farthest = start;
  let farthestD = 0;
  for (let i = 0; i < nodes.length; i++) {
    const d = heuristic(nodes[i], nodes[start]);
    if (d > 0.9) far.push(i);
    if (d > farthestD) {
      farthestD = d;
      farthest = i;
    }
  }
  goal = far.length ? far[Math.floor(rng() * far.length)] : farthest;
  return [start, goal];
}

/**
 * Where the camera rests: above one end of the bench, looking across it, so
 * the bowl the search lifts has a near side and a far one — and close, so
 * that the graph is larger than the screen. The page's window covers the
 * middle of every screen; a graph that fitted the screen sat under it. From
 * here the near nodes run off the foot of the field, the far rim of the
 * bowl rises into the band behind the title, and the search crosses under
 * the glass between them.
 */
export const restPose = (aspect: number): Pose => ({
  target: [0, 0.14, 0.1],
  distance: (aspect < 1 ? 0.9 : 0.62) / TAN_HALF_FOV,
  azimuth: -0.22,
  elevation: 0.5,
  fov: FOV_DEGREES,
});

/**
 * With the page out of the way: back to where the whole graph is in view,
 * and lower, where the relief reads as relief.
 */
export const showPose = (aspect: number): Pose => ({
  target: [0, 0.18, 0.08],
  distance: (aspect < 1 ? 1.36 : 1.0) / TAN_HALF_FOV,
  azimuth: -0.3,
  elevation: 0.36,
  fov: FOV_DEGREES,
});

/**
 * Squared up for the number: straight overhead, at the height from which
 * the screen is exactly the plane the number was laid out in.
 */
export const readingPose = (): Pose => ({
  target: [0, 0, 0],
  distance: 1 / TAN_HALF_FOV,
  azimuth: 0,
  elevation: Math.PI / 2,
  fov: FOV_DEGREES,
});

const stageOptions = (settings: ShortestPathLabSettings): StageOptions => ({
  rig: {
    base: restPose,
    hidden: showPose,
    reading: readingPose,
    minElevation: 0.16,
    parallax: { azimuth: 0.08, elevation: 0.05, hiddenGain: 4 },
    drift: { azimuth: 0.11, elevation: 0.02, period: 52 },
  },
  bloom:
    settings.spGlowBloom > 0.5
      ? { strength: 0.6, threshold: 0.64, knee: 0.6, radius: 0.72 }
      : { strength: 0 },
  grade: { vignette: 0.38 },
  introSeconds: INTRO_SECONDS,
});

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<ShortestPathLabSettings>): SceneHandle => {
  const initial = settings();

  // Structural parameters — these define the graph and the search, so
  // changing one has to rebuild.
  const totalNodes = initial.spTotalNodes;
  const edgeDensity = Math.min(1, Math.max(0.05, initial.spEdgeDensity));
  const heuristicWeight = initial.spHeuristicWeight; // 0=Dijkstra, 1=A*

  // Everything below is read per frame instead of captured: rebuilding the
  // scene mid-drag restarted the search on every input event.
  // Animation Speed is a master multiplier over this background's own rates.
  const liveStepsPerSecond = () =>
    Math.max(
      0.1,
      settings().spAnimationSpeed * settings().globalTimeMultiplier
    );

  let seed = 424242;
  let rngFunc = mulberry32(seed);
  let { nodes, edges } = generateRandomGraph(totalNodes, edgeDensity, rngFunc);

  const settingsStart = Math.min(
    totalNodes - 1,
    Math.max(0, initial.spStartNode)
  );
  const settingsGoal = Math.min(
    totalNodes - 1,
    Math.max(0, initial.spGoalNode)
  );
  let startNode = settingsStart;
  let goalNode = settingsGoal;

  // ── The 404 sequence ─────────────────────────────────────────────────────
  // The lab already throws its graph away and draws a new one after every
  // search. The 404 is a graph of its own shape: the nodes fly into the
  // number, joined along its strokes, and the search runs through it —
  // lighting the digits up as it explores, and walking the path from one
  // end of the number to the other. Each search done, the number is laid
  // out again and searched between two new points. Let go, the nodes
  // scatter back into a random graph and the lab carries on.
  const sequence = new NotFoundSequence();
  let progress = 0;
  // Whether the graph on screen is the number, and which kind was asked
  // for last — a number that could not be drawn must not be asked for
  // again every frame.
  let glyphMode = false;
  let lastKind: 'random' | 'glyph' = 'random';
  let glyphRuns = 0;
  let glyphSize = { width: stage.width, height: stage.height };
  // Nodes in flight between two layouts.
  let morph: Morph | null = null;

  // ── The search ───────────────────────────────────────────────────────────
  // Priority queue using simple array for clarity (small N)
  const openSet: number[] = [];
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>();
  const fScore = new Map<number, number>();
  const inOpen = new Set<number>();
  const closed = new Set<number>();
  let foundPath: number[] = [];
  // The node the search most recently settled: where it is, as far as a
  // reader can point to.
  let lastSettled = 0;

  /** Starts a search on the graph as it stands, from the start to the goal. */
  const resetSearch = () => {
    openSet.length = 0;
    openSet.push(startNode);
    cameFrom.clear();
    gScore.clear();
    fScore.clear();
    inOpen.clear();
    closed.clear();
    inOpen.add(startNode);
    for (const n of nodes) {
      gScore.set(n.id, n.id === startNode ? 0 : Infinity);
      const h = heuristicWeight * heuristic(n, nodes[goalNode]);
      fScore.set(n.id, n.id === startNode ? h : Infinity);
    }
    foundPath = [];
    lastSettled = startNode;
    walking = false;
    walkFrom = -1;
    pendingRegenerate = false;
  };

  // The marble: where along the path it is, once there is a path.
  let walking = false;
  let walkFrom = -1;
  let walkTo = -1;
  let walkT = 0;
  let pendingRegenerate = false;
  let regenerateAt = 0;
  let sinceStep = 0;

  resetSearch();

  function neighbors(id: number): LabEdge[] {
    return edges.filter(e => e.source === id || e.target === id);
  }

  /** One expansion of the search. */
  function searchStep() {
    if (openSet.length === 0 || foundPath.length > 0) return;

    // Pick node with smallest fScore
    openSet.sort((a, b) => fScore.get(a)! - fScore.get(b)!);
    const current = openSet.shift()!;
    inOpen.delete(current);
    closed.add(current);
    lastSettled = current;

    if (current === goalNode) {
      foundPath = reconstructPath(cameFrom, current);
      // The marble is let go at the goal.
      walking = foundPath.length > 1;
      walkFrom = foundPath.length - 1;
      walkTo = foundPath.length - 2;
      walkT = 0;
      return;
    }

    // Explore neighbors
    for (const e of neighbors(current)) {
      const neighbor = e.source === current ? e.target : e.source;
      if (closed.has(neighbor)) continue;

      const tentativeG = gScore.get(current)! + e.weight;
      if (!inOpen.has(neighbor)) {
        openSet.push(neighbor);
        inOpen.add(neighbor);
      } else if (tentativeG >= gScore.get(neighbor)!) {
        continue;
      }

      cameFrom.set(neighbor, current);
      gScore.set(neighbor, tentativeG);
      const h = heuristicWeight * heuristic(nodes[neighbor], nodes[goalNode]);
      fScore.set(neighbor, tentativeG + h);
    }
  }

  /**
   * Replaces the graph with `built` and starts a search through it from
   * `start` to `goal`. With a `morphMs`, the new nodes set off from where
   * the old ones were — each from the old node at its index, wrapping, so
   * a bigger graph grows out of the smaller one — and fly to their places.
   */
  const rebuild = (
    built: { nodes: LabNode[]; edges: LabEdge[] },
    start: number,
    goal: number,
    now: number,
    morphMs: number
  ) => {
    const previous = nodes;
    const count = built.nodes.length;
    nodes = built.nodes;
    edges = built.edges;
    startNode = Math.min(count - 1, Math.max(0, start));
    goalNode = Math.min(count - 1, Math.max(0, goal));
    morph = beginMorph(previous, nodes, now, morphMs);
    hovered = -1;
    resetSearch();
    orderNodes();
  };

  /**
   * A new graph: the number while the 404 is up, a random one otherwise,
   * with a new seed either way.
   */
  const regenerate = (now: number, frozen: boolean) => {
    const wantGlyph = notFound();
    lastKind = wantGlyph ? 'glyph' : 'random';
    seed = (seed * 1664525 + 1013904223) >>> 0; // LCG step for new seed
    rngFunc = mulberry32(seed);

    const wasGlyph = glyphMode;
    let built: { nodes: LabNode[]; edges: LabEdge[] } | null = null;
    if (wantGlyph) {
      built = generateGlyphGraph(glyphSize.width, glyphSize.height, rngFunc);
    }
    glyphMode = built !== null;
    if (!built) {
      built = generateRandomGraph(totalNodes, edgeDensity, rngFunc);
    }

    const [start, goal] = glyphMode
      ? pickGlyphEndpoints(built.nodes, rngFunc, glyphRuns === 0)
      : [settingsStart, settingsGoal];
    glyphRuns = glyphMode ? glyphRuns + 1 : 0;

    const morphMs = frozen
      ? 0
      : glyphMode
        ? wasGlyph
          ? MORPH_AGAIN_MS
          : MORPH_IN_MS
        : wasGlyph
          ? MORPH_OUT_MS
          : MORPH_NEXT_MS;
    rebuild(built, start, goal, now, morphMs);

    // The reduced-motion still shows the search done: the path drawn
    // through the number, the dot at its start.
    if (frozen) {
      while (openSet.length > 0 && foundPath.length === 0) searchStep();
      walking = false;
    }
  };

  // ── What is drawn ────────────────────────────────────────────────────────
  const sprites = createSprites(NODE_CAPACITY + 1);
  const ribbons = createRibbons(EDGE_CAPACITY);
  stage.scene.add(ribbons.mesh);
  stage.scene.add(sprites.mesh);
  const floor = createFloor({
    height: 0,
    cell: 0.2,
    major: 5,
    reach: FLOOR_REACH,
    opacity: FLOOR_OPACITY,
  });
  stage.scene.add(floor.mesh);

  // Each node's place in the survey (see surveyOrder), worked out when a
  // graph is put down rather than every frame.
  const order = new Float32Array(NODE_CAPACITY);
  function orderNodes() {
    surveyOrder(
      nodes,
      startNode,
      Math.min(stage.aspect, 1.5) * 0.95,
      SPREAD_DEPTH,
      order
    );
  }
  orderNodes();

  // How high each node stands right now, eased toward its cost, and each
  // node's place in the world from the frame it was last drawn in.
  const rise = new Float32Array(NODE_CAPACITY);
  const world = new Float32Array((NODE_CAPACITY + 1) * 3);
  let spreadX = 1;
  let spreadZ = 1;

  // ── The pointer ──────────────────────────────────────────────────────────
  let hovered = -1;
  const projected = new THREE.Vector3();

  /** The node nearest a point on screen, or −1 if none is within reach. */
  const nearest = (
    ndcX: number,
    ndcY: number,
    aspect: number,
    reach: number
  ) => {
    let best = -1;
    let bestDistance = reach;
    for (let i = 0; i < nodes.length; i++) {
      projected
        .set(world[i * 3], world[i * 3 + 1], world[i * 3 + 2])
        .project(stage.camera);
      if (projected.z > 1) continue;
      const d = Math.hypot((projected.x - ndcX) * aspect, projected.y - ndcY);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    return best;
  };

  const applyPointer = (aspect: number, leaving: boolean) => {
    const pointer = stage.pointer.state;
    // A scene on its way out is not taking requests.
    const quiet = progress > 0.5 || morph !== null || leaving;

    // A tap names a goal: the search starts over on the graph as it stands,
    // for the node nearest where the tap landed.
    for (const tap of stage.pointer.takeTaps()) {
      if (quiet) continue;
      const index = nearest(tap.x, tap.y, aspect, Infinity);
      if (index >= 0 && index !== startNode) {
        goalNode = index;
        resetSearch();
      }
    }

    hovered =
      quiet || !pointer.present
        ? -1
        : nearest(pointer.x, pointer.y, aspect, REACH);
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  const color = new THREE.Color();
  let reshapeTimer = 0;
  let stillDrawn = false;

  /** A setting's colour in linear light, scaled, into three floats. */
  const writeColor = (
    out: Float32Array,
    at: number,
    rgb: [number, number, number],
    scale: number
  ) => {
    color.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    out[at] = color.r * scale;
    out[at + 1] = color.g * scale;
    out[at + 2] = color.b * scale;
  };

  const update: SceneHandle['update'] = frame => {
    const live = settings();
    const on = notFound();
    const { dt, now, aspect } = frame;
    const timeMs = frame.time * 1000;

    // The 404 sequence. A frozen frame tells the story at once.
    progress = frame.frozen ? sequence.settle(on) : sequence.advance(dt, on);
    stage.reading = glyphMode || on ? progress : 0;
    // The moment the flag flips, the next graph is the other kind — now,
    // not after the search in progress.
    if ((on ? 'glyph' : 'random') !== lastKind && !pendingRegenerate) {
      pendingRegenerate = true;
      regenerateAt = now;
    }

    if (frame.frozen) {
      // A still shows a search finished: the bowl lifted, the path down it.
      if (pendingRegenerate) {
        regenerate(now, true);
        stillDrawn = true;
      } else if (!stillDrawn) {
        while (openSet.length > 0 && foundPath.length === 0) searchStep();
        walking = false;
        stillDrawn = true;
      }
    } else {
      stillDrawn = false;
      applyPointer(aspect, frame.outro > 0);

      // The search, in whole steps at its own rate. Nodes in flight are not
      // a graph to search yet, and nor is a map still being surveyed.
      if (!morph && frame.intro >= SEARCH_FROM) {
        const rate = glyphMode
          ? Math.max(liveStepsPerSecond(), GLYPH_MIN_STEPS_PER_SECOND)
          : liveStepsPerSecond();
        sinceStep += dt;
        let budget = 6;
        while (sinceStep >= 1 / rate && budget-- > 0) {
          sinceStep -= 1 / rate;
          searchStep();
        }
        if (sinceStep > 1 / rate) sinceStep = 1 / rate;
      }

      // The marble, rolling down the path it found.
      if (foundPath.length === 1 && !pendingRegenerate) {
        // Start node is the goal node — the sliders allow it. There is no
        // edge to walk, so retire the search rather than sit on it forever.
        pendingRegenerate = true;
        regenerateAt = now + 500;
      } else if (walking) {
        walkT +=
          live.spTraversalSpeed *
          live.globalTimeMultiplier *
          (glyphMode ? GLYPH_WALK_BOOST : 1) *
          dt;
        while (walking && walkT >= 1) {
          walkT -= 1;
          walkFrom = walkTo;
          walkTo -= 1;
          if (walkTo < 0) {
            walking = false;
            walkT = 0;
            pendingRegenerate = true;
            regenerateAt = now + 500; // brief pause, then regenerate
          }
        }
      }

      if (pendingRegenerate && now >= regenerateAt) regenerate(now, false);
      if (morph && advanceMorph(morph, nodes, now)) morph = null;
    }

    // The plane the layout is worked out in, laid on the bench. Read from
    // overhead it is exactly the screen — which is what the number was laid
    // out for; at rest it is deeper than it is drawn, so the bowl has room
    // to be a bowl.
    const reading = stage.reading;
    const scenic = 1 - reading;
    spreadX = Math.min(aspect, 1.5) * 0.95 * scenic + aspect * reading;
    spreadZ = SPREAD_DEPTH * scenic + reading;
    // The number is read flat, and a node in flight is on its way to a new
    // cost: both bring the relief down.
    const relief = live.spRelief * HEIGHT_PER_COST * scenic;
    const ease = frame.frozen ? 1 : Math.min(1, dt * RISE_RATE);
    const slowPulse = Math.sin(timeMs * 0.002) * 0.5 + 0.5;
    const crowd = Math.min(1, Math.max(0.5, stage.width / 1100));
    const baseSize = live.elementSize * (glyphMode ? 0.5 * crowd : 0.62);

    // Where the survey's front is, and how much of its height the landscape
    // has: both exactly "all of it" once arrived and until asked to go.
    const front = surveyFront(frame.intro, frame.outro);
    const stand = standing(frame.outro);

    const onPath = new Set(foundPath);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const cost = gScore.get(i) ?? Infinity;
      const want = Number.isFinite(cost) && !morph ? cost * relief : 0;
      rise[i] += (want - rise[i]) * ease;

      const at = i * 3;
      world[at] = n.position.x * spreadX;
      world[at + 1] = 0.04 + rise[i] * stand;
      world[at + 2] = -n.position.y * spreadZ;
      sprites.positions[at] = world[at];
      sprites.positions[at + 1] = world[at + 1];
      sprites.positions[at + 2] = world[at + 2];

      const isStart = i === startNode;
      const isGoal = i === goalNode;
      const isClosed = closed.has(i);
      const isOpen = inOpen.has(i);

      let rgb: [number, number, number];
      let bright = 0.9;
      let size = baseSize;
      let halo = 0.14;
      if (isStart) {
        rgb = live.colors.accent; // Use accent color for start
        bright = 1.6;
        size *= 1.5;
        halo = 0.8;
      } else if (isGoal) {
        rgb = live.colors.secondary; // Use secondary color for goal
        bright = 1.6;
        size *= 1.5;
        halo = 0.8;
      } else if (onPath.has(i)) {
        rgb = live.colors.primary; // Use primary color for path
        bright = 1.4;
        size *= 1.2;
        halo = 0.6;
      } else if (isClosed) {
        rgb = live.colors.secondary; // Settled: its cost is known
        bright = 0.85;
        halo = 0.3;
      } else if (isOpen) {
        rgb = live.colors.secondary; // On the frontier: still being weighed
        bright = 1.1 + slowPulse * 0.4;
        size *= 1.1;
        halo = 0.5;
      } else {
        rgb = live.colors.background; // Not reached
        // The graph has to read as a graph before the search reaches it —
        // for the first seconds of every search it is all there is — and
        // the number as a shape.
        bright = 0.8 + 0.3 * progress;
        halo = 0.22;
      }
      // Found by the front: it comes up hot and a little too large, and
      // settles. Going, it does the same backwards.
      const found = surveyed(front, order[i]);
      writeColor(sprites.colors, at, rgb, bright * (1 + 0.9 * (1 - found)));

      const marked = i === hovered || isStart || isGoal;
      const p = i * 4;
      sprites.params[p] =
        size *
        (i === hovered ? 1.2 : 1) *
        (found >= 1 ? 1 : Math.max(0, easeOutBack(found, 1.7)));
      sprites.params[p + 1] = 1;
      sprites.params[p + 2] = halo;
      sprites.params[p + 3] = marked ? 1 : 0;
    }

    // The marble: on the node the search is at while it searches, and
    // rolling down the path once there is one.
    const marble = nodes.length;
    let mx = world[lastSettled * 3];
    let my = world[lastSettled * 3 + 1];
    let mz = world[lastSettled * 3 + 2];
    if (foundPath.length > 1 && walkFrom >= 0) {
      const from = foundPath[Math.min(foundPath.length - 1, walkFrom)] * 3;
      const to = foundPath[Math.max(0, walkTo)] * 3;
      const t = walking ? walkT : 1;
      mx = world[from] + (world[to] - world[from]) * t;
      my = world[from + 1] + (world[to + 1] - world[from + 1]) * t;
      mz = world[from + 2] + (world[to + 2] - world[from + 2]) * t;
    }
    world[marble * 3] = mx;
    world[marble * 3 + 1] = my;
    world[marble * 3 + 2] = mz;
    sprites.positions[marble * 3] = mx;
    sprites.positions[marble * 3 + 1] = my;
    sprites.positions[marble * 3 + 2] = mz;
    const glow = 1.5 + live.spDotGlow * Math.sin(timeMs * 0.01);
    writeColor(sprites.colors, marble * 3, live.colors.accent, glow);
    // The marble is the search's, so it comes with the node the search
    // starts at and is the first thing put away.
    sprites.params[marble * 4] =
      (live.spDotSize / 14) *
      baseSize *
      1.25 *
      smooth(surveyed(front, 0)) *
      (1 - smooth(frame.outro * 4));
    sprites.params[marble * 4 + 1] = 1.4;
    sprites.params[marble * 4 + 2] = 1.2;
    sprites.params[marble * 4 + 3] = 0;
    sprites.setCount(morph ? nodes.length : nodes.length + 1);
    sprites.commit();

    // Edges. Untouched ones are the graph, dashed and quiet; an edge the
    // search has been along is drawn in; the path is the heavy one, with
    // traffic running down it from the goal to the start.
    const actionWidth =
      live.spActionEdgeThickness * (1 + (crowd - 1) * progress);
    let count = 0;
    for (const e of edges) {
      if (count >= EDGE_CAPACITY) break;
      const pathIndexSource = foundPath.indexOf(e.source);
      const pathIndexTarget = foundPath.indexOf(e.target);
      const inPath =
        foundPath.length > 0 &&
        Math.abs(pathIndexSource - pathIndexTarget) === 1 &&
        pathIndexSource !== -1 &&
        pathIndexTarget !== -1;
      const inFrontier =
        (inOpen.has(e.source) && !closed.has(e.source)) ||
        (inOpen.has(e.target) && !closed.has(e.target));
      const touchesClosed = closed.has(e.source) || closed.has(e.target);

      // Drawn from the higher end to the lower, so traffic runs downhill.
      const downhill = pathIndexSource > pathIndexTarget;
      const a = (inPath && !downhill ? e.target : e.source) * 3;
      const b = (inPath && !downhill ? e.source : e.target) * 3;
      const at = count * 3;
      ribbons.starts[at] = world[a];
      ribbons.starts[at + 1] = world[a + 1];
      ribbons.starts[at + 2] = world[a + 2];
      ribbons.ends[at] = world[b];
      ribbons.ends[at + 1] = world[b + 1];
      ribbons.ends[at + 2] = world[b + 2];

      // Drawn from the end the front reached first, as far as the front has
      // run along it.
      const orderA = order[a / 3];
      const orderB = order[b / 3];
      const share =
        orderA <= orderB
          ? drawnShare(front, orderA, orderB)
          : drawnShare(front, orderB, orderA);
      if (share < 1) {
        if (orderA <= orderB) {
          ribbons.ends[at] = world[a] + (world[b] - world[a]) * share;
          ribbons.ends[at + 1] =
            world[a + 1] + (world[b + 1] - world[a + 1]) * share;
          ribbons.ends[at + 2] =
            world[a + 2] + (world[b + 2] - world[a + 2]) * share;
        } else {
          ribbons.starts[at] = world[b] + (world[a] - world[b]) * share;
          ribbons.starts[at + 1] =
            world[b + 1] + (world[a + 1] - world[b + 1]) * share;
          ribbons.starts[at + 2] =
            world[b + 2] + (world[a + 2] - world[b + 2]) * share;
        }
      }

      const p = count * 4;
      const lit = e.source === hovered || e.target === hovered ? 0.3 : 0;
      if (inPath) {
        writeColor(ribbons.colors, at, live.colors.primary, 1.3);
        ribbons.params[p] = actionWidth * 1.25;
        ribbons.params[p + 1] = 1;
        ribbons.params[p + 2] = 1.1;
        ribbons.params[p + 3] = 0;
      } else if (touchesClosed || inFrontier) {
        writeColor(ribbons.colors, at, live.colors.secondary, 1);
        ribbons.params[p] = actionWidth * 0.55;
        ribbons.params[p + 1] = Math.min(1, 0.22 + lit);
        ribbons.params[p + 2] = 0;
        ribbons.params[p + 3] = 0;
      } else {
        writeColor(ribbons.colors, at, live.colors.background, 1);
        ribbons.params[p] = live.spBaseEdgeThickness;
        ribbons.params[p + 1] = Math.min(
          1,
          live.spBaseEdgeAlpha * (1.6 + progress) + lit
        );
        ribbons.params[p + 2] = 0;
        ribbons.params[p + 3] = 1;
      }
      count += 1;
    }
    // A drop line under every node that has risen: its cost, as a length.
    for (let i = 0; i < nodes.length && count < EDGE_CAPACITY; i++) {
      if (rise[i] * stand < 0.04 || order[i] > front) continue;
      const a = i * 3;
      const at = count * 3;
      ribbons.starts[at] = world[a];
      ribbons.starts[at + 1] = world[a + 1];
      ribbons.starts[at + 2] = world[a + 2];
      ribbons.ends[at] = world[a];
      ribbons.ends[at + 1] = 0;
      ribbons.ends[at + 2] = world[a + 2];
      ribbons.colors[at] = sprites.colors[a] * 0.45;
      ribbons.colors[at + 1] = sprites.colors[a + 1] * 0.45;
      ribbons.colors[at + 2] = sprites.colors[a + 2] * 0.45;
      const p = count * 4;
      ribbons.params[p] = 1;
      ribbons.params[p + 1] = 0.45;
      ribbons.params[p + 2] = 0;
      ribbons.params[p + 3] = 1;
      count += 1;
    }
    ribbons.setCount(count);
    ribbons.commit();

    // The floor spreads from under the start node as the survey does, and
    // drains back to it; once the front has covered the map it is the
    // whole bench, centred where it always was.
    const covered = smooth(front);
    const startAt = Math.min(nodes.length - 1, startNode) * 3;
    floor.setCentre(
      world[startAt] * (1 - covered),
      world[startAt + 2] * (1 - covered)
    );
    floor.material.uniforms.uReach.value = FLOOR_REACH * (0.1 + 0.9 * covered);
    // What is left to the strength is only the guarantee that the last of
    // the light has gone when the scene has: the coming and going are the
    // front's.
    const light =
      frame.outro >= 1 ? 0 : 1 - smooth((frame.outro - 0.88) / 0.12);
    const pose = stage.rig.pose;
    const u = ribbons.material.uniforms;
    u.uResolution.value.set(
      stage.width * stage.pixelRatio,
      stage.height * stage.pixelRatio
    );
    u.uPixelRatio.value = stage.pixelRatio;
    u.uTime.value = frame.time * live.globalTimeMultiplier;
    u.uStrength.value = light;
    u.uFog.value.set(pose.distance + 0.6, pose.distance + 3.4);
    sprites.material.uniforms.uStrength.value = light;
    sprites.material.uniforms.uFog.value.set(
      pose.distance + 0.6,
      pose.distance + 3.4
    );
    floor.material.uniforms.uOpacity.value =
      FLOOR_OPACITY *
      smooth((front + SURVEY_WIDTH) / 0.6) *
      light *
      (1 - reading);

    // The bloom's three controls are the stage's own bloom, live.
    if (live.spGlowBloom > 0.5) {
      stage.post.bloom.strength = live.spGlowStrength * 0.5;
      stage.post.bloom.radius = Math.min(1, live.spGlowRadius * 3.5);
      stage.post.bloom.threshold = 0.5 + live.spGlowThreshold * 0.7;
    }

    readout.write(now, () => {
      const name =
        heuristicWeight === 0
          ? 'dijkstra'
          : heuristicWeight === 1
            ? 'a*'
            : `a* w${heuristicWeight.toFixed(1)}`;
      if (foundPath.length > 1) {
        const length = gScore.get(goalNode) ?? 0;
        return `${name} · path ${length.toFixed(2)} · ${foundPath.length - 1} hops`;
      }
      return `${name} · open ${inOpen.size} · settled ${closed.size}`;
    });
  };

  const resize = () => {
    // The number is laid out for the viewport's shape. A URL bar sliding
    // away is not a new shape; a real one gets the number laid out again
    // once the resize has settled, not on every frame of a drag.
    const size = { width: stage.width, height: stage.height };
    if (viewportReshaped(glyphSize, size)) {
      window.clearTimeout(reshapeTimer);
      reshapeTimer = window.setTimeout(() => {
        glyphSize = size;
        if (glyphMode && !pendingRegenerate) {
          pendingRegenerate = true;
          regenerateAt = performance.now();
          stage.requestFrame();
        }
      }, RESHAPE_SETTLE_MS);
    }
  };

  return {
    update,
    resize,
    dispose() {
      window.clearTimeout(reshapeTimer);
      readout.clear();
      sprites.dispose();
      ribbons.dispose();
      floor.dispose();
    },
  };
};

const ShortestPathLabBackground: React.FC<
  AnimatedBackgroundProps<ShortestPathLabSettings>
> = props => {
  const { className, settings } = props;
  // Structural only: the graph and the search, and whether there is a bloom
  // at all. Everything else is read live.
  const containerRef = useStageScene(props, stageOptions, buildScene, [
    settings.spTotalNodes,
    settings.spEdgeDensity,
    settings.spHeuristicWeight,
    settings.spStartNode,
    settings.spGoalNode,
    settings.spGlowBloom,
  ]);

  return (
    <StageSurface
      ref={containerRef}
      className={className}
      opacity={settings.opacity}
    />
  );
};

export default ShortestPathLabBackground;
