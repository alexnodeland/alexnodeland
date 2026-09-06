import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {
  glyphSpacingFor,
  rasterizeGlyph,
  sampleGlyphPoints,
} from '../../core/glyph';
import {
  NotFoundSequence,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { ShortestPathLabSettings } from './config';

// The 404 sequence. The number is sampled at this many columns across the
// viewport and drawn with between these many nodes, by viewport area; each
// joined to its nearest neighbours. The search runs at least this fast
// through it, since two hundred nodes at four steps a second is a minute,
// and the dot walks the path this much faster than usual.
const GLYPH_COLS = 160;
const MIN_GLYPH_NODES = 140;
const MAX_GLYPH_NODES = 240;
const GLYPH_LINKS = 3;
const GLYPH_MIN_STEPS_PER_SECOND = 22;
const GLYPH_WALK_BOOST = 3;
// Room for either graph the lab draws.
const NODE_CAPACITY = 320;
// How long the nodes take to fly into the number, to re-settle when it is
// laid out again, and to scatter once the page is left.
const MORPH_IN_MS = 2200;
const MORPH_AGAIN_MS = 700;
const MORPH_OUT_MS = 1600;

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

function generateRandomGraph(
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

function reconstructPath(prev: Map<number, number>, goal: number): number[] {
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
 * The number as a graph, for the 404 sequence: nodes sampled evenly inside
 * it, each joined to its nearest neighbours so that the edges run along the
 * strokes, and the digits bridged by the shortest links between them so that
 * a path across the whole number always exists. Null when the number cannot
 * be drawn (no canvas to rasterise it on).
 */
function generateGlyphGraph(
  width: number,
  height: number,
  count: number,
  rng: () => number
): { nodes: LabNode[]; edges: LabEdge[] } | null {
  const cols = GLYPH_COLS;
  const rows = Math.max(24, Math.round((cols * height) / Math.max(1, width)));
  const field = rasterizeGlyph(cols, rows, { maxHeight: 0.62 });
  const spacing = glyphSpacingFor(field, count);
  const spots = sampleGlyphPoints(field, count, spacing, rng);
  if (spots.length < 4) return null;

  const nodes: LabNode[] = spots.map((p, i) => ({
    id: i,
    position: { x: (p.x / cols) * 2 - 1, y: 1 - (p.y / rows) * 2 },
  }));
  const n = nodes.length;
  const distance = (i: number, j: number) =>
    Math.hypot(
      nodes[i].position.x - nodes[j].position.x,
      nodes[i].position.y - nodes[j].position.y
    );

  const edges: LabEdge[] = [];
  const seen = new Set<string>();
  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const link = (i: number, j: number) => {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: i, target: j, weight: distance(i, j) });
    parent[find(i)] = find(j);
  };

  // Along the strokes: the nearest few, within a stroke's width or so.
  const reach = spacing * (2 / cols) * 3.2;
  for (let i = 0; i < n; i++) {
    const near: Array<{ j: number; d: number }> = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d = distance(i, j);
      if (d <= reach) near.push({ j, d });
    }
    near.sort((a, b) => a.d - b.d);
    for (const { j } of near.slice(0, GLYPH_LINKS)) link(i, j);
  }

  // Across the gaps: the closest pair not yet joined, until everything is.
  for (;;) {
    let best: { i: number; j: number; d: number } | null = null;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (find(i) === find(j)) continue;
        const d = distance(i, j);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    if (!best) break;
    link(best.i, best.j);
  }

  return { nodes, edges };
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

const ShortestPathLabBackground: React.FC<
  AnimatedBackgroundProps<ShortestPathLabSettings>
> = ({ className, settings, frozen, notFound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // Live view of the settings for the render loop, which outlives the render
  // that created it.
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

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());
    container.appendChild(renderer.domElement);

    // Optional bloom composer
    const useBloom = settings.spGlowBloom > 0.5;
    let composer: EffectComposer | null = null;
    if (useBloom) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        settings.spGlowStrength,
        settings.spGlowRadius,
        settings.spGlowThreshold
      );
      composer.addPass(bloom);
    }

    // Structural parameters — these define the graph and the search, so
    // changing one has to rebuild.
    const totalNodes = settings.spTotalNodes;
    const edgeDensity = Math.min(1, Math.max(0.05, settings.spEdgeDensity));
    const heuristicWeight = settings.spHeuristicWeight; // 0=Dijkstra, 1=A*

    // Everything below is read per frame instead of captured: rebuilding the
    // scene mid-drag restarted the search on every input event.
    // Animation Speed is a master multiplier over this background's own rates.
    const liveStepsPerSecond = () =>
      Math.max(
        0.1,
        settingsRef.current.spAnimationSpeed *
          settingsRef.current.globalTimeMultiplier
      );

    let seed = 424242;
    let rngFunc = mulberry32(seed);
    let graph = generateRandomGraph(totalNodes, edgeDensity, rngFunc);
    let nodes = graph.nodes;
    let edges = graph.edges;

    const settingsStart = Math.min(
      totalNodes - 1,
      Math.max(0, settings.spStartNode)
    );
    const settingsGoal = Math.min(
      totalNodes - 1,
      Math.max(0, settings.spGoalNode)
    );
    let startNode = settingsStart;
    let goalNode = settingsGoal;

    // ── The 404 sequence ───────────────────────────────────────────────────
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
    let glyphSize = { width: window.innerWidth, height: window.innerHeight };
    // Nodes in flight between two layouts.
    let morph: {
      from: Float32Array;
      to: Float32Array;
      start: number;
      duration: number;
    } | null = null;

    const glyphNodeCount = () => {
      const area = window.innerWidth * window.innerHeight;
      return Math.round(
        Math.max(MIN_GLYPH_NODES, Math.min(MAX_GLYPH_NODES, area / 7000))
      );
    };

    // Edge lines (contrasting style vs topology): light dashed base, thick vivid
    // action colors. These seed the materials; renderFrame refreshes them.
    const opacity = settings.opacity;
    const baseAlpha = settings.spBaseEdgeAlpha;
    const baseThickness = settings.spBaseEdgeThickness;
    const actionThickness = settings.spActionEdgeThickness;
    const nodeSize = settings.elementSize * 380;
    const dotSizePx = settings.spDotSize;

    // Line2/LineMaterial rather than THREE.Line: gl.LINES is stuck at one
    // device pixel in every browser, so `linewidth` on a LineBasicMaterial is
    // silently ignored and these three thickness controls did nothing. Line2
    // draws the line as screen-space quads, which honours the width — at the
    // cost of needing the viewport resolution kept up to date.
    const lineResolution = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    );

    const baseEdgeMaterial = new LineMaterial({
      color: new THREE.Color(...settings.colors.background), // Use background color
      transparent: true,
      opacity: baseAlpha * opacity,
      dashed: true,
      dashSize: 0.04,
      gapSize: 0.025,
      linewidth: baseThickness,
      resolution: lineResolution,
    });
    const exploreEdgeMaterial = new LineMaterial({
      color: new THREE.Color(...settings.colors.secondary), // Use secondary color
      transparent: true,
      opacity: 0.9 * opacity,
      linewidth: actionThickness,
      resolution: lineResolution,
    });
    const finalEdgeMaterial = new LineMaterial({
      color: new THREE.Color(...settings.colors.primary), // Use primary color
      transparent: true,
      opacity: 1.0 * opacity,
      linewidth: actionThickness,
      resolution: lineResolution,
    });

    const buildEdgeLine = (e: LabEdge): Line2 => {
      const a0 = nodes[e.source].position;
      const b0 = nodes[e.target].position;
      const geometry = new LineGeometry();
      geometry.setPositions([a0.x, a0.y, 0, b0.x, b0.y, 0]);
      const line = new Line2(geometry, baseEdgeMaterial);
      line.computeLineDistances(); // required for dashed
      line.userData = { e };
      return line;
    };

    // Moves a line's ends in place. setPositions allocates a fresh buffer
    // every call, and a few hundred lines are moved every frame while the
    // nodes are in flight.
    const writeLine = (line: Line2, a: Vector2, b: Vector2) => {
      const attribute = line.geometry.attributes.instanceStart as
        | THREE.InterleavedBufferAttribute
        | undefined;
      const buffer = attribute?.data;
      if (buffer && buffer.array.length >= 6) {
        const array = buffer.array as Float32Array;
        array[0] = a.x;
        array[1] = a.y;
        array[2] = 0;
        array[3] = b.x;
        array[4] = b.y;
        array[5] = 0;
        buffer.needsUpdate = true;
      } else {
        line.geometry.setPositions([a.x, a.y, 0, b.x, b.y, 0]);
      }
    };

    const edgeLines: Line2[] = [];
    for (const e of edges) {
      const line = buildEdgeLine(e);
      scene.add(line);
      edgeLines.push(line);
    }

    // Nodes as points with per-vertex color. Sized for the biggest graph the
    // lab draws and drawn up to the one it has.
    const nodePositions = new Float32Array(NODE_CAPACITY * 3);
    const nodeColors = new Float32Array(NODE_CAPACITY * 3);
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(nodePositions, 3)
    );
    nodeGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(nodeColors, 3)
    );
    const nodeMaterial = new THREE.PointsMaterial({
      size: nodeSize,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    });
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodePoints);

    // Initialize positions and base colors using standardized colors
    for (let i = 0; i < nodes.length; i++) {
      nodePositions[i * 3 + 0] = nodes[i].position.x;
      nodePositions[i * 3 + 1] = nodes[i].position.y;
      nodePositions[i * 3 + 2] = 0;
      // base color from background
      nodeColors[i * 3 + 0] = settings.colors.background[0];
      nodeColors[i * 3 + 1] = settings.colors.background[1];
      nodeColors[i * 3 + 2] = settings.colors.background[2];
    }
    nodeGeometry.setDrawRange(0, nodes.length);
    (
      nodeGeometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (nodeGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate =
      true;

    // Priority queue using simple array for clarity (small N)
    const openSet: number[] = [startNode];
    const cameFrom = new Map<number, number>();
    const gScore = new Map<number, number>();
    const fScore = new Map<number, number>();
    const inOpen = new Set<number>([startNode]);
    const closed = new Set<number>();

    for (const n of nodes) {
      gScore.set(n.id, n.id === startNode ? 0 : Infinity);
      const h = heuristicWeight * heuristic(n, nodes[goalNode]);
      fScore.set(n.id, n.id === startNode ? h : Infinity);
    }

    let lastStep = 0;
    let foundPath: number[] = [];

    // Traversal dot state for animating along current edge
    let traversalActive = true;
    let traversalEdge: { from: number; to: number } | null = null;
    let traversalT = 0; // 0..1
    let lastTraversalTime = 0;
    let pendingRegenerate = false;
    let regenerateAt = 0;

    // Create glowing traversal dot (sprite)
    const dotGeometry = new THREE.SphereGeometry(0.01, 16, 16);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(...settings.colors.accent),
    });
    const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
    dotMesh.scale.setScalar(dotSizePx / 300);
    scene.add(dotMesh);

    function neighbors(id: number): LabEdge[] {
      return edges.filter(e => e.source === id || e.target === id);
    }

    function step(now: number) {
      // Nodes in flight are not a graph to search yet.
      if (morph) return;
      const rate = glyphMode
        ? Math.max(liveStepsPerSecond(), GLYPH_MIN_STEPS_PER_SECOND)
        : liveStepsPerSecond();
      const interval = 1000 / rate;
      if (now - lastStep < interval) return;
      lastStep = now;
      searchStep(now);
    }

    /** One expansion of the search. */
    function searchStep(now: number) {
      if (openSet.length === 0 || foundPath.length > 0) return;

      // Pick node with smallest fScore
      openSet.sort((a, b) => fScore.get(a)! - fScore.get(b)!);
      const current = openSet.shift()!;
      inOpen.delete(current);
      closed.add(current);

      if (current === goalNode) {
        foundPath = reconstructPath(cameFrom, current);
        // Start backtracking traversal animation along the final path
        traversalActive = true;
        traversalEdge = null; // will be set in render when processing path
        traversalT = 0;
        lastTraversalTime = now;
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
      const live = settingsRef.current;
      const previous = nodes;
      const count = built.nodes.length;
      const from = new Float32Array(count * 2);
      const to = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        const origin = previous.length
          ? previous[i % previous.length].position
          : built.nodes[i].position;
        from[i * 2] = origin.x;
        from[i * 2 + 1] = origin.y;
        to[i * 2] = built.nodes[i].position.x;
        to[i * 2 + 1] = built.nodes[i].position.y;
      }

      // Geometries are per-line and must go; the three materials are shared
      // and get re-attached to the rebuilt lines below, so disposing them
      // here only forces a shader recompile on every regeneration.
      edgeLines.forEach(l => {
        scene.remove(l);
        l.geometry.dispose();
      });
      edgeLines.length = 0;

      nodes = built.nodes;
      edges = built.edges;
      startNode = Math.min(count - 1, Math.max(0, start));
      goalNode = Math.min(count - 1, Math.max(0, goal));

      if (morphMs > 0) {
        for (let i = 0; i < count; i++) {
          nodes[i].position.x = from[i * 2];
          nodes[i].position.y = from[i * 2 + 1];
        }
        morph = { from, to, start: now, duration: morphMs };
      } else {
        morph = null;
      }

      for (const e of edges) {
        const line = buildEdgeLine(e);
        scene.add(line);
        edgeLines.push(line);
      }

      // reset astar/dijkstra state
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

      // write node positions/colors
      for (let i = 0; i < nodes.length; i++) {
        nodePositions[i * 3 + 0] = nodes[i].position.x;
        nodePositions[i * 3 + 1] = nodes[i].position.y;
        nodePositions[i * 3 + 2] = 0;
        nodeColors[i * 3 + 0] = live.colors.background[0];
        nodeColors[i * 3 + 1] = live.colors.background[1];
        nodeColors[i * 3 + 2] = live.colors.background[2];
      }
      nodeGeometry.setDrawRange(0, nodes.length);
      (
        nodeGeometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;
      (
        nodeGeometry.getAttribute('color') as THREE.BufferAttribute
      ).needsUpdate = true;

      // reset traversal
      traversalActive = true;
      traversalEdge = null;
      traversalT = 0;
      dotMesh.position.set(
        nodes[startNode].position.x,
        nodes[startNode].position.y,
        0
      );
      foundPath = [];
      pendingRegenerate = false;
    };

    /**
     * A new graph: the number while the 404 is up, a random one otherwise,
     * with a new seed either way.
     */
    const regenerate = (now: number) => {
      const wantGlyph = notFoundRef.current;
      lastKind = wantGlyph ? 'glyph' : 'random';
      seed = (seed * 1664525 + 1013904223) >>> 0; // LCG step for new seed
      rngFunc = mulberry32(seed);

      const wasGlyph = glyphMode;
      let built: { nodes: LabNode[]; edges: LabEdge[] } | null = null;
      if (wantGlyph) {
        built = generateGlyphGraph(
          glyphSize.width,
          glyphSize.height,
          glyphNodeCount(),
          rngFunc
        );
      }
      glyphMode = built !== null;
      if (!built) {
        built = generateRandomGraph(totalNodes, edgeDensity, rngFunc);
      }
      graph = built;

      const [start, goal] = glyphMode
        ? pickGlyphEndpoints(built.nodes, rngFunc, glyphRuns === 0)
        : [settingsStart, settingsGoal];
      glyphRuns = glyphMode ? glyphRuns + 1 : 0;

      const morphMs = frozenRef.current
        ? 0
        : glyphMode
          ? wasGlyph
            ? MORPH_AGAIN_MS
            : MORPH_IN_MS
          : wasGlyph
            ? MORPH_OUT_MS
            : 0;
      rebuild(built, start, goal, now, morphMs);

      // The reduced-motion still shows the search done: the path drawn
      // through the number, the dot at its start.
      if (frozenRef.current && glyphMode) {
        while (openSet.length > 0 && foundPath.length === 0) searchStep(now);
      }
    };

    /** Carries nodes in flight along, and their edges with them. */
    const advanceMorph = (now: number) => {
      if (!morph) return;
      const t = Math.min(1, (now - morph.start) / morph.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const { from, to } = morph;
      for (let i = 0; i < nodes.length; i++) {
        const x = from[i * 2] + (to[i * 2] - from[i * 2]) * eased;
        const y = from[i * 2 + 1] + (to[i * 2 + 1] - from[i * 2 + 1]) * eased;
        nodes[i].position.x = x;
        nodes[i].position.y = y;
        nodePositions[i * 3] = x;
        nodePositions[i * 3 + 1] = y;
      }
      (
        nodeGeometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;
      for (const line of edgeLines) {
        const e = line.userData.e as LabEdge;
        writeLine(line, nodes[e.source].position, nodes[e.target].position);
      }
      if (t >= 1) {
        morph = null;
        // The dashes are measured along the line, which has just moved.
        for (const line of edgeLines) line.computeLineDistances();
      }
    };

    let lastFrameMs = 0;
    function render(timeMs: number) {
      const live = settingsRef.current;

      // The 404 sequence. Real seconds since the last frame, clamped so a tab
      // coming back from the background plays one long frame rather than
      // the whole time it was away; a frozen frame tells the story at once.
      const real = lastFrameMs
        ? Math.min((timeMs - lastFrameMs) / 1000, 0.1)
        : 0;
      lastFrameMs = timeMs;
      const on = notFoundRef.current;
      progress = frozenRef.current
        ? sequence.settle(on)
        : sequence.advance(real, on);
      // The moment the flag flips, the next graph is the other kind — now,
      // not after the search in progress.
      if ((on ? 'glyph' : 'random') !== lastKind && !pendingRegenerate) {
        pendingRegenerate = true;
        regenerateAt = timeMs;
      }

      step(timeMs);
      if (pendingRegenerate && timeMs >= regenerateAt) regenerate(timeMs);
      advanceMorph(timeMs);

      // Update edges using standardized colors
      for (const line of edgeLines) {
        const e = line.userData.e as LabEdge;

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
        if (inPath) {
          line.material = finalEdgeMaterial;
        } else if (touchesClosed || inFrontier) {
          line.material = exploreEdgeMaterial;
        } else {
          line.material = baseEdgeMaterial;
        }
      }

      // Update nodes using standardized colors
      const slowPulse = Math.sin(timeMs * 0.002) * 0.5 + 0.5;
      for (let i = 0; i < nodes.length; i++) {
        const rIdx = i * 3;
        const isStart = i === startNode;
        const isGoal = i === goalNode;
        const isClosed = closed.has(i);
        const isOpen = inOpen.has(i);
        const inPath = foundPath.length > 0 && foundPath.includes(i);

        let r: number, g: number, b: number;
        let bright = 0.9;

        if (isStart) {
          [r, g, b] = live.colors.accent; // Use accent color for start
          bright = 1.6;
        } else if (isGoal) {
          [r, g, b] = live.colors.secondary; // Use secondary color for goal
          bright = 1.6;
        } else if (inPath) {
          [r, g, b] = live.colors.primary; // Use primary color for path
          bright = 1.4;
        } else if (isClosed || isOpen) {
          [r, g, b] = live.colors.secondary; // Use secondary for exploratory
          bright = 1.2 + slowPulse * 0.2;
        } else {
          [r, g, b] = live.colors.background; // Use background color
          // The number has to read as a shape before the search reaches it.
          bright = 0.4 + 0.45 * progress;
        }

        nodeColors[rIdx + 0] = r * bright;
        nodeColors[rIdx + 1] = g * bright;
        nodeColors[rIdx + 2] = b * bright;
      }
      (
        nodeGeometry.getAttribute('color') as THREE.BufferAttribute
      ).needsUpdate = true;
      // The number is a couple of hundred nodes across whatever width there
      // is; on a phone that is too close for nodes drawn at the usual size.
      const crowd = Math.min(1, Math.max(0.5, window.innerWidth / 1100));
      (nodeMaterial as THREE.PointsMaterial).size =
        live.elementSize * 380 * (1 + (crowd - 1) * progress);
      (nodeMaterial as THREE.PointsMaterial).opacity = live.opacity;
      baseEdgeMaterial.opacity = Math.min(
        1,
        live.spBaseEdgeAlpha * live.opacity * (1 + progress)
      );
      baseEdgeMaterial.linewidth = live.spBaseEdgeThickness;
      const actionWidth =
        live.spActionEdgeThickness * (1 + (crowd - 1) * progress);
      exploreEdgeMaterial.opacity = 0.9 * live.opacity;
      exploreEdgeMaterial.linewidth = actionWidth;
      finalEdgeMaterial.opacity = live.opacity;
      finalEdgeMaterial.linewidth = actionWidth;
      dotMesh.scale.setScalar(live.spDotSize / 300);

      // Advance traversal dot
      const updateDotAlong = (from: number, to: number, dt: number) => {
        const a = nodes[from].position;
        const b = nodes[to].position;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const speedPerSecond =
          live.spTraversalSpeed *
          live.globalTimeMultiplier *
          (glyphMode ? GLYPH_WALK_BOOST : 1); // edges/sec
        const tIncrement = speedPerSecond * dt;
        traversalT += tIncrement;
        const t = Math.min(1, traversalT);
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        dotMesh.position.set(x, y, 0);
        const glow = 1.0 + live.spDotGlow * Math.sin(timeMs * 0.01);
        (dotMaterial as THREE.MeshBasicMaterial).color.setRGB(
          live.colors.accent[0] * glow,
          live.colors.accent[1] * glow,
          live.colors.accent[2] * glow
        );
        if (t >= 1) {
          traversalT = 0;
          return true; // reached end
        }
        return false;
      };

      const dtSec = Math.min(0.05, (timeMs - lastTraversalTime) / 1000);
      lastTraversalTime = timeMs;

      if (traversalActive) {
        if (foundPath.length === 0) {
          // During search: move along an open or recently closed edge to illustrate exploration
          const current = inOpen.values().next().value ?? startNode;
          const nbr = neighbors(current)[0];
          if (nbr) {
            const to = nbr.source === current ? nbr.target : nbr.source;
            if (
              !traversalEdge ||
              traversalEdge.from !== current ||
              traversalEdge.to !== to
            ) {
              traversalEdge = { from: current, to };
              traversalT = 0;
            }
            updateDotAlong(traversalEdge.from, traversalEdge.to, dtSec);
          }
        } else if (foundPath.length === 1) {
          // Start node is the goal node — the sliders allow it. There is no
          // edge to walk, so retire the traversal immediately rather than
          // sitting on a frozen frame forever.
          traversalActive = false;
          pendingRegenerate = true;
          regenerateAt = timeMs + 500;
        } else if (foundPath.length > 1) {
          // Walk full path backwards (goal -> start)
          if (!traversalEdge) {
            traversalEdge = {
              from: foundPath[foundPath.length - 1],
              to: foundPath[foundPath.length - 2],
            };
            traversalT = 0;
          }
          const reached = updateDotAlong(
            traversalEdge.from,
            traversalEdge.to,
            dtSec
          );
          if (reached) {
            const idx = foundPath.indexOf(traversalEdge.to);
            if (idx > 0) {
              traversalEdge = { from: foundPath[idx], to: foundPath[idx - 1] };
            } else {
              traversalActive = false; // completed walk
              pendingRegenerate = true;
              regenerateAt = timeMs + 500; // brief pause, then regenerate
            }
          }
        }
      }

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (frozenRef.current) {
        animationRef.current = null;
        return;
      }
      animationRef.current = requestAnimationFrame(render);
    }

    animationRef.current = requestAnimationFrame(render);
    resumeRef.current = () => {
      if (animationRef.current === null)
        animationRef.current = requestAnimationFrame(render);
    };

    // Applied at most once per frame — a phone's URL bar fires resize
    // repeatedly over a single flick, and each raw call reallocates the
    // drawing buffer (and the bloom pass's render targets) mid-scroll.
    let resizeFrame: number | null = null;
    const applyResize = () => {
      resizeFrame = null;
      renderer.setSize(window.innerWidth, window.innerHeight);
      // Line2 widths are in screen space, so the materials need to know how
      // big the screen is or the edges scale wrong after a resize.
      lineResolution.set(window.innerWidth, window.innerHeight);
      if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
      }
      // The number is laid out for the viewport's shape. A URL bar sliding
      // away is not a new shape; a real one gets the number laid out again.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        glyphSize = size;
        if (glyphMode && !pendingRegenerate) {
          pendingRegenerate = true;
          regenerateAt = performance.now();
        }
      }
    };
    const handleResize = () => {
      if (resizeFrame === null) {
        resizeFrame = requestAnimationFrame(applyResize);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      resumeRef.current = null;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      edgeLines.forEach(l => l.geometry.dispose());
      baseEdgeMaterial.dispose();
      exploreEdgeMaterial.dispose();
      finalEdgeMaterial.dispose();
      nodeGeometry.dispose();
      (nodeMaterial as THREE.Material).dispose();
      dotGeometry.dispose();
      (dotMaterial as THREE.Material).dispose();
      // The bloom pass carries several full-screen render targets, and this
      // effect re-runs on every settings change.
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
    // Structural only: the graph and the search. Everything else is read live
    // off settingsRef inside render().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.spTotalNodes,
    settings.spEdgeDensity,
    settings.spHeuristicWeight,
    settings.spStartNode,
    settings.spGoalNode,
    settings.spGlowBloom,
    settings.spGlowStrength,
    settings.spGlowRadius,
    settings.spGlowThreshold,
  ]);

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
        opacity: settings.opacity,
      }}
    />
  );
};

export default ShortestPathLabBackground;
