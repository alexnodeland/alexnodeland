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
  // Per step, not per second — and the solver takes 300 steps a second, so
  // even 0.001 bleeds about a quarter of the amplitude away every second and
  // the field is flat within a minute. A background has to still be there
  // after a minute, so take the control's own zero case: energy conserved,
  // waves ringing off the boundaries indefinitely.
  damping: 0,
  gridSize: 128,
  initialConditionType: 'interference',
  initialAmplitude: 1.0,
  // At 3 the four sources overlap into one broad blob — the plate reads as a
  // flat wash with no interference visible, which is the whole point of this
  // initial condition. 6 puts a few fringes across the grid without aliasing
  // against it the way the top of the range does.
  initialFrequency: 6.0,
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
    description:
      'Heat diffuses and smooths an initial distribution out; the wave equation propagates and reflects it. Same grid and same solver, different physics.',
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
    description:
      'Thermal diffusivity in the heat equation — how fast heat spreads. The timestep is clamped to the stability limit, so pushing this slows the simulation down rather than making it diverge.',
    category: 'Physical Parameters',
  },
  {
    key: 'waveSpeed',
    label: 'Wave Speed (c)',
    type: 'slider',
    min: 0.1,
    max: 3.0,
    step: 0.1,
    description:
      'Propagation speed in the wave equation. Bound by the CFL condition, so very high values shrink the timestep instead of outrunning the grid.',
    category: 'Physical Parameters',
  },
  {
    key: 'damping',
    label: 'Damping',
    type: 'slider',
    min: 0.0,
    max: 0.05,
    step: 0.001,
    description:
      'Bleeds energy out of the system each step. At zero energy is conserved and waves ring indefinitely.',
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
    description:
      'Resolution of the simulation grid. Higher resolves finer detail at roughly four times the work per step for each doubling.',
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
    description:
      'The state the solver starts from. A Gaussian pulse is the cleanest way to see boundary reflections; interference starts with several sources already overlapping.',
    category: 'Initial Conditions',
  },
  {
    key: 'initialAmplitude',
    label: 'Initial Amplitude',
    type: 'slider',
    min: 0.1,
    max: 2.0,
    step: 0.1,
    description: 'Height of the initial disturbance.',
    category: 'Initial Conditions',
  },
  {
    key: 'initialFrequency',
    label: 'Initial Frequency',
    type: 'slider',
    min: 1.0,
    max: 10.0,
    step: 0.5,
    description:
      'Spatial frequency of the sine and interference initial conditions.',
    category: 'Initial Conditions',
  },
  {
    key: 'initialWidth',
    label: 'Initial Width',
    type: 'slider',
    min: 0.02,
    max: 0.3,
    step: 0.01,
    description:
      'Width of the Gaussian, square and ring initial conditions. Narrow pulses contain higher spatial frequencies and show grid dispersion sooner.',
    category: 'Initial Conditions',
  },
  {
    key: 'numSources',
    label: 'Number of Sources',
    type: 'slider',
    min: 2,
    max: 8,
    step: 1,
    description:
      'How many sources the interference initial condition starts with.',
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
    description:
      'What happens at the left and right edges. Dirichlet fixes the value there, so waves reflect inverted; Neumann fixes the derivative, so they reflect upright; Periodic wraps, so anything leaving one edge arrives at the other. Switching between the three with a Gaussian pulse on the wave equation is the clearest demonstration of what a boundary condition actually does.',
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
    description:
      'The same choice for the top and bottom edges. Setting the two axes differently — periodic in x, Dirichlet in y — makes a waveguide.',
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
    description:
      'Palette mapping field value to colour. Thermal suits the heat equation; the blue-red scale is diverging, so it distinguishes positive from negative better for waves.',
    category: 'Visualization',
  },
  {
    key: 'heightScale',
    label: 'Height Scale',
    type: 'slider',
    min: 0.0,
    max: 0.5,
    step: 0.01,
    description:
      'Displaces the surface vertically by field value, turning the plot into a relief. Zero renders it flat.',
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
    description:
      'Draws the grid the solver actually computes on, rather than a smooth surface.',
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
    description: 'Slowly orbits the camera around the surface.',
    category: 'Visualization',
  },
  {
    key: 'rotationSpeed',
    label: 'Rotation Speed',
    type: 'slider',
    min: 0.0,
    max: 2.0,
    step: 0.1,
    description: 'How fast the view rotates when auto-rotate is on.',
    category: 'Visualization',
  },

  // Color settings
  {
    key: 'colors.positive',
    label: 'Positive Value Color',
    type: 'color',
    description: 'Colour for values above zero — hot regions, or wave crests.',
    category: 'Colors',
  },
  {
    key: 'colors.negative',
    label: 'Negative Value Color',
    type: 'color',
    description:
      'Colour for values below zero. Only the wave equation goes negative; heat with a positive initial condition stays above zero.',
    category: 'Colors',
  },
  {
    key: 'colors.zero',
    label: 'Zero Value Color',
    type: 'color',
    description: 'Colour at zero, the midpoint of the scale.',
    category: 'Colors',
  },
];

// Create the complete background configuration
export const pdeSolverConfig = createBackgroundConfig({
  id: 'pde-solver',
  name: 'PDE Solver: Heat & Wave Equations',
  description:
    'Explicit finite differences on a grid, solving the heat equation (∂u/∂t = α∇²u) or the wave equation ' +
    '(∂²u/∂t² = c²∇²u). The Laplacian is a five-point stencil; heat uses FTCS, wave a centered second difference in time. ' +
    'Boundary Condition and Initial Condition are the settings that change the physics rather than the look — Dirichlet ' +
    'fixes the edge value so waves reflect inverted, Neumann zeroes the edge derivative so they reflect upright, and ' +
    'Periodic wraps. Try a Gaussian pulse on the wave equation and switch between the three. You cannot make it diverge: ' +
    'explicit schemes are only conditionally stable, so the timestep is clamped to the CFL limit before every step and ' +
    'pushing diffusivity too far slows the simulation instead.',
  component: PDESolverBackground,
  customSettings: defaultCustomSettings,
  customSettingsSchema,
  standardOverrides,
  // A continuous height field has no discrete element to size.
  omitStandardSettings: ['elementSize'],
  blogPostSection: '#pde-solver',
});
