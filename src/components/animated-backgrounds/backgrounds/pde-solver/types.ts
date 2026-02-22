/**
 * Types for the PDE Solver system
 * Implements numerical solutions for Heat and Wave equations
 */

export type EquationType = 'heat' | 'wave';

export type BoundaryConditionType =
  | 'dirichlet'    // Fixed values at boundaries
  | 'neumann'      // Fixed derivative at boundaries
  | 'periodic';    // Periodic boundaries

export type InitialConditionType =
  | 'gaussian'
  | 'sine'
  | 'square'
  | 'random'
  | 'ring'
  | 'interference';

/**
 * Boundary condition specification
 */
export interface BoundaryCondition {
  type: BoundaryConditionType;
  value?: number;  // For Dirichlet conditions
  derivative?: number;  // For Neumann conditions
}

/**
 * Initial condition specification
 */
export interface InitialCondition {
  type: InitialConditionType;
  amplitude: number;
  frequency?: number;  // For sine/cosine
  width?: number;  // For Gaussian
  centerX?: number;
  centerY?: number;
  numSources?: number;  // For interference patterns
}

/**
 * PDE Solver configuration
 */
export interface PDESolverConfig {
  // Grid parameters
  gridSizeX: number;
  gridSizeY: number;

  // Physical parameters
  dx: number;  // Spatial step size
  dy: number;  // Spatial step size
  dt: number;  // Time step size

  // Equation-specific parameters
  alpha?: number;  // Thermal diffusivity (heat equation)
  c?: number;      // Wave speed (wave equation)

  // Boundary conditions
  boundaryX: BoundaryCondition;
  boundaryY: BoundaryCondition;

  // Initial conditions
  initialCondition: InitialCondition;
  initialVelocity?: InitialCondition;  // For wave equation

  // Simulation parameters
  damping?: number;  // Energy dissipation (0-1)
}

/**
 * State of the PDE simulation
 */
export interface PDEState {
  // Current field values
  u: Float32Array;  // Current state

  // For wave equation (requires previous state)
  uPrev?: Float32Array;  // Previous state (t - dt)

  // Grid parameters
  gridSizeX: number;
  gridSizeY: number;

  // Time tracking
  time: number;
  step: number;
}

/**
 * Result of a PDE solve step
 */
export interface PDESolveResult {
  state: PDEState;
  maxValue: number;
  minValue: number;
  energy: number;  // Total energy in the system
}
