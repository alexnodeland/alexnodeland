import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
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
import { GraphTopologySettings } from './config';

// The 404 sequence. The number is sampled at this many columns across the
// viewport; the network recruits between these many extra nodes to draw it,
// by viewport area; and a recruit links to this many of its neighbours.
const GLYPH_COLS = 160;
const MIN_RECRUITS = 150;
const MAX_RECRUITS = 320;
const WEB_LINKS = 2;
// A recruit counts as arrived within this distance of its place.
const ARRIVAL = 0.05;

type Vector2 = { x: number; y: number };

interface GraphNode {
  id: number;
  position: Vector2;
  velocity: Vector2;
  fixed?: boolean;
}

interface GraphEdge {
  source: number;
  target: number;
  latencyMs: number; // edge length represents latency
  weight: number; // conductivity proxy: higher = better
}

// Simple seeded RNG for deterministic layouts across reloads
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createClusteredGraph(
  nodeCount: number,
  clusterCount: number,
  rng: () => number
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  // Create specified number of distinct clusters with high internal connectivity
  const nodesPerCluster = Math.floor(nodeCount / clusterCount);
  const clusters: number[][] = [];

  const nodes: GraphNode[] = [];
  let nodeId = 0;

  // Create clusters positioned in different areas
  for (let c = 0; c < clusterCount; c++) {
    const clusterNodes: number[] = [];
    const angle = (c / clusterCount) * 2 * Math.PI;
    const clusterX = Math.cos(angle) * 0.6;
    const clusterY = Math.sin(angle) * 0.6;

    const actualNodesInCluster =
      c === clusterCount - 1
        ? nodeCount - nodeId // Last cluster gets remaining nodes
        : nodesPerCluster;

    for (let n = 0; n < actualNodesInCluster; n++) {
      const localX = (rng() - 0.5) * 0.4; // Tight cluster spread
      const localY = (rng() - 0.5) * 0.4;
      nodes.push({
        id: nodeId,
        position: { x: clusterX + localX, y: clusterY + localY },
        velocity: { x: 0, y: 0 },
      });
      clusterNodes.push(nodeId);
      nodeId++;
    }
    clusters.push(clusterNodes);
  }

  const edges: GraphEdge[] = [];

  // High-conductivity intra-cluster connections (low latency, high bandwidth)
  for (const cluster of clusters) {
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        if (rng() < 0.8) {
          // High connectivity within clusters
          const latencyMs = 0.1 + rng() * 0.9; // Very low latency: 0.1-1ms (same rack)
          // Conductivity = bandwidth / latency (higher is better)
          // Assume 100Gbps intra-cluster bandwidth
          const bandwidth = 100; // Gbps
          const weight = bandwidth / latencyMs; // High conductivity
          edges.push({
            source: cluster[i],
            target: cluster[j],
            latencyMs,
            weight,
          });
        }
      }
    }
  }

  // Sparse inter-cluster connections (high latency, lower bandwidth)
  for (let c1 = 0; c1 < clusters.length; c1++) {
    for (let c2 = c1 + 1; c2 < clusters.length; c2++) {
      const cluster1 = clusters[c1];
      const cluster2 = clusters[c2];

      // Add a few high-latency inter-cluster links
      const linkCount = Math.max(1, Math.floor(rng() * 3));
      for (let l = 0; l < linkCount; l++) {
        const node1 = cluster1[Math.floor(rng() * cluster1.length)];
        const node2 = cluster2[Math.floor(rng() * cluster2.length)];
        const latencyMs = 5 + rng() * 15; // Higher latency: 5-20ms (cross-datacenter)
        // Lower bandwidth for inter-cluster
        const bandwidth = 10; // Gbps
        const weight = bandwidth / latencyMs; // Lower conductivity
        edges.push({ source: node1, target: node2, latencyMs, weight });
      }
    }
  }

  // Add some random backup/redundant connections for resilience
  const redundantEdges = Math.floor(nodeCount * 0.1);
  for (let e = 0; e < redundantEdges; e++) {
    const i = Math.floor(rng() * nodeCount);
    const j = Math.floor(rng() * nodeCount);
    if (
      i !== j &&
      !edges.some(
        edge =>
          (edge.source === i && edge.target === j) ||
          (edge.source === j && edge.target === i)
      )
    ) {
      const latencyMs = 2 + rng() * 8; // Medium latency: 2-10ms
      const bandwidth = 25; // Medium bandwidth
      const weight = bandwidth / latencyMs;
      edges.push({ source: i, target: j, latencyMs, weight });
    }
  }

  return { nodes, edges };
}

