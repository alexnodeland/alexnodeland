import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../types/animated-backgrounds';

const SimpleWaveBackground: React.FC<AnimatedBackgroundProps> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

    // Vertex shader
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment shader for simple sine waves
    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uWaveFrequency;
      uniform float uWaveAmplitude;
      uniform float uWaveSpeed;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      
      varying vec2 vUv;
      
      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        float time = uTime * uWaveSpeed;
        
        // Multiple sine waves
        float wave1 = sin(uv.x * uWaveFrequency + time) * uWaveAmplitude;
        float wave2 = sin(uv.y * uWaveFrequency * 0.8 + time * 1.2) * uWaveAmplitude * 0.7;
        float wave3 = sin((uv.x + uv.y) * uWaveFrequency * 0.6 + time * 0.8) * uWaveAmplitude * 0.5;
        
        float combined = wave1 + wave2 + wave3;
        
        // Color gradient based on wave values
        vec3 color;
        if (combined < -0.5) {
          color = mix(uColor1, uColor2, (combined + 1.0) * 2.0);
        } else if (combined < 0.5) {
          color = mix(uColor2, uColor3, (combined + 0.5) * 2.0);
        } else {
          color = uColor3;
        }
        
        // Add some brightness variation
        float brightness = 0.8 + 0.4 * sin(uv.x * 3.0 + time * 0.5) * sin(uv.y * 2.0 + time * 0.3);
        color *= brightness;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Create shader material with configurable uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uWaveFrequency: { value: settings.waveSpeed1 }, // Reuse existing settings
        uWaveAmplitude: { value: settings.waveAmplitude },
        uWaveSpeed: { value: settings.globalTimeMultiplier },
        uColor1: { value: new THREE.Vector3(...settings.colors.cold) },
        uColor2: { value: new THREE.Vector3(...settings.colors.neutral) },
        uColor3: { value: new THREE.Vector3(...settings.colors.hot) }
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
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
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
        opacity: settings.opacity
      }}
    />
  );
};

export default SimpleWaveBackground;
