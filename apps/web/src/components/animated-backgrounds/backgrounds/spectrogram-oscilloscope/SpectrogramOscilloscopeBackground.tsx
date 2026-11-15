import React, { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { isShortcutKey } from '../../../../lib/utils/keys';
import { glyphCoverage, GlyphField, rasterizeGlyph } from '../../core/glyph';
import {
  NotFoundSequence,
  RESHAPE_SETTLE_MS,
  viewportReshaped,
} from '../../core/notFoundSequence';
import { Pose } from '../../core/stage/rig';
import { STAGE_GROUND, StageOptions } from '../../core/stage/stage';
import { createReadout } from '../../core/stage/telemetry';
import {
  SceneContext,
  SceneHandle,
  StageSurface,
  useStageScene,
} from '../../core/stage/useStageScene';
import { AnimatedBackgroundProps } from '../../core/types';
import { SpectrogramOscilloscopeSettings } from './config';
import {
  analyse,
  axisFrequency,
  levelToDecibels,
  noteName,
  SAMPLE_RATE,
  Synth,
  toLevel,
  UNIT_SECONDS,
} from './synth';

/**
 * A synthesizer, and the two instruments for looking at one.
 *
 * The synth is synth.ts: two oscillators, one modulating the other's phase,
 * through a filter, a delay, distortion and a little reverb, made a sample
 * at a time into a ring. This file is the looking.
 *
 * It was a split screen: an oscilloscope across the top, a spectrogram
 * under it. It is one picture now, with time as its depth. The spectrum of
 * the present moment is the ridge along the front edge; every moment before
 * it is a ridge further back, the whole history receding like a waterfall
 * display on a bench analyser — which is what it is. In front of it all, at
 * the viewer's feet, runs the oscilloscope's trace: the same samples, in the
 * other domain. So a sideband that opens when the FM is pushed is seen
 * arriving at the front and travelling away, and the sweep of the filter is
 * a shadow moving across the hills.
 */

// The oscilloscope's width, the terrain's footprint at rest, how tall a
// full-scale bin stands, and where the front edge — the present — is.
const WIDTH = 3.5;
const DEPTH = 5.2;
const HEIGHT = 0.6;
const FRONT = 1.45;
const SCOPE_AHEAD = 0.34;
const SCOPE_SWING = 0.15;
// The trace's centre line, a little under the ground the history stands on.
const SCOPE_LEVEL = -0.05;

// The modulators' clock runs this many units a second at an animation speed
// of one: fast enough that the FM's wobble and the filter's sweep are things
// that happen while you watch.
const UNITS_PER_SECOND = 1.6;
// Ridges laid down a second, at a waterfall speed of one.
const ROWS_PER_SECOND = 26;
// Never more samples in a frame than this: a tab coming back from the
// background plays one long frame, not the whole time it was away.
const MAX_SAMPLES_PER_FRAME = 2400;

// The 404 sequence: the number, played. An additive voice of this many
// partials, spread across the frequency axis, whose amplitudes follow the
// number's columns row by row over PHRASE_SECONDS — so the spectrogram,
// analysing what it is given as it always does, shows the number travelling
// back through its history the way anything played does. The top row goes
// first: it is the furthest away by the time the bottom row plays, and so
// the highest on the screen — the number lands upright. The phrase repeats
// after a rest. While it plays the waterfall runs at the speed that lays one
// phrase across its whole depth, and the terrain widens to the screen: that
// is the instrument's zoom, not the signal.
const PARTIALS = 48;
const PHRASE_SECONDS = 7;
const PHRASE_REST = 0.35;
const GLYPH_COLS = 256;
// How long the fader takes to bring the voice up; it comes down on the
// shared release.
const FADER_SECONDS = 1.5;
// How loud the voice's partials are: well up the display's range, short of
// the peaks, so the number is drawn in the colour of a loud signal and not
// of a clipped one.
const SUNG_LEVEL = 0.2;

export const FOV_DEGREES = 40;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);

/**
 * Where the camera rests: above the front edge, looking down the history.
 * The present is at the bottom of the screen and the past runs up it into
 * the dark, which is where the page's title sits.
 */
export const restPose = (aspect: number): Pose => ({
  // Aimed just behind the front edge, so the edge sits a fifth of the way
  // up the screen and the trace has the strip under it — the strip the
  // rail's two pills stand at the ends of.
  target: [0, 0.1, aspect < 1 ? -0.25 : 0.15],
  distance: aspect < 1 ? 5.2 : 3.9,
  azimuth: 0,
  elevation: aspect < 1 ? 0.52 : 0.4,
  fov: FOV_DEGREES,
});

