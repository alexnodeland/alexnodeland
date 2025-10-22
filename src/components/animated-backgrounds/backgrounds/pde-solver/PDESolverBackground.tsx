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
import {
  createInitialState,
  stepPDESolver,
  index,
} from './pde-solver';
import { PDEState, PDESolverConfig } from './types';

const PDESolverBackground: React.FC<AnimatedBackgroundProps<PDESolverSettings>> = ({
  className,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stateRef = useRef<PDEState | null>(null);
  const configRef = useRef<PDESolverConfig | null>(null);
  const timeAccumulatorRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1.5, 2.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
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

    // Animation loop
    let lastTime = performance.now();
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      if (stateRef.current && configRef.current) {
        // Accumulate time and step solver multiple times per frame
        timeAccumulatorRef.current += deltaTime * settings.globalTimeMultiplier;
        const stepsPerFrame = 5; // Run multiple solver steps per visual frame

        for (let i = 0; i < stepsPerFrame; i++) {
          stepPDESolver(stateRef.current, configRef.current, settings.equationType);
        }

        // Update mesh geometry
        updateMeshGeometry(meshRef.current!, stateRef.current, settings);

        // Auto-rotate camera
        if (settings.autoRotate && meshRef.current) {
          meshRef.current.rotation.z += settings.rotationSpeed * 0.001 * deltaTime * 60;
        }
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
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
          meshRef.current.material.forEach(m => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [
    settings.equationType,
    settings.gridSize,
    settings.initialConditionType,
    settings.boundaryConditionX,
    settings.boundaryConditionY,
  ]);

  // Update settings that don't require recreation
  useEffect(() => {
    if (configRef.current) {
      configRef.current.alpha = settings.alpha;
      configRef.current.c = settings.waveSpeed;
      configRef.current.damping = settings.damping;
      configRef.current.dt = settings.timeStep;
      configRef.current.initialCondition.amplitude = settings.initialAmplitude;
      configRef.current.initialCondition.frequency = settings.initialFrequency;
      configRef.current.initialCondition.width = settings.initialWidth;
      configRef.current.initialCondition.numSources = settings.numSources;
    }
  }, [
    settings.alpha,
    settings.waveSpeed,
    settings.damping,
    settings.timeStep,
    settings.initialAmplitude,
    settings.initialFrequency,
    settings.initialWidth,
    settings.numSources,
  ]);

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
function createPDEConfig(settings: PDESolverSettings): PDESolverConfig {
  const gridSize = settings.gridSize;
  const spatialStep = settings.spatialStep;

  return {
    gridSizeX: gridSize,
    gridSizeY: gridSize,
    dx: spatialStep,
    dy: spatialStep,
    dt: settings.timeStep,
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
    2,
    2,
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
  const colors = geometry.attributes.color || new THREE.BufferAttribute(
    new Float32Array(positions.count * 3),
    3
  );

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
