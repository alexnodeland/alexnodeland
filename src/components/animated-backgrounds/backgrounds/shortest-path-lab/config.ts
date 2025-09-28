import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import ShortestPathLabBackground from './ShortestPathLabBackground';

// Custom settings specific to shortest path lab
export interface ShortestPathLabCustomSettings {
  // Graph properties
  spTotalNodes: number;
  spEdgeDensity: number;
  spStartNode: number;
  spGoalNode: number;

  // Algorithm parameters
  spHeuristicWeight: number; // 0=Dijkstra, 1=A*, >1 greedy
  spAnimationSpeed: number; // Steps per second
  spTraversalSpeed: number; // Edges per second for dot animation

  // Visual properties
  spBaseEdgeAlpha: number;
  spBaseEdgeThickness: number;
  spActionEdgeThickness: number;
  spDotSize: number;
  spDotGlow: number;

  // Effects
  spGlowBloom: number; // 0/1 toggle
  spGlowStrength: number;
  spGlowRadius: number;
  spGlowThreshold: number;

  // Colors specific to shortest path lab
  colors: {
    primary: [number, number, number]; // Blue for final path
    secondary: [number, number, number]; // Yellow for exploration
    accent: [number, number, number]; // Red for start/special nodes
    background: [number, number, number]; // Dark gray-blue for background
    grid: [number, number, number]; // Grid overlay
  };
}

export type ShortestPathLabSettings = StandardSettings &
  ShortestPathLabCustomSettings;

// Default custom settings for shortest path lab
const defaultCustomSettings: ShortestPathLabCustomSettings = {
  // Graph properties
  spTotalNodes: 28,
  spEdgeDensity: 0.15,
  spStartNode: 0,
  spGoalNode: 27,

  // Algorithm parameters
  spHeuristicWeight: 1.0, // Standard A*
  spAnimationSpeed: 4.0, // Steps per second
  spTraversalSpeed: 3.0, // Edges per second

  // Visual properties
  spBaseEdgeAlpha: 0.18,
  spBaseEdgeThickness: 1.2,
  spActionEdgeThickness: 3.5,
  spDotSize: 14,
  spDotGlow: 0.6,

  // Effects
  spGlowBloom: 1, // Enable bloom by default
  spGlowStrength: 1.2,
  spGlowRadius: 0.2,
  spGlowThreshold: 0.2,

  // Algorithm visualization color scheme
  colors: {
    primary: [0.0, 0.55, 1.0], // Blue for final path
    secondary: [1.0, 1.0, 0.0], // Yellow for exploration
    accent: [0.9, 0.2, 0.2], // Red for start/special nodes
    background: [0.18, 0.2, 0.26], // Dark gray-blue for background
    grid: [0.2, 0.3, 0.4], // Grid overlay
  },
};

// Standard settings overrides for shortest path lab
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.9,
  globalTimeMultiplier: 1.0,
};

// Settings schema for custom shortest path lab settings
const customSettingsSchema: SettingsSchema[] = [
  // Graph Properties
  {
    key: 'spTotalNodes',
    label: 'Total Nodes',
    type: 'slider',
    min: 10,
    max: 80,
    step: 2,
    category: 'Graph',
  },
  {
    key: 'spEdgeDensity',
    label: 'Edge Density',
    type: 'slider',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    category: 'Graph',
  },
  {
    key: 'spStartNode',
    label: 'Start Node',
    type: 'slider',
    min: 0,
    max: 79,
    step: 1,
    category: 'Graph',
  },
  {
    key: 'spGoalNode',
    label: 'Goal Node',
    type: 'slider',
    min: 0,
    max: 79,
    step: 1,
    category: 'Graph',
  },

  // Algorithm Parameters
  {
    key: 'spHeuristicWeight',
    label: 'Heuristic Weight (0=Dijkstra, 1=A*, >1 greedy)',
    type: 'slider',
    min: 0.0,
    max: 3.0,
    step: 0.05,
    category: 'Algorithm',
  },
  {
    key: 'spAnimationSpeed',
    label: 'Steps per Second',
    type: 'slider',
    min: 0.5,
    max: 12.0,
    step: 0.5,
    category: 'Algorithm',
  },
  {
    key: 'spTraversalSpeed',
    label: 'Traversal Speed (edges/sec)',
    type: 'slider',
    min: 0.2,
    max: 10.0,
    step: 0.2,
    category: 'Algorithm',
  },

  // Visual Properties
  {
    key: 'spBaseEdgeAlpha',
    label: 'Base Edge Alpha',
    type: 'slider',
    min: 0.05,
    max: 0.8,
    step: 0.05,
    category: 'Visual Effects',
  },
  {
    key: 'spBaseEdgeThickness',
    label: 'Base Edge Thickness',
    type: 'slider',
    min: 0.5,
    max: 4.0,
    step: 0.25,
    category: 'Visual Effects',
  },
  {
    key: 'spActionEdgeThickness',
    label: 'Action Edge Thickness',
    type: 'slider',
    min: 1.0,
    max: 8.0,
    step: 0.25,
    category: 'Visual Effects',
  },
  {
    key: 'spDotSize',
    label: 'Traversal Dot Size',
    type: 'slider',
    min: 4,
    max: 24,
    step: 1,
    category: 'Visual Effects',
  },
  {
    key: 'spDotGlow',
    label: 'Traversal Dot Glow',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Visual Effects',
  },

  // Effects
  {
    key: 'spGlowBloom',
    label: 'Glow Bloom (0/1)',
    type: 'slider',
    min: 0,
    max: 1,
    step: 1,
    category: 'Post-Processing',
  },
  {
    key: 'spGlowStrength',
    label: 'Glow Strength',
    type: 'slider',
    min: 0.0,
    max: 3.0,
    step: 0.05,
    category: 'Post-Processing',
  },
  {
    key: 'spGlowRadius',
    label: 'Glow Radius',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    category: 'Post-Processing',
  },
  {
    key: 'spGlowThreshold',
    label: 'Glow Threshold',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    category: 'Post-Processing',
  },

  // Color settings specific to shortest path lab
  {
    key: 'colors.primary',
    label: 'Final Path Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Exploration Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Start/Goal Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Background Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.grid',
    label: 'Grid Color',
    type: 'color',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const shortestPathLabConfig = createBackgroundConfig({
  id: 'shortest-path-lab',
  name: 'Shortest Path (Dijkstra/A*)',
  description:
    "Comparative visualization of pathfinding algorithms that power GPS navigation, internet routing, and game AI. Dijkstra's algorithm (weight = 0) systematically explores all possibilities to guarantee optimal paths. A* (weight = 1) uses distance heuristics to find optimal paths faster. Greedy search (weight > 1) sacrifices optimality for speed. Yellow patterns show exploration strategy: uniform for Dijkstra, directionally-biased for A*, narrow for greedy. Blue highlights the discovered optimal route. Demonstrates the fundamental trade-off between computational thoroughness and execution speed in network optimization.",
  component: ShortestPathLabBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#pathfinding',
});
