import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface AnimatedBackgroundProps {
  className?: string;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    containerRef.current.appendChild(renderer.domElement);
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Vertex shader for the pixelated gradient
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment shader for PDE stencil propagation
    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      varying vec2 vUv;
      
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      // Heat/diffusion equation simulation
      float getFieldValue(vec2 pos, float t) {
        vec2 mousePos = (vec2(uMouse.x, uResolution.y - uMouse.y) * 2.0 - uResolution.xy) / uResolution.y;
        float totalField = 0.0;
        
        // Traveling waves across the screen
        float wave1 = sin(pos.x * 8.0 - t * 4.0) * sin(pos.y * 6.0 - t * 3.0) * 
                     exp(-abs(pos.x - sin(t * 0.5)) * 0.8);
        float wave2 = sin(pos.y * 10.0 - t * 5.0) * sin(pos.x * 4.0 - t * 2.0) * 
                     exp(-abs(pos.y - cos(t * 0.7)) * 0.6);
        
        // Diagonal traveling waves
        float diagonalWave = sin((pos.x + pos.y) * 12.0 - t * 6.0) * 
                           exp(-abs(pos.x + pos.y - sin(t * 0.3) * 2.0) * 0.4);
        
        totalField += (wave1 + wave2 + diagonalWave) * 0.4;
        
        // Mouse-triggered expanding ripples
        for (int i = 0; i < 3; i++) {
          float waveTime = t - float(i) * 0.8; // Staggered waves
          if (waveTime > 0.0) {
            float rippleRadius = waveTime * 2.0;
            float distFromMouse = length(pos - mousePos);
            
            // Expanding circular wave from mouse
            float ripple = sin(distFromMouse * 20.0 - waveTime * 8.0) * 
                          exp(-max(0.0, distFromMouse - rippleRadius * 0.3) * 3.0) * 
                          exp(-waveTime * 0.5);
            totalField += ripple * 0.6;
          }
        }
        
        // Additional mouse influence - create persistent disturbance
        float mouseInfluence = exp(-length(pos - mousePos) * 2.0) * 
                              sin(t * 10.0) * 0.3;
        totalField += mouseInfluence;
        
        // Cross-screen propagation waves
        float horizontalWave = sin(pos.x * 15.0 - t * 7.0) * 
                             exp(-abs(pos.y) * 0.5) * 0.3;
        float verticalWave = sin(pos.y * 15.0 - t * 6.0) * 
                           exp(-abs(pos.x) * 0.5) * 0.3;
        
        totalField += horizontalWave + verticalWave;
        
        return totalField;
      }
      
      vec3 getStencilColor(float value) {
        // Color mapping for field values
        vec3 cold = vec3(0.0, 0.2, 0.8);    // Blue for negative
        vec3 neutral = vec3(0.1, 0.8, 0.1); // Green for zero
        vec3 hot = vec3(1.0, 0.3, 0.0);     // Red/orange for positive
        vec3 hottest = vec3(1.0, 1.0, 0.2); // Yellow for high positive
        
        if (value < 0.0) {
          return mix(cold, neutral, (value + 1.0));
        } else if (value < 0.5) {
          return mix(neutral, hot, value * 2.0);
        } else {
          return mix(hot, hottest, (value - 0.5) * 2.0);
        }
      }
      
      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        vec3 finalColor = vec3(0.0);
        
        // Computational grid parameters
        float gridSize = 0.08;
        vec2 gridPos = floor(uv / gridSize);
        vec2 localUv = fract(uv / gridSize) - 0.5;
        vec2 worldPos = gridPos * gridSize;
        
        // Calculate field value at this grid point
        float fieldValue = getFieldValue(worldPos, uTime);
        
        // Draw grid node (computational point)
        float nodeDistance = length(localUv);
        float nodeSize = 0.02 + abs(fieldValue) * 0.03;
        float nodeBrightness = smoothstep(nodeSize + 0.01, nodeSize - 0.01, nodeDistance);
        
        vec3 nodeColor = getStencilColor(fieldValue);
        finalColor += nodeColor * nodeBrightness * (2.0 + abs(fieldValue) * 3.0);
        
        // Draw stencil connections (5-point finite difference stencil)
        vec2 stencilOffsets[4];
        stencilOffsets[0] = vec2(1.0, 0.0);   // Right
        stencilOffsets[1] = vec2(-1.0, 0.0);  // Left  
        stencilOffsets[2] = vec2(0.0, 1.0);   // Up
        stencilOffsets[3] = vec2(0.0, -1.0);  // Down
        
        for (int i = 0; i < 4; i++) {
          vec2 neighborGrid = gridPos + stencilOffsets[i];
          vec2 neighborWorld = neighborGrid * gridSize;
          float neighborValue = getFieldValue(neighborWorld, uTime);
          
          // Stencil weight visualization (diffusion coefficient)
          float weight = abs(fieldValue - neighborValue);
          vec3 stencilColor = mix(nodeColor, getStencilColor(neighborValue), 0.5);
          
          // Draw connection line
          vec2 lineDir = stencilOffsets[i];
          vec2 lineStart = localUv;
          float lineProgress = dot(localUv, lineDir);
          
          if (lineProgress > 0.0 && lineProgress < gridSize * 0.5) {
            vec2 perpDir = vec2(-lineDir.y, lineDir.x);
            float distFromLine = abs(dot(localUv, perpDir));
            
            float lineWidth = 0.003 * (1.0 + weight * 2.0);
            float lineBrightness = smoothstep(lineWidth * 2.0, lineWidth, distFromLine);
            
            // Animate data flow - propagate across grid
            vec2 flowDirection = vec2(sin(uTime * 0.8), cos(uTime * 0.6));
            float flowWave = sin(dot(gridPos, flowDirection) * 2.0 - uTime * 8.0) * 0.5 + 0.5;
            float mouseDistance = length(worldPos - (vec2(uMouse.x, uResolution.y - uMouse.y) * 2.0 - uResolution.xy) / uResolution.y);
            float mouseWakeEffect = exp(-mouseDistance * 2.0) * sin(uTime * 12.0 - mouseDistance * 10.0) * 0.5 + 0.5;
            float flowBrightness = lineBrightness * (0.3 + 0.4 * flowWave + 0.3 * mouseWakeEffect);
            
            finalColor += stencilColor * flowBrightness * weight * 1.5;
          }
        }
        
        // Draw 9-point stencil for higher order accuracy (diagonal connections)
        vec2 diagonalOffsets[4];
        diagonalOffsets[0] = vec2(1.0, 1.0);   // NE
        diagonalOffsets[1] = vec2(-1.0, 1.0);  // NW
        diagonalOffsets[2] = vec2(1.0, -1.0);  // SE
        diagonalOffsets[3] = vec2(-1.0, -1.0); // SW
        
        for (int i = 0; i < 4; i++) {
          vec2 neighborGrid = gridPos + diagonalOffsets[i];
          vec2 neighborWorld = neighborGrid * gridSize;
          float neighborValue = getFieldValue(neighborWorld, uTime);
          
          float diagonalWeight = abs(fieldValue - neighborValue) * 0.25; // Reduced weight for diagonals
          vec3 diagonalColor = mix(nodeColor, getStencilColor(neighborValue), 0.7);
          
          vec2 lineDir = normalize(diagonalOffsets[i]);
          float lineProgress = dot(localUv, lineDir);
          
          if (lineProgress > 0.0 && lineProgress < gridSize * 0.7) {
            vec2 perpDir = vec2(-lineDir.y, lineDir.x);
            float distFromLine = abs(dot(localUv, perpDir));
            
            float lineWidth = 0.002 * (1.0 + diagonalWeight * 3.0);
            float lineBrightness = smoothstep(lineWidth * 1.5, lineWidth, distFromLine);
            
            finalColor += diagonalColor * lineBrightness * diagonalWeight * 0.8;
          }
        }
        
        // Add computational grid overlay
        float gridLine = min(
          smoothstep(0.002, 0.001, abs(localUv.x)),
          smoothstep(0.002, 0.001, abs(localUv.y))
        );
        finalColor += vec3(0.2, 0.3, 0.4) * gridLine * 0.3;
        
        // Highlight active computation zones - sweeping across screen
        vec2 mouseWorldPos = (vec2(uMouse.x, uResolution.y - uMouse.y) * 2.0 - uResolution.xy) / uResolution.y;
        float sweepPhase = sin(worldPos.x * 3.0 - uTime * 4.0) * sin(worldPos.y * 2.0 - uTime * 3.0);
        float mouseProximityBoost = exp(-length(worldPos - mouseWorldPos) * 1.5);
        float computeActivity = (sweepPhase * 0.5 + 0.5) * (0.5 + 0.5 * mouseProximityBoost);
        
        if (abs(fieldValue) > 0.2) {
          finalColor += nodeColor * computeActivity * 0.4;
        }
        
        // Add propagating computational waves from mouse
        float mouseWaveDist = length(worldPos - mouseWorldPos);
        float mouseWave = sin(mouseWaveDist * 25.0 - uTime * 10.0) * 
                         exp(-mouseWaveDist * 1.2) * 0.3;
        if (mouseWave > 0.0) {
          finalColor += vec3(0.8, 0.9, 1.0) * mouseWave;
        }
        
        gl_FragColor = vec4(finalColor * 1.0, 0.85);
      }
    `;

    // Create shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.0, 0.0) }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      // Use raw screen coordinates for better shader interaction
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = (time: number) => {
      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = time * 0.001;
      }
      
      // Update mouse uniform
      if (material.uniforms.uMouse) {
        material.uniforms.uMouse.value.x = mouseRef.current.x;
        material.uniforms.uMouse.value.y = mouseRef.current.y;
      }
      
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (renderer && material.uniforms.uResolution) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Clean up Three.js resources
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

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
        opacity: 0.5
      }}
    />
  );
};

export default AnimatedBackground;
