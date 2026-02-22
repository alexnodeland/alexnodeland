import { createBackgroundConfig } from '../../core/baseConfig';
import { SettingsSchema, StandardSettings } from '../../core/types';
import PDESolverBackground from './PDESolverBackground';
import {
  EquationType,
  BoundaryConditionType,
  InitialConditionType,
} from './types';

// Custom settings specific to PDE solver
export interface PDESolverCustomSettings {
  // Equation type
  equationType: EquationType;

  // Physical parameters
  alpha: number; // Thermal diffusivity (heat equation)
  waveSpeed: number; // Wave speed (wave equation)
  damping: number; // Energy dissipation

  // Grid parameters
  gridSize: number;

  // Initial conditions
  initialConditionType: InitialConditionType;
  initialAmplitude: number;
  initialFrequency: number;
  initialWidth: number;
  numSources: number;

  // Boundary conditions
  boundaryConditionX: BoundaryConditionType;
  boundaryConditionY: BoundaryConditionType;

  // Visualization
  colorScale: 'rainbow' | 'thermal' | 'wave' | 'monochrome';
  heightScale: number;
  showWireframe: boolean;
  autoRotate: boolean;
  rotationSpeed: number;

  // Colors
  colors: {
    positive: [number, number, number];
    negative: [number, number, number];
    zero: [number, number, number];
  };
}

export type PDESolverSettings = StandardSettings & PDESolverCustomSettings;

// Default custom settings for PDE solver
const defaultCustomSettings: PDESolverCustomSettings = {
  equationType: 'wave',
  alpha: 0.1,
  waveSpeed: 1.0,
  damping: 0.001,
  gridSize: 128,
  initialConditionType: 'interference',
  initialAmplitude: 1.0,
  initialFrequency: 3.0,
  initialWidth: 0.08,
  numSources: 4,
  boundaryConditionX: 'dirichlet',
  boundaryConditionY: 'dirichlet',
  colorScale: 'wave',
  heightScale: 0.15,
  showWireframe: false,
  autoRotate: true,
  rotationSpeed: 0.3,
  colors: {
    positive: [0.1, 0.6, 1.0], // Cyan-blue
    negative: [1.0, 0.3, 0.4], // Red-pink
    zero: [0.1, 0.1, 0.15], // Dark blue-gray
  },
};

// Standard settings overrides for PDE solver
const standardOverrides: Partial<StandardSettings> = {
  opacity: 0.85,
  globalTimeMultiplier: 1.0,
};

