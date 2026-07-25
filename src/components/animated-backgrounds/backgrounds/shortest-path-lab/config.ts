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
  spBaseEdgeThickness: 0.8,
  spActionEdgeThickness: 1.6,
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
    description: 'Number of nodes in the randomly generated graph.',
    category: 'Graph',
  },
  {
    key: 'spEdgeDensity',
    label: 'Edge Density',
    type: 'slider',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    description:
      'What fraction of possible edges exist. Sparse graphs force long detours and make the algorithms differ more; dense ones make almost every route short.',
    category: 'Graph',
  },
  {
    key: 'spStartNode',
    label: 'Start Node',
    type: 'slider',
    min: 0,
    max: 79,
    step: 1,
    description: 'Index of the node the search starts from.',
    category: 'Graph',
  },
  {
    key: 'spGoalNode',
    label: 'Goal Node',
    type: 'slider',
    min: 0,
    max: 79,
    step: 1,
    description:
      'Index of the node it is trying to reach. The further it is from the start, the more visible the difference between the algorithms.',
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
    description:
      'Scales w in f = g + w·h, which is the only thing separating these algorithms. At 0 the heuristic vanishes and this is Dijkstra, exploring evenly in every direction. At 1 it is A*: still guaranteed optimal, but exploration stretches toward the goal. Above 1 it over-trusts the heuristic, drives almost straight at the goal, and gives up the optimality guarantee. Watch the shape of the explored region rather than the path — a circle, then an ellipse, then a corridor.',
    category: 'Algorithm',
  },
  {
    key: 'spAnimationSpeed',
    label: 'Steps per Second',
    type: 'slider',
    min: 0.5,
    max: 12.0,
    step: 0.5,
    description:
      'How many nodes the search expands per second. Drop it to around 5 to follow the frontier one node at a time.',
    category: 'Algorithm',
  },
  {
    key: 'spTraversalSpeed',
    label: 'Traversal Speed (edges/sec)',
    type: 'slider',
    min: 0.2,
    max: 10.0,
    step: 0.2,
    description:
      'Speed of the dot that retraces the route once the search has finished.',
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
    description:
      'Opacity of edges the search has not touched — the backdrop it happens over.',
    category: 'Visual Effects',
  },
  {
    key: 'spBaseEdgeThickness',
    label: 'Base Edge Thickness',
    type: 'slider',
    min: 0.25,
    max: 3.0,
    step: 0.25,
    description: 'Line weight for untouched edges.',
    category: 'Visual Effects',
  },
  {
    key: 'spActionEdgeThickness',
    label: 'Action Edge Thickness',
    type: 'slider',
    min: 0.5,
    max: 5.0,
    step: 0.25,
    description:
      'Line weight for edges the search has explored. This is what makes the explored region legible, so it is the one to raise if you are watching the frontier.',
    category: 'Visual Effects',
  },
  {
    key: 'spDotSize',
    label: 'Traversal Dot Size',
    type: 'slider',
    min: 4,
    max: 24,
    step: 1,
    description: 'Size of the dot that traces the final route.',
    category: 'Visual Effects',
  },
  {
    key: 'spDotGlow',
    label: 'Traversal Dot Glow',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    description: 'Glow around that dot.',
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
    description: 'Toggles the bloom post-process. Off is cheaper and sharper.',
    category: 'Post-Processing',
  },
  {
    key: 'spGlowStrength',
    label: 'Glow Strength',
    type: 'slider',
    min: 0.0,
    max: 3.0,
    step: 0.05,
    description: 'How intensely bright areas bloom.',
    category: 'Post-Processing',
  },
  {
    key: 'spGlowRadius',
    label: 'Glow Radius',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    description: 'How far the bloom spreads from its source.',
    category: 'Post-Processing',
  },
  {
    key: 'spGlowThreshold',
    label: 'Glow Threshold',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.01,
    description:
      'How bright a pixel must be before it blooms at all. Raise it to confine the glow to the final path.',
    category: 'Post-Processing',
  },

  // Color settings specific to shortest path lab
  {
    key: 'colors.primary',
    label: 'Final Path Color',
    type: 'color',
    description: 'The shortest route, once the search has found it.',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Exploration Color',
    type: 'color',
    description:
      'Nodes and edges the search has explored. This is the region whose shape tells you which algorithm is running.',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Start/Goal Color',
    type: 'color',
    description: 'The start and goal nodes.',
    category: 'Colors',
  },
  {
    key: 'colors.background',
    label: 'Background Color',
    type: 'color',
    description: 'Canvas colour behind the graph.',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const shortestPathLabConfig = createBackgroundConfig({
  id: 'shortest-path-lab',
  name: 'Shortest Path (Dijkstra/A*)',
  description:
    'Dijkstra, A*, and greedy best-first are the same search with one number changed. Heuristic Weight scales w in f = g + w*h: at 0 the heuristic vanishes and this is Dijkstra, at 1 it is A* with an admissible heuristic, above 1 it over-trusts the heuristic and gives up the optimality guarantee for speed. Watch the shape of the explored region rather than the path — a circle, then an ellipse, then a corridor. Yellow is explored, blue is the route found. Drop Steps per Second to about 5 to follow the frontier node by node.',
  component: ShortestPathLabBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#pathfinding',
});
