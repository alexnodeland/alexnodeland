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
import { GraphTopologySettings } from './config';

/**
 * A scheduler looking for somewhere to put a job.
 *
 * The network is what it was: clusters of machines, densely linked inside
 * and sparsely between, laid out by forces while a simulated annealer hunts
 * it for the best-connected subgraph of the size asked for. None of that is
 * changed here, and the layout is still worked out in the plane.
 *
 * What is new is the third axis, and it is the search's. The network lies
 * on a bench; a machine the annealer is considering stands a little off it,
 * one it has in its best set stands higher, and one in both stands highest.
 * So the answer is not a colour to be picked out of a drawing — it is the
 * part of the network that has been lifted clear of the rest, and while the
 * temperature is high it can be watched being picked up and put down.
 */

// Room for either network the scheduler is shown: the configured one, or
// the number (see numberNetwork).
const NODE_CAPACITY = 320;
// The number's own links, a dense network's, and a drop line a node.
const EDGE_CAPACITY = 2600;
// How long the machines take to fly into the number, to settle when it is
// laid out again, and to scatter back once the page is left.
const MORPH_IN_MS = 2200;
const MORPH_AGAIN_MS = 700;
const MORPH_OUT_MS = 1600;

export const FOV_DEGREES = 36;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);

// How far off the bench a machine stands: at rest, when the annealer is
// considering it, and when it is in the best set found so far. One in both
// stands at the sum.
const LIFT_REST = 0.05;
const LIFT_CURRENT = 0.15;
const LIFT_BEST = 0.27;
// How quickly a machine rises or settles, per second.
const LIFT_RATE = 4;
// How close to a node the pointer has to be to have it, in screen heights.
const REACH = 0.07;
const FLOOR_OPACITY = 0.13;
// A full turn of the network takes about four minutes.
const SPIN_PER_SECOND = 0.026;

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

export function createClusteredGraph(
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

/**
 * The number as a network, for the 404 sequence — the same kind of network
 * `createClusteredGraph` makes, with the digits as the datacenters. Each
 * machine sits at its place inside a digit, and stays there: a datacenter
 * has a location, and a node with one is pinned in the layout the way a
 * pinned node is in any force-directed drawing. Links along a stroke are
 * same-rack links and the links that bridge two digits are cross-datacenter
 * ones, with the latencies and bandwidths the generator gives those. The
 * scheduler's search then runs on it as on any other network.
 */
function numberNetwork(
  width: number,
  height: number,
  rng: () => number
): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
  const graph = glyphGraphFor(width, height, rng);
  if (!graph) return null;
  const nodes: GraphNode[] = graph.points.map((p, id) => ({
    id,
    position: { x: p.x, y: p.y },
    velocity: { x: 0, y: 0 },
    fixed: true,
  }));
  const edges: GraphEdge[] = graph.edges.map(e => {
    const latencyMs = e.bridge ? 5 + rng() * 15 : 0.1 + rng() * 0.9;
    const bandwidth = e.bridge ? 10 : 100; // Gbps
    return {
      source: e.a,
      target: e.b,
      latencyMs,
      weight: bandwidth / latencyMs,
    };
  });
  return { nodes, edges };
}