// Settings schema for custom PDE solver settings
const customSettingsSchema: SettingsSchema[] = [
  // Equation settings
  {
    key: 'equationType',
    label: 'Equation Type',
    type: 'select',
    options: [
      { value: 'heat', label: 'Heat Equation (Diffusion)' },
      { value: 'wave', label: 'Wave Equation (Propagation)' },
    ],
    category: 'PDE Configuration',
  },

  // Physical parameters
  {
    key: 'alpha',
    label: 'Thermal Diffusivity (α)',
    type: 'slider',
    min: 0.01,
    max: 0.5,
    step: 0.01,
    category: 'Physical Parameters',
  },
  {
    key: 'waveSpeed',
    label: 'Wave Speed (c)',
    type: 'slider',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    category: 'Physical Parameters',
  },
  {
    key: 'damping',
    label: 'Damping',
    type: 'slider',
    min: 0.0,
    max: 0.05,
    step: 0.001,
    category: 'Physical Parameters',
  },

  // Grid parameters
  {
    key: 'gridSize',
    label: 'Grid Resolution',
    type: 'select',
    options: [
      { value: 64, label: '64×64 (Fast)' },
      { value: 128, label: '128×128 (Balanced)' },
      { value: 256, label: '256×256 (Detailed)' },
    ],
    category: 'Grid Configuration',
  },

  // Initial conditions
  {
    key: 'initialConditionType',
    label: 'Initial Condition',
    type: 'select',
    options: [
      { value: 'gaussian', label: 'Gaussian Pulse' },
      { value: 'sine', label: 'Sine Wave' },
      { value: 'square', label: 'Square Pulse' },
      { value: 'ring', label: 'Ring' },
      { value: 'interference', label: 'Interference Pattern' },
      { value: 'random', label: 'Random Noise' },
    ],
    category: 'Initial Conditions',
  },
  {
    key: 'initialAmplitude',
    label: 'Initial Amplitude',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    category: 'Initial Conditions',
  },
  {
    key: 'initialFrequency',
    label: 'Initial Frequency',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    category: 'Initial Conditions',
  },
  {
    key: 'initialWidth',
    label: 'Initial Width',
    type: 'slider',
    min: 0.02,
    max: 0.3,
    step: 0.01,
    category: 'Initial Conditions',
  },
  {
    key: 'numSources',
    label: 'Number of Sources',
    type: 'slider',
    min: 2,
    max: 8,
    step: 1,
    category: 'Initial Conditions',
  },

  // Boundary conditions
  {
    key: 'boundaryConditionX',
    label: 'Boundary Condition (X)',
    type: 'select',
    options: [
      { value: 'dirichlet', label: 'Dirichlet (Fixed)' },
      { value: 'neumann', label: 'Neumann (Free)' },
      { value: 'periodic', label: 'Periodic (Wrap)' },
    ],
    category: 'Boundary Conditions',
  },
  {
    key: 'boundaryConditionY',
    label: 'Boundary Condition (Y)',
    type: 'select',
    options: [
      { value: 'dirichlet', label: 'Dirichlet (Fixed)' },
      { value: 'neumann', label: 'Neumann (Free)' },
      { value: 'periodic', label: 'Periodic (Wrap)' },
    ],
    category: 'Boundary Conditions',
  },

  // Visualization settings
  {
    key: 'colorScale',
    label: 'Color Scale',
    type: 'select',
    options: [
      { value: 'rainbow', label: 'Rainbow' },
      { value: 'thermal', label: 'Thermal (Heat)' },
      { value: 'wave', label: 'Wave (Blue-Red)' },
      { value: 'monochrome', label: 'Monochrome' },
    ],
    category: 'Visualization',
  },
  {
    key: 'heightScale',
    label: 'Height Scale',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    category: 'Visualization',
  },
  {
    key: 'showWireframe',
    label: 'Show Wireframe',
    type: 'select',
    options: [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ],
    category: 'Visualization',
  },
  {
    key: 'autoRotate',
    label: 'Auto Rotate',
    type: 'select',
    options: [
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ],
    category: 'Visualization',
  },
  {
    key: 'rotationSpeed',
    label: 'Rotation Speed',
    type: 'slider',
    min: 0.0,
    max: 2.0,
    step: 0.1,
    category: 'Visualization',
  },

  // Color settings
  {
    key: 'colors.positive',
    label: 'Positive Value Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.negative',
    label: 'Negative Value Color',
    type: 'color',
    category: 'Colors',
  },
  {
    key: 'colors.zero',
    label: 'Zero Value Color',
    type: 'color',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const pdeSolverConfig = createBackgroundConfig({
  id: 'pde-solver',
  name: 'PDE Solver: Heat & Wave Equations',
  description:
    'Mathematically rigorous visualization of Partial Differential Equations using finite difference methods. ' +
    'Heat Equation (∂u/∂t = α∇²u) models thermal diffusion, chemical diffusion, and stochastic processes. ' +
    'Wave Equation (∂²u/∂t² = c²∇²u) models electromagnetic waves, sound propagation, quantum mechanics, and string vibrations. ' +
    'Features configurable boundary conditions (Dirichlet, Neumann, Periodic), multiple initial conditions, ' +
    'and real-time 3D visualization. Built with stability-checked FTCS and CFL-compliant schemes. ' +
    'Essential for understanding heat transfer, wave phenomena, quantum wavefunctions, and numerical analysis.',
  component: PDESolverBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  blogPostSection: '#pde-solver',
});
