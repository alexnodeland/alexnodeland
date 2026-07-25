import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../core/types';
import { SimpleWaveSettings } from './config';

const SimpleWaveBackground: React.FC<
  AnimatedBackgroundProps<SimpleWaveSettings>
> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live view of the settings for the animation loop, which outlives the
  // render that created it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.appendChild(renderer.domElement);

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
      uniform vec3 uColorPrimary;
      uniform vec3 uColorSecondary;
      uniform vec3 uColorAccent;
      uniform vec3 uColorBackground;

      varying vec2 vUv;

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        float time = uTime;

        // Multiple sine waves
        float wave1 = sin(uv.x * uWaveFrequency + time) * uWaveAmplitude;
        float wave2 = sin(uv.y * uWaveFrequency * 0.8 + time * 1.2) * uWaveAmplitude * 0.7;
        float wave3 = sin((uv.x + uv.y) * uWaveFrequency * 0.6 + time * 0.8) * uWaveAmplitude * 0.5;

        float combined = wave1 + wave2 + wave3;

        // Color gradient based on wave values using standardized colors
        vec3 color;
        if (combined < -0.5) {
          color = mix(uColorSecondary, uColorPrimary, (combined + 1.0) * 2.0);
        } else if (combined < 0.5) {
          color = mix(uColorPrimary, uColorAccent, (combined + 0.5) * 2.0);
        } else {
          color = uColorAccent;
        }

        // Add some brightness variation
        float brightness = 0.8 + 0.4 * sin(uv.x * 3.0 + time * 0.5) * sin(uv.y * 2.0 + time * 0.3);
        color *= brightness;

        // Fade toward the background colour where the three components cancel.
        // Without this the background colour has nowhere to show: the wave
        // fills every pixel, so total destructive interference still painted a
        // wave colour rather than reading as empty.
        float energy = smoothstep(0.0, 0.35, abs(combined));
        color = mix(uColorBackground, color, energy);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Create shader material with configurable uniforms
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uWaveFrequency: { value: settings.waveFrequency },
        uWaveAmplitude: { value: settings.waveAmplitude },
        uColorPrimary: { value: new THREE.Vector3(...settings.colors.primary) },
        uColorSecondary: {
          value: new THREE.Vector3(...settings.colors.secondary),
        },
        uColorAccent: { value: new THREE.Vector3(...settings.colors.accent) },
        uColorBackground: {
          value: new THREE.Vector3(...settings.colors.background),
        },
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

    // Animation loop. Settings are read live off a ref and pushed into the
    // uniforms each frame, so this effect never has to rebuild the scene —
    // dragging a slider used to tear down the renderer and reset the clock on
    // every input event.
    //
    // Phase is integrated rather than computed as time × speed, so changing
    // the speed changes the rate from here on instead of jumping the wave.
    let phase = 0;
    let lastTime = 0;
    const animate = (time: number) => {
      const live = settingsRef.current;
      const deltaSec = lastTime === 0 ? 0 : (time - lastTime) / 1000;
      lastTime = time;
      phase += deltaSec * live.globalTimeMultiplier;

      const u = material.uniforms;
      u.uTime.value = phase;
      u.uWaveFrequency.value = live.waveFrequency;
      u.uWaveAmplitude.value = live.waveAmplitude;
      u.uColorPrimary.value.set(...live.colors.primary);
      u.uColorSecondary.value.set(...live.colors.secondary);
      u.uColorAccent.value.set(...live.colors.accent);
      u.uColorBackground.value.set(...live.colors.background);

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (renderer && material.uniforms.uResolution) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight
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
      renderer.forceContextLoss();
    };
    // Nothing here is structural: every setting is a uniform the loop refreshes
    // from settingsRef each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        opacity: settings.opacity,
      }}
    />
  );
};

export default SimpleWaveBackground;
