/**
 * Core PDE Solver using Finite Difference Methods
 *
 * Implements numerically stable schemes for:
 * - Heat Equation: ∂u/∂t = α(∂²u/∂x² + ∂²u/∂y²)
 * - Wave Equation: ∂²u/∂t² = c²(∂²u/∂x² + ∂²u/∂y²)
 *
 * Uses Forward-Time Central-Space (FTCS) for heat equation
 * Uses second-order central differences for wave equation
 */

import {
  PDESolverConfig,
  PDEState,
  PDESolveResult,
  InitialCondition,
  BoundaryCondition,
  EquationType,
} from './types';

/**
 * Utility: Convert 2D grid coordinates to 1D array index
 */
export function index(i: number, j: number, nx: number): number {
  return i + j * nx;
}

/**
 * Generate initial condition based on type
 */
export function generateInitialCondition(
  config: PDESolverConfig,
  condition: InitialCondition
): Float32Array {
  const { gridSizeX, gridSizeY, dx, dy } = config;
  const u = new Float32Array(gridSizeX * gridSizeY);

  for (let j = 0; j < gridSizeY; j++) {
    for (let i = 0; i < gridSizeX; i++) {
      const x = i * dx;
      const y = j * dy;
      const idx = index(i, j, gridSizeX);

      switch (condition.type) {
        case 'gaussian': {
          const cx = condition.centerX ?? 0.5;
          const cy = condition.centerY ?? 0.5;
          const width = condition.width ?? 0.1;
          const distSq = Math.pow(x - cx, 2) + Math.pow(y - cy, 2);
          u[idx] = condition.amplitude * Math.exp(-distSq / (2 * width * width));
          break;
        }

        case 'sine': {
          const freq = condition.frequency ?? 2;
          u[idx] = condition.amplitude * Math.sin(freq * Math.PI * x) * Math.sin(freq * Math.PI * y);
          break;
        }

        case 'square': {
          const cx = condition.centerX ?? 0.5;
          const cy = condition.centerY ?? 0.5;
          const width = condition.width ?? 0.2;
          if (Math.abs(x - cx) < width && Math.abs(y - cy) < width) {
            u[idx] = condition.amplitude;
          }
          break;
        }

        case 'random': {
          u[idx] = condition.amplitude * (Math.random() - 0.5) * 2;
          break;
        }

        case 'ring': {
          const cx = condition.centerX ?? 0.5;
          const cy = condition.centerY ?? 0.5;
          const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
          const width = condition.width ?? 0.05;
          const radius = 0.25;
          if (Math.abs(dist - radius) < width) {
            u[idx] = condition.amplitude;
          }
          break;
        }

        case 'interference': {
          const numSources = condition.numSources ?? 3;
          const freq = condition.frequency ?? 5;
          let value = 0;

          // Create multiple point sources
          for (let s = 0; s < numSources; s++) {
            const angle = (s / numSources) * 2 * Math.PI;
            const radius = 0.3;
            const sx = 0.5 + radius * Math.cos(angle);
            const sy = 0.5 + radius * Math.sin(angle);
            const dist = Math.sqrt(Math.pow(x - sx, 2) + Math.pow(y - sy, 2));
            value += Math.cos(freq * Math.PI * dist);
          }

          u[idx] = condition.amplitude * value / numSources;
          break;
        }

        default:
          u[idx] = 0;
      }
    }
  }

  return u;
}

/**
 * Apply boundary conditions to the grid
 */
export function applyBoundaryConditions(
  u: Float32Array,
  config: PDESolverConfig
): void {
  const { gridSizeX, gridSizeY, dx, dy, boundaryX, boundaryY } = config;

  // Apply boundary conditions on X boundaries (left and right)
  for (let j = 0; j < gridSizeY; j++) {
    applyBoundaryX(u, 0, j, gridSizeX, boundaryX, dx, 'left');
    applyBoundaryX(u, gridSizeX - 1, j, gridSizeX, boundaryX, dx, 'right');
  }

  // Apply boundary conditions on Y boundaries (top and bottom)
  for (let i = 0; i < gridSizeX; i++) {
    applyBoundaryY(u, i, 0, gridSizeX, gridSizeY, boundaryY, dy, 'bottom');
    applyBoundaryY(u, i, gridSizeY - 1, gridSizeX, gridSizeY, boundaryY, dy, 'top');
  }
}