// Proper graph conductivity calculation for weighted undirected graphs
// We want HIGH conductivity WITHIN the subgraph, LOW conductivity ACROSS the boundary
function calculateSubgraphConductivity(
  nodeIds: Set<number>,
  edges: GraphEdge[],
  totalNodes: number
): number {
  if (nodeIds.size === 0) return -Infinity;
  if (nodeIds.size === totalNodes) return -Infinity; // Full graph is not a valid subgraph

  // Calculate cut edges and internal edges
  let cutWeight = 0;
  let internalWeight = 0;

  for (const e of edges) {
    const sourceInSubgraph = nodeIds.has(e.source);
    const targetInSubgraph = nodeIds.has(e.target);

    if (sourceInSubgraph && targetInSubgraph) {
      // Internal edge - high weight is good (high conductivity/low latency)
      internalWeight += e.weight;
    } else if (sourceInSubgraph || targetInSubgraph) {
      // Cut edge - low weight is good (minimize external connections)
      cutWeight += e.weight;
    }
  }

  // For resource allocation, we want:
  // 1. High internal conductivity (sum of internal edge weights)
  // 2. Low external conductivity (sum of cut edge weights)
  // 3. Balanced size (not too small, not too large)

  // Quality metric: maximize internal connectivity while minimizing cut
  // Q = internal_weight / (1 + cut_weight)
  // This rewards high internal connectivity and penalizes high cut weight

  if (internalWeight === 0) return -Infinity; // Disconnected subgraph

  const quality = internalWeight / (1.0 + cutWeight);

  // Apply size penalty to avoid trivial solutions
  const sizePenalty = Math.exp(
    -Math.abs(nodeIds.size - totalNodes / 2) / (totalNodes / 4)
  );

  return quality * sizePenalty;
}

