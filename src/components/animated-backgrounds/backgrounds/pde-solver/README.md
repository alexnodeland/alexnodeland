# PDE Solver Background

A mathematically rigorous numerical solver for Partial Differential Equations (PDEs) with real-time Three.js visualization. This background implements finite difference methods to solve the Heat and Wave equations with configurable boundary and initial conditions.

## Mathematical Background

### Heat Equation (Parabolic PDE)

The heat equation models thermal diffusion and is given by:

```
∂u/∂t = α∇²u
```

where:
- `u(x, y, t)` is the temperature field
- `α` is the thermal diffusivity
- `∇²u = ∂²u/∂x² + ∂²u/∂y²` is the Laplacian operator

**Physical Interpretation:**
- Models heat conduction in materials
- Models chemical diffusion
- Models stochastic processes (Brownian motion)
- Solution smooths out over time (dissipative)

### Wave Equation (Hyperbolic PDE)

The wave equation models wave propagation and is given by:

```
∂²u/∂t² = c²∇²u
```

where:
- `u(x, y, t)` is the wave amplitude
- `c` is the wave speed
- Solution exhibits propagating waves (conservative)

**Physical Interpretation:**
- Models electromagnetic waves
- Models sound propagation
- Models string/membrane vibrations
- Models quantum mechanical wave functions

## Numerical Methods

### Heat Equation: Forward-Time Central-Space (FTCS)

The FTCS scheme is an explicit finite difference method:

```
u[i,j]^(n+1) = u[i,j]^n + (α*dt/dx²)(u[i+1,j]^n - 2u[i,j]^n + u[i-1,j]^n)
                        + (α*dt/dy²)(u[i,j+1]^n - 2u[i,j]^n + u[i,j-1]^n)
```

**Stability Condition:**
```
α*dt/(dx²) + α*dt/(dy²) ≤ 0.5
```

The solver automatically checks this condition and warns if violated.

### Wave Equation: Second-Order Central Difference

Uses second-order finite differences in both space and time:

```
u[i,j]^(n+1) = 2u[i,j]^n - u[i,j]^(n-1) + (c*dt/dx)²(u[i+1,j]^n - 2u[i,j]^n + u[i-1,j]^n)
                                        + (c*dt/dy)²(u[i,j+1]^n - 2u[i,j]^n + u[i,j-1]^n)
```

**Stability Condition (CFL):**

The implementation uses a conservative stability check:
```
√((c*dt/dx)² + (c*dt/dy)²) ≤ 1/√2 ≈ 0.707
```

For square grids (dx = dy), this simplifies to:
```
c*dt/dx ≤ 1/2 ≈ 0.5
```

Note: The standard CFL condition for 2D is c*dt/dx ≤ 1/√2 ≈ 0.707, but this implementation uses a more conservative bound to ensure stability across all grid configurations.

The solver automatically checks this condition and warns if violated.

## Boundary Conditions

### Dirichlet Boundary Conditions
Fixed value at boundaries:
```
u(boundary) = constant
```
- Models fixed temperature boundaries
- Models clamped membrane edges
- Default: u = 0 (grounded boundaries)

### Neumann Boundary Conditions
Fixed derivative at boundaries:
```
∂u/∂n(boundary) = constant
```
- Models insulated boundaries (for heat equation)
- Models free membrane edges (for wave equation)
- Default: ∂u/∂n = 0 (no flux)

### Periodic Boundary Conditions
Values wrap around:
```
u(left) = u(right-1)
u(right) = u(left+1)
```
- Models infinite periodic domains
- Useful for studying wave interference

## Initial Conditions

### Gaussian Pulse
```
u(x, y, 0) = A * exp(-((x-x₀)² + (y-y₀)²)/(2σ²))
```
- Smooth, localized disturbance
- Good for testing diffusion/propagation

### Sine Wave
```
u(x, y, 0) = A * sin(kπx) * sin(kπy)
```
- Periodic initial condition
- Tests eigenmode behavior

### Square Pulse
```
u(x, y, 0) = A if |x-x₀| < w and |y-y₀| < w, else 0
```
- Sharp discontinuity
- Tests numerical stability

### Ring
```
u(x, y, 0) = A if |r - r₀| < w, else 0
```
- Circular wave source
- Tests radial symmetry

### Interference Pattern
```
u(x, y, 0) = Σᵢ cos(k * dᵢ)
```
- Multiple point sources
- Creates complex interference patterns

### Random Noise
```
u(x, y, 0) = A * (random - 0.5) * 2
```
- Stochastic initial condition
- Tests diffusion/damping

## Configuration Options

### Grid Parameters
- **Grid Size**: 64×64, 128×128, or 256×256
  - Higher resolution = more detail but slower
  - Default: 128×128 (balanced)

- **Spatial Step** (dx, dy): Grid cell size
  - Affects stability conditions
  - Default: 0.01