function applyBoundaryX(
  u: Float32Array,
  i: number,
  j: number,
  nx: number,
  boundary: BoundaryCondition,
  dx: number,
  side: 'left' | 'right'
): void {
  const idx = index(i, j, nx);

  switch (boundary.type) {
    case 'dirichlet':
      u[idx] = boundary.value ?? 0;
      break;

    case 'neumann': {
      // ∂u/∂x = value
      // Use one-sided finite difference
      const deriv = boundary.derivative ?? 0;
      if (side === 'left') {
        u[idx] = u[index(i + 1, j, nx)] - deriv * dx;
      } else {
        u[idx] = u[index(i - 1, j, nx)] + deriv * dx;
      }
      break;
    }

    case 'periodic':
      if (side === 'left') {
        u[idx] = u[index(nx - 2, j, nx)];
      } else {
        u[idx] = u[index(1, j, nx)];
      }
      break;
  }
}

function applyBoundaryY(
  u: Float32Array,
  i: number,
  j: number,
  nx: number,
  ny: number,
  boundary: BoundaryCondition,
  dy: number,
  side: 'top' | 'bottom'
): void {
  const idx = index(i, j, nx);

  switch (boundary.type) {
    case 'dirichlet':
      u[idx] = boundary.value ?? 0;
      break;

    case 'neumann': {
      const deriv = boundary.derivative ?? 0;
      if (side === 'bottom') {
        u[idx] = u[index(i, j + 1, nx)] - deriv * dy;
      } else {
        u[idx] = u[index(i, j - 1, nx)] + deriv * dy;
      }
      break;
    }

    case 'periodic':
      if (side === 'bottom') {
        u[idx] = u[index(i, ny - 2, nx)];
      } else {
        u[idx] = u[index(i, 1, nx)];
      }
      break;
  }
}

/**
 * Solve Heat Equation: ∂u/∂t = α∇²u
 * Uses explicit FTCS (Forward-Time Central-Space) scheme
 *
 * Stability condition: α*dt/(dx²) <= 0.25 for 2D
 */
export function solveHeatEquation(
  state: PDEState,
  config: PDESolverConfig
): PDESolveResult {
  const { gridSizeX, gridSizeY, dx, dy, dt, damping = 0 } = config;
  const alpha = config.alpha ?? 0.1;

  // Check stability condition
  const stabilityX = alpha * dt / (dx * dx);
  const stabilityY = alpha * dt / (dy * dy);
  const totalStability = stabilityX + stabilityY;

  if (totalStability > 0.5) {
    console.warn(
      `Heat equation may be unstable: r = ${totalStability.toFixed(4)} > 0.5. ` +
      `Reduce dt or increase dx/dy.`
    );
  }

  const uOld = state.u;
  const uNew = new Float32Array(gridSizeX * gridSizeY);

  // Apply finite difference scheme to interior points
  for (let j = 1; j < gridSizeY - 1; j++) {
    for (let i = 1; i < gridSizeX - 1; i++) {
      const idx = index(i, j, gridSizeX);
      const idxLeft = index(i - 1, j, gridSizeX);
      const idxRight = index(i + 1, j, gridSizeX);
      const idxDown = index(i, j - 1, gridSizeX);
      const idxUp = index(i, j + 1, gridSizeX);

      // Second derivatives using central differences
      const d2u_dx2 = (uOld[idxRight] - 2 * uOld[idx] + uOld[idxLeft]) / (dx * dx);
      const d2u_dy2 = (uOld[idxUp] - 2 * uOld[idx] + uOld[idxDown]) / (dy * dy);

      // FTCS update: u(t+dt) = u(t) + α*dt*∇²u
      const laplacian = d2u_dx2 + d2u_dy2;
      uNew[idx] = uOld[idx] + alpha * dt * laplacian;

      // Apply damping (energy dissipation)
      if (damping > 0) {
        uNew[idx] *= (1 - damping * dt);
      }
    }
  }

  // Copy and apply boundary conditions
  state.u = uNew;
  applyBoundaryConditions(state.u, config);

  // Update time
  state.time += dt;
  state.step += 1;

  return computeMetrics(state);
}

/**
 * Solve Wave Equation: ∂²u/∂t² = c²∇²u
 * Uses second-order central difference in time
 *
 * Stability condition (CFL): c*dt/dx <= 1/√2 for 2D
 */
