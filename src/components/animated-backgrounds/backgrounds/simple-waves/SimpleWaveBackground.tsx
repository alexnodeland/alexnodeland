import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLYPH_GLSL, glyphTexture, rasterizeGlyph } from '../../core/glyph';
import {
  NotFoundSequence,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { SimpleWaveSettings } from './config';

// The number is sampled, not drawn, so this only has to be fine enough for a
// soft edge at the size the waves are.
const GLYPH_COLS = 256;

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

    // The number, for the 404 sequence. Rebuilt when the viewport changes
    // shape, since it is set to the viewport's aspect.
    let glyphSize = { width: window.innerWidth, height: window.innerHeight };
    const buildGlyph = () => {
      const rows = Math.max(
        32,
        Math.round((GLYPH_COLS * glyphSize.height) / glyphSize.width)
      );
      return glyphTexture(rasterizeGlyph(GLYPH_COLS, rows));
    };
    let glyph = buildGlyph();
    const sequence = new NotFoundSequence();

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

      ${GLYPH_GLSL}

      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;
        float time = uTime;

        // Multiple sine waves
        float wave1 = sin(uv.x * uWaveFrequency + time) * uWaveAmplitude;
        float wave2 = sin(uv.y * uWaveFrequency * 0.8 + time * 1.2) * uWaveAmplitude * 0.7;
        float wave3 = sin((uv.x + uv.y) * uWaveFrequency * 0.6 + time * 0.8) * uWaveAmplitude * 0.5;

        float combined = wave1 + wave2 + wave3;

        // The 404 sequence: the number pulls the field. Inside it the three
        // components are driven to reinforce, so it reads at full amplitude;
        // outside they cancel, down to a residue of the wave and to rings
        // spreading out from the number's edge.
        if (uNotFound > 0.0) {
          float cover = glyphCover(vUv);
          float d = glyphDist(vUv);
          float rings = 0.5 + 0.5 * sin(d * 0.9 - time * 2.2);
          float halo = exp(-max(d, 0.0) / 6.0);
          float outside = combined * 0.12
            + 0.55 * halo * rings * (0.4 + 0.6 * abs(combined));
          float inside = 0.9 + 0.3 * combined;
          combined = mix(combined, mix(outside, inside, cover), uNotFound);
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
        uGlyph: { value: glyph },
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

      // A frozen frame tells the whole story at once; a live one advances it.
      // The step is clamped so a tab coming back from the background plays
      // one long frame rather than the whole time it was away.
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
      // The number is set to the viewport's shape. A URL bar sliding away is
      // not a new shape, and rebuilding for it would make the number jump.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        glyphSize = size;
        glyph.dispose();
        glyph = buildGlyph();
        material.uniforms.uGlyph.value = glyph;
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
      glyph.dispose();
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
