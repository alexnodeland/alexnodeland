import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../types/animated-backgrounds';

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
  weight: number;    // conductivity proxy: higher = better
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

function createClusteredGraph(nodeCount: number, clusterCount: number, rng: () => number): { nodes: GraphNode[]; edges: GraphEdge[] } {
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
    
    const actualNodesInCluster = c === clusterCount - 1 ? 
      nodeCount - nodeId : // Last cluster gets remaining nodes
      nodesPerCluster;

    for (let n = 0; n < actualNodesInCluster; n++) {
      const localX = (rng() - 0.5) * 0.4; // Tight cluster spread
      const localY = (rng() - 0.5) * 0.4;
      nodes.push({
        id: nodeId,
        position: { x: clusterX + localX, y: clusterY + localY },
        velocity: { x: 0, y: 0 }
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
        if (rng() < 0.8) { // High connectivity within clusters
          const latencyMs = 0.1 + rng() * 0.9; // Very low latency: 0.1-1ms (same rack)
          // Conductivity = bandwidth / latency (higher is better)
          // Assume 100Gbps intra-cluster bandwidth
          const bandwidth = 100; // Gbps
          const weight = bandwidth / latencyMs; // High conductivity
          edges.push({ source: cluster[i], target: cluster[j], latencyMs, weight });
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
    if (i !== j && !edges.some(edge => 
      (edge.source === i && edge.target === j) || 
      (edge.source === j && edge.target === i)
    )) {
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
function calculateSubgraphConductivity(nodeIds: Set<number>, edges: GraphEdge[], totalNodes: number): number {
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
  const sizePenalty = Math.exp(-Math.abs(nodeIds.size - totalNodes/2) / (totalNodes/4));
  
  return quality * sizePenalty;
}

// Alternative: Normalized Cut for better numerical properties
function calculateNormalizedCut(nodeIds: Set<number>, edges: GraphEdge[]): number {
  if (nodeIds.size === 0) return Infinity;
  
  let cutWeight = 0;
  let volumeS = 0;
  let volumeComplement = 0;
  
  // Calculate cut weight and volumes
  for (const e of edges) {
    const sourceInSubgraph = nodeIds.has(e.source);
    const targetInSubgraph = nodeIds.has(e.target);
    
    if (sourceInSubgraph && targetInSubgraph) {
      // Internal edge
      volumeS += 2 * e.weight;
    } else if (sourceInSubgraph || targetInSubgraph) {
      // Cut edge
      cutWeight += e.weight;
      if (sourceInSubgraph) {
        volumeS += e.weight;
        volumeComplement += e.weight;
      } else {
        volumeComplement += e.weight;
        volumeS += e.weight;
      }
    } else {
      // External edge
      volumeComplement += 2 * e.weight;
    }
  }
  
  if (volumeS === 0 || volumeComplement === 0) return Infinity;
  
  // Normalized cut: NCut(S) = cut(S,V\S) * (1/vol(S) + 1/vol(V\S))
  const normalizedCut = cutWeight * (1.0 / volumeS + 1.0 / volumeComplement);
  
  // Return negative for maximization (lower normalized cut is better)
  return -normalizedCut;
}

const GraphTopologyBackground: React.FC<AnimatedBackgroundProps> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Use new intuitive settings with fallbacks to legacy settings
    const opacity = settings.opacity;
    const simulationSpeed = settings.animationSpeed || settings.globalTimeMultiplier || 1.0;
    const nodeCountParam = settings.totalNodes || Math.max(12, Math.min(48, Math.floor((settings.waveSpeed1 || 6) * 4)));
    const clusterCountParam = settings.clusterCount || Math.max(2, Math.min(4, Math.floor(nodeCountParam / 8)));
    const targetSubgraphSize = settings.requestedNodes || Math.max(3, Math.min(12, Math.floor((settings.mouseWaveSpeed || 15) / 3)));
    const graphScale = settings.scale || 1.0;
    const edgeThickness = settings.edgeThickness || Math.max(1.0, (settings.stencilLineWidth || 0.003) * 300.0);
    const walkStepsPerSecond = Math.max(0.5, (settings.flowAnimationSpeed || 4) / 4); // Slower for visibility
    const highlightIntensity = settings.computeActivityIntensity || 1.0;

    const rng = mulberry32(1337);
    const { nodes, edges } = createClusteredGraph(nodeCountParam, clusterCountParam, rng);

    // Force-directed layout with spring lengths proportional to latency
    const desiredLen = (latency: number) => Math.sqrt(latency / 10.0) * 0.2 * graphScale;
    const repulsion = 0.01 * graphScale; // Coulomb-like repulsion
    const springK = 0.05; // Spring constant
    const damping = 0.9; // Higher damping for stability

    // Random-walk search state for high-conductivity subgraph of size n
    let currentSet: Set<number> = new Set<number>();
    let bestSet: Set<number> = new Set<number>();
    let bestScore = -Infinity;
    let currentScore = -Infinity;
    let frontier: number[] = [];
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
    currentScore = bestScore;

    // Build Three.js geometry for edges (lines) and nodes (instanced circles)
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.1, 0.1, 0.12), // Very dark gray for background edges
      transparent: true,
      opacity: opacity * 0.1, // Very faint by default
      linewidth: 1 // note: most browsers ignore linewidth, we simulate thickness by alpha
    });

    const edgeSegments: THREE.Line[] = [];
    for (const e of edges) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geometry, edgeMaterial);
      line.userData = { e };
      scene.add(line);
      edgeSegments.push(line);
    }

    // Node rendering: simple circles via Points
    const nodePositions = new Float32Array(nodes.length * 3);
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    const nodeColors = new Float32Array(nodes.length * 3);
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      size: (settings.nodeBaseSize || 0.02) * 300,
      vertexColors: true,
      transparent: true,
      opacity: opacity,
      sizeAttenuation: true
    });
    const points = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(points);

    const colorBlue = new THREE.Color(0.0, 0.6, 1.0);      // Bright cyan-blue for current subgraph
    const colorGreen = new THREE.Color(0.0, 1.0, 0.0);     // Pure bright green for optimal subgraph
    const colorNeutral = new THREE.Color(0.15, 0.15, 0.2); // Dark blue-gray for background
    const colorFlash = new THREE.Color(1.0, 0.95, 0.0);    // Bright gold for flashing convergence
    const colorPurple = new THREE.Color(1.0, 0.0, 1.0);    // Bright magenta for overlap

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
          const force = Math.min(repulsion / (effectiveDist * effectiveDist), 0.1);
          
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
        const vel = Math.sqrt(n.velocity.x * n.velocity.x + n.velocity.y * n.velocity.y);
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
      const stepIntervalMs = 1000 / walkStepsPerSecond;
      if (now - lastStepTime < stepIntervalMs) return;
      lastStepTime = now;
      iterationCount++;

      // Generate proposal state using valid graph mutations
      let proposal = generateProposal(currentSet, targetSubgraphSize);
      
      // Calculate conductivity (objective function) for current and proposed states
      const currentConductivity = calculateSubgraphConductivity(currentSet, edges, nodes.length);
      const proposedConductivity = calculateSubgraphConductivity(proposal, edges, nodes.length);
      
      // Simulated annealing with exponential cooling schedule
      const initialTemp = 1.0;
      const coolingRate = 0.995;
      const minTemp = 0.01;
      currentTemperature = Math.max(minTemp, initialTemp * Math.pow(coolingRate, iterationCount));
      
      // Metropolis-Hastings acceptance probability
      // We want to maximize conductivity score
      const deltaE = proposedConductivity - currentConductivity;
      const acceptanceProbability = deltaE >= 0 ? 1.0 : Math.exp(deltaE / currentTemperature);
      
      // Accept or reject the proposal
      const shouldAccept = rng() < acceptanceProbability;
      
      if (shouldAccept) {
        currentSet = proposal;
        currentScore = proposedConductivity;
        
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
    function generateProposal(current: Set<number>, targetSize: number): Set<number> {
      const mutationType = Math.floor(rng() * 4);
      let proposal = new Set(current);
      
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
          const nodeToAdd = neighborArray[Math.floor(rng() * neighborArray.length)];
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
            const nodeToAdd = boundaryArray[Math.floor(rng() * boundaryArray.length)];
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
              if ((e.source === nodeId && current.has(e.target)) ||
                  (e.target === nodeId && current.has(e.source))) {
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
            const nodeToRemove = candidatesForRemoval[Math.floor(rng() * candidatesForRemoval.length)];
            proposal.delete(nodeToRemove);
          }
        }
      } else {
        // Mutation 4: Random jump (exploration) - replace a random subset
        if (rng() < 0.1) { // Low probability for exploration
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

    function renderFrame(timeMs: number) {
      const dt = Math.min(0.05, (simulationSpeed * 0.016));
      stepLayout(dt);
      mcmcStep(timeMs);

      // Check for convergence
      const hasConverged = currentSet.size === bestSet.size && 
        Array.from(currentSet).every(nodeId => bestSet.has(nodeId));
      
      // Animation timings
      const slowPulse = Math.sin(timeMs * 0.001) * 0.5 + 0.5; // 0 to 1, slow pulse
      const flashPhase = Math.sin(timeMs * 0.004); // -1 to 1, for flashing
      const searchPulse = Math.sin(timeMs * 0.003) * 0.5 + 0.5; // For search animation

      // Update edge lines
      for (let i = 0; i < edgeSegments.length; i++) {
        const line = edgeSegments[i];
        const e = (line.userData.e as GraphEdge);
        const a = nodes[e.source].position;
        const b = nodes[e.target].position;
        const positions = (line.geometry.getAttribute('position') as THREE.BufferAttribute);
        positions.setXYZ(0, a.x, a.y, 0);
        positions.setXYZ(1, b.x, b.y, 0);
        positions.needsUpdate = true;

        // Determine edge state
        const sourceInCurrent = currentSet.has(e.source);
        const targetInCurrent = currentSet.has(e.target);
        const sourceInBest = bestSet.has(e.source);
        const targetInBest = bestSet.has(e.target);
        
        const inCurrentSubgraph = sourceInCurrent && targetInCurrent;
        const inBestSubgraph = sourceInBest && targetInBest;
        const touchesCurrent = (sourceInCurrent || targetInCurrent) && !(sourceInCurrent && targetInCurrent);
        const touchesBest = (sourceInBest || targetInBest) && !(sourceInBest && targetInBest);
        
        // Base properties from edge weight (conductivity)
        const normalizedWeight = Math.min(1, e.weight / 1000);
        
        let color: number[];
        let alpha: number;
        let linewidth = 1.0;
        
        if (hasConverged && inBestSubgraph) {
          // Converged optimal edges: flash between bright green and gold
          const flash = flashPhase > 0 ? 1 : 0;
          color = [
            flash,           // R: 0 -> 1 (green to gold)
            1.0,             // G: always max
            0               // B: 0
          ];
          alpha = 1.0; // Full opacity
          linewidth = 3.0;
        } else if (inBestSubgraph && inCurrentSubgraph) {
          // Edge in both: bright magenta
          color = [1.0, 0.0, 1.0];
          alpha = 1.0;
          linewidth = 2.5;
        } else if (inBestSubgraph) {
          // Best only: bright green
          color = [0.0, 1.0, 0.0];
          alpha = 0.9;
          linewidth = 2.0;
        } else if (inCurrentSubgraph) {
          // Current only: bright cyan-blue with pulse
          color = [0.0, 0.6 + searchPulse * 0.4, 1.0];
          alpha = 0.8 + searchPulse * 0.2;
          linewidth = 2.0;
        } else if (touchesCurrent) {
          // Boundary of current: medium blue
          color = [0.2, 0.4, 0.8];
          alpha = 0.4;
          linewidth = 1.0;
        } else if (touchesBest) {
          // Boundary of best: medium green
          color = [0.2, 0.6, 0.2];
          alpha = 0.4;
          linewidth = 1.0;
        } else {
          // Background edge: very dark gray
          color = [0.1, 0.1, 0.12];
          alpha = 0.05 + normalizedWeight * 0.05; // Very faint
          linewidth = 0.3;
        }
        
        // Apply settings
        (line.material as THREE.LineBasicMaterial).color.setRGB(color[0], color[1], color[2]);
        (line.material as THREE.LineBasicMaterial).opacity = alpha * opacity;
        (line.material as THREE.LineBasicMaterial).linewidth = linewidth * edgeThickness;
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
          if ((e.source === n.id && currentSet.has(e.target)) ||
              (e.target === n.id && currentSet.has(e.source))) {
            nodeConnectivity += e.weight;
          }
        }
        const normalizedConnectivity = Math.min(1, nodeConnectivity / 500);

        let r: number, g: number, b: number;
        let brightness: number;
        let size = 1.0;

        if (hasConverged && inBest) {
          // Converged optimal nodes: flash between bright green and gold
          if (flashPhase > 0) {
            r = 1.0;  // Gold
            g = 1.0;
            b = 0.0;
          } else {
            r = 0.0;  // Bright green
            g = 1.0;
            b = 0.0;
          }
          brightness = 1.5; // Extra bright
          size = 1.8 + Math.abs(flashPhase) * 0.4;
        } else if (inBest && inCurrent) {
          // Node in both: bright magenta with pulse
          r = 1.0;
          g = 0.0;
          b = 1.0;
          brightness = 1.3 + slowPulse * 0.3;
          size = 1.6;
        } else if (inBest) {
          // Best only: bright green
          r = 0.0;
          g = 1.0;
          b = 0.0;
          brightness = 1.2;
          size = 1.5;
        } else if (inCurrent) {
          // Current only: bright cyan-blue with search animation
          r = 0.0;
          g = 0.6 + searchPulse * 0.4;
          b = 1.0;
          brightness = 1.1 + searchPulse * 0.3;
          size = 1.4 + searchPulse * 0.2;
        } else {
          // Background nodes: very dark gray, barely visible
          r = 0.15;
          g = 0.15;
          b = 0.2;
          brightness = 0.1 + normalizedConnectivity * 0.1; // Very dim
          size = 0.6 + normalizedConnectivity * 0.2;
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
      
      (nodeGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (nodeGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

      // Dynamic node sizing based on algorithm state
      const baseNodeSize = (settings.nodeBaseSize || 0.02) * 400; // Doubled base size
      let dynamicSize = baseNodeSize;
      
      if (hasConverged) {
        // Converged: stable with celebration pulse
        dynamicSize = baseNodeSize * (1.5 + Math.sin(timeMs * 0.002) * 0.3);
      } else {
        // Searching: size indicates temperature (exploration level)
        dynamicSize = baseNodeSize * (1.2 + currentTemperature * 0.4 + searchPulse * 0.2);
      }
      
      (points.material as THREE.PointsMaterial).size = dynamicSize;

      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(renderFrame);
    }

    animationRef.current = requestAnimationFrame(renderFrame);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      // Cleanup
      edgeSegments.forEach(l => {
        l.geometry.dispose();
      });
      nodeGeometry.dispose();
      (points.material as THREE.Material).dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [settings]);

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
        opacity: settings.opacity
      }}
    />
  );
};

export default GraphTopologyBackground;