/** With the page out of the way: lower and closer, along the ridges. */
export const showPose = (aspect: number): Pose => ({
  target: [0, 0.16, 0],
  distance: aspect < 1 ? 5.4 : 4,
  azimuth: 0,
  elevation: aspect < 1 ? 0.46 : 0.3,
  fov: FOV_DEGREES,
});

/** Squared up for the number: straight over the middle of the history. */
export const readingPose = (): Pose => ({
  target: [0, 0, FRONT - DEPTH / 2],
  distance: DEPTH / 2 / TAN_HALF_FOV,
  azimuth: 0,
  elevation: Math.PI / 2,
  fov: FOV_DEGREES,
});

const stageOptions = (): StageOptions => ({
  rig: {
    base: restPose,
    hidden: showPose,
    reading: readingPose,
    minElevation: 0.14,
    parallax: { azimuth: 0.07, elevation: 0.035, hiddenGain: 3.5 },
  },
  bloom: { strength: 0.66, threshold: 0.66, knee: 0.6, radius: 0.72 },
  grade: { vignette: 0.36 },
});

const TERRAIN_VERTEX = /* glsl */ `
  uniform sampler2D uSpectrum;
  uniform float uRows;
  uniform float uHead;
  uniform float uFrac;
  uniform float uFront;
  uniform vec3 uSize;
  varying vec3 vWorld;
  varying float vLevel;
  varying float vRow;
  varying float vAcross;

  void main() {
    // Row 0 is the present, at the front edge; every row behind it is one
    // ridge older, and the whole history slides back by a fraction of a
    // ridge between one being laid down and the next.
    float row = uv.y * (uRows - 1.0);
    float level = texture2D(uSpectrum, vec2(uv.x, (uHead - row + 0.5) / uRows)).r;
    float back = max(0.0, row - 1.0 + uFrac) * (uSize.z / (uRows - 1.0));

    vec3 world = vec3((uv.x - 0.5) * uSize.x, level * uSize.y, uFront - back);
    vWorld = world;
    vLevel = level;
    vRow = row;
    vAcross = uv.x;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

// The history, as a surface. It is solid and nearly black, so a ridge hides
// the ridges behind it, and what is drawn on it is lines: one along the
// crest of every row, in the colour its level maps to. That is all a
// waterfall display is.
const TERRAIN_FRAGMENT = /* glsl */ `
  uniform vec3 uLow;
  uniform vec3 uMid;
  uniform vec3 uHigh;
  uniform vec3 uPeak;
  uniform vec3 uGrid;
  uniform vec3 uGround;
  uniform vec3 uSize;
  uniform float uRows;
  uniform float uFront;
  uniform float uBrightness;
  uniform float uStrength;
  uniform float uReading;
  uniform vec4 uAxis;
  uniform vec3 uProbe;
  varying vec3 vWorld;
  varying float vLevel;
  varying float vRow;
  varying float vAcross;

  // Colour mapping: near silence, then mid, loud and peak.
  vec3 levelColor(float value) {
    if (value < 0.25) return mix(uLow * 0.2, uLow, value * 4.0);
    if (value < 0.5) return mix(uLow, uMid, (value - 0.25) * 4.0);
    if (value < 0.75) return mix(uMid, uHigh, (value - 0.5) * 4.0);
    return mix(uHigh, uPeak, (value - 0.75) * 4.0);
  }

  float lineOn(float coord, float weight) {
    float rate = max(fwidth(coord), 1e-5);
    float crowd = 1.0 - smoothstep(0.35, 0.9, rate);
    return (1.0 - smoothstep(0.0, weight, abs(fract(coord - 0.5) - 0.5) / rate)) * crowd;
  }

  void main() {
    float level = clamp(vLevel, 0.0, 1.0);
    vec3 hue = levelColor(level);

    // Lit by slope, a little: enough for a ridge to have a near side.
    vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (n.y < 0.0) n = -n;
    float diffuse = 0.5 + 0.5 * max(dot(n, normalize(vec3(-0.3, 0.6, 0.74))), 0.0);

    vec3 color = uLow * 0.1 * (0.3 + level) * diffuse;

    // One line a ridge, and the present's a little heavier than the rest.
    float ridge = lineOn(vRow, 1.15);
    float present = 1.0 - smoothstep(0.4, 1.4, vRow);
    color += hue * ridge * (0.1 + 1.7 * pow(level, 1.5)) * (1.0 + 1.4 * present);
    color += hue * pow(level, 3.2) * 0.7;

    // The octaves, ruled along the history where there is nothing louder:
    // the A in each one, when the axis is logarithmic.
    if (uAxis.x > 0.5) {
      float hertz = exp(mix(uAxis.y, uAxis.z, vAcross));
      float octave = log2(hertz / 55.0);
      color += uGrid * lineOn(octave, 1.0) * 0.22 * (1.0 - level);
    }

    // The probe: the frequency under the pointer, ruled down the whole
    // history, so one partial can be followed back through time.
    float fromProbe = abs(vAcross - uProbe.x) * uSize.x;
    float probe = 1.0 - smoothstep(0.0, 1.4, fromProbe / max(fwidth(fromProbe), 1e-5));
    float near = exp(-fromProbe * fromProbe / 0.006);
    color += (vec3(0.85, 0.94, 1.0) * probe * 0.5 + hue * near * 0.5 * level) * uProbe.y;

    color *= uBrightness;

    // The sides and the far end fall away into the ground. Read from
    // overhead there is no far end: the whole history is the picture.
    float sides = smoothstep(0.5, 0.42, abs(vAcross - 0.5));
    float age = (uFront - vWorld.z) / uSize.z;
    float depth = mix(1.0 - smoothstep(0.35, 1.0, age), 1.0, uReading);
    color = mix(uGround, color, sides * depth);

    gl_FragColor = vec4(mix(uGround, color, uStrength), 1.0);
  }