- **Time Step** (dt): Time increment per step
  - Must satisfy stability conditions
  - Default: 0.0001

### Physical Parameters

- **Thermal Diffusivity** (α): 0.01 - 0.5
  - Controls heat diffusion rate
  - Higher = faster spreading
  - Default: 0.1

- **Wave Speed** (c): 0.1 - 3.0
  - Controls wave propagation speed
  - Higher = faster waves
  - Default: 1.0

- **Damping**: 0.0 - 0.05
  - Energy dissipation rate
  - 0 = conservative, >0 = dissipative
  - Default: 0.001

### Visualization Options

- **Color Scale**:
  - Rainbow: Full spectrum mapping
  - Thermal: Black → Red → Yellow → White
  - Wave: Blue (negative) → Dark → Red (positive)
  - Monochrome: Grayscale

- **Height Scale**: 0.0 - 0.5
  - Vertical displacement amount
  - Higher = more dramatic 3D effect

- **Wireframe**: On/Off
  - Shows grid structure

- **Auto Rotate**: On/Off
  - Automatic camera rotation

## Implementation Details

### File Structure
```
pde-solver/
├── types.ts              # TypeScript type definitions
├── pde-solver.ts         # Core numerical solver
├── config.ts             # Background configuration
├── PDESolverBackground.tsx  # Three.js visualization
├── __tests__/
│   └── pde-solver.test.ts   # Mathematical correctness tests
└── README.md             # This file
```

### Performance Optimization

1. **Float32Array**: Uses typed arrays for efficient memory access
2. **GPU Rendering**: Three.js uses WebGL for visualization
3. **Multiple Steps Per Frame**: Runs 5 solver steps per visual frame
4. **Adaptive Grid**: Configurable resolution for performance tuning

### Numerical Accuracy

The solver is tested for:
- ✓ Stability under specified conditions
- ✓ Correct boundary condition application
- ✓ Physical conservation properties
- ✓ Convergence with grid refinement
- ✓ Energy dissipation (heat equation)
- ✓ Energy conservation (wave equation)
- ✓ Wave propagation correctness

## Usage Examples

### Example 1: Heat Diffusion
```typescript
{
  equationType: 'heat',
  alpha: 0.1,
  initialConditionType: 'gaussian',
  boundaryConditionX: 'dirichlet',
  boundaryConditionY: 'dirichlet',
  damping: 0
}
```
Result: Gaussian pulse spreads and dissipates over time

### Example 2: Wave Propagation
```typescript
{
  equationType: 'wave',
  waveSpeed: 1.0,
  initialConditionType: 'ring',
  boundaryConditionX: 'dirichlet',
  boundaryConditionY: 'dirichlet',
  damping: 0.001
}
```
Result: Circular wave propagates outward and reflects from boundaries

### Example 3: Interference Pattern
```typescript
{
  equationType: 'wave',
  waveSpeed: 1.0,
  initialConditionType: 'interference',
  numSources: 4,
  boundaryConditionX: 'periodic',
  boundaryConditionY: 'periodic',
  damping: 0.005
}
```
Result: Complex interference patterns from multiple sources

## References

### Numerical Methods
- LeVeque, R. J. (2007). *Finite Difference Methods for Ordinary and Partial Differential Equations*
- Strikwerda, J. C. (2004). *Finite Difference Schemes and Partial Differential Equations*
- Morton, K. W., & Mayers, D. F. (2005). *Numerical Solution of Partial Differential Equations*

### Physical Applications
- Crank, J. (1975). *The Mathematics of Diffusion*
- Strauss, W. A. (2007). *Partial Differential Equations: An Introduction*
- Evans, L. C. (2010). *Partial Differential Equations*

### Stability Analysis
- Courant, R., Friedrichs, K., & Lewy, H. (1928). "On the Partial Difference Equations of Mathematical Physics"
- Von Neumann, J. (1950). "The Theory of Shock Waves for an Arbitrary Equation of State"

## Mathematical Soundness Guarantees

This implementation provides:

1. **Stability Checking**: Automatically verifies stability conditions before solving
2. **Boundary Condition Enforcement**: Correctly applies all three types of boundary conditions
3. **Energy Conservation**: Wave equation conserves energy (with damping = 0)
4. **Physical Accuracy**: Solutions match expected physical behavior
5. **Convergence**: Grid refinement improves accuracy (second-order in space)
6. **Numerical Robustness**: Handles edge cases and extreme parameters gracefully

## Testing

Run the comprehensive test suite:

```bash
npm test -- pde-solver.test.ts
```

Tests cover:
- Initial condition generation
- Boundary condition application
- Heat equation dissipation
- Wave equation propagation
- Numerical stability
- Energy conservation
- Grid refinement convergence

## License

MIT License - See main repository for details
