import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AnimatedBackgroundProps, BackgroundSettings } from '../../types/animated-backgrounds';

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

const ShortestPathLabBackground: React.FC<AnimatedBackgroundProps> = ({ className, settings }) => {
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

    // Optional bloom composer
    const useBloom = (settings.spGlowBloom ?? 1) > 0.5;
    let composer: EffectComposer | null = null;
    if (useBloom) {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), settings.spGlowStrength ?? 1.2, settings.spGlowRadius ?? 0.2, settings.spGlowThreshold ?? 0.2);
      composer.addPass(bloom);
    }

    // Parameters with safe defaults
    const opacity = settings.opacity ?? 0.9;
    const totalNodes = settings.spTotalNodes ?? 28;
    const edgeDensity = Math.min(1, Math.max(0.05, settings.spEdgeDensity ?? 0.15));
    const heuristicWeight = settings.spHeuristicWeight ?? 1.0; // 0=Dijkstra, 1=A*
    const stepsPerSecond = Math.max(0.5, settings.spAnimationSpeed ?? 4.0);
    const nodeSize = (settings.nodeBaseSize || 0.02) * 380;
    const edgeThickness = settings.edgeThickness || 1.5;

    let seed = 424242;
    let rngFunc = mulberry32(seed);
    let graph = generateRandomGraph(totalNodes, edgeDensity, rngFunc);
    let nodes = graph.nodes;
    let edges = graph.edges;

    const startNode = Math.min(totalNodes - 1, Math.max(0, settings.spStartNode ?? 0));
    const goalNode = Math.min(totalNodes - 1, Math.max(0, settings.spGoalNode ?? totalNodes - 1));

    // Edge lines (contrasting style vs topology): light dashed base, thick vivid action colors
    const baseAlpha = settings.spBaseEdgeAlpha ?? 0.18;
    const baseThickness = settings.spBaseEdgeThickness ?? 1.2;
    const actionThickness = settings.spActionEdgeThickness ?? 3.5;
    const dotSizePx = settings.spDotSize ?? 14;
    const dotGlow = settings.spDotGlow ?? 0.6;
    const traversalSpeed = settings.spTraversalSpeed ?? 3.0; // edges per second

    const baseEdgeMaterial = new THREE.LineDashedMaterial({
      color: new THREE.Color(0.85, 0.88, 0.92), // light grey-blue
      transparent: true,
      opacity: baseAlpha * opacity,
      dashSize: 0.04,
      gapSize: 0.025,
      linewidth: baseThickness
    });
    const exploreEdgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(1.0, 1.0, 0.0), // yellow
      transparent: true,
      opacity: 0.9 * opacity,
      linewidth: actionThickness
    });
    const finalEdgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0.0, 0.55, 1.0), // blue
      transparent: true,
      opacity: 1.0 * opacity,
      linewidth: actionThickness
    });

    const edgeLines: THREE.Line[] = [];
    for (const e of edges) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      // initialize positions once (static graph)
      const a0 = nodes[e.source].position;
      const b0 = nodes[e.target].position;
      positions[0] = a0.x; positions[1] = a0.y; positions[2] = 0;
      positions[3] = b0.x; positions[4] = b0.y; positions[5] = 0;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geometry, baseEdgeMaterial);
      line.computeLineDistances(); // required for dashed
      line.userData = { e };
      scene.add(line);
      edgeLines.push(line);
    }

    // Nodes as points with per-vertex color
    const nodePositions = new Float32Array(nodes.length * 3);
    const nodeColors = new Float32Array(nodes.length * 3);
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));
    const nodeMaterial = new THREE.PointsMaterial({
      size: nodeSize,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    });
    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodePoints);

    // Initialize positions and base colors
    for (let i = 0; i < nodes.length; i++) {
      nodePositions[i * 3 + 0] = nodes[i].position.x;
      nodePositions[i * 3 + 1] = nodes[i].position.y;
      nodePositions[i * 3 + 2] = 0;
      // base dark gray-blue
      nodeColors[i * 3 + 0] = 0.18;
      nodeColors[i * 3 + 1] = 0.2;
      nodeColors[i * 3 + 2] = 0.26;
    }
    (nodeGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (nodeGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;

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
    const dotMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 1.0, 0.0) });
    const dotMesh = new THREE.Mesh(dotGeometry, dotMaterial);
    dotMesh.scale.setScalar(dotSizePx / 300);
    scene.add(dotMesh);

    function neighbors(id: number): LabEdge[] {
      return edges.filter(e => e.source === id || e.target === id);
    }

    function step(now: number) {
      const interval = 1000 / stepsPerSecond;
      if (now - lastStep < interval) return;
      lastStep = now;

      if (openSet.length === 0 || foundPath.length > 0) return;

      // Pick node with smallest fScore
      openSet.sort((a, b) => (fScore.get(a)! - fScore.get(b)!));
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
      const currentPos = nodes[current];
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

    function render(timeMs: number) {
      step(timeMs);
      if (pendingRegenerate && timeMs >= regenerateAt) {
        // regenerate graph with same parameters and a new seed
        // cleanup old edges
        edgeLines.forEach(l => {
          scene.remove(l);
          l.geometry.dispose();
          (l.material as THREE.Material).dispose();
        });
        edgeLines.length = 0;
        seed = (seed * 1664525 + 1013904223) >>> 0; // LCG step for new seed
        rngFunc = mulberry32(seed);
        graph = generateRandomGraph(totalNodes, edgeDensity, rngFunc);
        nodes = graph.nodes;
        edges = graph.edges;
        // rebuild edges
        for (const e of edges) {
          const geometry = new THREE.BufferGeometry();
          const positions = new Float32Array(6);
          const a0 = nodes[e.source].position;
          const b0 = nodes[e.target].position;
          positions[0] = a0.x; positions[1] = a0.y; positions[2] = 0;
          positions[3] = b0.x; positions[4] = b0.y; positions[5] = 0;
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const line = new THREE.Line(geometry, baseEdgeMaterial);
          line.computeLineDistances();
          line.userData = { e };
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
          nodeColors[i * 3 + 0] = 0.18;
          nodeColors[i * 3 + 1] = 0.2;
          nodeColors[i * 3 + 2] = 0.26;
        }
        (nodeGeometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
        (nodeGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
        // reset traversal
        traversalActive = true;
        traversalEdge = null;
        traversalT = 0;
        dotMesh.position.set(nodes[startNode].position.x, nodes[startNode].position.y, 0);
        foundPath = [];
        pendingRegenerate = false;
      }

      // Update edges
      for (const line of edgeLines) {
        const e = line.userData.e as LabEdge;

        const pathIndexSource = foundPath.indexOf(e.source);
        const pathIndexTarget = foundPath.indexOf(e.target);
        const inPath = foundPath.length > 0 && Math.abs(pathIndexSource - pathIndexTarget) === 1 && pathIndexSource !== -1 && pathIndexTarget !== -1;
        const inFrontier = (inOpen.has(e.source) && !closed.has(e.source)) || (inOpen.has(e.target) && !closed.has(e.target));
        const touchesClosed = closed.has(e.source) || closed.has(e.target);
        if (inPath) {
          line.material = finalEdgeMaterial;
        } else if (touchesClosed || inFrontier) {
          line.material = exploreEdgeMaterial;
        } else {
          line.material = baseEdgeMaterial;
        }
      }

      // Update nodes
      const slowPulse = Math.sin(timeMs * 0.002) * 0.5 + 0.5;
      for (let i = 0; i < nodes.length; i++) {
        const rIdx = i * 3;
        const isStart = i === startNode;
        const isGoal = i === goalNode;
        const isClosed = closed.has(i);
        const isOpen = inOpen.has(i);
        const inPath = foundPath.length > 0 && foundPath.includes(i);

        let r = 0.18, g = 0.2, b = 0.26, bright = 0.9;
        let size = nodeSize;

        if (isStart) {
          r = 0.9; g = 0.2; b = 0.2; // red
          bright = 1.6;
          size = nodeSize * (1.4 + slowPulse * 0.2);
        } else if (isGoal) {
          r = 0.95; g = 0.95; b = 0.0; // yellow
          bright = 1.6;
          size = nodeSize * (1.4 + slowPulse * 0.2);
        } else if (inPath) {
          r = 0.0; g = 0.55; b = 1.0; // blue
          bright = 1.4;
          size = nodeSize * 1.3;
        } else if (isClosed || isOpen) {
          r = 1.0; g = 1.0; b = 0.0; // yellow for exploratory
          bright = 1.2 + slowPulse * 0.2;
          size = nodeSize * (1.1 + slowPulse * 0.1);
        }

        nodeColors[rIdx + 0] = r * bright;
        nodeColors[rIdx + 1] = g * bright;
        nodeColors[rIdx + 2] = b * bright;
      }
      (nodeGeometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
      (nodeMaterial as THREE.PointsMaterial).size = nodeSize;

      // Advance traversal dot
      const updateDotAlong = (from: number, to: number, dt: number) => {
        const a = nodes[from].position;
        const b = nodes[to].position;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        const speedPerSecond = traversalSpeed; // edges/sec scaled by normalized space
        const tIncrement = (speedPerSecond * dt);
        traversalT += tIncrement;
        const t = Math.min(1, traversalT);
        const x = a.x + dx * t; const y = a.y + dy * t;
        dotMesh.position.set(x, y, 0);
        const glow = 1.0 + dotGlow * Math.sin(timeMs * 0.01);
        (dotMaterial as THREE.MeshBasicMaterial).color.setRGB(1.0 * glow, 1.0 * glow, 0.0);
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
            if (!traversalEdge || traversalEdge.from !== current || traversalEdge.to !== to) {
              traversalEdge = { from: current, to };
              traversalT = 0;
            }
            updateDotAlong(traversalEdge.from, traversalEdge.to, dtSec);
          }
        } else if (foundPath.length > 1) {
          // Walk full path backwards (goal -> start)
          if (!traversalEdge) {
            traversalEdge = { from: foundPath[foundPath.length - 1], to: foundPath[foundPath.length - 2] };
            traversalT = 0;
          }
          const reached = updateDotAlong(traversalEdge.from, traversalEdge.to, dtSec);
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
      animationRef.current = requestAnimationFrame(render);
    }

    animationRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      edgeLines.forEach(l => l.geometry.dispose());
      nodeGeometry.dispose();
      (nodeMaterial as THREE.Material).dispose();
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
        opacity: settings.opacity,
      }}
    />
  );
};

export default ShortestPathLabBackground;