// Proper graph conductivity calculation for weighted undirected graphs
// We want HIGH conductivity WITHIN the subgraph, LOW conductivity ACROSS the boundary
export function calculateSubgraphConductivity(
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

/**
 * Where the camera rests: above and in front of the bench, close enough that
 * the network fills the field and the lift of a chosen machine reads.
 */
export const restPose = (aspect: number): Pose => ({
  target: [0, 0.08, 0.22],
  distance: (aspect < 1 ? 1.12 : 0.88) / TAN_HALF_FOV,
  azimuth: 0,
  elevation: 0.56,
  fov: FOV_DEGREES,
});

/** With the page out of the way: lower, so the lifted subgraph stands clear. */
export const showPose = (aspect: number): Pose => ({
  target: [0, 0.12, 0.05],
  distance: (aspect < 1 ? 1.2 : 0.96) / TAN_HALF_FOV,
  azimuth: 0,
  elevation: 0.44,
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

const stageOptions = (): StageOptions => ({
  rig: {
    base: restPose,
    hidden: showPose,
    reading: readingPose,
    minElevation: 0.2,
    parallax: { azimuth: 0.08, elevation: 0.05, hiddenGain: 4 },
  },
  bloom: { strength: 0.52, threshold: 0.66, knee: 0.6, radius: 0.72 },
  grade: { vignette: 0.38 },
});

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<GraphTopologySettings>): SceneHandle => {
  const initial = settings();

  // Animation Speed is a master multiplier over this background's own rates:
  // the layout timestep and the annealer's proposal rate. Read per frame
  // rather than captured: only the settings that determine the graph itself
  // are structural, and rebuilding the scene mid-drag threw away the search
  // that was in progress.
  const liveSpeedScale = () => settings().globalTimeMultiplier;
  const liveSimulationSpeed = () =>
    settings().animationSpeed * liveSpeedScale();
  const nodeCountParam = initial.totalNodes || Math.max(12, Math.min(48, 32));
  const clusterCountParam =
    initial.clusterCount ||
    Math.max(2, Math.min(4, Math.floor(nodeCountParam / 8)));
  // A subgraph spanning every node has no boundary to cut, so its
  // conductivity is -Infinity — and once both the current and the proposed
  // set score -Infinity, deltaE is NaN, every proposal is rejected, and the
  // annealer sits in its "converged" state from the first frame. The sliders
  // let both counts reach 16, so keep the subgraph strictly inside the graph.
  const targetSubgraphSize = Math.min(
    initial.requestedNodes || Math.max(3, Math.min(12, 8)),
    nodeCountParam - 1
  );
  // Scale is baked into the force constants below, so it stays structural.
  const graphScale = initial.scale || 1.0;
  // The setting is in proposals per second, so it is used as-is.
  const liveWalkStepsPerSecond = () =>
    Math.max(0.1, settings().updateAnimationSpeed * liveSpeedScale());

  const rng = mulberry32(1337);
  let { nodes, edges } = createClusteredGraph(
    nodeCountParam,
    clusterCountParam,
    rng
  );
  // Whether every node is pinned, in which case the layout has nothing to
  // do and is not run.
  let pinned = false;

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
  let sinceStep = 0;
  let iterationCount = 0; // Track iterations for temperature schedule
  let currentTemperature = 1.0; // Track current temperature for visualization

  /** Grows a connected subgraph of the target size outward from `seedIndex`. */
  const growFrom = (seedIndex: number): Set<number> => {
    const grown = new Set<number>([seedIndex]);
    // Expand by connected neighbors until target size (ensures connectivity)
    const size = Math.min(targetSubgraphSize, nodes.length - 1);
    while (grown.size < size) {
      const boundary: number[] = [];
      for (const nodeId of Array.from(grown)) {
        for (const e of edges) {
          if (e.source === nodeId && !grown.has(e.target)) {
            boundary.push(e.target);
          }
          if (e.target === nodeId && !grown.has(e.source)) {
            boundary.push(e.source);
          }
        }
      }
      if (boundary.length > 0) {
        // Add a connected neighbor
        grown.add(boundary[Math.floor(rng() * boundary.length)]);
      } else {
        // Fallback: add random node if no connected neighbors
        grown.add(Math.floor(rng() * nodes.length));
      }
    }
    return grown;
  };

  /**
   * Starts the search over on the network as it stands: a connected seed
   * subgraph grown from a random node, taken as the best so far.
   */
  const initSearch = () => {
    iterationCount = 0;
    currentTemperature = 1.0;
    currentSet = growFrom(Math.floor(rng() * nodes.length));
    // Initialize best solution and current score
    bestSet = new Set(currentSet);
    bestScore = calculateSubgraphConductivity(bestSet, edges, nodes.length);
  };
  initSearch();

  /**
   * The pointer's say in the search: the candidate is thrown away and grown
   * again from the machine that was tapped, and the temperature goes back
   * up. The best found so far is kept — the scheduler has been asked to look
   * somewhere, not to forget what it knows.
   */
  const reheatFrom = (index: number) => {
    iterationCount = 0;
    currentTemperature = 1.0;
    currentSet = growFrom(index);
  };

  // ── What is drawn ────────────────────────────────────────────────────────
  const sprites = createSprites(NODE_CAPACITY);
  const ribbons = createRibbons(EDGE_CAPACITY);
  const network = new THREE.Group();
  network.add(ribbons.mesh);
  network.add(sprites.mesh);
  stage.scene.add(network);
  const floor = createFloor({
    height: 0,
    cell: 0.2,
    major: 5,
    reach: 2.1,
    opacity: FLOOR_OPACITY,
  });
  stage.scene.add(floor.mesh);

  // How far each machine stands off the bench right now, eased toward where
  // the search has it, and a little of its own so the network at rest is
  // not a sheet.
  const lift = new Float32Array(NODE_CAPACITY);
  const ownLift = new Float32Array(NODE_CAPACITY);
  for (let i = 0; i < NODE_CAPACITY; i++) ownLift[i] = rng() * 0.05;

  // ── The 404 sequence ─────────────────────────────────────────────────────
  // The network the scheduler is shown becomes the number: the digits as
  // datacenters, the machines at their places (see numberNetwork), and the
  // same search for a well-connected subgraph running on it. Nothing is
  // drawn but the network. Swapping one network for another is done the
  // way the pathfinding lab does it — each machine of the new network sets
  // off from where one of the old ones was and flies to its place — so
  // there is no cut. Let go, the configured network comes back the same
  // way and the layout picks up where it left off.
  let isNumber = false;
  let morph: Morph | null = null;
  let glyphSize = { width: stage.width, height: stage.height };
  const sequence = new NotFoundSequence({ formSeconds: MORPH_IN_MS / 1000 });

  const rebuild = (
    built: { nodes: GraphNode[]; edges: GraphEdge[] },
    number: boolean,
    now: number,
    morphMs: number
  ) => {
    const previous = nodes;
    nodes = built.nodes;
    edges = built.edges;
    isNumber = number;
    pinned = nodes.every(n => n.fixed);
    morph = beginMorph(previous, nodes, now, morphMs);
    grabbed = -1;
    hovered = -1;
    initSearch();
  };

  /** The network the flag asks for, if it is not the one on screen. */
  const syncNetwork = (now: number, frozen: boolean) => {
    const on = notFound();
    if (on === isNumber) return;
    if (on) {
      const built = numberNetwork(glyphSize.width, glyphSize.height, rng);
      // A number that could not be drawn leaves the network as it is,
      // and is not asked for again every frame.
      if (!built) {
        isNumber = true;
        return;
      }
      rebuild(built, true, now, frozen ? 0 : MORPH_IN_MS);
    } else {
      rebuild(
        createClusteredGraph(nodeCountParam, clusterCountParam, rng),
        false,
        now,
        frozen ? 0 : MORPH_OUT_MS
      );
    }
  };

  function stepLayout(dt: number) {
    // Nodes in flight are not laid out, and pinned ones have nowhere to go.
    if (morph || pinned) return;

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
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // A machine held by the pointer goes where the pointer is.
      if (n.fixed || i === grabbed) continue;

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
  function annealOnce() {
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

  // ── The pointer ──────────────────────────────────────────────────────────
  // Which machine is under the pointer, and which one it has hold of.
  let hovered = -1;
  let grabbed = -1;
  const projected = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);
  // Each machine's place in the world, kept from the frame it was drawn in,
  // and how far the layout's plane is spread to get there.
  const world = new Float32Array(NODE_CAPACITY * 3);
  let spreadX = 1;
  let spreadZ = 1;

  /** The machine nearest a point on screen, or −1 if none is within reach. */
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
        .applyMatrix4(network.matrixWorld)
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

  const applyPointer = (aspect: number, reading: number) => {
    const pointer = stage.pointer.state;
    const quiet = reading > 0.5 || morph !== null;

    // A tap asks the scheduler to look here: wherever it landed, the nearest
    // machine is where the candidate is grown from again.
    for (const tap of stage.pointer.takeTaps()) {
      if (quiet) continue;
      const index = nearest(tap.x, tap.y, aspect, Infinity);
      if (index >= 0) reheatFrom(index);
    }

    if (quiet || !pointer.present) {
      hovered = -1;
      grabbed = -1;
      return;
    }

    if (!pointer.pressed) grabbed = -1;
    hovered =
      grabbed >= 0 ? grabbed : nearest(pointer.x, pointer.y, aspect, REACH * 2);
    if (pointer.pressed && grabbed < 0 && hovered >= 0 && !pinned) {
      grabbed = hovered;
    }

    // A machine held by the pointer is carried over the bench at the height
    // it was picked up at; the springs do the rest.
    if (grabbed >= 0 && grabbed < nodes.length) {
      if (stage.groundPoint(pointer.x, pointer.y, lift[grabbed], hit)) {
        hit.applyAxisAngle(upAxis, -network.rotation.y);
        const node = nodes[grabbed];
        node.position.x = Math.max(-0.95, Math.min(0.95, hit.x / spreadX));
        node.position.y = Math.max(-0.95, Math.min(0.95, -hit.z / spreadZ));
        node.velocity.x = 0;
        node.velocity.y = 0;
      }
    }
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  const color = new THREE.Color();
  let reshapeTimer = 0;
  let stillSettled = false;

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

    syncNetwork(now, frame.frozen);
    if (morph && advanceMorph(morph, nodes, now)) morph = null;
    const reading = frame.frozen
      ? sequence.settle(on && isNumber)
      : sequence.advance(dt, on && isNumber);
    stage.reading = reading;

    if (frame.frozen) {
      // A still shows the search done and the layout settled, since it will
      // not get to watch either happen.
      if (!stillSettled) {
        for (let i = 0; i < 260; i++) stepLayout(0.016);
        for (let i = 0; i < 400; i++) annealOnce();
        stillSettled = true;
      }
    } else {
      stillSettled = false;
      applyPointer(aspect, reading);
      stepLayout(Math.min(0.05, liveSimulationSpeed() * 0.016));

      // The annealer proposes at its own rate, in whole proposals.
      sinceStep += dt;
      const interval = 1 / liveWalkStepsPerSecond();
      let budget = 4;
      while (sinceStep >= interval && budget-- > 0) {
        sinceStep -= interval;
        if (!morph) annealOnce();
      }
      if (sinceStep > interval) sinceStep = interval;

      // The network turns, slowly, so its depth is always being shown; it
      // comes round to square for the number and holds there.
      const turn = Math.PI * 2;
      network.rotation.y += SPIN_PER_SECOND * dt * (1 - reading);
      if (reading > 0) {
        const square = Math.round(network.rotation.y / turn) * turn;
        network.rotation.y +=
          (square - network.rotation.y) * Math.min(1, dt * 2.2) * reading;
      }
    }
    if (frame.frozen && on) network.rotation.y = 0;
    network.updateMatrixWorld();

    // Check for convergence
    const hasConverged =
      currentSet.size === bestSet.size &&
      Array.from(currentSet).every(nodeId => bestSet.has(nodeId));

    // Animation timings
    const slowPulse = Math.sin(timeMs * 0.001) * 0.5 + 0.5; // 0 to 1, slow pulse
    const flashPhase = Math.sin(timeMs * 0.004); // -1 to 1, for flashing
    const searchPulse = Math.sin(timeMs * 0.003) * 0.5 + 0.5; // For search animation

    const edgeThickness = live.edgeThickness || 2.0;
    // The number is read flat: its machines stay on the bench.
    const lifting = 1 - reading;
    const ease = frame.frozen ? 1 : Math.min(1, dt * LIFT_RATE);

    // How strongly each node is linked into the current set, for visual
    // emphasis: one pass over the edges, since ids are indices.
    const connectivity = new Float32Array(nodes.length);
    for (const e of edges) {
      if (currentSet.has(e.target)) connectivity[e.source] += e.weight;
      if (currentSet.has(e.source)) connectivity[e.target] += e.weight;
    }

    // The plane the layout is worked out in, laid on the bench. Read from
    // overhead it is exactly the screen — which is what the number was laid
    // out for; at rest it is drawn in a little, so the network sits inside
    // the field rather than running off it.
    spreadX = Math.min(aspect, 1.45) * 0.9 * lifting + aspect * reading;
    spreadZ = 0.82 * lifting + reading;

    // Nodes: where each stands, and how it is drawn.
    const baseSize = live.elementSize * (isNumber ? 0.5 : 0.68);
    const crowd = Math.min(1, Math.max(0.55, stage.width / 1100));
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const inCurrent = currentSet.has(n.id);
      const inBest = bestSet.has(n.id);
      const normalizedConnectivity = Math.min(1, connectivity[i] / 500);

      const wantLift =
        LIFT_REST +
        ownLift[i] +
        ((inCurrent ? LIFT_CURRENT : 0) + (inBest ? LIFT_BEST : 0)) * lifting;
      lift[i] += (wantLift - lift[i]) * ease;

      const at = i * 3;
      world[at] = n.position.x * spreadX;
      world[at + 1] = lift[i];
      world[at + 2] = -n.position.y * spreadZ;
      sprites.positions[at] = world[at];
      sprites.positions[at + 1] = world[at + 1];
      sprites.positions[at + 2] = world[at + 2];

      let rgb: [number, number, number];
      let brightness: number;
      let size = baseSize;
      if (hasConverged && inBest) {
        // Converged optimal nodes: flash between primary and accent
        rgb = flashPhase > 0 ? live.colors.accent : live.colors.primary;
        brightness = 1.5;
        size *= 1.35;
      } else if (inBest && inCurrent) {
        // Node in both: bright accent with pulse
        rgb = live.colors.accent;
        brightness = 1.3 + slowPulse * 0.3;
        size *= 1.3;
      } else if (inBest) {
        // Best only: primary color
        rgb = live.colors.primary;
        brightness = 1.2;
        size *= 1.2;
      } else if (inCurrent) {
        // Current only: secondary color with search animation
        rgb = live.colors.secondary;
        brightness = 1.1 + searchPulse * 0.3;
        size *= 1.1 + currentTemperature * 0.2;
      } else {
        // Background nodes: quiet — except a pinned one, which has a
        // location and is drawn there like a landmark on a map.
        rgb = live.colors.background;
        brightness = n.fixed ? 0.75 : 0.34 + normalizedConnectivity * 0.2;
      }

      writeColor(sprites.colors, at, rgb, brightness);
      // Hotter is redder: the temperature shows on what is being tried.
      if (inCurrent && !hasConverged) {
        sprites.colors[at] += currentTemperature * 0.25;
      }

      const is = i === hovered || i === grabbed;
      const p = i * 4;
      sprites.params[p] = size * (isNumber ? crowd : 1) * (is ? 1.25 : 1);
      sprites.params[p + 1] = 1;
      sprites.params[p + 2] = inCurrent || inBest ? 0.6 : 0.14;
      sprites.params[p + 3] = is ? 1 : 0;
    }
    sprites.setCount(nodes.length);
    sprites.commit();

    // Edges, and then a drop line a node: the line from a machine to the
    // spot on the bench under it, which is how its height can be read.
    let count = 0;
    for (const e of edges) {
      if (count >= EDGE_CAPACITY) break;
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

      let rgb: [number, number, number];
      let alpha: number;
      let linewidth = 1.0;
      // Traffic runs on the links the search is holding: faster on the
      // better ones.
      let flow = 0;

      if (hasConverged && inBestSubgraph) {
        // Converged optimal edges: flash between primary and accent
        rgb = flashPhase > 0 ? live.colors.accent : live.colors.primary;
        alpha = 1.0;
        linewidth = 1.4;
        flow = 0.5 + normalizedWeight;
      } else if (inBestSubgraph && inCurrentSubgraph) {
        // Edge in both: bright accent color
        rgb = live.colors.accent;
        alpha = 1.0;
        linewidth = 1.2;
        flow = 0.5 + normalizedWeight;
      } else if (inBestSubgraph) {
        // Best only: primary color
        rgb = live.colors.primary;
        alpha = 0.9;
        flow = 0.3 + normalizedWeight * 0.7;
      } else if (inCurrentSubgraph) {
        // Current only: secondary color with pulse
        rgb = live.colors.secondary;
        alpha = 0.8 + searchPulse * 0.2;
        flow = 0.3 + normalizedWeight * 0.7;
      } else if (touchesCurrent) {
        // Boundary of current: faded secondary
        rgb = live.colors.secondary;
        alpha = 0.2;
        linewidth = 0.7;
      } else if (touchesBest) {
        // Boundary of best: faded primary
        rgb = live.colors.primary;
        alpha = 0.2;
        linewidth = 0.7;
      } else {
        // Background edge: the network itself, quiet
        rgb = live.colors.background;
        alpha = 0.16 + normalizedWeight * 0.14;
        linewidth = 0.6;
      }
      if (e.source === hovered || e.target === hovered) {
        alpha = Math.min(1, alpha + 0.45);
      }

      const a = e.source * 3;
      const b = e.target * 3;
      const at = count * 3;
      ribbons.starts[at] = world[a];
      ribbons.starts[at + 1] = world[a + 1];
      ribbons.starts[at + 2] = world[a + 2];
      ribbons.ends[at] = world[b];
      ribbons.ends[at + 1] = world[b + 1];
      ribbons.ends[at + 2] = world[b + 2];
      writeColor(ribbons.colors, at, rgb, 1);
      const p = count * 4;
      ribbons.params[p] = linewidth * edgeThickness;
      ribbons.params[p + 1] = alpha;
      ribbons.params[p + 2] = flow;
      ribbons.params[p + 3] = 0;
      count += 1;
    }
    for (let i = 0; i < nodes.length && count < EDGE_CAPACITY; i++) {
      // Only what stands clear of the bench has a height worth marking.
      if (lift[i] < LIFT_REST + 0.06) continue;
      const a = i * 3;
      const at = count * 3;
      ribbons.starts[at] = world[a];
      ribbons.starts[at + 1] = world[a + 1];
      ribbons.starts[at + 2] = world[a + 2];
      ribbons.ends[at] = world[a];
      ribbons.ends[at + 1] = 0;
      ribbons.ends[at + 2] = world[a + 2];
      ribbons.colors[at] = sprites.colors[a] * 0.5;
      ribbons.colors[at + 1] = sprites.colors[a + 1] * 0.5;
      ribbons.colors[at + 2] = sprites.colors[a + 2] * 0.5;
      const p = count * 4;
      ribbons.params[p] = 1;
      ribbons.params[p + 1] = 0.5 * lifting;
      ribbons.params[p + 2] = 0;
      ribbons.params[p + 3] = 1;
      count += 1;
    }
    ribbons.setCount(count);
    ribbons.commit();

    const arrive = frame.intro * frame.intro * (3 - 2 * frame.intro);
    const pose = stage.rig.pose;
    const u = ribbons.material.uniforms;
    u.uResolution.value.set(
      stage.width * stage.pixelRatio,
      stage.height * stage.pixelRatio
    );
    u.uPixelRatio.value = stage.pixelRatio;
    u.uTime.value = frame.time * liveSpeedScale();
    u.uStrength.value = arrive;
    u.uFog.value.set(pose.distance + 0.4, pose.distance + 3.2);
    sprites.material.uniforms.uStrength.value = arrive;
    sprites.material.uniforms.uFog.value.set(
      pose.distance + 0.4,
      pose.distance + 3.2
    );
    floor.material.uniforms.uOpacity.value =
      FLOOR_OPACITY * arrive * (1 - reading);

    readout.write(now, () => {
      const score = Number.isFinite(bestScore) ? bestScore.toFixed(1) : '—';
      const state = hasConverged
        ? 'settled'
        : `t ${currentTemperature.toFixed(2)}`;
      return `${state} · best ${score} · ${targetSubgraphSize} of ${nodes.length}`;
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
        if (isNumber) {
          const built = numberNetwork(size.width, size.height, rng);
          if (built) rebuild(built, true, performance.now(), MORPH_AGAIN_MS);
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

const GraphTopologyBackground: React.FC<
  AnimatedBackgroundProps<GraphTopologySettings>
> = props => {
  const { className, settings } = props;
  // Structural only: these determine the graph itself, so changing one has
  // to rebuild the scene. Everything else is read live.
  const containerRef = useStageScene(props, stageOptions, buildScene, [
    settings.totalNodes,
    settings.clusterCount,
    settings.requestedNodes,
    settings.scale,
  ]);

  return (
    <StageSurface
      ref={containerRef}
      className={className}
      opacity={settings.opacity}
    />
  );
};

export default GraphTopologyBackground;
