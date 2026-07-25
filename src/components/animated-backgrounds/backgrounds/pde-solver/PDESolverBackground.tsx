/**
 * PDE Solver Background Component
 *
 * Real-time visualization of Heat and Wave equations using Three.js
 * Displays the solution as a 3D height field with color mapping
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../core/types';
import { PDESolverSettings } from './config';
import { createInitialState, stepPDESolver, index } from './pde-solver';
import { PDEState, PDESolverConfig } from './types';

// Framing constants. The height field is a PLANE_SIZE-square plate held very
// nearly face-on to the camera (its -30° tilt about x almost exactly matches
// the camera's elevation), and it spins in its own plane.
export const PLANE_SIZE = 2;
const CAMERA_POSITION: [number, number, number] = [0, 1.5, 2.5];
export const CAMERA_DISTANCE = Math.hypot(...CAMERA_POSITION);
export const BASE_FOV_DEGREES = 50;

// Solver steps per second at an animation speed of 1 (five per frame at 60fps,
// which is the rate this was tuned at), and a ceiling so a long frame or a
// backgrounded tab cannot come back and run thousands of steps at once.
const BASE_STEPS_PER_SECOND = 300;
const MAX_STEPS_PER_FRAME = 40;

/**
 * Vertical FOV for a given viewport.
 *
 * Landscape keeps the designed framing: a plate floating against the page,
 * smaller than the window. Portrait cannot have that and be full-bleed, and
 * full-bleed is what a phone wants — the alternative is the plate's spinning
 * corners sweeping wedges of empty page across the screen.
 *
 * The plate covers a rotating square, so the guaranteed-covered region is its
 * inscribed circle, of world radius PLANE_SIZE / 2. Solve for the FOV that
 * projects that circle out to the screen's corners and the plate covers at
 * every angle of its spin. Never widens past the base FOV, so this only ever
 * zooms in.
 */
export const fovForViewport = (width: number, height: number): number => {
  if (width >= height) return BASE_FOV_DEGREES;

  // Half-height of the frustum at the plate, as a fraction of the world radius
  // we have to fill: screen half-diagonal over screen half-height.
  const cornerReach = Math.hypot(width, height) / height;
  const covering =
    2 *
    Math.atan(PLANE_SIZE / 2 / (CAMERA_DISTANCE * cornerReach)) *
    (180 / Math.PI);

  return Math.min(BASE_FOV_DEGREES, covering);
};

const PDESolverBackground: React.FC<
  AnimatedBackgroundProps<PDESolverSettings>
> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<PDEState | null>(null);
  const configRef = useRef<PDESolverConfig | null>(null);
  const timeAccumulatorRef = useRef<number>(0);

  // Live view of the settings for the animation loop, which outlives the
  // render that created it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      fovForViewport(window.innerWidth, window.innerHeight),
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(...CAMERA_POSITION);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create PDE solver configuration
    const config = createPDEConfig(settings);
    configRef.current = config;

    // Initialize PDE state
    const state = createInitialState(config, settings.equationType);
    stateRef.current = state;

    // Create geometry and mesh
    const { geometry, material } = createVisualizationMesh(state, settings);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 6;
    scene.add(mesh);
    meshRef.current = mesh;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Animation loop. Everything the loop reads per frame comes off
    // settingsRef, not the captured `settings`: this effect only re-runs for
    // the structural settings in its dep array, so a captured value would
    // leave height scale, colours, rotation and speed frozen at whatever they
    // were when the simulation was last rebuilt.
    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      const live = settingsRef.current;

      if (stateRef.current && configRef.current) {
        // Solver steps are whole, so bank the fractional part rather than
        // rounding it away — that is what makes speeds below 1 slow the
        // simulation down instead of doing nothing.
        timeAccumulatorRef.current +=
          deltaTime * live.globalTimeMultiplier * BASE_STEPS_PER_SECOND;
        const steps = Math.min(
          MAX_STEPS_PER_FRAME,
          Math.floor(timeAccumulatorRef.current)
        );
        timeAccumulatorRef.current -= steps;

        for (let i = 0; i < steps; i++) {
          stepPDESolver(stateRef.current, configRef.current, live.equationType);
        }

        // Update mesh geometry
        updateMeshGeometry(meshRef.current!, stateRef.current, live);

        // Auto-rotate camera
        if (live.autoRotate && meshRef.current) {
          meshRef.current.rotation.z +=
            live.rotationSpeed * 0.001 * deltaTime * 60;
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        const { innerWidth, innerHeight } = window;
        cameraRef.current.aspect = innerWidth / innerHeight;
        cameraRef.current.fov = fovForViewport(innerWidth, innerHeight);
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(innerWidth, innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }

      if (rendererRef.current) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
    };
    // Deps are intentionally structural only — everything else the animation
    // loop needs is read live off settingsRef. Listing `settings` here would
    // tear the simulation down and re-seed it on every slider tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.equationType,
    settings.gridSize,
    settings.initialConditionType,
    settings.initialAmplitude,
    settings.initialFrequency,
    settings.initialWidth,
    settings.numSources,
    settings.boundaryConditionX,
    settings.boundaryConditionY,
  ]);

  // Update settings that don't require recreation
  useEffect(() => {
    if (configRef.current) {
      configRef.current.alpha = settings.alpha;
      configRef.current.c = settings.waveSpeed;
      configRef.current.damping = settings.damping;
    }
  }, [settings.alpha, settings.waveSpeed, settings.damping]);

  // Update visualization settings
  useEffect(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.wireframe = settings.showWireframe;
    }
  }, [settings.showWireframe]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: settings.opacity,
      }}
    />
  );
};

/**
 * Create PDE solver configuration from settings
 */
