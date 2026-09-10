import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  glyphSpacingFor,
  rasterizeGlyph,
  sampleGlyphPoints,
} from '../../core/glyph';
import {
  NotFoundSequence,
  RESHAPE_SETTLE_MS,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { getRenderPixelRatio } from '../../core/renderScale';
import { AnimatedBackgroundProps } from '../../core/types';
import { SimpleWaveSettings } from './config';

// The 404 sequence is an interference pattern: this many point sources,
// placed inside the number, each radiating a circular wave, summed. Near the
// sources the waves reinforce and the number reads; away from them their
// tails interfere into fringes and fade. The count is a uniform array in the
// shader, so it is fixed. Each source's wave is sin(k·d − ωt), which is
// sin(k·d)·cos(ωt) − cos(k·d)·sin(ωt): the whole field is two fixed pictures
// — the sines and the cosines, summed over the sources with their falloffs
// — turned against each other by the clock. So the two pictures are drawn
// once, by the GPU, into a texture this wide, and the fragment shader
// samples it rather than summing every source at every pixel every frame.
// The wavelength is this many times the wave frequency setting's reciprocal:
// shorter than a stroke, so the rings fill the digits.
const SOURCE_COUNT = 128;
const GLYPH_COLS = 160;
const FIELD_WIDTH = 512;
const RINGS_PER_FREQUENCY = 6;
// How long the plane waves take to give way to the sources. Shorter than
// the default: the cycle gives each background twelve seconds on the 404,
// and the number should be up for most of them.
const FORM_SECONDS = 3;

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
    const sequence = new NotFoundSequence({ formSeconds: FORM_SECONDS });
    const sourceVectors = Array.from(
      { length: SOURCE_COUNT },
      (_, i) => new THREE.Vector2(sources[i * 2], sources[i * 2 + 1])
    );
    const syncSourceVectors = () =>
      sourceVectors.forEach((v, i) =>
        v.set(sources[i * 2], sources[i * 2 + 1])
      );

    // The baked field. Drawn again when the sources move or the wavelength
    // setting changes, and only while the sequence is up.
    const fieldHeight = () =>
      Math.max(
        32,
        Math.round((FIELD_WIDTH * glyphSize.height) / glyphSize.width)
      );
    const field = new THREE.WebGLRenderTarget(FIELD_WIDTH, fieldHeight(), {
      depthBuffer: false,
      stencilBuffer: false,
    });
    field.texture.minFilter = THREE.LinearFilter;
    field.texture.magFilter = THREE.LinearFilter;
    const bakeScene = new THREE.Scene();
    const bakeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const bakeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSources: { value: sourceVectors },
        uSourceCount: { value: sourceCount },
        uK: { value: 0 },
        uAspect: { value: glyphSize.width / glyphSize.height },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        const int SOURCE_COUNT = ${SOURCE_COUNT};
        uniform vec2 uSources[SOURCE_COUNT];
        uniform int uSourceCount;
        uniform float uK;
        uniform float uAspect;
        varying vec2 vUv;

        void main() {
          // The same coordinates the wave shader works in: x across by the
          // aspect, y −1 → 1 up.
          vec2 p = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
          float sines = 0.0;
          float cosines = 0.0;
          float presence = 0.0;
          for (int i = 0; i < SOURCE_COUNT; i++) {
            if (i >= uSourceCount) break;
            float d = length(p - uSources[i]);
            float fall = exp(-d * 20.0);
            sines += sin(d * uK) * fall;
            cosines += cos(d * uK) * fall;
            presence += fall;
          }
          // Normalised where sources crowd, so a thick stroke is no brighter
          // than a thin one; each in −1 → 1, stored 0 → 1.
          float norm = max(1.0, presence);
          gl_FragColor = vec4(sines / norm * 0.5 + 0.5, cosines / norm * 0.5 + 0.5, 0.0, 1.0);
        }
      `,
    });
    const bakeGeometry = new THREE.PlaneGeometry(2, 2);
    bakeScene.add(new THREE.Mesh(bakeGeometry, bakeMaterial));
    let bakedK = NaN;
    let fieldStale = true;
    const bake = (k: number) => {
      bakeMaterial.uniforms.uK.value = k;
      bakeMaterial.uniforms.uSourceCount.value = sourceCount;
      bakeMaterial.uniforms.uAspect.value = glyphSize.width / glyphSize.height;
      renderer.setRenderTarget(field);
      renderer.render(bakeScene, bakeCamera);
      renderer.setRenderTarget(null);
      bakedK = k;
      fieldStale = false;
    };

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
      uniform sampler2D uField;
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
        // arranged as the number, all in phase, radiating circular waves at
        // a wavelength shorter than a stroke. What fills the number is the
        // rings travelling out of its sources and interfering with one
        // another — the ripple-tank picture — and what surrounds it is
        // their tails, interfering into fainter rings that fade with
        // distance. The field is read from the baked texture (see the bake
        // pass) and turned by the clock. Both fields exist while the fade
        // runs — it is the same superposition, reweighted.
        if (uNotFound > 0.0) {
          vec2 baked = texture2D(uField, vUv).rg * 2.0 - 1.0;
          float radial = baked.x * cos(time * 4.0) - baked.y * sin(time * 4.0);
          float sourced = radial * 1.6 * uWaveAmplitude;
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
        uField: { value: field.texture },
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

      // The field is drawn once per shape and wavelength, the first time
      // it is needed.
      const k = live.waveFrequency * RINGS_PER_FREQUENCY;
      if (progress > 0 && (fieldStale || k !== bakedK)) bake(k);

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
    let reshapeTimer = 0;
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
      // number jump; a real one has them placed again once it has settled.
      const size = { width: window.innerWidth, height: window.innerHeight };
      if (viewportReshaped(glyphSize, size)) {
        window.clearTimeout(reshapeTimer);
        reshapeTimer = window.setTimeout(() => {
          glyphSize = size;
          placeSources();
          syncSourceVectors();
          field.setSize(FIELD_WIDTH, fieldHeight());
          fieldStale = true;
        }, RESHAPE_SETTLE_MS);
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
      window.clearTimeout(reshapeTimer);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Clean up Three.js resources
      field.dispose();
      bakeGeometry.dispose();
      bakeMaterial.dispose();
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
