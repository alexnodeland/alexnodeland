import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../types/animated-backgrounds';

const CellularAutomatonBackground: React.FC<AnimatedBackgroundProps> = ({
  className,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);

    container.appendChild(renderer.domElement);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Vertex shader for the cellular automaton
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment shader for cellular automaton simulation
    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;

      // Configurable parameters
      uniform float uCellSize;
      uniform float uCellBaseSize;
      uniform float uCellSizeMultiplier;
      uniform float uGlobalTimeMultiplier;
      uniform float uEvolutionSpeed1;
      uniform float uEvolutionSpeed2;
      uniform float uDiagonalEvolutionSpeed;
      uniform float uUpdateAnimationSpeed;
      uniform float uWaveAmplitude;
      uniform vec3 uColorAlive;
      uniform vec3 uColorNeutral;
      uniform vec3 uColorActive;
      uniform vec3 uColorHighActivity;
      uniform vec3 uColorGridOverlay;
      uniform float uConnectionLineWidth;
      uniform float uDiagonalConnectionWeight;
      uniform float uActivityIntensity;

      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // Cellular automaton state calculation - Enhanced for concentrated growth communities
      float getCellState(vec2 pos, float t) {
        float totalState = 0.0;

        // Create multiple growth centers that slowly evolve
        vec2 growthCenters[5];
        growthCenters[0] = vec2(sin(t * 0.15) * 0.8, cos(t * 0.12) * 0.6);
        growthCenters[1] = vec2(cos(t * 0.18) * 0.7, sin(t * 0.14) * 0.8);
        growthCenters[2] = vec2(sin(t * 0.11) * 0.9, cos(t * 0.16) * 0.5);
        growthCenters[3] = vec2(cos(t * 0.13) * 0.6, sin(t * 0.17) * 0.9);
        growthCenters[4] = vec2(sin(t * 0.19) * 0.5, cos(t * 0.21) * 0.7);

        // Each growth center creates expanding communities
        for (int i = 0; i < 5; i++) {
          float communityAge = t - float(i) * 2.0; // Staggered community birth times
          if (communityAge > 0.0) {
            vec2 center = growthCenters[i];
            float distToCenter = length(pos - center);

            // Slow expanding growth with concentrated core
            float growthRadius = communityAge * 0.3; // Very slow expansion
            float communityCore = exp(-distToCenter * 8.0); // Strong concentrated center

            // Cellular growth rings that expand slowly
            float growthRings = sin(distToCenter * 25.0 - communityAge * uEvolutionSpeed1) *
                               exp(-max(0.0, distToCenter - growthRadius) * 4.0);

            // Community strength based on age and concentration
            float communityStrength = exp(-communityAge * 0.1) * // Communities fade with age
                                    (0.4 + 0.6 * communityCore); // Stronger at center

            totalState += growthRings * communityStrength * (0.8 + float(i) * 0.1);
          }
        }

        // Slow-moving wave patterns that create substrate for growth
        float substrate1 = sin(pos.x * 12.0 - t * uEvolutionSpeed2) *
                          sin(pos.y * 8.0 - t * uEvolutionSpeed1 * 0.8) * 0.3;
        float substrate2 = sin((pos.x + pos.y) * 10.0 - t * uDiagonalEvolutionSpeed) *
                          sin((pos.x - pos.y) * 14.0 + t * uEvolutionSpeed2 * 0.7) * 0.25;

        totalState += (substrate1 + substrate2) * uWaveAmplitude * 0.7;

        // Occasional sporadic growth bursts at random locations
        float sporadicTime = floor(t * 0.2); // Change every 5 seconds
        vec2 sporadicPos = vec2(hash(vec2(sporadicTime, 1.0)) * 2.0 - 1.0,
                               hash(vec2(sporadicTime, 2.0)) * 2.0 - 1.0);
        float sporadicDist = length(pos - sporadicPos);
        float sporadicBurst = sin(sporadicDist * 30.0 - (t - sporadicTime * 5.0) * 8.0) *
                            exp(-sporadicDist * 6.0) *
                            exp(-max(0.0, t - sporadicTime * 5.0) * 2.0);

        totalState += sporadicBurst * 0.4;

        return totalState;
      }

      vec3 getAutomatonColor(float state) {
        // Color mapping for cellular states using configurable colors
        if (state < 0.0) {
          return mix(uColorAlive, uColorNeutral, (state + 1.0));
        } else if (state < 0.5) {
          return mix(uColorNeutral, uColorActive, state * 2.0);
        } else {
          return mix(uColorActive, uColorHighActivity, (state - 0.5) * 2.0);
        }
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        vec3 finalColor = vec3(0.0);
        float adjustedTime = uTime * uGlobalTimeMultiplier;

        // Cellular grid parameters
        vec2 cellPos = floor(uv / uCellSize);
        vec2 localUv = fract(uv / uCellSize) - 0.5;
        vec2 worldPos = cellPos * uCellSize;

        // Calculate cellular state at this grid position
        float cellState = getCellState(worldPos, adjustedTime);

        // Draw cell (alive/dead state visualization)
        float cellDistance = length(localUv);
        float cellSize = uCellBaseSize + abs(cellState) * uCellSizeMultiplier;
        float cellBrightness = smoothstep(cellSize + 0.01, cellSize - 0.01, cellDistance);

        vec3 cellColor = getAutomatonColor(cellState);
        finalColor += cellColor * cellBrightness * (2.0 + abs(cellState) * 3.0);

        // Draw neighbor connections (cellular automaton rules visualization)
        vec2 neighborOffsets[4];
        neighborOffsets[0] = vec2(1.0, 0.0);   // Right
        neighborOffsets[1] = vec2(-1.0, 0.0);  // Left
        neighborOffsets[2] = vec2(0.0, 1.0);   // Up
        neighborOffsets[3] = vec2(0.0, -1.0);  // Down

        for (int i = 0; i < 4; i++) {
          vec2 neighborCell = cellPos + neighborOffsets[i];
          vec2 neighborWorld = neighborCell * uCellSize;
          float neighborState = getCellState(neighborWorld, adjustedTime);

          // Connection strength based on state difference
          float connectionStrength = abs(cellState - neighborState);
          vec3 connectionColor = mix(cellColor, getAutomatonColor(neighborState), 0.5);

          // Draw connection line
          vec2 lineDir = neighborOffsets[i];
          vec2 lineStart = localUv;
          float lineProgress = dot(localUv, lineDir);

          if (lineProgress > 0.0 && lineProgress < uCellSize * 0.5) {
            vec2 perpDir = vec2(-lineDir.y, lineDir.x);
            float distFromLine = abs(dot(localUv, perpDir));

            float lineWidth = uConnectionLineWidth * (1.0 + connectionStrength * 2.0);
            float lineBrightness = smoothstep(lineWidth * 2.0, lineWidth, distFromLine);

            // Animate state updates - propagate through grid
            vec2 updateDirection = vec2(sin(adjustedTime * 0.8), cos(adjustedTime * 0.6));
            float updateWave = sin(dot(cellPos, updateDirection) * 2.0 - adjustedTime * uUpdateAnimationSpeed) * 0.5 + 0.5;
            float updateBrightness = lineBrightness * (0.3 + 0.7 * updateWave);

            finalColor += connectionColor * updateBrightness * connectionStrength * 1.5;
          }
        }

        // Draw diagonal neighbor connections for 8-neighbor automaton
        vec2 diagonalOffsets[4];
        diagonalOffsets[0] = vec2(1.0, 1.0);   // NE
        diagonalOffsets[1] = vec2(-1.0, 1.0);  // NW
        diagonalOffsets[2] = vec2(1.0, -1.0);  // SE
        diagonalOffsets[3] = vec2(-1.0, -1.0); // SW

        for (int i = 0; i < 4; i++) {
          vec2 neighborCell = cellPos + diagonalOffsets[i];
          vec2 neighborWorld = neighborCell * uCellSize;
          float neighborState = getCellState(neighborWorld, adjustedTime);

          float diagonalConnection = abs(cellState - neighborState) * uDiagonalConnectionWeight;
          vec3 diagonalColor = mix(cellColor, getAutomatonColor(neighborState), 0.7);

          vec2 lineDir = normalize(diagonalOffsets[i]);
          float lineProgress = dot(localUv, lineDir);

          if (lineProgress > 0.0 && lineProgress < uCellSize * 0.7) {
            vec2 perpDir = vec2(-lineDir.y, lineDir.x);
            float distFromLine = abs(dot(localUv, perpDir));

            float lineWidth = 0.002 * (1.0 + diagonalConnection * 3.0);
            float lineBrightness = smoothstep(lineWidth * 1.5, lineWidth, distFromLine);

            finalColor += diagonalColor * lineBrightness * diagonalConnection * 0.8;
          }
        }

        // Add cellular grid overlay
        float gridLine = min(
          smoothstep(0.002, 0.001, abs(localUv.x)),
          smoothstep(0.002, 0.001, abs(localUv.y))
        );
        finalColor += uColorGridOverlay * gridLine * 0.3;

        // Highlight active evolution zones - sweeping across screen
        float sweepPhase = sin(worldPos.x * 3.0 - adjustedTime * 4.0) * sin(worldPos.y * 2.0 - adjustedTime * 3.0);
        float evolutionActivity = (sweepPhase * 0.5 + 0.5);

        if (abs(cellState) > 0.2) {
          finalColor += cellColor * evolutionActivity * uActivityIntensity;
        }

        gl_FragColor = vec4(finalColor * 1.0, 1.0);
      }
    `;

    // Create shader material with configurable uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        // Match drawing buffer size (device pixels) to align with gl_FragCoord
        uResolution: {
          value: new THREE.Vector2(
            renderer.domElement.width,
            renderer.domElement.height
          ),
        },

        // Configurable parameters from settings
        uCellSize: { value: settings.cellSize },
        uCellBaseSize: { value: settings.cellBaseSize },
        uCellSizeMultiplier: { value: settings.cellSizeMultiplier },
        uGlobalTimeMultiplier: { value: settings.globalTimeMultiplier },
        uEvolutionSpeed1: { value: settings.evolutionSpeed1 },
        uEvolutionSpeed2: { value: settings.evolutionSpeed2 },
        uDiagonalEvolutionSpeed: { value: settings.diagonalEvolutionSpeed },
        uUpdateAnimationSpeed: { value: settings.updateAnimationSpeed },
        uWaveAmplitude: { value: settings.waveAmplitude },
        uColorAlive: { value: new THREE.Vector3(...settings.colors.alive) },
        uColorNeutral: { value: new THREE.Vector3(...settings.colors.neutral) },
        uColorActive: { value: new THREE.Vector3(...settings.colors.active) },
        uColorHighActivity: {
          value: new THREE.Vector3(...settings.colors.highActivity),
        },
        uColorGridOverlay: {
          value: new THREE.Vector3(...settings.colors.gridOverlay),
        },
        uConnectionLineWidth: { value: settings.connectionLineWidth },
        uDiagonalConnectionWeight: { value: settings.diagonalConnectionWeight },
        uActivityIntensity: { value: settings.activityIntensity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Animation loop
    const animate = (time: number) => {
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time * 0.001;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (renderer && material.uniforms.uResolution) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        material.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      window.removeEventListener('resize', handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Clean up Three.js resources
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [settings]);

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

export default CellularAutomatonBackground;
