import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  glyphSpacingFor,
  rasterizeGlyph,
  sampleGlyphPoints,
} from '../../core/glyph';
import {
  NotFoundSequence,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { SimpleWaveSettings } from './config';

// The 404 sequence is an interference pattern: this many point sources,
// placed inside the number, each radiating a circular wave, summed. Near the
// sources the waves reinforce and the number reads; away from them their
// tails interfere into fringes and fade. The count is a uniform array in the
// shader, so it is fixed.
const SOURCE_COUNT = 128;
const GLYPH_COLS = 160;

const SimpleWaveBackground: React.FC<
  AnimatedBackgroundProps<SimpleWaveSettings>
> = ({ className, settings, frozen, notFound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Live view of the settings for the animation loop, which outlives the
  // render that created it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Draw one frame and hold — see AnimatedBackgroundProps.frozen. The loop
  // reads the ref each frame; the effect restarts it when the hold is lifted.
  const frozenRef = useRef(Boolean(frozen));
  frozenRef.current = Boolean(frozen);
  const resumeRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!frozen) resumeRef.current?.();
  }, [frozen]);

  // The 404 sequence — see AnimatedBackgroundProps.notFound. Read off a ref
  // each frame like the settings; the effect nudges a frozen loop so it draws
  // the new state once.
  const notFoundRef = useRef(Boolean(notFound));
  notFoundRef.current = Boolean(notFound);
  useEffect(() => {
    resumeRef.current?.();
  }, [notFound]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(getRenderPixelRatio());

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

    // The point sources, in the shader's own coordinates (x across by the
    // aspect, y −1 → 1 up), sampled evenly inside the number. Placed again
    // when the viewport changes shape, since the number is set to it.
    const sources = new Float32Array(SOURCE_COUNT * 2);
    let sourceCount = 0;
    let glyphSize = { width: window.innerWidth, height: window.innerHeight };
    const placeSources = () => {
      const { width, height } = glyphSize;
      const rows = Math.max(24, Math.round((GLYPH_COLS * height) / width));
      const field = rasterizeGlyph(GLYPH_COLS, rows);
      const spots = sampleGlyphPoints(
        field,
        SOURCE_COUNT,
        glyphSpacingFor(field, SOURCE_COUNT)
      );
      const aspect = width / height;
      sourceCount = spots.length;
      spots.forEach((p, i) => {
        sources[i * 2] = ((p.x / GLYPH_COLS) * 2 - 1) * aspect;
        sources[i * 2 + 1] = 1 - (p.y / rows) * 2;
      });
    };
    placeSources();
    const sequence = new NotFoundSequence();

    // Fragment shader for simple sine waves
    const fragmentShader = `
      const int SOURCE_COUNT = ${SOURCE_COUNT};

      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uWaveFrequency;
      uniform float uWaveAmplitude;
      uniform vec3 uColorPrimary;
      uniform vec3 uColorSecondary;
      uniform vec3 uColorAccent;
      uniform vec3 uColorBackground;
      uniform vec2 uSources[SOURCE_COUNT];
      uniform int uSourceCount;
      uniform float uNotFound;

      varying vec2 vUv;

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        float time = uTime;

        // Multiple sine waves
        float wave1 = sin(uv.x * uWaveFrequency + time) * uWaveAmplitude;
        float wave2 = sin(uv.y * uWaveFrequency * 0.8 + time * 1.2) * uWaveAmplitude * 0.7;
        float wave3 = sin((uv.x + uv.y) * uWaveFrequency * 0.6 + time * 0.8) * uWaveAmplitude * 0.5;

        float combined = wave1 + wave2 + wave3;

        // The 404 sequence: the three plane waves give way to point sources
        // arranged as the number, each radiating a circular wave that falls
        // off with distance, all in phase. The wavelength is shorter than a
        // stroke, so what fills the number is the rings travelling out of
        // its sources and interfering with one another — the ripple-tank
        // picture — and what surrounds it is their tails, interfering into
        // fainter rings that fade with distance. Normalised where sources
        // crowd, so a thick stroke is no brighter than a thin one. Both
        // fields exist while the fade runs — it is the same superposition,
        // reweighted.
        if (uNotFound > 0.0) {
          float radial = 0.0;
          float presence = 0.0;
          float k = uWaveFrequency * 6.0;
          for (int i = 0; i < SOURCE_COUNT; i++) {
            if (i >= uSourceCount) break;
            float d = length(uv - uSources[i]);
            float fall = exp(-d * 20.0);
            radial += sin(d * k - time * 4.0) * fall;
            presence += fall;
          }
          float sourced = radial / max(1.0, presence) * 1.6 * uWaveAmplitude;
          combined = mix(combined, sourced, uNotFound);
        }

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
        uSources: {
          value: Array.from(
            { length: SOURCE_COUNT },
            (_, i) => new THREE.Vector2(sources[i * 2], sources[i * 2 + 1])
          ),
        },
        uSourceCount: { value: sourceCount },
        uNotFound: { value: 0 },
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

      // A frozen frame tells the whole story at once; a live one advances
      // it. The step is clamped so a tab coming back from the background
      // plays one long frame rather than the whole time it was away.
      const on = notFoundRef.current;
      const progress = frozenRef.current
        ? sequence.settle(on)
        : sequence.advance(Math.min(deltaSec, 0.1), on);

      const u = material.uniforms;
      u.uTime.value = phase;
      u.uNotFound.value = progress;
      u.uWaveFrequency.value = live.waveFrequency;
      u.uWaveAmplitude.value = live.waveAmplitude;
      u.uColorPrimary.value.set(...live.colors.primary);
      u.uColorSecondary.value.set(...live.colors.secondary);
      u.uColorAccent.value.set(...live.colors.accent);
      u.uColorBackground.value.set(...live.colors.background);

      renderer.render(scene, camera);
      if (frozenRef.current) {
        animationFrameRef.current = null;
        return;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(0);
    resumeRef.current = () => {
      if (animationFrameRef.current === null)
        animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Handle window resize, at most once per frame. A phone's URL bar sliding
    // in and out fires resize repeatedly over a single flick, and each raw
    // call reallocates the drawing buffer mid-scroll.
    let resizeFrame: number | null = null;
    const applyResize = () => {
      resizeFrame = null;
      if (renderer && material.uniforms.uResolution) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(
          window.innerWidth,
          window.innerHeight
        );
      }
      // The sources are set to the viewport's shape. A URL bar sliding away
      // is not a new shape, and placing them again for it would make the
      // number jump.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        glyphSize = size;
        placeSources();
        const vectors = material.uniforms.uSources.value as THREE.Vector2[];
        vectors.forEach((v, i) => v.set(sources[i * 2], sources[i * 2 + 1]));
        material.uniforms.uSourceCount.value = sourceCount;
      }
    };
    const handleResize = () => {
      if (resizeFrame === null) {
        resizeFrame = requestAnimationFrame(applyResize);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      resumeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      window.removeEventListener('resize', handleResize);
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

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
