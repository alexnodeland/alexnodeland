import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import GraphTopologyBackground from './GraphTopologyBackground';

// Custom settings specific to graph topology
export interface GraphTopologyCustomSettings {
  // Core graph settings
  totalNodes: number;
  clusterCount: number;
  requestedNodes: number;
  animationSpeed: number;
  scale: number;
  edgeThickness: number; // Moved from standard since not all backgrounds use edges

  // Legacy compatibility settings
  updateAnimationSpeed: number;

  // Colors specific to graph topology
  colors: {
    primary: [number, number, number]; // Bright cyan - optimal subgraph
    secondary: [number, number, number]; // Gold - current search
    accent: [number, number, number]; // Magenta - overlap/convergence
    background: [number, number, number]; // Dark background
    grid: [number, number, number]; // Grid overlay
  };
}

export type GraphTopologySettings = StandardSettings &
  GraphTopologyCustomSettings;

// Default custom settings for graph topology
const defaultCustomSettings: GraphTopologyCustomSettings = {
  totalNodes: 32,
  clusterCount: 3,
  requestedNodes: 8,
  animationSpeed: 1.0,
  scale: 1.0,
  edgeThickness: 2.0, // Moved from standard
  updateAnimationSpeed: 4.0, // Legacy compatibility

  // Network/topology color scheme
  colors: {
    primary: [0.2, 0.8, 1.0], // Bright cyan - optimal subgraph
    secondary: [1.0, 0.7, 0.0], // Gold - current search
    accent: [1.0, 0.2, 0.8], // Magenta - overlap/convergence
    background: [0.15, 0.15, 0.2], // Dark background
    grid: [0.25, 0.3, 0.35], // Grid overlay
  },
};

// Standard settings overrides for graph topology
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.9,
  elementSize: 0.02,
  globalTimeMultiplier: 1.0,
};

// Settings schema for custom graph topology settings
const customSettingsSchema: SettingsSchema[] = [
  // Core graph topology settings
  {
    key: 'totalNodes',
    label: 'Total Nodes in Network',
    type: 'slider',
    min: 16,
    max: 64,
    step: 4,
    description:
      'Number of machines in the simulated network. More nodes make the search harder and the layout busier.',
    category: 'Graph Topology',
  },
  {
    key: 'clusterCount',
    label: 'Number of Clusters',
    type: 'slider',
    min: 2,
    max: 6,
    step: 1,
    description:
      'How many tightly connected groups the network splits into — think racks or availability zones, dense inside and sparse between.',
    category: 'Graph Topology',
  },
  {
    key: 'requestedNodes',
    label: 'Requested Subgraph Size',
    type: 'slider',
    min: 3,
    max: 16,
    step: 1,
    description:
      "How many nodes the search must select. Set it near one cluster's worth to watch the annealer commit to a single cluster; set it larger and it is forced to span clusters and pay the latency between them.",
    category: 'Graph Topology',
  },
  {
    key: 'scale',
    label: 'Graph Scale',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    description:
      'Spreads the layout out or pulls it in. Purely visual; it does not affect the search.',
    category: 'Graph Topology',
  },
  {
    key: 'animationSpeed',
    label: 'Simulation Speed',
    type: 'slider',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    description:
      'How fast the annealer proposes swaps. Slow it down to see individual accept and reject decisions.',
    category: 'Algorithm',
  },
  {
    key: 'edgeThickness',
    label: 'Edge Thickness',
    type: 'slider',
    min: 0.5,
    max: 5.0,
    step: 0.25,
    description: "Line weight for the network's links.",
    category: 'Graph Topology',
  },

  // Color settings specific to graph topology
  {
    key: 'colors.primary',
    label: 'Optimal Subgraph Color',
    type: 'color',
    description:
      'The best subgraph found so far. Late in a run it stops changing.',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Current Search Color',
    type: 'color',
    description:
      'The candidate set under consideration right now. Early on, while the temperature is high, it jumps around constantly.',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Convergence Color',
    type: 'color',
    description:
      'Where the current candidate and the best-known set agree. The two lock together as the temperature drops.',
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
export const graphTopologyConfig = createBackgroundConfig({
  id: 'graph-topology',
  name: 'Job Scheduling',
  description:
    'Simulated annealing over a clustered graph. The topology is built like a datacenter: dense high-bandwidth links inside each cluster, sparse high-latency links between them. The search looks for the subgraph of the requested size with the highest total conductivity, proposing swaps and accepting worse ones with a temperature-dependent probability that decays on an exponential cooling schedule. Gold is the candidate set under consideration right now; cyan is the best set found so far. Early on they diverge constantly, then lock together as the temperature drops. Layout is force-directed and still settling while the search runs.',
  component: GraphTopologyBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#job-scheduling',
});
