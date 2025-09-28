import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import CellularAutomatonBackground from './CellularAutomatonBackground';

// Custom settings specific to cellular automaton
export interface CellularAutomatonCustomSettings {
  // Grid and cell properties
  cellSize: number;
  cellSizeMultiplier: number;

  // Evolution speeds
  evolutionSpeed1: number;
  evolutionSpeed2: number;
  diagonalEvolutionSpeed: number;
  updateAnimationSpeed: number;

  // Wave properties
  waveAmplitude: number;

  // Connection properties
  connectionLineWidth: number;
  diagonalConnectionWeight: number;
  activityIntensity: number;

  // Colors specific to cellular automaton
  colors: {
    primary: [number, number, number]; // Forest green for alive cells
    secondary: [number, number, number]; // Warm orange for active cells
    accent: [number, number, number]; // Golden yellow for high activity
    background: [number, number, number]; // Dark blue-gray for empty space
    grid: [number, number, number]; // Subtle grid lines
  };
}

export type CellularAutomatonSettings = StandardSettings &
  CellularAutomatonCustomSettings;

// Default custom settings for cellular automaton
const defaultCustomSettings: CellularAutomatonCustomSettings = {
  // Grid and cell properties - zoomed out for better overview
  cellSize: 0.006, // Much smaller cells for more detail
  cellSizeMultiplier: 0.08, // Moderate size variation

  // Evolution speeds - slower for observable growth dynamics
  evolutionSpeed1: 1.2,
  evolutionSpeed2: 1.8,
  diagonalEvolutionSpeed: 2.5,
  updateAnimationSpeed: 2.0,

  // Wave properties - more concentrated patterns
  waveAmplitude: 1.2,

  // Connection properties - enhanced for concentrated growth
  connectionLineWidth: 0.012,
  diagonalConnectionWeight: 0.6,
  activityIntensity: 1.4,

  // Organic color scheme for cellular automaton
  colors: {
    primary: [0.1, 0.8, 0.3], // Forest green for alive cells
    secondary: [0.9, 0.4, 0.1], // Warm orange for active cells
    accent: [1.0, 0.7, 0.2], // Golden yellow for high activity
    background: [0.15, 0.15, 0.2], // Dark blue-gray for empty space
    grid: [0.25, 0.3, 0.35], // Subtle grid lines
  },
};

// Standard settings overrides for cellular automaton
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.75, // Less overpowering
  elementSize: 0.03, // Smaller base cell size
  globalTimeMultiplier: 0.4, // Very slow global time
};

// Settings schema for custom cellular automaton settings
const customSettingsSchema: SettingsSchema[] = [
  // Grid and Cell Properties
  {
    key: 'cellSize',
    label: 'Cell Size',
    type: 'slider',
    min: 0.02,
    max: 0.15,
    step: 0.005,
    category: 'Cellular Automaton',
  },
  {
    key: 'cellSizeMultiplier',
    label: 'Cell Size Response',
    type: 'slider',
    min: 0.01,
    max: 0.08,
    step: 0.001,
    category: 'Cellular Automaton',
  },

  // Evolution Speeds
  {
    key: 'evolutionSpeed1',
    label: 'Primary Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Evolution',
  },
  {
    key: 'evolutionSpeed2',
    label: 'Secondary Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Evolution',
  },
  {
    key: 'diagonalEvolutionSpeed',
    label: 'Diagonal Evolution Speed',
    type: 'slider',
    min: 1.0,
    max: 12.0,
    step: 0.5,
    category: 'Evolution',
  },
  {
    key: 'updateAnimationSpeed',
    label: 'Update Animation Speed',
    type: 'slider',
    min: 2.0,
    max: 15.0,
    step: 0.5,
    category: 'Evolution',
  },

  // Wave Properties
  {
    key: 'waveAmplitude',
    label: 'Evolution Amplitude',
    type: 'slider',
    min: 0.1,
    max: 1.0,
    step: 0.05,
    category: 'Evolution',
  },

  // Connection Properties
  {
    key: 'connectionLineWidth',
    label: 'Connection Line Width',
    type: 'slider',
    min: 0.001,
    max: 0.01,
    step: 0.0005,
    category: 'Connections',
  },
  {
    key: 'diagonalConnectionWeight',
    label: 'Diagonal Connection Weight',
    type: 'slider',
    min: 0.1,
    max: 0.8,
    step: 0.05,
    category: 'Connections',
  },
  {
    key: 'activityIntensity',
    label: 'Activity Intensity',
    type: 'slider',
    min: 0.0,
    max: 1.0,
    step: 0.05,
    category: 'Connections',
  },

  // Color settings specific to cellular automaton
  {
    key: 'colors.primary',
    label: 'Alive Cell Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Active Cell Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'High Activity Color',
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
export const cellularAutomatonConfig = createBackgroundConfig({
  id: 'cellular-automaton',
  name: 'Cellular Automaton',
  description:
    'Study of emergence: how simple local rules create complex global patterns. Each cell follows basic survival rules based on neighbor states, yet large populations exhibit sophisticated behaviors impossible to predict from individual interactions. Demonstrates how biological systems, neural networks, and distributed systems generate complex behaviors from simple components. Green cells show stable populations, orange indicates active growth, golden highlights mark evolutionary pressure zones.',
  component: CellularAutomatonBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#cellular-automata',
});