// Internal constants for spatial/temporal discretization. The domain is fixed
// and dx follows from the grid, not the other way round: with dx pinned, each
// resolution step doubled the physical size of the sheet instead of resolving
// the same scene more finely, and shoved the initial disturbance — placed at a
// fraction of the domain — off toward one corner.
const DOMAIN_SIZE = 1.28;
const TIME_STEP = 0.0001;

function createPDEConfig(settings: PDESolverSettings): PDESolverConfig {
  const gridSize = settings.gridSize;
  const spatialStep = DOMAIN_SIZE / gridSize;

  return {
    gridSizeX: gridSize,
    gridSizeY: gridSize,
    dx: spatialStep,
    dy: spatialStep,
    dt: TIME_STEP,
    alpha: settings.alpha,
    c: settings.waveSpeed,
    damping: settings.damping,
    boundaryX: {
      type: settings.boundaryConditionX,
      value: 0,
      derivative: 0,
    },
    boundaryY: {
      type: settings.boundaryConditionY,
      value: 0,
      derivative: 0,
    },
    initialCondition: {
      type: settings.initialConditionType,
      amplitude: settings.initialAmplitude,
      frequency: settings.initialFrequency,
      width: settings.initialWidth,
      centerX: 0.5,
      centerY: 0.5,
      numSources: settings.numSources,
    },
  };
}

/**
 * Create visualization mesh for PDE state
 */
function createVisualizationMesh(
  state: PDEState,
  settings: PDESolverSettings
): { geometry: THREE.PlaneGeometry; material: THREE.MeshStandardMaterial } {
  const { gridSizeX, gridSizeY } = state;

  // Create plane geometry
  const geometry = new THREE.PlaneGeometry(
    PLANE_SIZE,
    PLANE_SIZE,
    gridSizeX - 1,
    gridSizeY - 1
  );

  // Create material
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    wireframe: settings.showWireframe,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  // Initialize vertex colors and positions
  updateGeometryFromState(geometry, state, settings);

  return { geometry, material };
}

/**
 * Update mesh geometry from PDE state
 */
function updateMeshGeometry(
  mesh: THREE.Mesh,
  state: PDEState,
  settings: PDESolverSettings
): void {
  const geometry = mesh.geometry as THREE.PlaneGeometry;
  updateGeometryFromState(geometry, state, settings);
}

/**
 * Update geometry vertices and colors from PDE state
 */
function updateGeometryFromState(
  geometry: THREE.PlaneGeometry,
  state: PDEState,
  settings: PDESolverSettings
): void {
  const { u, gridSizeX, gridSizeY } = state;
  const positions = geometry.attributes.position;
  const colors =
    geometry.attributes.color ||
    new THREE.BufferAttribute(new Float32Array(positions.count * 3), 3);

  if (!geometry.attributes.color) {
    geometry.setAttribute('color', colors);
  }

  // Find min/max for normalization
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (let i = 0; i < u.length; i++) {
    minValue = Math.min(minValue, u[i]);
    maxValue = Math.max(maxValue, u[i]);
  }

  const range = Math.max(Math.abs(minValue), Math.abs(maxValue), 0.001);

  // Update vertices and colors
  for (let j = 0; j < gridSizeY; j++) {
    for (let i = 0; i < gridSizeX; i++) {
      const idx = index(i, j, gridSizeX);
      const value = u[idx];

      // Update vertex height
      const vertexIndex = idx;
      if (vertexIndex < positions.count) {
        const z = value * settings.heightScale;
        positions.setZ(vertexIndex, z);

        // Update vertex color
        const color = getColorForValue(value, range, settings);
        colors.setXYZ(vertexIndex, color.r, color.g, color.b);
      }
    }
  }

  positions.needsUpdate = true;
  colors.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Get color for a given value based on color scale
 */
function getColorForValue(
  value: number,
  range: number,
  settings: PDESolverSettings
): THREE.Color {
  const normalized = value / range; // -1 to 1

  switch (settings.colorScale) {
    case 'rainbow': {
      // Rainbow: blue -> cyan -> green -> yellow -> red
      const hue = (1 - (normalized + 1) / 2) * 0.7; // 0.7 to 0 (blue to red)
      return new THREE.Color().setHSL(hue, 0.8, 0.5);
    }

    case 'thermal': {
      // Thermal: black -> red -> yellow -> white
      const t = (normalized + 1) / 2; // 0 to 1
      if (t < 0.25) {
        return new THREE.Color(t * 4, 0, 0);
      } else if (t < 0.5) {
        return new THREE.Color(1, (t - 0.25) * 4, 0);
      } else if (t < 0.75) {
        return new THREE.Color(1, 1, (t - 0.5) * 4);
      } else {
        return new THREE.Color(1, 1, 1);
      }
    }

    case 'wave': {
      // Wave: blue (negative) -> dark (zero) -> red (positive)
      const [posR, posG, posB] = settings.colors.positive;
      const [negR, negG, negB] = settings.colors.negative;
      const [zeroR, zeroG, zeroB] = settings.colors.zero;

      if (normalized > 0) {
        // Interpolate from zero to positive
        const t = normalized;
        return new THREE.Color(
          zeroR + (posR - zeroR) * t,
          zeroG + (posG - zeroG) * t,
          zeroB + (posB - zeroB) * t
        );
      } else {
        // Interpolate from negative to zero
        const t = 1 + normalized; // 0 to 1
        return new THREE.Color(
          negR + (zeroR - negR) * t,
          negG + (zeroG - negG) * t,
          negB + (zeroB - negB) * t
        );
      }
    }

    case 'monochrome': {
      // Grayscale
      const intensity = (normalized + 1) / 2;
      return new THREE.Color(intensity, intensity, intensity);
    }

    default:
      return new THREE.Color(0.5, 0.5, 0.5);
  }
}

export default PDESolverBackground;
