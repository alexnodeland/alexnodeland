/**
 * Tests for PDE solver numerical methods
 */

import {
  createInitialState,
  stepPDESolver,
  generateInitialCondition,
  applyBoundaryConditions,
  index,
  solveHeatEquation,
  solveWaveEquation,
} from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/pde-solver';
import { PDESolverConfig, PDEState } from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/types';

describe('PDE Solver', () => {
  describe('Helper Functions', () => {
    test('index function should convert 2D coordinates to 1D', () => {
      expect(index(0, 0, 10)).toBe(0);
      expect(index(5, 0, 10)).toBe(5);
      expect(index(0, 1, 10)).toBe(10);
      expect(index(5, 3, 10)).toBe(35);
    });
  });

  describe('Initial Conditions', () => {
    const config: PDESolverConfig = {
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

    test('should generate Gaussian initial condition', () => {
      const u = generateInitialCondition(config, config.initialCondition);

      expect(u.length).toBe(32 * 32);
      expect(u[index(16, 16, 32)]).toBeGreaterThan(0.5); // Center should have high value
      expect(u[index(0, 0, 32)]).toBeLessThan(0.1); // Corners should have low value
    });

    test('should generate sine wave initial condition', () => {
      const sineConfig = {
        type: 'sine' as const,
        amplitude: 1.0,
        frequency: 2,
      };
      const u = generateInitialCondition(config, sineConfig);

      expect(u.length).toBe(32 * 32);
      expect(Math.abs(u[index(0, 16, 32)])).toBeLessThan(0.2);
    });

    test('should generate square pulse initial condition', () => {
      const squareConfig = {
        type: 'square' as const,
        amplitude: 1.0,
        width: 0.1,
        centerX: 0.5,
        centerY: 0.5,
      };
      const u = generateInitialCondition(config, squareConfig);

      expect(u.length).toBe(32 * 32);
      expect(u[index(16, 16, 32)]).toBe(1.0);
    });
  });

  describe('Boundary Conditions', () => {
    test('should apply Dirichlet boundary conditions', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 1.0 / 15,
        dy: 1.0 / 15,
        dt: 0.0001,
        alpha: 0.1,
        boundaryX: { type: 'dirichlet', value: 0.5 },
        boundaryY: { type: 'dirichlet', value: 0.5 },
        initialCondition: {
          type: 'random',
          amplitude: 1.0,
        },
      };

      const u = new Float32Array(16 * 16);
      for (let i = 0; i < u.length; i++) {
        u[i] = Math.random();
      }

      applyBoundaryConditions(u, config);

      // Check boundaries
      expect(u[index(0, 8, 16)]).toBe(0.5);
      expect(u[index(15, 8, 16)]).toBe(0.5);
      expect(u[index(8, 0, 16)]).toBe(0.5);
      expect(u[index(8, 15, 16)]).toBe(0.5);
    });
  });

  describe('Heat Equation', () => {
    test('should run heat equation solver without errors', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.001,
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
      const initialMax = Math.max(...Array.from(state.u));

      // Run a few steps
      for (let i = 0; i < 10; i++) {
        const result = solveHeatEquation(state, config);
        state = result.state;

        // Check that values are finite
        expect(result.maxValue).toBeLessThan(Infinity);
        expect(result.minValue).toBeGreaterThan(-Infinity);
      }

      const finalMax = Math.max(...Array.from(state.u));
      expect(finalMax).toBeLessThan(initialMax); // Heat should dissipate
    });

    test('should dissipate energy over time', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.001,
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
      const result1 = solveHeatEquation(state, config);

      for (let i = 0; i < 50; i++) {
        state = solveHeatEquation(state, config).state;
      }

      const result2 = solveHeatEquation(state, config);

      expect(result2.energy).toBeLessThan(result1.energy);
    });
  });

  describe('Wave Equation', () => {
    test('should run wave equation solver without errors', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.0005,
        c: 1.0,
        damping: 0.01,
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

      // Run a few steps
      for (let i = 0; i < 10; i++) {
        const result = solveWaveEquation(state, config);
        state = result.state;

        // Check that values are finite
        expect(result.maxValue).toBeLessThan(Infinity);
        expect(result.minValue).toBeGreaterThan(-Infinity);
        expect(isFinite(result.energy)).toBe(true);
      }
    });

    test('should handle first step correctly', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.0005,
        c: 1.0,
        damping: 0,
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

      const state = createInitialState(config, 'wave');
      expect(state.step).toBe(0);
      expect(state.uPrev).toBeDefined();

      const result = solveWaveEquation(state, config);
      expect(result.state.step).toBe(1);
    });
  });

  describe('stepPDESolver', () => {
    test('should step heat equation solver', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.001,
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

      const state = createInitialState(config, 'heat');
      const result = stepPDESolver(state, config, 'heat');

      expect(result.state.step).toBe(1);
      expect(result.maxValue).toBeDefined();
      expect(result.energy).toBeDefined();
    });

    test('should step wave equation solver', () => {
      const config: PDESolverConfig = {
        gridSizeX: 16,
        gridSizeY: 16,
        dx: 0.1,
        dy: 0.1,
        dt: 0.0005,
        c: 1.0,
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

      const state = createInitialState(config, 'wave');
      const result = stepPDESolver(state, config, 'wave');

      expect(result.state.step).toBe(1);
      expect(result.maxValue).toBeDefined();
      expect(result.energy).toBeDefined();
    });
  });

  describe('Additional Initial Conditions', () => {
    const config: PDESolverConfig = {
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

    test('should generate ring initial condition', () => {
      const ringConfig = {
        type: 'ring' as const,
        amplitude: 1.0,
        width: 0.05,
        centerX: 0.5,
        centerY: 0.5,
      };
      const u = generateInitialCondition(config, ringConfig);

      expect(u.length).toBe(32 * 32);
    });

    test('should generate interference pattern', () => {
      const interferenceConfig = {
        type: 'interference' as const,
        amplitude: 1.0,
        frequency: 3,
        numSources: 4,
      };
      const u = generateInitialCondition(config, interferenceConfig);

      expect(u.length).toBe(32 * 32);
    });

    test('should generate random initial condition', () => {
      const randomConfig = {
        type: 'random' as const,
        amplitude: 1.0,
      };
      const u = generateInitialCondition(config, randomConfig);

      expect(u.length).toBe(32 * 32);
      // Check that values are within expected range
      const values = Array.from(u);
      expect(Math.max(...values)).toBeLessThanOrEqual(1.0);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(-1.0);
    });
  });
});
