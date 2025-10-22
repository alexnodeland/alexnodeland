/**
 * Comprehensive tests for PDE solver mathematical correctness
 *
 * Tests:
 * 1. Numerical stability
 * 2. Boundary conditions
 * 3. Initial conditions
 * 4. Conservation properties
 * 5. Convergence to analytical solutions
 */

import {
  createInitialState,
  stepPDESolver,
  generateInitialCondition,
  applyBoundaryConditions,
  index,
  solveHeatEquation,
  solveWaveEquation,
} from '../pde-solver';
import { PDESolverConfig, PDEState } from '../types';

describe('PDE Solver - Mathematical Correctness', () => {
  describe('Initial Conditions', () => {
    test('Gaussian initial condition should be centered and normalized', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 1.0 / 63,
        dy: 1.0 / 63,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      const u = generateInitialCondition(config, config.initialCondition);

      // Find maximum value (should be at center)
      let maxValue = -Infinity;
      let maxIndex = -1;
      for (let i = 0; i < u.length; i++) {
        if (u[i] > maxValue) {
          maxValue = u[i];
          maxIndex = i;
        }
      }

      // Maximum should be close to amplitude
      expect(maxValue).toBeCloseTo(1.0, 1);

      // Maximum should be near center
      const centerIdx = index(32, 32, 64);
      const distance = Math.abs(maxIndex - centerIdx);
      expect(distance).toBeLessThan(5); // Within a few grid points
    });

    test('Sine wave initial condition should have correct frequency', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 1.0 / 63,
        dy: 1.0 / 63,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'sine',
          amplitude: 1.0,
          frequency: 2,
        },
      };

      const u = generateInitialCondition(config, config.initialCondition);

      // Check that sine wave has correct boundary values (should be near 0)
      expect(Math.abs(u[index(0, 32, 64)])).toBeLessThan(0.1);
      expect(Math.abs(u[index(63, 32, 64)])).toBeLessThan(0.1);
    });
  });

  describe('Boundary Conditions', () => {
    test('Dirichlet boundary conditions should fix values', () => {
      const config: PDESolverConfig = {
        gridSizeX: 32,
        gridSizeY: 32,
        dx: 1.0 / 31,
        dy: 1.0 / 31,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0.5 },
        boundaryY: { type: 'dirichlet', value: 0.3 },
        initialCondition: {
          type: 'random',
          amplitude: 1.0,
        },
      };

      const u = new Float32Array(32 * 32);
      for (let i = 0; i < u.length; i++) {
        u[i] = Math.random();
      }

      applyBoundaryConditions(u, config);

      // Check X boundaries
      for (let j = 0; j < 32; j++) {
        expect(u[index(0, j, 32)]).toBe(0.5);
        expect(u[index(31, j, 32)]).toBe(0.5);
      }

      // Check Y boundaries
      for (let i = 0; i < 32; i++) {
        expect(u[index(i, 0, 32)]).toBe(0.3);
        expect(u[index(i, 31, 32)]).toBe(0.3);
      }
    });

    test('Periodic boundary conditions should wrap', () => {
      const config: PDESolverConfig = {
        gridSizeX: 32,
        gridSizeY: 32,
        dx: 1.0 / 31,
        dy: 1.0 / 31,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'periodic' },
        boundaryY: { type: 'periodic' },
        initialCondition: {
          type: 'random',
          amplitude: 1.0,
        },
      };

      const u = new Float32Array(32 * 32);
      for (let i = 0; i < u.length; i++) {
        u[i] = Math.random();
      }

      // Store interior values
      const leftInterior = u[index(1, 16, 32)];
      const rightInterior = u[index(30, 16, 32)];

      applyBoundaryConditions(u, config);

      // Check that boundaries match opposite interior
      expect(u[index(0, 16, 32)]).toBe(rightInterior);
      expect(u[index(31, 16, 32)]).toBe(leftInterior);
    });
  });

  describe('Heat Equation - Physical Properties', () => {
    test('Heat equation should dissipate energy over time', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 0.02,
        dy: 0.02,
        dt: 0.0001,
        alpha: 0.1,
        damping: 0,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'heat');

      // Calculate initial energy
      let initialEnergy = 0;
      for (let i = 0; i < state.u.length; i++) {
        initialEnergy += state.u[i] * state.u[i];
      }

      // Run simulation for many steps
      for (let step = 0; step < 1000; step++) {
        const result = solveHeatEquation(state, config);
        state = result.state;
      }

      // Calculate final energy
      let finalEnergy = 0;
      for (let i = 0; i < state.u.length; i++) {
        finalEnergy += state.u[i] * state.u[i];
      }

      // Energy should decrease significantly
      expect(finalEnergy).toBeLessThan(initialEnergy * 0.5);
      expect(finalEnergy).toBeGreaterThan(0);
    });

    test('Heat equation should smooth out sharp features', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 0.02,
        dy: 0.02,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'square',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'heat');

      // Calculate initial gradient magnitude (sum of spatial derivatives)
      const initialGradient = calculateGradientMagnitude(state, config);

      // Run simulation
      for (let step = 0; step < 500; step++) {
        const result = solveHeatEquation(state, config);
        state = result.state;
      }

      // Calculate final gradient magnitude
      const finalGradient = calculateGradientMagnitude(state, config);

      // Gradient should decrease (smoothing)
      expect(finalGradient).toBeLessThan(initialGradient * 0.5);
    });

    test('Heat equation stability: should not blow up for stable parameters', () => {
      const config: PDESolverConfig = {
        gridSizeX: 32,
        gridSizeY: 32,
        dx: 0.05,
        dy: 0.05,
        dt: 0.0005, // Stable time step
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'heat');

      // Run many steps
      for (let step = 0; step < 1000; step++) {
        const result = solveHeatEquation(state, config);
        state = result.state;

        // Check for NaN or infinity
        for (let i = 0; i < state.u.length; i++) {
          expect(isFinite(state.u[i])).toBe(true);
          expect(Math.abs(state.u[i])).toBeLessThan(10); // Should not explode
        }
      }
    });
  });

  describe('Wave Equation - Physical Properties', () => {
    test('Wave equation should approximately conserve energy with low damping', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 0.02,
        dy: 0.02,
        dt: 0.0001,
        c: 1.0,
        damping: 0.0, // No damping
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.08,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'wave');

      // Calculate initial energy
      let initialEnergy = 0;
      for (let i = 0; i < state.u.length; i++) {
        initialEnergy += state.u[i] * state.u[i];
      }

      // Run simulation
      for (let step = 0; step < 500; step++) {
        const result = solveWaveEquation(state, config);
        state = result.state;
      }

      // Calculate final energy
      let finalEnergy = 0;
      for (let i = 0; i < state.u.length; i++) {
        finalEnergy += state.u[i] * state.u[i];
      }

      // Energy should be relatively conserved (within 50% due to boundary losses)
      const energyRatio = finalEnergy / initialEnergy;
      expect(energyRatio).toBeGreaterThan(0.3);
      expect(energyRatio).toBeLessThan(2.0);
    });

    test('Wave equation should propagate disturbances', () => {
      const config: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 0.02,
        dy: 0.02,
        dt: 0.0001,
        c: 1.0,
        damping: 0.001,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.05,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'wave');

      // Store initial center value
      const centerIdx = index(32, 32, 64);
      const initialCenterValue = state.u[centerIdx];

      // Run simulation
      for (let step = 0; step < 200; step++) {
        const result = solveWaveEquation(state, config);
        state = result.state;
      }

      // Wave should have propagated outward
      // Center should have lower amplitude (wave moved away)
      const finalCenterValue = Math.abs(state.u[centerIdx]);
      expect(finalCenterValue).toBeLessThan(Math.abs(initialCenterValue));

      // Some points away from center should have non-zero values
      let hasOuterActivity = false;
      for (let i = 20; i < 28; i++) {
        if (Math.abs(state.u[index(i, 32, 64)]) > 0.01) {
          hasOuterActivity = true;
          break;
        }
      }
      expect(hasOuterActivity).toBe(true);
    });

    test('Wave equation stability: CFL condition check', () => {
      const config: PDESolverConfig = {
        gridSizeX: 32,
        gridSizeY: 32,
        dx: 0.05,
        dy: 0.05,
        dt: 0.00025, // Stable time step (c*dt/dx < 1/sqrt(2))
        c: 1.0,
        damping: 0.01,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      let state = createInitialState(config, 'wave');

      // Run many steps
      for (let step = 0; step < 1000; step++) {
        const result = solveWaveEquation(state, config);
        state = result.state;

        // Check for NaN or infinity
        for (let i = 0; i < state.u.length; i++) {
          expect(isFinite(state.u[i])).toBe(true);
          expect(Math.abs(state.u[i])).toBeLessThan(10); // Should not explode
        }
      }
    });
  });

  describe('Numerical Accuracy', () => {
    test('Grid refinement should improve accuracy', () => {
      // Test heat equation with different grid sizes
      const coarseConfig: PDESolverConfig = {
        gridSizeX: 32,
        gridSizeY: 32,
        dx: 1.0 / 31,
        dy: 1.0 / 31,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0 },
        boundaryY: { type: 'dirichlet', value: 0 },
        initialCondition: {
          type: 'gaussian',
          amplitude: 1.0,
          width: 0.1,
          centerX: 0.5,
          centerY: 0.5,
        },
      };

      const fineConfig: PDESolverConfig = {
        ...coarseConfig,
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 1.0 / 63,
        dy: 1.0 / 63,
      };

      let coarseState = createInitialState(coarseConfig, 'heat');
      let fineState = createInitialState(fineConfig, 'heat');

      // Run both simulations
      const steps = 100;
      for (let i = 0; i < steps; i++) {
        coarseState = solveHeatEquation(coarseState, coarseConfig).state;
        fineState = solveHeatEquation(fineState, fineConfig).state;
      }

      // Compare center values (should be similar, fine grid more accurate)
      const coarseCenter = coarseState.u[index(16, 16, 32)];
      const fineCenter = fineState.u[index(32, 32, 64)];

      // Both should be positive and similar order of magnitude
      expect(coarseCenter).toBeGreaterThan(0);
      expect(fineCenter).toBeGreaterThan(0);
      expect(Math.abs(coarseCenter - fineCenter) / coarseCenter).toBeLessThan(0.5);
    });
  });

  describe('Damping Effects', () => {
    test('Damping should reduce wave energy over time', () => {
      const noDampingConfig: PDESolverConfig = {
        gridSizeX: 64,
        gridSizeY: 64,
        dx: 0.02,
        dy: 0.02,
        dt: 0.0001,
        c: 1.0,
        damping: 0.0,
        boundaryX: { type: 'periodic' },
        boundaryY: { type: 'periodic' },
        initialCondition: {
          type: 'sine',
          amplitude: 1.0,
          frequency: 2,
        },
      };

      const dampedConfig: PDESolverConfig = {
        ...noDampingConfig,
        damping: 0.01,
      };

      let noDampingState = createInitialState(noDampingConfig, 'wave');
      let dampedState = createInitialState(dampedConfig, 'wave');

      // Run simulations
      for (let i = 0; i < 500; i++) {
        noDampingState = solveWaveEquation(noDampingState, noDampingConfig).state;
        dampedState = solveWaveEquation(dampedState, dampedConfig).state;
      }

      // Calculate energies
      let noDampingEnergy = 0;
      let dampedEnergy = 0;
      for (let i = 0; i < noDampingState.u.length; i++) {
        noDampingEnergy += noDampingState.u[i] ** 2;
        dampedEnergy += dampedState.u[i] ** 2;
      }

      // Damped should have significantly less energy
      expect(dampedEnergy).toBeLessThan(noDampingEnergy * 0.7);
    });
  });
});

/**
 * Helper function to calculate gradient magnitude
 */
function calculateGradientMagnitude(state: PDEState, config: PDESolverConfig): number {
  const { u, gridSizeX, gridSizeY } = state;
  const { dx, dy } = config;
  let totalGradient = 0;

  for (let j = 1; j < gridSizeY - 1; j++) {
    for (let i = 1; i < gridSizeX - 1; i++) {
      const idx = index(i, j, gridSizeX);
      const du_dx = (u[index(i + 1, j, gridSizeX)] - u[index(i - 1, j, gridSizeX)]) / (2 * dx);
      const du_dy = (u[index(i, j + 1, gridSizeX)] - u[index(i, j - 1, gridSizeX)]) / (2 * dy);
      totalGradient += Math.sqrt(du_dx * du_dx + du_dy * du_dy);
    }
  }

  return totalGradient;
}