export function solveWaveEquation(
  state: PDEState,
  config: PDESolverConfig
): PDESolveResult {
  const { gridSizeX, gridSizeY, dx, dy, dt, damping = 0 } = config;
  const c = config.c ?? 1.0;

  // Check CFL condition
  const cflX = c * dt / dx;
  const cflY = c * dt / dy;
  const cflCondition = Math.sqrt(cflX * cflX + cflY * cflY);

  if (cflCondition > 1 / Math.sqrt(2)) {
    console.warn(
      `Wave equation may be unstable: CFL = ${cflCondition.toFixed(4)} > ${(1 / Math.sqrt(2)).toFixed(4)}. ` +
      `Reduce dt or increase dx/dy.`
    );
  }

  const uCurrent = state.u;
  const uPrev = state.uPrev!;
  const uNext = new Float32Array(gridSizeX * gridSizeY);

  const rxSq = (c * dt / dx) ** 2;
  const rySq = (c * dt / dy) ** 2;

  // Special case for first time step (use initial velocity)
  const isFirstStep = state.step === 0;

  // Apply finite difference scheme to interior points
  for (let j = 1; j < gridSizeY - 1; j++) {
    for (let i = 1; i < gridSizeX - 1; i++) {
      const idx = index(i, j, gridSizeX);
      const idxLeft = index(i - 1, j, gridSizeX);
      const idxRight = index(i + 1, j, gridSizeX);
      const idxDown = index(i, j - 1, gridSizeX);
      const idxUp = index(i, j + 1, gridSizeX);

      // Laplacian using central differences
      const laplacian =
        rxSq * (uCurrent[idxRight] - 2 * uCurrent[idx] + uCurrent[idxLeft]) +
        rySq * (uCurrent[idxUp] - 2 * uCurrent[idx] + uCurrent[idxDown]);

      if (isFirstStep) {
        // First step: u(t+dt) = u(t) + dt*v(t) + 0.5*dt²*c²*∇²u(t)
        // Assuming v(t) = 0 for simplicity (can be modified to use initialVelocity)
        uNext[idx] = uCurrent[idx] + laplacian;
      } else {
        // Standard step: u(t+dt) = 2*u(t) - u(t-dt) + dt²*c²*∇²u(t)
        uNext[idx] = 2 * uCurrent[idx] - uPrev[idx] + laplacian;
      }

      // Apply damping (prevents unbounded energy growth)
      if (damping > 0) {
        const velocity = (uNext[idx] - uCurrent[idx]) / dt;
        uNext[idx] -= damping * velocity * dt;
      }
    }
  }

  // Update state
  state.uPrev = uCurrent;
  state.u = uNext;
  applyBoundaryConditions(state.u, config);

  // Update time
  state.time += dt;
  state.step += 1;

  return computeMetrics(state);
}

/**
 * Compute metrics for the current state
 */
function computeMetrics(state: PDEState): PDESolveResult {
  const { u } = state;
  let maxValue = -Infinity;
  let minValue = Infinity;
  let energy = 0;

  for (let i = 0; i < u.length; i++) {
    const val = u[i];
    maxValue = Math.max(maxValue, val);
    minValue = Math.min(minValue, val);
    energy += val * val;
  }

  return {
    state,
    maxValue,
    minValue,
    energy: Math.sqrt(energy / u.length),
  };
}

/**
 * Create initial state for PDE solver
 */
export function createInitialState(
  config: PDESolverConfig,
  equationType: EquationType
): PDEState {
  const { gridSizeX, gridSizeY, initialCondition, initialVelocity } = config;

  const u = generateInitialCondition(config, initialCondition);
  applyBoundaryConditions(u, config);

  const state: PDEState = {
    u,
    gridSizeX,
    gridSizeY,
    time: 0,
    step: 0,
  };

  // For wave equation, initialize previous state
  if (equationType === 'wave') {
    if (initialVelocity) {
      // If initial velocity provided, use it to compute u(t - dt)
      const v = generateInitialCondition(config, initialVelocity);
      state.uPrev = new Float32Array(u.length);
      for (let i = 0; i < u.length; i++) {
        state.uPrev[i] = u[i] - v[i] * config.dt;
      }
    } else {
      // Zero initial velocity
      state.uPrev = new Float32Array(u);
    }
  }

  return state;
}

/**
 * Step the PDE solver forward one time step
 */
export function stepPDESolver(
  state: PDEState,
  config: PDESolverConfig,
  equationType: EquationType
): PDESolveResult {
  if (equationType === 'heat') {
    return solveHeatEquation(state, config);
  } else {
    return solveWaveEquation(state, config);
  }
}
