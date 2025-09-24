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
    category: 'Graph Topology',
  },
  {
    key: 'clusterCount',
    label: 'Number of Clusters',
    type: 'slider',
    min: 2,
    max: 6,
    step: 1,
    category: 'Graph Topology',
  },
  {
    key: 'requestedNodes',
    label: 'Requested Subgraph Size',
    type: 'slider',
    min: 3,
    max: 16,
    step: 1,
    category: 'Graph Topology',
  },
  {
    key: 'scale',
    label: 'Graph Scale',
    type: 'slider',
    min: 0.5,
    max: 2.0,
    step: 0.1,
    category: 'Graph Topology',
  },
  {
    key: 'animationSpeed',
    label: 'Simulation Speed',
    type: 'slider',
    min: 0.2,
    max: 3.0,
    step: 0.1,
    category: 'Algorithm',
  },
  {
    key: 'edgeThickness',
    label: 'Edge Thickness',
    type: 'slider',
    min: 0.5,
    max: 5.0,
    step: 0.25,
    category: 'Graph Topology',
  },

  // Color settings specific to graph topology
  {
    key: 'colors.primary',
    label: 'Optimal Subgraph Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Current Search Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Convergence Color',
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
export const graphTopologyConfig = createBackgroundConfig({
  id: 'graph-topology',
  name: 'Job Scheduling',
  description:
    'Random-walk search for high-conductivity n-node subgraphs on a network interconnect; edge length (loosely) encodes latency.',
  component: GraphTopologyBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
});
