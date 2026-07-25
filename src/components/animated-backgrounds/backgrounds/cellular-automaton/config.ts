import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import CellularAutomatonBackground from './CellularAutomatonBackground';

/**
 * Life-like rules in B/S notation: a dead cell is born when its live neighbor
 * count appears in `birth`, and a live cell survives when its count appears in
 * `survival`. Everything else dies. Shared by the settings schema and the
 * simulation so the dropdown and the rule table cannot drift apart.
 */
export const LIFE_RULES: Record<
  string,
  { label: string; birth: number[]; survival: number[] }
> = {
  conway: { label: "Conway's Life (B3/S23)", birth: [3], survival: [2, 3] },
  highlife: { label: 'HighLife (B36/S23)', birth: [3, 6], survival: [2, 3] },
  maze: {
    label: 'Maze (B3/S12345)',
    birth: [3],
    survival: [1, 2, 3, 4, 5],
  },
  coral: {
    label: 'Coral (B3/S45678)',
    birth: [3],
    survival: [4, 5, 6, 7, 8],
  },
  daynight: {
    label: 'Day & Night (B3678/S34678)',
    birth: [3, 6, 7, 8],
    survival: [3, 4, 6, 7, 8],
  },
  seeds: { label: 'Seeds (B2/S)', birth: [2], survival: [] },
};

// Custom settings specific to cellular automaton
export interface CellularAutomatonCustomSettings {
  // Simulation
  rule: string;
  cellSize: number; // CSS pixels per cell
  generationsPerSecond: number;
  initialDensity: number; // Fraction of cells alive in the starting soup
  perturbationRate: number; // Fraction of cells randomly flipped per generation

  // Rendering
  cellScale: number; // Cell fill size as a fraction of its grid square
  connectionLineWidth: number; // 0 disables neighbor links
  activityIntensity: number;

  // Colors specific to cellular automaton
  colors: {
    primary: [number, number, number]; // Established cells
    secondary: [number, number, number]; // Newly born cells
    accent: [number, number, number]; // Long-lived cells
    background: [number, number, number]; // Empty space
    grid: [number, number, number]; // Neighbor links
  };
}

export type CellularAutomatonSettings = StandardSettings &
  CellularAutomatonCustomSettings;

// Default custom settings for cellular automaton
const defaultCustomSettings: CellularAutomatonCustomSettings = {
  // Simulation - slow enough to read as structure rather than static
  rule: 'conway',
  cellSize: 22,
  generationsPerSecond: 3,
  initialDensity: 0.32,
  perturbationRate: 0.0006,

  // Rendering
  cellScale: 0.55,
  connectionLineWidth: 0.06,
  activityIntensity: 1.2,

  // Organic color scheme for cellular automaton
  colors: {
    primary: [0.1, 0.8, 0.3], // Established cells
    secondary: [0.9, 0.4, 0.1], // Newly born cells
    accent: [1.0, 0.7, 0.2], // Long-lived cells
    background: [0.15, 0.15, 0.2], // Empty space
    grid: [0.25, 0.3, 0.35], // Neighbor links
  },
};

// Standard settings overrides for cellular automaton
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.75, // Less overpowering
  elementSize: 0.03,
  globalTimeMultiplier: 0.4,
};

// Settings schema for custom cellular automaton settings
const customSettingsSchema: SettingsSchema[] = [
  // Simulation
  {
    key: 'rule',
    label: 'Rule',
    type: 'select',
    options: Object.entries(LIFE_RULES).map(([value, { label }]) => ({
      value,
      label,
    })),
    category: 'Simulation',
  },
  {
    key: 'cellSize',
    label: 'Cell Size (px)',
    type: 'slider',
    min: 8,
    max: 48,
    step: 1,
    category: 'Simulation',
  },
  {
    key: 'generationsPerSecond',
    label: 'Generations per Second',
    type: 'slider',
    min: 0.5,
    max: 20,
    step: 0.5,
    category: 'Simulation',
  },
  {
    key: 'initialDensity',
    label: 'Initial Density',
    type: 'slider',
    min: 0.05,
    max: 0.8,
    step: 0.01,
    category: 'Simulation',
  },
  {
    key: 'perturbationRate',
    label: 'Perturbation Rate',
    type: 'slider',
    min: 0,
    max: 0.01,
    step: 0.0002,
    category: 'Simulation',
  },

  // Rendering
  {
    key: 'cellScale',
    label: 'Cell Fill',
    type: 'slider',
    min: 0.2,
    max: 1.0,
    step: 0.05,
    category: 'Visual Effects',
  },
  {
    key: 'connectionLineWidth',
    label: 'Neighbor Link Width',
    type: 'slider',
    min: 0,
    max: 0.2,
    step: 0.01,
    category: 'Visual Effects',
  },
  {
    key: 'activityIntensity',
    label: 'Activity Intensity',
    type: 'slider',
    min: 0.5,
    max: 3.0,
    step: 0.1,
    category: 'Visual Effects',
  },

  // Color settings specific to cellular automaton
  {
    key: 'colors.primary',
    label: 'Established Cell Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.secondary',
    label: 'Newborn Cell Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.accent',
    label: 'Long-Lived Cell Color',
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
    label: 'Neighbor Link Color',
    type: 'color',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const cellularAutomatonConfig = createBackgroundConfig({
  id: 'cellular-automaton',
  name: 'Cellular Automaton',
  description:
    'A real Life-like cellular automaton: a grid of cells, a rule in B/S notation, and a state buffer stepped one generation at a time. Each cell counts its eight neighbors on a wrapping torus, then lives, dies, or is born according to Rule. Newborn cells take the newborn color, cells that have survived a while shift toward the long-lived color, and links are drawn between live neighbors. Random soup under Conway settles into still lifes and oscillators within a couple of hundred generations, so Perturbation Rate flips a small fraction of cells each step to keep it from freezing — turn it to zero to watch it stall on its own.',
  component: CellularAutomatonBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#cellular-automata',
});