`;

const TRACE_VERTEX = /* glsl */ `
  attribute float aSide;
  varying float vSide;
  void main() {
    vSide = aSide;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`;

const TRACE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBrightness;
  varying float vSide;
  void main() {
    // A bright core in a soft line: the phosphor, and its glow.
    float across = abs(vSide);
    float core = 1.0 - smoothstep(0.0, 0.34, across);
    float glow = pow(1.0 - across, 2.0);
    gl_FragColor = vec4(uColor * (core * 2.2 + glow * 0.55) * uBrightness, 1.0);
  }
`;

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<SpectrogramOscilloscopeSettings>): SceneHandle => {
  const dense = stage.quality.tier === 'high';
  const BINS = dense ? 192 : 128;
  const ROWS = dense ? 150 : 96;
  const live0 = settings();

  // ── The synth and its history ────────────────────────────────────────────
  const synth = new Synth(4096);
  // A full window of samples before anything is measured.
  synth.render(2048, live0);
  const magnitudes = new Float32Array(BINS);
  const levels = new Float32Array(BINS);
  const history = new Uint8Array(BINS * ROWS);
  const spectrum = new THREE.DataTexture(
    history,
    BINS,
    ROWS,
    THREE.RedFormat,
    THREE.UnsignedByteType
  );
  spectrum.unpackAlignment = 1;
  spectrum.minFilter = THREE.LinearFilter;
  spectrum.magFilter = THREE.LinearFilter;
  spectrum.wrapS = THREE.ClampToEdgeWrapping;
  // The history is a ring: the row after the last is the first.
  spectrum.wrapT = THREE.RepeatWrapping;
  spectrum.needsUpdate = true;

  let head = 0;
  let frac = 0;
  let sampleBank = 0;
  let clock = 0;

  // ── The 404's voice ──────────────────────────────────────────────────────
  // The number, at the shape the terrain is read at from overhead. Rebuilt
  // only when the viewport changes shape.
  let glyphSize = { width: stage.width, height: stage.height };
  const buildGlyph = (): GlyphField =>
    rasterizeGlyph(
      GLYPH_COLS,
      Math.max(
        32,
        Math.round((GLYPH_COLS * glyphSize.height) / glyphSize.width)
      )
    );
  let glyph = buildGlyph();
  // The fader on the voice: up in a moment, since the phrase starts the
  // moment the flag goes up and should be heard from its first row; down on
  // the sequence's own release.
  const sequence = new NotFoundSequence({ formSeconds: FADER_SECONDS });
  // When the phrase started, on the scene's clock; null while it is silent.
  let voiceStart: number | null = null;
  // How much of the terrain's depth one phrase is laid across.
  const PHRASE_ROWS = Math.round(ROWS * 0.86);

  /** Which row of the number is playing at a moment, top first: 0 → 1, or −1 in the rest. */
  const phraseAt = (at: number): number => {
    if (voiceStart === null || at < voiceStart) return -1;
    const p =
      ((at - voiceStart) % (PHRASE_SECONDS * (1 + PHRASE_REST))) /
      PHRASE_SECONDS;
    return p > 1 ? -1 : p;
  };

  /** The voice's level at a place along the frequency axis, on a row of the number. */
  const voiceLevel = (across: number, row: number): number => {
    if (row < 0) return 0;
    const col = Math.min(
      glyph.cols - 1,
      Math.max(0, Math.floor(across * glyph.cols))
    );
    const line = Math.min(
      glyph.rows - 1,
      Math.max(0, Math.floor(row * glyph.rows))
    );
    return glyphCoverage(glyph, line * glyph.cols + col);
  };

  // The partials' frequencies and phases: each at the place on the axis its
  // column sits at, staggered so they do not all cross zero together.
  const partialHertz = new Float32Array(PARTIALS);
  const partialLevel = new Float32Array(PARTIALS);
  let voiceRow = -1;
  const voice = (seconds: number): number => {
    if (voiceRow < 0) return 0;
    let sum = 0;
    for (let k = 0; k < PARTIALS; k++) {
      if (partialLevel[k] > 0) {
        sum +=
          partialLevel[k] *
          Math.sin(Math.PI * 2 * partialHertz[k] * seconds + k * 1.7);
      }
    }
    return sum / (PARTIALS * 0.3);
  };

  // ── The terrain ──────────────────────────────────────────────────────────
  const asColor = (rgb: [number, number, number]) =>
    new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
  const terrainGeometry = new THREE.PlaneGeometry(1, 1, BINS - 1, ROWS - 1);
  const terrainMaterial = new THREE.ShaderMaterial({
    vertexShader: TERRAIN_VERTEX,
    fragmentShader: TERRAIN_FRAGMENT,
    uniforms: {
      uSpectrum: { value: spectrum },
      uRows: { value: ROWS },
      uHead: { value: 0 },
      uFrac: { value: 0 },
      uFront: { value: FRONT },
      uSize: { value: new THREE.Vector3(WIDTH, HEIGHT, DEPTH) },
      uLow: { value: asColor(live0.colors.background) },
      uMid: { value: asColor(live0.colors.primary) },
      uHigh: { value: asColor(live0.colors.secondary) },
      uPeak: { value: asColor(live0.colors.accent) },
      uGrid: { value: asColor(live0.colors.grid) },
      uGround: { value: new THREE.Color(STAGE_GROUND) },
      uBrightness: { value: 1 },
      uStrength: { value: 0 },
      uReading: { value: 0 },
      // x: logarithmic or not. y, z: the logs of the axis's two ends.
      uAxis: { value: new THREE.Vector4(1, 0, 1, 0) },
      // x: where along the axis the probe is. y: how present it is.
      uProbe: { value: new THREE.Vector3(0.5, 0, 0) },
    },
    side: THREE.DoubleSide,
  });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.frustumCulled = false;
  stage.scene.add(terrain);

  // ── The oscilloscope's trace ─────────────────────────────────────────────
  // A ribbon: two vertices a sample, pushed apart across the line's own
  // direction, so the trace has a width that perspective can act on.
  const POINTS = dense ? 420 : 260;
  const tracePositions = new Float32Array(POINTS * 2 * 3);
  const traceSides = new Float32Array(POINTS * 2);
  const traceIndex: number[] = [];
  for (let i = 0; i < POINTS; i++) {
    traceSides[i * 2] = -1;
    traceSides[i * 2 + 1] = 1;
    if (i < POINTS - 1) {
      const a = i * 2;
      traceIndex.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const traceGeometry = new THREE.BufferGeometry();
  const tracePositionAttribute = new THREE.BufferAttribute(tracePositions, 3);
  tracePositionAttribute.setUsage(THREE.DynamicDrawUsage);
  traceGeometry.setAttribute('position', tracePositionAttribute);
  traceGeometry.setAttribute('aSide', new THREE.BufferAttribute(traceSides, 1));
  traceGeometry.setIndex(traceIndex);
  const traceMaterial = new THREE.ShaderMaterial({
    vertexShader: TRACE_VERTEX,
    fragmentShader: TRACE_FRAGMENT,
    uniforms: {
      uColor: { value: terrainMaterial.uniforms.uMid.value },
      uBrightness: { value: 1 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const trace = new THREE.Mesh(traceGeometry, traceMaterial);
  trace.frustumCulled = false;
  stage.scene.add(trace);
  const traceY = new Float32Array(POINTS);

  /** Lay the trace along the most recent samples. */
  const writeTrace = (live: SpectrogramOscilloscopeSettings, width: number) => {
    // A couple of periods of the first oscillator, ending on the start of
    // one of its cycles — a scope's trigger, which is what holds a waveform
    // still enough to be looked at.
    const period = SAMPLE_RATE / Math.max(20, live.vco1Frequency);
    const span = Math.max(160, Math.min(3000, period * 2.5));
    const sinceTrigger = (synth.carrierPhase % 1) * period;
    const thickness = 0.011 * live.waveformThickness;

    for (let i = 0; i < POINTS; i++) {
      const back = sinceTrigger + (1 - i / (POINTS - 1)) * span;
      const whole = Math.floor(back);
      const t = back - whole;
      const sample = synth.at(whole) * (1 - t) + synth.at(whole + 1) * t;
      traceY[i] = Math.max(-1.6, Math.min(1.6, sample)) * SCOPE_SWING;
    }
    const step = width / (POINTS - 1);
    for (let i = 0; i < POINTS; i++) {
      const x = -width / 2 + i * step;
      const y = SCOPE_LEVEL + traceY[i];
      // Across the line: the direction to the next sample, turned a quarter.
      const before = traceY[Math.max(0, i - 1)];
      const after = traceY[Math.min(POINTS - 1, i + 1)];
      const dx = step * 2;
      const dy = after - before;
      const length = Math.hypot(dx, dy) || 1;
      const nx = (-dy / length) * thickness;
      const ny = (dx / length) * thickness;
      const at = i * 6;
      tracePositions[at] = x - nx;
      tracePositions[at + 1] = y - ny;
      tracePositions[at + 2] = FRONT + SCOPE_AHEAD;
      tracePositions[at + 3] = x + nx;
      tracePositions[at + 4] = y + ny;
      tracePositions[at + 5] = FRONT + SCOPE_AHEAD;
    }
    tracePositionAttribute.needsUpdate = true;
  };

  // ── Measuring ────────────────────────────────────────────────────────────
  /** Measure the present and write it to the history's front row. */
  const measure = (
    live: SpectrogramOscilloscopeSettings,
    voicing: number
  ): void => {
    analyse(
      synth,
      live,
      magnitudes,
      live.analysisCycles,
      live.spectrogramSmoothing
    );
    const row = head * BINS;
    for (let b = 0; b < BINS; b++) {
      let magnitude = magnitudes[b];
      // The 404 sequence: the voice's partial at this frequency has the
      // amplitude the number gives it at this moment — which is what the
      // transform of an additive voice measures — and the synth is ducked
      // under it, as it is on the trace.
      if (voicing > 0) {
        const sung = voiceLevel((b + 0.5) / BINS, voiceRow) * SUNG_LEVEL;
        magnitude += (magnitude * 0.3 + sung - magnitude) * voicing;
      }
      const level = toLevel(magnitude);
      levels[b] = level;
      history[row + b] = Math.round(level * 255);
    }
  };

  /**
   * Fill the whole history at once: every ridge measured a ridge's worth of
   * signal after the one behind it. What a still is drawn from, since a
   * still has no time to fill one in.
   */
  const fillHistory = (
    live: SpectrogramOscilloscopeSettings,
    voicing: number
  ) => {
    const perRow = Math.max(
      1,
      Math.round(
        (UNITS_PER_SECOND * UNIT_SECONDS * SAMPLE_RATE) / ROWS_PER_SECOND
      )
    );
    for (let j = 0; j < ROWS; j++) {
      head = (head + 1) % ROWS;
      // The phrase, laid across the history as it would have been played:
      // its top row furthest back.
      voiceRow =
        voicing > 0
          ? (() => {
              const p = 1 - (ROWS - 1 - j) / PHRASE_ROWS;
              return p < 0 || p > 1 ? -1 : p;
            })()
          : -1;
      synth.render(perRow, live);
      measure(live, voicing);
    }
    spectrum.needsUpdate = true;
  };

  // ── The pointer ──────────────────────────────────────────────────────────
  const hit = new THREE.Vector3();
  let probeHertz = 0;
  let probeLevel = 0;

  /** Where along the frequency axis a point on screen falls, or null. */
  const acrossAt = (ndcX: number, ndcY: number, width: number) => {
    if (!stage.groundPoint(ndcX, ndcY, 0, hit)) return null;
    const across = hit.x / width + 0.5;
    if (across < 0.02 || across > 0.98) return null;
    if (hit.z > FRONT + 0.6 || hit.z < FRONT - DEPTH) return null;
    return across;
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  let reshapeTimer = 0;
  let stillDrawn: 'none' | 'plain' | 'number' = 'none';

  const update: SceneHandle['update'] = frame => {
    const live = settings();
    const on = notFound();
    const { dt } = frame;
    clock += dt;

    // The 404 sequence: the fader on the voice.
    const voicing = frame.frozen
      ? sequence.settle(on)
      : sequence.advance(dt, on);
    stage.reading = voicing;
    if (on && voiceStart === null) voiceStart = clock;
    else if (!on && !sequence.active) voiceStart = null;

    // The terrain is as wide as the screen when it is read from overhead,
    // and its own width otherwise.
    const width = WIDTH + (DEPTH * frame.aspect - WIDTH) * voicing;

    // The axis: where each partial of the voice sits, and what the shader
    // rules its octaves by.
    for (let k = 0; k < PARTIALS; k++) {
      partialHertz[k] = axisFrequency((k + 0.5) / PARTIALS, live);
    }

    if (frame.frozen) {
      // A still is the whole history, drawn once for whichever state it is
      // a still of.
      const want = on ? 'number' : 'plain';
      if (stillDrawn !== want) {
        fillHistory(live, voicing);
        stillDrawn = want;
      }
      frac = 0;
    } else {
      stillDrawn = 'none';

      // Samples are whole, so the fraction is banked: that is what makes a
      // speed below one slow the synth down instead of stopping it.
      sampleBank +=
        dt *
        live.globalTimeMultiplier *
        UNITS_PER_SECOND *
        UNIT_SECONDS *
        SAMPLE_RATE;
      const samples = Math.min(MAX_SAMPLES_PER_FRAME, Math.floor(sampleBank));
      sampleBank -= samples;

      voiceRow = voicing > 0 ? phraseAt(clock) : -1;
      if (voiceRow >= 0) {
        for (let k = 0; k < PARTIALS; k++) {
          partialLevel[k] = voiceLevel((k + 0.5) / PARTIALS, voiceRow);
        }
      }
      synth.render(
        samples,
        live,
        voicing > 0 ? voice : undefined,
        voicing * 0.7
      );

      // The waterfall. The present is always being measured into the front
      // row; when a ridge's worth of time has passed, the front row is left
      // where it is as history and the next one becomes the present.
      const rate =
        ROWS_PER_SECOND * live.timeScale * live.globalTimeMultiplier +
        (PHRASE_ROWS / PHRASE_SECONDS -
          ROWS_PER_SECOND * live.timeScale * live.globalTimeMultiplier) *
          voicing;
      frac += dt * rate;
      while (frac >= 1) {
        frac -= 1;
        const from = head * BINS;
        head = (head + 1) % ROWS;
        history.copyWithin(head * BINS, from, from + BINS);
      }
      measure(live, voicing);
      spectrum.needsUpdate = true;

      // The pointer: a frequency, ruled back through the history, and a
      // note put in by hand where it is tapped.
      const pointer = stage.pointer.state;
      const quiet = voicing > 0.5;
      for (const tap of stage.pointer.takeTaps()) {
        const across = quiet ? null : acrossAt(tap.x, tap.y, width);
        if (across !== null) synth.pluck(axisFrequency(across, live), 0.55);
      }
      const across =
        !quiet && pointer.present
          ? acrossAt(pointer.x, pointer.y, width)
          : null;
      const probe = terrainMaterial.uniforms.uProbe.value as THREE.Vector3;
      probe.y += ((across !== null ? 1 : 0) - probe.y) * 0.2;
      if (across !== null) {
        probe.x = across;
        probeHertz = axisFrequency(across, live);
        probeLevel = levels[Math.min(BINS - 1, Math.floor(across * BINS))];
      } else {
        probeHertz = 0;
      }
    }

    writeTrace(live, WIDTH);

    const arrive = frame.intro * frame.intro * (3 - 2 * frame.intro);
    const u = terrainMaterial.uniforms;
    u.uHead.value = head;
    u.uFrac.value = frac;
    u.uSize.value.set(width, HEIGHT * (0.2 + 0.8 * arrive), DEPTH);
    u.uBrightness.value = live.spectrogramBrightness;
    u.uStrength.value = arrive;
    u.uReading.value = voicing;
    const logarithmic = live.useLogScale > 0.5;
    u.uAxis.value.set(
      logarithmic ? 1 : 0,
      Math.log(Math.max(1, live.minLogFreq)),
      Math.log(Math.max(live.minLogFreq + 1, live.maxLogFreq)),
      0
    );
    (u.uLow.value as THREE.Color).setRGB(
      ...live.colors.background,
      THREE.SRGBColorSpace
    );
    (u.uMid.value as THREE.Color).setRGB(
      ...live.colors.primary,
      THREE.SRGBColorSpace
    );
    (u.uHigh.value as THREE.Color).setRGB(
      ...live.colors.secondary,
      THREE.SRGBColorSpace
    );
    (u.uPeak.value as THREE.Color).setRGB(
      ...live.colors.accent,
      THREE.SRGBColorSpace
    );
    (u.uGrid.value as THREE.Color).setRGB(
      ...live.colors.grid,
      THREE.SRGBColorSpace
    );
    // The trace is the present, and from overhead the present is an edge:
    // it stands down while the number is read.
    traceMaterial.uniforms.uBrightness.value =
      live.waveformBrightness * arrive * (1 - voicing);

    readout.write(frame.now, () => {
      if (probeHertz > 0) {
        const decibels = levelToDecibels(probeLevel);
        return `${Math.round(probeHertz)} hz · ${noteName(probeHertz)} · ${decibels.toFixed(0)} db`;
      }
      return `${Math.round(live.vco1Frequency)} hz · ${noteName(live.vco1Frequency)} · fm ${live.vco1FMAmount.toFixed(2)}`;
    });
  };

  const resize = () => {
    // The number is set to the screen's shape. A URL bar sliding away is
    // not a new shape, and rebuilding for it would make the number jump; a
    // real one is rebuilt for once it has settled.
    const size = { width: stage.width, height: stage.height };
    if (viewportReshaped(glyphSize, size)) {
      window.clearTimeout(reshapeTimer);
      reshapeTimer = window.setTimeout(() => {
        glyphSize = size;
        glyph = buildGlyph();
        stillDrawn = 'none';
        stage.requestFrame();
      }, RESHAPE_SETTLE_MS);
    }
  };

  return {
    update,
    resize,
    dispose() {
      window.clearTimeout(reshapeTimer);
      readout.clear();
      spectrum.dispose();
      terrainGeometry.dispose();
      terrainMaterial.dispose();
      traceGeometry.dispose();
      traceMaterial.dispose();
    },
  };
};

interface SpectrogramOscilloscopeBackgroundProps extends AnimatedBackgroundProps<SpectrogramOscilloscopeSettings> {
  onAudioControlsReady?: (
    startAudio: () => void,
    stopAudio: () => void,
    isPlaying: boolean
  ) => void;
}

const SpectrogramOscilloscopeBackground: React.FC<
  SpectrogramOscilloscopeBackgroundProps
> = props => {
  const { className, settings, onAudioControlsReady } = props;

  // Live view of the settings for the audio graph, which outlives the render
  // that created it.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Nothing here is structural: every setting is read by the loop each
  // frame, so no control rebuilds the scene.
  const containerRef = useStageScene(props, stageOptions, buildScene, []);

  // Web Audio API references
  const audioContextRef = useRef<AudioContext | null>(null);
  const vco1Ref = useRef<OscillatorNode | null>(null);
  const vco2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Create stable audio control functions using useCallback
  const stableStartAudio = useCallback(async () => {
    if (isPlayingRef.current) return;

    // Read through the ref so the audio graph is built from whatever the
    // controls say right now, without this callback's identity changing on
    // every edit.
    const settings = settingsRef.current;

    try {
      // Create audio context
      audioContextRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )();

      // Resume context if suspended (browser security)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Create oscillators
      vco1Ref.current = audioContextRef.current.createOscillator();
      vco2Ref.current = audioContextRef.current.createOscillator();

      // Set oscillator types
      const waveTypes = ['sine', 'square', 'triangle', 'sawtooth'] as const;
      vco1Ref.current.type = waveTypes[Math.floor(settings.vco1WaveformType)];
      vco2Ref.current.type = waveTypes[Math.floor(settings.vco2WaveformType)];

      // Set frequencies
      vco1Ref.current.frequency.value = settings.vco1Frequency;
      vco2Ref.current.frequency.value =
        settings.vco2Frequency * (1 + settings.detune);

      // Create gain nodes for mixing
      const vco1Gain = audioContextRef.current.createGain();
      const vco2Gain = audioContextRef.current.createGain();
      vco1Gain.gain.value = settings.vco1Amplitude * 0.3; // Scale for audible volume
      vco2Gain.gain.value = settings.vco2Amplitude * 0.3;

      // Create mixer
      const mixer = audioContextRef.current.createGain();
      mixer.gain.value = 0.7; // Overall volume control

      // Create filter
      filterNodeRef.current = audioContextRef.current.createBiquadFilter();
      const filterTypes = [
        'lowpass',
        'lowpass',
        'highpass',
        'bandpass',
      ] as const;
      filterNodeRef.current.type = filterTypes[Math.floor(settings.filterType)];
      filterNodeRef.current.frequency.value = settings.filterCutoff * 10000;
      filterNodeRef.current.Q.value = settings.filterResonance * 30;

      // Final gain for output
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0; // Start at 0, ramp up

      // Connect the audio graph
      vco1Ref.current.connect(vco1Gain);
      vco2Ref.current.connect(vco2Gain);
      vco1Gain.connect(mixer);
      vco2Gain.connect(mixer);

      let currentNode: AudioNode = mixer;

      // Filter
      if (settings.filterType > 0) {
        currentNode.connect(filterNodeRef.current);
        currentNode = filterNodeRef.current;
      }

      currentNode.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);

      // Start oscillators
      vco1Ref.current.start();
      vco2Ref.current.start();

      // Fade in - use linear ramp for more reliable fade
      gainNodeRef.current.gain.setValueAtTime(
        0.001,
        audioContextRef.current.currentTime
      );
      gainNodeRef.current.gain.linearRampToValueAtTime(
        0.4,
        audioContextRef.current.currentTime + 0.1
      );

      // Add FM modulation
      if (settings.vco1FMAmount > 0) {
        const lfo1 = audioContextRef.current.createOscillator();
        const lfo1Gain = audioContextRef.current.createGain();
        lfo1.frequency.value = settings.vco1FMFrequency;
        lfo1Gain.gain.value = settings.vco1FMAmount * 50;
        lfo1.connect(lfo1Gain);
        lfo1Gain.connect(vco1Ref.current.frequency);
        lfo1.start();
      }

      if (settings.vco2FMAmount > 0) {
        const lfo2 = audioContextRef.current.createOscillator();
        const lfo2Gain = audioContextRef.current.createGain();
        lfo2.frequency.value = settings.vco2FMFrequency;
        lfo2Gain.gain.value = settings.vco2FMAmount * 50;
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(vco2Ref.current.frequency);
        lfo2.start();
      }

      // Add filter LFO
      if (settings.filterLFOAmount > 0 && filterNodeRef.current) {
        const filterLFO = audioContextRef.current.createOscillator();
        const filterLFOGain = audioContextRef.current.createGain();
        filterLFO.frequency.value = settings.filterLFOSpeed;
        filterLFOGain.gain.value = settings.filterLFOAmount * 5000;
        filterLFO.connect(filterLFOGain);
        filterLFOGain.connect(filterNodeRef.current.frequency);
        filterLFO.start();
      }

      isPlayingRef.current = true;
    } catch (error) {
      // Audio playback failed - silently continue
      isPlayingRef.current = false;
    }
  }, []);

  const stableStopAudio = useCallback(() => {
    if (!isPlayingRef.current) return;

    try {
      // Fade out
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.linearRampToValueAtTime(
          0.001,
          audioContextRef.current.currentTime + 0.1
        );

        // Stop after fade
        setTimeout(() => {
          if (vco1Ref.current) {
            try {
              vco1Ref.current.stop();
            } catch (e) {
              // Already stopped
            }
            vco1Ref.current = null;
          }
          if (vco2Ref.current) {
            try {
              vco2Ref.current.stop();
            } catch (e) {
              // Already stopped
            }
            vco2Ref.current = null;
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }

          gainNodeRef.current = null;
          filterNodeRef.current = null;
          isPlayingRef.current = false;
        }, 150);
      }
    } catch (error) {
      // Audio stop failed - silently continue
    }
  }, []);

  // Hold P to hear it. A key typed into a field is text, and one with a
  // modifier held is the browser's: neither is this.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isShortcutKey(event)) return;
      if (event.key.toLowerCase() === 'p' && !event.repeat) stableStartAudio();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'p') stableStopAudio();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      // Whatever is sounding stops with the background that was making it.
      stableStopAudio();
    };
  }, [stableStartAudio, stableStopAudio]);

  // State for showing audio playback indicator
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Store the callback in a ref to avoid dependency issues
  const onAudioControlsReadyRef = useRef(onAudioControlsReady);
  onAudioControlsReadyRef.current = onAudioControlsReady;

  // Update the audio playback functions to set state - with proper dependencies
  React.useEffect(() => {
    let previousPlaying = false;

    // Monitor playing state for UI update and call parent callback when it changes
    const checkInterval = setInterval(() => {
      const currentPlaying = isPlayingRef.current;

      if (currentPlaying !== previousPlaying) {
        setIsPlaying(currentPlaying);

        // Call the parent callback when playing state actually changes
        if (onAudioControlsReadyRef.current) {
          onAudioControlsReadyRef.current(
            stableStartAudio,
            stableStopAudio,
            currentPlaying
          );
        }

        previousPlaying = currentPlaying;
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [stableStartAudio, stableStopAudio]); // Only depend on the stable functions

  // Call parent callback once on mount with initial state
  React.useEffect(() => {
    if (onAudioControlsReadyRef.current) {
      onAudioControlsReadyRef.current(stableStartAudio, stableStopAudio, false);
    }
  }, [stableStartAudio, stableStopAudio]); // Include stable audio functions

  return (
    <>
      <StageSurface
        ref={containerRef}
        className={className}
        opacity={settings.opacity}
      />
      {/* Bottom-centre of the field, above the `?` hint's line: the corners
          belong to the two pills. Styled with the rest of the backgrounds'
          chrome (.audio-indicator in animated-backgrounds.scss). */}
      {isPlaying && (
        <div className="audio-indicator" role="status">
          <span className="audio-indicator-dot" aria-hidden="true" />
          <span>audio playing</span>
        </div>
      )}
    </>
  );
};

export default SpectrogramOscilloscopeBackground;