const GraphTopologyBackground: React.FC<
  AnimatedBackgroundProps<GraphTopologySettings>
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

    // Animation Speed is a master multiplier over this background's own rates:
    // the layout timestep and the annealer's proposal rate. The old
    // `animationSpeed || globalTimeMultiplier` could never reach the second
    // operand, since animationSpeed's slider bottoms out at 0.2.
    //
    // Read per frame rather than captured: only the settings that determine
    // the graph itself belong in this effect's dep array, and rebuilding the
    // scene mid-drag threw away the search that was in progress.
    const liveSpeedScale = () => settingsRef.current.globalTimeMultiplier;
    const liveSimulationSpeed = () =>
      settingsRef.current.animationSpeed * liveSpeedScale();
    const nodeCountParam =
      settings.totalNodes || Math.max(12, Math.min(48, 32));
    const clusterCountParam =
      settings.clusterCount ||
      Math.max(2, Math.min(4, Math.floor(nodeCountParam / 8)));
    // A subgraph spanning every node has no boundary to cut, so its
    // conductivity is -Infinity — and once both the current and the proposed
    // set score -Infinity, deltaE is NaN, every proposal is rejected, and the
    // annealer sits in its "converged" state from the first frame. The sliders
    // let both counts reach 16, so keep the subgraph strictly inside the graph.
    const targetSubgraphSize = Math.min(
      settings.requestedNodes || Math.max(3, Math.min(12, 8)),
      nodeCountParam - 1
    );
    // Scale is baked into the force constants below, so it stays structural.
    const graphScale = settings.scale || 1.0;
    // The setting is in proposals per second, so it is used as-is.
    const liveWalkStepsPerSecond = () =>
      Math.max(
        0.1,
        settingsRef.current.updateAnimationSpeed * liveSpeedScale()
      );

    const rng = mulberry32(1337);
    const { nodes, edges } = createClusteredGraph(
      nodeCountParam,
      clusterCountParam,
      rng
    );

    // Force-directed layout with spring lengths proportional to latency
    const desiredLen = (latency: number) =>
      Math.sqrt(latency / 10.0) * 0.2 * graphScale;
    const repulsion = 0.01 * graphScale; // Coulomb-like repulsion
    const springK = 0.05; // Spring constant
    const damping = 0.9; // Higher damping for stability

    // Random-walk search state for high-conductivity subgraph of size n
    let currentSet: Set<number> = new Set<number>();
    let bestSet: Set<number> = new Set<number>();
    let bestScore = -Infinity;
    let lastStepTime = 0;
    let iterationCount = 0; // Track iterations for temperature schedule
    let currentTemperature = 1.0; // Track current temperature for visualization

    // Initialize current set from random seed using proper graph connectivity
    const seedIndex = Math.floor(rng() * nodes.length);
    currentSet.add(seedIndex);

    // Expand by connected neighbors until target size (ensures connectivity)
    while (currentSet.size < targetSubgraphSize) {
      const boundary: number[] = [];
      const currentArray = Array.from(currentSet);

      // Find all nodes connected to current subgraph
      for (const nodeId of currentArray) {
        for (const e of edges) {
          if (e.source === nodeId && !currentSet.has(e.target)) {
            boundary.push(e.target);
          }
          if (e.target === nodeId && !currentSet.has(e.source)) {
            boundary.push(e.source);
          }
        }
      }

      if (boundary.length > 0) {
        // Add a connected neighbor
        const next = boundary[Math.floor(rng() * boundary.length)];
        currentSet.add(next);
      } else {
        // Fallback: add random node if no connected neighbors
        const next = Math.floor(rng() * nodes.length);
        currentSet.add(next);
      }
    }

    // Initialize best solution and current score
    bestSet = new Set(currentSet);
    bestScore = calculateSubgraphConductivity(bestSet, edges, nodes.length);

    // Build Three.js geometry for edges (lines) and nodes (instanced circles).
    //
    // Line2 rather than THREE.Line because gl.LINES is one device pixel wide
    // in every browser, so the width the search state computes below was
    // discarded. And a material per line rather than one shared one: the loop
    // below assigns each edge its own colour, opacity and width, and writing
    // all of that into a single shared material meant every edge rendered
    // identically — whatever the last one in the loop happened to be.
    const lineResolution = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight
    );

    const edgeSegments: Line2[] = [];
    for (const e of edges) {
      const geometry = new LineGeometry();
      geometry.setPositions([0, 0, 0, 0, 0, 0]);
      const material = new LineMaterial({
        color: new THREE.Color(0.1, 0.1, 0.12), // Very dark gray for background edges
        transparent: true,
        opacity: settings.opacity * 0.1, // Very faint by default; live below
        linewidth: 1,
        resolution: lineResolution,
      });
      const line = new Line2(geometry, material);
      line.userData = { e };
      scene.add(line);
      edgeSegments.push(line);
    }

    // Node rendering: simple circles via Points
    const nodePositions = new Float32Array(nodes.length * 3);
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(nodePositions, 3)
    );
    const nodeColors = new Float32Array(nodes.length * 3);
    nodeGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(nodeColors, 3)
    );

    const nodeMaterial = new THREE.PointsMaterial({
      size: settings.elementSize * 300,
      vertexColors: true,
      transparent: true,
      opacity: settings.opacity, // seed; refreshed live in renderFrame
      sizeAttenuation: true,
    });
    const points = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(points);

    // ── The 404 sequence ───────────────────────────────────────────────────
    // The whole network is pulled into the number: every node is given a
    // place inside it and drawn there, and any link stretched past twice its
    // length on the way breaks. Thirty-odd machines cannot draw three digits,
    // so the network recruits: new nodes spawn out of the existing ones, a
    // few at a time, fly to their own places and link up with their nearest
    // neighbours as they arrive — the same sparse web the clusters are joined
    // by. Let go, the recruits fly back into the nodes they came from, the
    // broken links heal, and the layout picks up where it was.
    const sequence = new NotFoundSequence();
    let progress = 0;

    interface Recruit {
      x: number;
      y: number;
      tx: number;
      ty: number;
      /** The node it spawns out of, and flies back into. */
      from: number;
      /** Seconds into the sequence at which it appears. */
      born: number;
      spawned: boolean;
      /** Which digit it belongs to, for its colour. */
      third: number;
    }
    let recruits: Recruit[] = [];
    let webPairs: Array<[number, number]> = [];
    let nodeTargets = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
    const edgeLife = new Float32Array(edges.length).fill(1);
    let glyphSize = { width: window.innerWidth, height: window.innerHeight };
    let numberBuilt = false;

    const recruitCount = () => {
      const area = window.innerWidth * window.innerHeight;
      return Math.round(
        Math.max(MIN_RECRUITS, Math.min(MAX_RECRUITS, area / 5000))
      );
    };

    // The recruits' points and their web, allocated once at the most either
    // can hold and drawn up to what is in use; the buffers are written in
    // place each frame rather than reallocated.
    const recruitPositions = new Float32Array(MAX_RECRUITS * 3);
    const recruitColors = new Float32Array(MAX_RECRUITS * 3);
    const recruitGeometry = new THREE.BufferGeometry();
    recruitGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(recruitPositions, 3)
    );
    recruitGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(recruitColors, 3)
    );
    recruitGeometry.setDrawRange(0, 0);
    const recruitMaterial = new THREE.PointsMaterial({
      size: settings.elementSize * 260,
      vertexColors: true,
      transparent: true,
      opacity: settings.opacity,
      sizeAttenuation: true,
    });
    const recruitPoints = new THREE.Points(recruitGeometry, recruitMaterial);
    recruitPoints.visible = false;
    scene.add(recruitPoints);

    const MAX_WEB = MAX_RECRUITS * WEB_LINKS;
    const webGeometry = new LineSegmentsGeometry();
    webGeometry.setPositions(new Float32Array(MAX_WEB * 6));
    webGeometry.setColors(new Float32Array(MAX_WEB * 6));
    webGeometry.instanceCount = 0;
    const webMaterial = new LineMaterial({
      vertexColors: true,
      transparent: true,
      opacity: settings.opacity,
      linewidth: 1,
      resolution: lineResolution,
    });
    const web = new LineSegments2(webGeometry, webMaterial);
    web.visible = false;
    scene.add(web);
    const webPositionBuffer = (
      webGeometry.attributes.instanceStart as THREE.InterleavedBufferAttribute
    ).data;
    const webColorBuffer = (
      webGeometry.attributes
        .instanceColorStart as THREE.InterleavedBufferAttribute
    ).data;

    /**
     * Lays the number out for the current viewport: a place inside it for
     * every node and every recruit, and the web between the recruits. On a
     * rebuild (the viewport changed shape) the recruits keep where they are
     * and only their places move, so they glide rather than jump.
     */
    const buildNumber = () => {
      numberBuilt = true;
      const cols = GLYPH_COLS;
      const rows = Math.max(
        24,
        Math.round((cols * glyphSize.height) / glyphSize.width)
      );
      const field = rasterizeGlyph(cols, rows);
      const wanted = recruitCount();
      const total = wanted + nodes.length;
      const seeded = mulberry32(4040 + nodes.length);
      const spots = sampleGlyphPoints(
        field,
        total,
        glyphSpacingFor(field, total),
        seeded
      ).map(p => ({
        x: (p.x / cols) * 2 - 1,
        y: 1 - (p.y / rows) * 2,
      }));

      // A number that could not be drawn (no canvas to rasterise it on)
      // leaves everything where it is.
      if (!spots.length) {
        nodeTargets = nodes.map(n => ({ x: n.position.x, y: n.position.y }));
        recruits = [];
        webPairs = [];
        return;
      }

      // The existing nodes take the first places; the recruits the rest.
      nodeTargets = nodes.map((_, i) => spots[i % spots.length]);
      const places = spots.slice(nodes.length);
      const previous = recruits;
      recruits = places.map((place, i) => {
        const kept = previous[i];
        const from = Math.floor(seeded() * nodes.length);
        const origin = nodes[from].position;
        return {
          x: kept ? kept.x : origin.x,
          y: kept ? kept.y : origin.y,
          tx: place.x,
          ty: place.y,
          from: kept ? kept.from : from,
          born: kept ? kept.born : 0.4 + seeded() * 4.2,
          spawned: kept ? kept.spawned : false,
          // The digits sit in three bands across the number's width.
          third: place.x < -0.25 ? 0 : place.x > 0.25 ? 2 : 1,
        };
      });

      // Each recruit to its nearest neighbours by place, deduplicated, and
      // never across the gap between two digits.
      const reach = glyphSpacingFor(field, total) * (2 / cols) * 3.5;
      const seen = new Set<string>();
      webPairs = [];
      for (let i = 0; i < recruits.length && webPairs.length < MAX_WEB; i++) {
        const a = recruits[i];
        const near: Array<{ j: number; d: number }> = [];
        for (let j = 0; j < recruits.length; j++) {
          if (j === i) continue;
          const b = recruits[j];
          const d = Math.hypot(a.tx - b.tx, a.ty - b.ty);
          if (d <= reach) near.push({ j, d });
        }
        near.sort((u, v) => u.d - v.d);
        for (const { j } of near.slice(0, WEB_LINKS)) {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) continue;
          seen.add(key);
          webPairs.push([i, j]);
        }
      }
    };

    /** Draws the recruits and their web for this frame. */
    const drawRecruits = (
      live: GraphTopologySettings,
      timeMs: number,
      on: boolean
    ) => {
      const showing = sequence.active && recruits.length > 0;
      recruitPoints.visible = showing;
      web.visible = showing && webPairs.length > 0;
      if (!showing) return;

      const hues = [
        live.colors.primary,
        live.colors.secondary,
        live.colors.accent,
      ];
      const arrival = new Float32Array(recruits.length);
      for (let i = 0; i < recruits.length; i++) {
        const r = recruits[i];
        const o = i * 3;
        recruitPositions[o] = r.x;
        recruitPositions[o + 1] = r.y;
        recruitPositions[o + 2] = 0;
        let bright = 0;
        if (r.spawned) {
          const since = sequence.seconds - r.born;
          const fadeIn = frozenRef.current ? 1 : Math.min(1, since / 0.6);
          const pulse = 0.85 + 0.3 * Math.sin(timeMs * 0.0025 + i * 1.7);
          bright = fadeIn * pulse * (on ? 1 : progress);
          arrival[i] = Math.max(
            0,
            1 - Math.hypot(r.tx - r.x, r.ty - r.y) / ARRIVAL
          );
        }
        const [hr, hg, hb] = hues[r.third];
        recruitColors[o] = hr * bright;
        recruitColors[o + 1] = hg * bright;
        recruitColors[o + 2] = hb * bright;
      }
      recruitGeometry.setDrawRange(0, recruits.length);
      (
        recruitGeometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;
      (
        recruitGeometry.getAttribute('color') as THREE.BufferAttribute
      ).needsUpdate = true;
      recruitMaterial.size =
        live.elementSize * 260 * (0.9 + 0.1 * Math.sin(timeMs * 0.002));
      recruitMaterial.opacity = live.opacity;

      // A link is drawn once both its ends are in place, and twinkles.
      const [lr, lg, lb] = live.colors.primary;
      const pos = webPositionBuffer.array as Float32Array;
      const col = webColorBuffer.array as Float32Array;
      for (let k = 0; k < webPairs.length; k++) {
        const [i, j] = webPairs[k];
        const a = recruits[i];
        const b = recruits[j];
        const o = k * 6;
        pos[o] = a.x;
        pos[o + 1] = a.y;
        pos[o + 2] = 0;
        pos[o + 3] = b.x;
        pos[o + 4] = b.y;
        pos[o + 5] = 0;
        const twinkle = 0.55 + 0.45 * Math.sin(timeMs * 0.003 + k * 0.9);
        const strength =
          Math.min(arrival[i], arrival[j]) *
          twinkle *
          1.3 *
          (on ? 1 : progress);
        for (let c = 0; c < 6; c += 3) {
          col[o + c] = lr * strength;
          col[o + c + 1] = lg * strength;
          col[o + c + 2] = lb * strength;
        }
      }
      webGeometry.instanceCount = webPairs.length;
      webPositionBuffer.needsUpdate = true;
      webColorBuffer.needsUpdate = true;
      webMaterial.opacity = live.opacity * 0.8;
      webMaterial.linewidth = (live.edgeThickness || 2) * 0.5;
    };

    /**
     * Advances the sequence by `dt` seconds: the nodes toward their places,
     * the recruits out of the nodes and toward theirs — or back, once the
     * page is left.
     */
    const stepNumber = (dt: number, on: boolean) => {
      if (!sequence.active) {
        // Fully let go: the next visit starts from nothing again.
        for (const r of recruits) r.spawned = false;
        return;
      }
      if (!numberBuilt) buildNumber();
      const snap = frozenRef.current;
      const pull = snap ? 1 : 1 - Math.exp(-dt * 3 * progress);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const t = nodeTargets[i];
        n.position.x += (t.x - n.position.x) * pull;
        n.position.y += (t.y - n.position.y) * pull;
        // The layout's own forces give way to the number.
        n.velocity.x *= 1 - progress;
        n.velocity.y *= 1 - progress;
      }
      const fly = snap ? 1 : 1 - Math.exp(-dt * 2.6);
      for (const r of recruits) {
        const origin = nodes[r.from].position;
        if (!r.spawned) {
          r.x = origin.x;
          r.y = origin.y;
          if (on && (snap || sequence.seconds >= r.born)) r.spawned = true;
          // A still is one frame: what spawns in it has to arrive in it too.
          if (!snap) continue;
        }
        const gx = on ? r.tx : origin.x;
        const gy = on ? r.ty : origin.y;
        r.x += (gx - r.x) * fly;
        r.y += (gy - r.y) * fly;
      }
    };

    function stepLayout(dt: number) {
      // Limit dt to prevent instability
      dt = Math.min(dt, 0.02);

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.position.x - b.position.x;
          const dy = a.position.y - b.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 0.01) continue; // Skip if too close

          // Repulsive force with cutoff
          const effectiveDist = Math.max(dist, 0.05);
          const force = Math.min(
            repulsion / (effectiveDist * effectiveDist),
            0.1
          );

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          a.velocity.x += fx * dt;
          a.velocity.y += fy * dt;
          b.velocity.x -= fx * dt;
          b.velocity.y -= fy * dt;
        }
      }

      // Spring forces for edges
      for (const e of edges) {
        const a = nodes[e.source];
        const b = nodes[e.target];
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.001) continue; // Skip if overlapping

        const targetLen = desiredLen(e.latencyMs);
        const displacement = dist - targetLen;

        // Spring force with weight-based strength
        const edgeStrength = e.weight / 100; // Normalize weight
        const force = springK * displacement * Math.min(edgeStrength, 1.0);

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.velocity.x += fx * dt;
        a.velocity.y += fy * dt;
        b.velocity.x -= fx * dt;
        b.velocity.y -= fy * dt;
      }

      // Center attraction to prevent drift
      for (const n of nodes) {
        const centerForce = 0.001;
        n.velocity.x -= n.position.x * centerForce;
        n.velocity.y -= n.position.y * centerForce;
      }

      // Update positions with velocity limiting
      for (const n of nodes) {
        // Apply damping
        n.velocity.x *= damping;
        n.velocity.y *= damping;

        // Limit maximum velocity
        const maxVel = 0.5;
        const vel = Math.sqrt(
          n.velocity.x * n.velocity.x + n.velocity.y * n.velocity.y
        );
        if (vel > maxVel) {
          n.velocity.x = (n.velocity.x / vel) * maxVel;
          n.velocity.y = (n.velocity.y / vel) * maxVel;
        }

        // Update position
        n.position.x += n.velocity.x * dt;
        n.position.y += n.velocity.y * dt;

        // Keep within bounds with soft boundaries
        const boundary = 0.95;
        if (Math.abs(n.position.x) > boundary) {
          n.position.x = boundary * Math.sign(n.position.x);
          n.velocity.x *= -0.5; // Bounce
        }
        if (Math.abs(n.position.y) > boundary) {
          n.position.y = boundary * Math.sign(n.position.y);
          n.velocity.y *= -0.5; // Bounce
        }
      }
    }

    // Proper MCMC with Metropolis-Hastings for subgraph optimization
    function mcmcStep(now: number) {
      const stepIntervalMs = 1000 / liveWalkStepsPerSecond();
      if (now - lastStepTime < stepIntervalMs) return;
      lastStepTime = now;
      iterationCount++;

      // Generate proposal state using valid graph mutations
      const proposal = generateProposal(currentSet, targetSubgraphSize);

      // Calculate conductivity (objective function) for current and proposed states
      const currentConductivity = calculateSubgraphConductivity(
        currentSet,
        edges,
        nodes.length
      );
      const proposedConductivity = calculateSubgraphConductivity(
        proposal,
        edges,
        nodes.length
      );

      // Simulated annealing with exponential cooling schedule
      const initialTemp = 1.0;
      const coolingRate = 0.995;
      const minTemp = 0.01;
      currentTemperature = Math.max(
        minTemp,
        initialTemp * Math.pow(coolingRate, iterationCount)
      );

      // Metropolis-Hastings acceptance probability
      // We want to maximize conductivity score
      const deltaE = proposedConductivity - currentConductivity;
      const acceptanceProbability =
        deltaE >= 0 ? 1.0 : Math.exp(deltaE / currentTemperature);

      // Accept or reject the proposal
      const shouldAccept = rng() < acceptanceProbability;

      if (shouldAccept) {
        currentSet = proposal;

        // Update best solution found so far
        if (proposedConductivity > bestScore) {
          bestScore = proposedConductivity;
          bestSet = new Set(proposal);
          // Reset iteration count on finding better solution (reheating)
          iterationCount = Math.floor(iterationCount * 0.8);
        }
      }
    }

    // Generate a valid proposal by mutating the current subgraph
    function generateProposal(
      current: Set<number>,
      targetSize: number
    ): Set<number> {
      const mutationType = Math.floor(rng() * 4);
      const proposal = new Set(current);

      if (mutationType === 0 && current.size > 0) {
        // Mutation 1: Swap a node with a neighbor (maintains connectivity)
        const currentArray = Array.from(current);
        const removeIdx = Math.floor(rng() * currentArray.length);
        const nodeToRemove = currentArray[removeIdx];

        // Find neighbors of the node to remove
        const neighbors = new Set<number>();
        for (const e of edges) {
          if (e.source === nodeToRemove && !current.has(e.target)) {
            neighbors.add(e.target);
          }
          if (e.target === nodeToRemove && !current.has(e.source)) {
            neighbors.add(e.source);
          }
        }

        if (neighbors.size > 0) {
          const neighborArray = Array.from(neighbors);
          const nodeToAdd =
            neighborArray[Math.floor(rng() * neighborArray.length)];
          proposal.delete(nodeToRemove);
          proposal.add(nodeToAdd);
        }
      } else if (mutationType === 1) {
        // Mutation 2: Expand subgraph by adding a connected node
        if (current.size < targetSize + 2) {
          const boundary = new Set<number>();
          const currentArray = Array.from(current);

          // Find boundary nodes (nodes connected to current subgraph but not in it)
          for (const nodeId of currentArray) {
            for (const e of edges) {
              if (e.source === nodeId && !current.has(e.target)) {
                boundary.add(e.target);
              }
              if (e.target === nodeId && !current.has(e.source)) {
                boundary.add(e.source);
              }
            }
          }

          if (boundary.size > 0) {
            const boundaryArray = Array.from(boundary);
            const nodeToAdd =
              boundaryArray[Math.floor(rng() * boundaryArray.length)];
            proposal.add(nodeToAdd);
          }
        }
      } else if (mutationType === 2) {
        // Mutation 3: Contract subgraph by removing a peripheral node
        if (current.size > Math.max(2, targetSize - 2)) {
          const currentArray = Array.from(current);

          // Prefer removing nodes with fewer connections within the subgraph
          let minConnections = Infinity;
          let candidatesForRemoval: number[] = [];

          for (const nodeId of currentArray) {
            let internalConnections = 0;
            for (const e of edges) {
              if (
                (e.source === nodeId && current.has(e.target)) ||
                (e.target === nodeId && current.has(e.source))
              ) {
                internalConnections++;
              }
            }

            if (internalConnections < minConnections) {
              minConnections = internalConnections;
              candidatesForRemoval = [nodeId];
            } else if (internalConnections === minConnections) {
              candidatesForRemoval.push(nodeId);
            }
          }

          if (candidatesForRemoval.length > 0) {
            const nodeToRemove =
              candidatesForRemoval[
                Math.floor(rng() * candidatesForRemoval.length)
              ];
            proposal.delete(nodeToRemove);
          }
        }
      } else {
        // Mutation 4: Random jump (exploration) - replace a random subset
        if (rng() < 0.1) {
          // Low probability for exploration
          const currentArray = Array.from(current);
          const replaceCount = Math.min(2, Math.floor(currentArray.length / 3));

          // Remove some nodes
          for (let i = 0; i < replaceCount; i++) {
            if (currentArray.length > 0) {
              const removeIdx = Math.floor(rng() * currentArray.length);
              proposal.delete(currentArray[removeIdx]);
              currentArray.splice(removeIdx, 1);
            }
          }

          // Add random nodes to maintain size
          while (proposal.size < targetSize) {
            const randomNode = Math.floor(rng() * nodes.length);
            proposal.add(randomNode);
          }
        }
      }

      // Ensure proposal has correct size
      while (proposal.size > targetSize) {
        const proposalArray = Array.from(proposal);
        const remove = proposalArray[Math.floor(rng() * proposalArray.length)];
        proposal.delete(remove);
      }

      while (proposal.size < targetSize) {
        // Add nodes preferentially from boundary
        const boundary = new Set<number>();
        const currentArray = Array.from(proposal);

        for (const nodeId of currentArray) {
          for (const e of edges) {
            if (e.source === nodeId && !proposal.has(e.target)) {
              boundary.add(e.target);
            }
            if (e.target === nodeId && !proposal.has(e.source)) {
              boundary.add(e.source);
            }
          }
        }

        if (boundary.size > 0) {
          const boundaryArray = Array.from(boundary);
          const add = boundaryArray[Math.floor(rng() * boundaryArray.length)];
          proposal.add(add);
        } else {
          // Fallback: add random node
          const add = Math.floor(rng() * nodes.length);
          proposal.add(add);
        }
      }

      return proposal;
    }

    let lastFrameMs = 0;
    function renderFrame(timeMs: number) {
      const live = settingsRef.current;
      const opacity = live.opacity;
      const edgeThickness = live.edgeThickness || 2.0;
      const dt = Math.min(0.05, liveSimulationSpeed() * 0.016);
      // Real seconds since the last frame, for the sequence: clamped so a tab
      // coming back from the background plays one long frame rather than
      // the whole time it was away.
      const real = lastFrameMs
        ? Math.min((timeMs - lastFrameMs) / 1000, 0.1)
        : 0;
      lastFrameMs = timeMs;
      stepLayout(dt);
      mcmcStep(timeMs);

      // The 404 sequence, after the layout so that it has the last word on
      // where everything is. A frozen frame tells the whole story at once.
      const on = notFoundRef.current;
      progress = frozenRef.current
        ? sequence.settle(on)
        : sequence.advance(real, on);
      stepNumber(real, on);

      // Check for convergence
      const hasConverged =
        currentSet.size === bestSet.size &&
        Array.from(currentSet).every(nodeId => bestSet.has(nodeId));

      // Animation timings
      const slowPulse = Math.sin(timeMs * 0.001) * 0.5 + 0.5; // 0 to 1, slow pulse
      const flashPhase = Math.sin(timeMs * 0.004); // -1 to 1, for flashing
      const searchPulse = Math.sin(timeMs * 0.003) * 0.5 + 0.5; // For search animation

      // Update edge lines
      for (let i = 0; i < edgeSegments.length; i++) {
        const line = edgeSegments[i];
        const e = line.userData.e as GraphEdge;
        const a = nodes[e.source].position;
        const b = nodes[e.target].position;
        line.geometry.setPositions([a.x, a.y, 0, b.x, b.y, 0]);

        // The 404 sequence: a link stretched past twice its length breaks,
        // flaring as it goes; a broken one heals once the number is let go.
        if (progress > 0.15 && edgeLife[i] >= 1) {
          const length = Math.hypot(a.x - b.x, a.y - b.y);
          if (length > desiredLen(e.latencyMs) * 2.2 + 0.12)
            // In a still there is no time for it to go: it is gone.
            edgeLife[i] = frozenRef.current ? 0 : 0.999;
        }
        if (edgeLife[i] < 1) {
          edgeLife[i] = on
            ? Math.max(0, edgeLife[i] - real * 1.4)
            : Math.min(1, edgeLife[i] + real * 0.8);
        }

        // Determine edge state
        const sourceInCurrent = currentSet.has(e.source);
        const targetInCurrent = currentSet.has(e.target);
        const sourceInBest = bestSet.has(e.source);
        const targetInBest = bestSet.has(e.target);

        const inCurrentSubgraph = sourceInCurrent && targetInCurrent;
        const inBestSubgraph = sourceInBest && targetInBest;
        const touchesCurrent =
          (sourceInCurrent || targetInCurrent) &&
          !(sourceInCurrent && targetInCurrent);
        const touchesBest =
          (sourceInBest || targetInBest) && !(sourceInBest && targetInBest);

        // Base properties from edge weight (conductivity)
        const normalizedWeight = Math.min(1, e.weight / 1000);

        let color: number[];
        let alpha: number;
        // Widths are in pixels now that Line2 honours them, so these are a
        // deliberately narrow spread — the graph reads as a drawing, and the
        // state hierarchy comes mostly from colour with weight as a hint.
        let linewidth = 1.0;

        if (hasConverged && inBestSubgraph) {
          // Converged optimal edges: flash between primary and accent
          const flash = flashPhase > 0 ? 1 : 0;
          color = flash > 0.5 ? live.colors.accent : live.colors.primary;
          alpha = 1.0; // Full opacity
          linewidth = 1.4;
        } else if (inBestSubgraph && inCurrentSubgraph) {
          // Edge in both: bright accent color
          color = live.colors.accent;
          alpha = 1.0;
          linewidth = 1.2;
        } else if (inBestSubgraph) {
          // Best only: primary color
          color = live.colors.primary;
          alpha = 0.9;
          linewidth = 1.0;
        } else if (inCurrentSubgraph) {
          // Current only: secondary color with pulse
          color = live.colors.secondary;
          alpha = 0.8 + searchPulse * 0.2;
          linewidth = 1.0;
        } else if (touchesCurrent) {
          // Boundary of current: faded secondary
          color = live.colors.secondary.map(c => c * 0.5) as [
            number,
            number,
            number,
          ];
          alpha = 0.4;
          linewidth = 0.7;
        } else if (touchesBest) {
          // Boundary of best: faded primary
          color = live.colors.primary.map(c => c * 0.5) as [
            number,
            number,
            number,
          ];
          alpha = 0.4;
          linewidth = 0.7;
        } else {
          // Background edge: very dark gray
          color = live.colors.background;
          alpha = 0.05 + normalizedWeight * 0.05; // Very faint
          linewidth = 0.5;
        }

        // A breaking link flares to the accent on its way out.
        const life = edgeLife[i];
        if (life < 1) {
          const flare = 1 - life;
          color = [
            color[0] + (live.colors.accent[0] - color[0]) * flare,
            color[1] + (live.colors.accent[1] - color[1]) * flare,
            color[2] + (live.colors.accent[2] - color[2]) * flare,
          ];
          alpha = Math.max(alpha, 0.8) * life;
        }

        // Apply settings
        const edgeLineMaterial = line.material as LineMaterial;
        edgeLineMaterial.color.setRGB(color[0], color[1], color[2]);
        edgeLineMaterial.opacity = alpha * opacity;
        edgeLineMaterial.linewidth = linewidth * edgeThickness;
      }

      // Update node positions and colors
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        nodePositions[i * 3 + 0] = n.position.x;
        nodePositions[i * 3 + 1] = n.position.y;
        nodePositions[i * 3 + 2] = 0;

        const inCurrent = currentSet.has(n.id);
        const inBest = bestSet.has(n.id);

        // Calculate node connectivity for visual emphasis
        let nodeConnectivity = 0;
        for (const e of edges) {
          if (
            (e.source === n.id && currentSet.has(e.target)) ||
            (e.target === n.id && currentSet.has(e.source))
          ) {
            nodeConnectivity += e.weight;
          }
        }
        const normalizedConnectivity = Math.min(1, nodeConnectivity / 500);

        let r: number, g: number, b: number;
        let brightness: number;

        if (hasConverged && inBest) {
          // Converged optimal nodes: flash between primary and accent
          if (flashPhase > 0) {
            [r, g, b] = live.colors.accent; // Accent
          } else {
            [r, g, b] = live.colors.primary; // Primary
          }
          brightness = 1.5; // Extra bright
        } else if (inBest && inCurrent) {
          // Node in both: bright accent with pulse
          [r, g, b] = live.colors.accent;
          brightness = 1.3 + slowPulse * 0.3;
        } else if (inBest) {
          // Best only: primary color
          [r, g, b] = live.colors.primary;
          brightness = 1.2;
        } else if (inCurrent) {
          // Current only: secondary color with search animation
          [r, g, b] = live.colors.secondary;
          brightness = 1.1 + searchPulse * 0.3;
        } else {
          // Background nodes: background color, barely visible
          [r, g, b] = live.colors.background;
          brightness = 0.1 + normalizedConnectivity * 0.1; // Very dim
        }

        // Apply temperature visualization (redder = hotter = more exploration)
        if (inCurrent && !hasConverged) {
          const tempColor = currentTemperature; // 0 to 1
          r = r * (1 - tempColor * 0.3) + tempColor * 0.3;
        }

        nodeColors[i * 3 + 0] = r * brightness;
        nodeColors[i * 3 + 1] = g * brightness;
        nodeColors[i * 3 + 2] = b * brightness;
      }

      (
        nodeGeometry.getAttribute('position') as THREE.BufferAttribute
      ).needsUpdate = true;
      (
        nodeGeometry.getAttribute('color') as THREE.BufferAttribute
      ).needsUpdate = true;

      // Dynamic node sizing based on algorithm state
      const baseNodeSize = live.elementSize * 400;
      let dynamicSize = baseNodeSize;

      if (hasConverged) {
        // Converged: stable with celebration pulse
        dynamicSize = baseNodeSize * (1.5 + Math.sin(timeMs * 0.002) * 0.3);
      } else {
        // Searching: size indicates temperature (exploration level)
        dynamicSize =
          baseNodeSize * (1.2 + currentTemperature * 0.4 + searchPulse * 0.2);
      }

      (points.material as THREE.PointsMaterial).size = dynamicSize;
      (points.material as THREE.PointsMaterial).opacity = opacity;

      drawRecruits(live, timeMs, on);

      renderer.render(scene, camera);
      if (frozenRef.current) {
        animationRef.current = null;
        return;
      }
      animationRef.current = requestAnimationFrame(renderFrame);
    }

    animationRef.current = requestAnimationFrame(renderFrame);
    resumeRef.current = () => {
      if (animationRef.current === null)
        animationRef.current = requestAnimationFrame(renderFrame);
    };

    // Applied at most once per frame — a phone's URL bar fires resize
    // repeatedly over a single flick, and each raw call reallocates the
    // drawing buffer mid-scroll.
    let resizeFrame: number | null = null;
    const applyResize = () => {
      resizeFrame = null;
      renderer.setSize(window.innerWidth, window.innerHeight);
      // Line2 widths are screen-space, so the materials need the viewport size.
      lineResolution.set(window.innerWidth, window.innerHeight);
      // The number is laid out for the viewport's shape. A URL bar sliding
      // away is not a new shape, and re-laying it out for one would send
      // every recruit somewhere new.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        glyphSize = size;
        if (numberBuilt) buildNumber();
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
      // Cleanup
      edgeSegments.forEach(l => {
        l.geometry?.dispose?.();
        (l.material as LineMaterial)?.dispose?.();
      });
      nodeGeometry.dispose();
      (points.material as THREE.Material).dispose();
      recruitGeometry.dispose();
      recruitMaterial.dispose();
      webGeometry.dispose();
      webMaterial.dispose();
      renderer.dispose();
      // dispose() releases three's own objects but leaves the GL context
      // alive until the canvas is collected. These components rebuild on every
      // settings change, so without this a slider drag can walk the tab past
      // the browser's active-context cap and blank the background.
      renderer.forceContextLoss();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
    // Structural only: these determine the graph itself, so changing one has to
    // rebuild the scene. Everything else is read live off settingsRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.totalNodes,
    settings.clusterCount,
    settings.requestedNodes,
    settings.scale,
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

export default GraphTopologyBackground;
