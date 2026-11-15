import React from 'react';
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
import { clamp01, smooth } from '../../core/stage/passage';
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
import { SimpleWaveSettings } from './config';

/**
 * Three sine waves, summed — and drawn as the surface that sum describes.
 *
 * The arithmetic is what it always was: one wave along x, one along y at
 * 0.8× the frequency, one on the diagonal at 0.6×, each drifting at its own
 * rate. It used to be painted flat, amplitude as colour. It is a sheet of
 * water now, seen from just above it, running out to a horizon: amplitude is
 * height as well as colour, and the pattern that was a wallpaper of blobs is
 * a swell with crests to it.
 *
 * Nothing is simulated. The surface's height at a point is a function of
 * where the point is and what time it is, so the vertex shader evaluates it
 * to place the sheet and the fragment shader evaluates it again — with its
 * derivative, which is the slope — to light it. The pointer adds terms to
 * the same sum: every ripple it leaves is one more wave, a ring this time,
 * superposed on the three.
 */

// The 404 sequence is an interference pattern: this many point sources,
// placed inside the number, each radiating a circular wave, summed. Near the
// sources the waves reinforce and the number reads; away from them their
// tails interfere into fringes and fade. Each source's wave is sin(k·d − ωt),
// which is sin(k·d)·cos(ωt) − cos(k·d)·sin(ωt): the whole field is two fixed
// pictures — the sines and the cosines, summed over the sources with their
// falloffs — turned against each other by the clock. So the two pictures are
// drawn once, by the GPU, into a texture this wide, and the surface samples
// it rather than summing every source at every point every frame. The
// wavelength is this many times the wave frequency setting's reciprocal:
// shorter than a stroke, so the rings fill the digits.
const SOURCE_COUNT = 128;
const GLYPH_COLS = 160;
const FIELD_WIDTH = 512;
const RINGS_PER_FREQUENCY = 6;
// How long the plane waves take to give way to the sources. Shorter than
// the default: the cycle gives each background twelve seconds on the 404,
// and the number should be up for most of them.
const FORM_SECONDS = 3;

export const FOV_DEGREES = 40;
const TAN_HALF_FOV = Math.tan((FOV_DEGREES * Math.PI) / 360);

// The sheet: how far it runs, and how finely it is cut. It is far larger
// than anything the fog lets through, so its edge is never in the picture.
const SHEET_WIDTH = 26;
const SHEET_DEPTH = 24;
const SHEET_CENTRE_Z = -9.5;
// Height of the surface per unit of summed amplitude.
const HEIGHT_SCALE = 0.105;
// How quickly distance takes the sheet into the ground: per world unit.
const FOG = 0.24;

// Ripples: the pointer's own waves. Each is a ring that leaves where the
// pointer was, travels outward at this speed and is gone after this long.
const RIPPLES = 10;
const RIPPLE_SPEED = 0.85;
const RIPPLE_LIFE = 3.2;
// A moving pointer leaves one this often, in world units of travel.
const RIPPLE_EVERY = 0.42;

// ── Coming on and going off ────────────────────────────────────────────────
// The water is there before the waves are, and after them. The swell comes
// on as a front spreading over still water from a point out in front of the
// viewer, with a crest riding its leading edge the way the first wave of a
// set does; it goes off the same way round — the sources fall silent, and
// the calm spreads out from the same point behind one last trough. Then the
// water's own light goes.
//
// The point both fronts spread from, on the ground plane (x, z): where the
// camera is looking, a little beyond it.
const FRONT_CENTRE: [number, number] = [0, -2.2];
// How far a front has to travel before everything the fog lets through is
// behind it. Past this the sheet is the horizon's own colour.
const FRONT_REACH = 19;
// How much water the swell takes to rise behind its front, and to settle
// behind the calm, in world units.
const SWELL_RISE = 2.6;
const CALM_FALL = 1.8;
// The radius that says "everywhere": a front that has long since passed.
const EVERYWHERE = 1e3;
// How high the wave on a front stands, as a fraction of the full sum.
const CREST = 0.8;
const TROUGH = 0.8;
// The fraction of a leaving the calm takes to reach the horizon, and the
// fraction after which the water's own light starts to go: by then the calm
// is past everything near enough to be seen moving.
const CALM_BY = 0.86;
const DARK_FROM = 0.58;
// The fraction of an arrival in which the still water comes up out of the
// dark, ahead of the swell.
const WATER_BY = 0.24;
// How a front's radius grows with its share of the time: slow off the mark
// and quick to the horizon. Most of the picture is the water nearest the
// viewer, and a front that crossed it at its average speed would be gone in
// a few frames.
const FRONT_PACE = 2.1;

export const INTRO_SECONDS = 2.2;

/**
 * What an arrival and a leaving ask of the sheet, as the numbers its shader
 * takes: how far the swell has spread, how far the calm has, the wave riding
 * whichever front is moving (signed, as a fraction of the full sum, with the
 * radius it is at), and how much of the water's light is up.
 *
 * Arrived and not leaving, these are "everywhere", "nowhere", no wave and
 * all of it — at which the shader's sum is the three sines and nothing else.
 */
export interface WavePassage {
  swell: number;
  calm: number;
  wave: number;
  waveAt: number;
  light: number;
}

export const passageOf = (intro: number, outro: number): WavePassage => {
  const coming = clamp01(intro);
  const going = clamp01(outro);

  // Arrived, the swell is everywhere.
  const swell =
    coming >= 1
      ? EVERYWHERE
      : (FRONT_REACH + SWELL_RISE) * Math.pow(coming, FRONT_PACE);

  // The calm crosses in the first part of a leaving, however long the
  // leaving is, and holds the water flat for the rest.
  const crossing = clamp01(going / CALM_BY);
  const calm =
    going <= 0
      ? -EVERYWHERE
      : (FRONT_REACH + CALM_FALL) * Math.pow(crossing, FRONT_PACE);

  // One wave, on whichever front is moving. It gathers as the front sets
  // out and is spent before the front has finished, so that neither end of
  // either movement has a wave standing in it.
  let wave = 0;
  let waveAt = 0;
  if (going > 0) {
    wave =
      -TROUGH * smooth(crossing / 0.2) * (1 - smooth((crossing - 0.7) / 0.3));
    // Behind the calm's own edge, on water that is already flat: a ring
    // following the swell out, not a hole dug in it.
    waveAt = calm - CALM_FALL;
  } else if (coming < 1) {
    wave = CREST * smooth(coming / 0.2) * (1 - smooth((coming - 0.7) / 0.3));
    waveAt = swell;
  }

  const light =
    smooth(coming / WATER_BY) *
    (1 - smooth((going - DARK_FROM) / (1 - DARK_FROM)));

  return { swell, calm, wave, waveAt, light };
};

/**
 * Where the camera rests: low over the water, looking along it. Low enough
 * that the horizon is in the picture — the sheet takes the lower two thirds
 * of the screen and runs out into the dark above it, which is where the
 * page's title sits.
 */
export const restPose = (aspect: number): Pose => ({
  target: [0, 0, -1.4],
  // A tall screen sees a narrow slice; stood further back, it sees more of
  // the swell than one crest.
  distance: aspect < 1 ? 4.4 : 3.5,
  azimuth: 0,
  // Set so the horizon falls just under the page's title: a phone's title
  // block is deeper, so its horizon sits lower.
  elevation: aspect < 1 ? 0.17 : 0.19,
  fov: FOV_DEGREES,
});

/** With the page out of the way: a little higher, to show the pattern. */
export const showPose = (aspect: number): Pose => ({
  target: [0, 0, -1.6],
  distance: aspect < 1 ? 5 : 4.2,
  azimuth: 0,
  elevation: 0.36,
  fov: FOV_DEGREES,
});

/**
 * Squared up for the number: straight overhead, at the height from which
 * the screen is exactly two units tall — the frame the sources were placed
 * in (see placeSources), so the number lands where it was set.
 */
export const readingPose = (): Pose => ({
  target: [0, 0, 0],
  distance: 1 / TAN_HALF_FOV,
  azimuth: 0,
  elevation: Math.PI / 2,
  fov: FOV_DEGREES,
});

const stageOptions = (): StageOptions => ({
  rig: {
    base: restPose,
    hidden: showPose,
    reading: readingPose,
    minElevation: 0.09,
    parallax: { azimuth: 0.06, elevation: 0.03, hiddenGain: 3.5 },
    scroll: { elevation: 0.05, distance: -0.04 },
  },
  // Long enough for the front to be watched across the water.
  introSeconds: INTRO_SECONDS,
  far: 80,
  bloom: { strength: 0.6, threshold: 0.7, knee: 0.6, radius: 0.75 },
  grade: { vignette: 0.34 },
});

// The sum itself, shared by the two shaders so that the sheet is placed and
// lit by the same function. `p` is a point on the ground plane, (x, z);
// the page's own axes are x across and y up the screen, and up the screen is
// away from the viewer, which is −z.
const FIELD = /* glsl */ `
  const int RIPPLES = ${RIPPLES};
  const float RIPPLE_SPEED = ${RIPPLE_SPEED.toFixed(3)};
  const float RIPPLE_LIFE = ${RIPPLE_LIFE.toFixed(3)};
  const float RIPPLE_K = 10.0;

  uniform float uPhase;
  uniform float uClock;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform vec4 uRipples[RIPPLES];
  uniform sampler2D uField;
  uniform float uNotFound;
  uniform float uAspect;
  // Coming on and going off (see passageOf): how far the swell has spread
  // from the centre and how far the calm has, and the wave riding the front
  // that is moving — its height in the sum's own units, and where it is.
  uniform vec2 uFronts;
  uniform vec2 uFrontWave;
  const vec2 FRONT_CENTRE = vec2(${FRONT_CENTRE[0].toFixed(2)}, ${FRONT_CENTRE[1].toFixed(2)});
  const float SWELL_RISE = ${SWELL_RISE.toFixed(2)};
  const float CALM_FALL = ${CALM_FALL.toFixed(2)};

  // The number's field at a point: the baked sines and cosines, turned
  // against each other by the clock. Zero outside the frame it was baked in.
  float sourced(vec2 q) {
    vec2 uv = vec2(q.x / uAspect, q.y) * 0.5 + 0.5;
    vec2 inside = smoothstep(vec2(0.0), vec2(0.04), uv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - uv);
    vec2 baked = texture2D(uField, clamp(uv, 0.0, 1.0)).rg * 2.0 - 1.0;
    float radial = baked.x * cos(uPhase * 4.0) - baked.y * sin(uPhase * 4.0);
    return radial * 1.6 * uAmplitude * inside.x * inside.y;
  }

  // The summed amplitude at a point, and its slope along x and z.
  float field(vec2 p, out vec2 slope) {
    vec2 q = vec2(p.x, -p.y);
    float f = uFrequency;
    float a1 = q.x * f + uPhase;
    float a2 = q.y * f * 0.8 + uPhase * 1.2;
    float a3 = (q.x + q.y) * f * 0.6 + uPhase * 0.8;

    float sum = sin(a1) + 0.7 * sin(a2) + 0.5 * sin(a3);
    float dx = f * cos(a1) + 0.3 * f * cos(a3);
    float dy = 0.56 * f * cos(a2) + 0.3 * f * cos(a3);
    sum *= uAmplitude;
    slope = vec2(dx, -dy) * uAmplitude;

    // The 404 sequence: the three plane waves give way to point sources
    // arranged as the number. Both fields exist while the fade runs — it is
    // the same superposition, reweighted.
    if (uNotFound > 0.0) {
      float e = 0.012;
      float here = sourced(q);
      vec2 slopeQ = vec2(sourced(q + vec2(e, 0.0)) - here, sourced(q + vec2(0.0, e)) - here) / e;
      sum = mix(sum, here, uNotFound);
      slope = mix(slope, vec2(slopeQ.x, -slopeQ.y), uNotFound);
    }

    // The pointer's ripples: each one more term, a ring travelling outward
    // from where it was left and thinning as it goes.
    for (int i = 0; i < RIPPLES; i++) {
      vec4 ripple = uRipples[i];
      float age = uClock - ripple.z;
      if (ripple.w <= 0.0 || age < 0.0 || age > RIPPLE_LIFE) continue;
      vec2 away = p - ripple.xy;
      float d = length(away) + 1e-4;
      float u = d - RIPPLE_SPEED * age;
      float width = 0.2 + 0.14 * age;
      float fade = 1.0 - smoothstep(RIPPLE_LIFE * 0.45, RIPPLE_LIFE, age);
      float envelope = ripple.w * fade * exp(-(u * u) / (width * width)) / (1.0 + d * 0.7);
      float wave = sin(RIPPLE_K * u);
      sum += envelope * wave;
      float along = envelope * (RIPPLE_K * cos(RIPPLE_K * u) - 2.0 * u / (width * width) * wave);
      slope += away / d * along;
    }

    // The swell is where its front has been and the calm's has not. With
    // both at rest this is one everywhere, and the sum is untouched.
    vec2 out_ = p - FRONT_CENTRE;
    float r = length(out_) + 1e-4;
    float present =
      (1.0 - smoothstep(uFronts.x - SWELL_RISE, uFronts.x, r)) *
      smoothstep(uFronts.y - CALM_FALL, uFronts.y, r);
    sum *= present;
    slope *= present;

    // And the wave on the front itself: a single ring, wider the further it
    // has run.
    if (uFrontWave.x != 0.0) {
      float u = r - uFrontWave.y;
      float width = 0.27 + 0.034 * uFrontWave.y;
      float ring = uFrontWave.x * exp(-(u * u) / (width * width));
      sum += ring;
      slope += out_ / r * (-2.0 * u / (width * width) * ring);
    }
    return sum;
  }
`;

const VERTEX = /* glsl */ `
  ${FIELD}
  uniform float uHeight;
  varying vec3 vWorld;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 slope;
    world.y += field(world.xz, slope) * uHeight;
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  ${FIELD}
  uniform float uHeight;
  uniform float uFull;
  uniform vec3 uPrimary;
  uniform vec3 uSecondary;
  uniform vec3 uAccent;
  uniform vec3 uBackground;
  uniform vec3 uGround;
  uniform vec3 uLight;
  uniform vec4 uProbe;
  uniform float uFog;
  uniform float uReach;
  uniform float uStrength;
  varying vec3 vWorld;

  float lineOn(float coord, float weight) {
    float rate = max(fwidth(coord), 1e-5);
    float crowd = 1.0 - smoothstep(0.3, 0.75, rate);
    return (1.0 - smoothstep(0.0, weight, abs(fract(coord - 0.5) - 0.5) / rate)) * crowd;
  }

  void main() {
    vec2 slope;
    float sum = field(vWorld.xz, slope);
    float s = clamp(sum / uFull, -1.0, 1.0);
    float magnitude = abs(s);

    // Colour maps the amplitude, as it always did: the background where the
    // components cancel, the primary where they partly do, and out to the
    // accent on a crest and the secondary in a trough.
    vec3 extreme = s > 0.0 ? uAccent : uSecondary;
    vec3 hue = mix(uPrimary, extreme, smoothstep(0.28, 0.92, magnitude));
    float energy = smoothstep(0.0, 0.42, magnitude);

    vec3 n = normalize(vec3(-slope.x * uHeight, 1.0, -slope.y * uHeight));
    vec3 toEye = cameraPosition - vWorld;
    float distance = length(toEye);
    vec3 v = toEye / distance;

    // Lit from low ahead of the viewer, so the face of each swell that
    // turns toward the horizon is the bright one.
    float diffuse = max(dot(n, uLight), 0.0);
    float sheen = pow(1.0 - max(dot(n, v), 0.0), 5.0);

    // The water itself is dark: a body in the primary, lit from low ahead.
    // The colour is in the lines — contours of equal amplitude, in the
    // accent toward a crest and the secondary toward a trough — and only
    // the very top of a crest is bright enough to be a light.
    vec3 color = mix(uBackground, uPrimary * 0.2, energy) * (0.3 + 0.95 * diffuse);
    color += uAccent * pow(smoothstep(0.52, 1.0, s), 2.0) * 1.2;
    color += uSecondary * pow(smoothstep(0.5, 1.0, -s), 2.0) * 0.26;
    // No contours where the sum is all but zero: a line there follows
    // nothing but the last bit of the arithmetic.
    color += hue * lineOn(s * 7.0, 1.2) * (0.14 + 0.9 * magnitude)
      * smoothstep(0.03, 0.12, magnitude);
    color += mix(uPrimary, vec3(0.75, 0.8, 1.0), 0.5) * sheen * 0.3;

    // The pointer's mark: a ring on the water where its ray lands.
    float fromProbe = length(vWorld.xz - uProbe.xy);
    float ringRate = max(fwidth(fromProbe), 1e-5);
    float ring = 1.0 - smoothstep(0.0, 1.5, abs(fromProbe - uProbe.z) / ringRate);
    color += vec3(0.86, 0.92, 1.0) * ring * 0.65 * uProbe.w;

    // Distance takes the sheet into the ground it is drawn on, by way of a
    // faint band of the primary where the water meets the dark: a horizon
    // rather than an edge.
    float haze = 1.0 - exp(-distance * uFog);
    haze = max(haze, smoothstep(uReach * 0.55, uReach, distance) * step(1e-4, uFog));
    vec3 horizon = uGround + uPrimary * 0.05 * smoothstep(0.6, 1.0, haze);
    color = mix(color, horizon, haze);

    // Unlit, the sheet is the ground it lies on rather than a black one.
    gl_FragColor = vec4(mix(uGround, color, uStrength), 1.0);
  }
`;

const buildScene = ({
  stage,
  settings,
  notFound,
}: SceneContext<SimpleWaveSettings>): SceneHandle => {
  const renderer = stage.renderer;
  const dense = stage.quality.tier === 'high';

  // ── The number's sources ─────────────────────────────────────────────────
  // In the frame the page used to be drawn in: x across by the aspect, y
  // −1 → 1 up, sampled evenly inside the number. Placed again when the
  // viewport changes shape, since the number is set to it.
  const sources = new Float32Array(SOURCE_COUNT * 2);
  let sourceCount = 0;
  let glyphSize = { width: stage.width, height: stage.height };
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
    sourceVectors.forEach((v, i) => v.set(sources[i * 2], sources[i * 2 + 1]));

  // The baked field. Drawn again when the sources move or the wavelength
  // setting changes, and only while the sequence is up.
  const fieldHeight = () =>
    Math.max(
      32,
      Math.round((FIELD_WIDTH * glyphSize.height) / glyphSize.width)
    );
  // Half-float where the device can draw to it: at eight bits the field is a
  // staircase of 255 steps, and the contours drawn from it follow the steps.
  const smooth =
    renderer.extensions.has('EXT_color_buffer_float') ||
    renderer.extensions.has('EXT_color_buffer_half_float');
  const baked = new THREE.WebGLRenderTarget(FIELD_WIDTH, fieldHeight(), {
    type: smooth ? THREE.HalfFloatType : THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const bakeScene = new THREE.Scene();
  const bakeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uSources: { value: sourceVectors },
      uSourceCount: { value: sourceCount },
      uK: { value: 0 },
      uAspect: { value: glyphSize.width / glyphSize.height },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      const int SOURCE_COUNT = ${SOURCE_COUNT};
      uniform vec2 uSources[SOURCE_COUNT];
      uniform int uSourceCount;
      uniform float uK;
      uniform float uAspect;
      varying vec2 vUv;

      void main() {
        // The same coordinates the sources were placed in: x across by the
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
    depthTest: false,
    depthWrite: false,
  });
  const bakeGeometry = new THREE.PlaneGeometry(2, 2);
  bakeScene.add(new THREE.Mesh(bakeGeometry, bakeMaterial));
  let bakedK = NaN;
  let fieldStale = true;
  const bake = (k: number) => {
    bakeMaterial.uniforms.uK.value = k;
    bakeMaterial.uniforms.uSourceCount.value = sourceCount;
    bakeMaterial.uniforms.uAspect.value = glyphSize.width / glyphSize.height;
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(baked);
    renderer.render(bakeScene, bakeCamera);
    renderer.setRenderTarget(previous);
    bakedK = k;
    fieldStale = false;
  };

  // ── The sheet ────────────────────────────────────────────────────────────
  const live0 = settings();
  // How finely the sheet is cut: fine enough on a desktop that a crest is
  // round, coarser on a phone, and coarser again where there is no graphics
  // hardware and every vertex is the processor's.
  const segments = stage.quality.software ? 120 : dense ? 420 : 200;
  const geometry = new THREE.PlaneGeometry(
    SHEET_WIDTH,
    SHEET_DEPTH,
    segments,
    segments
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, SHEET_CENTRE_Z);

  const ripples = Array.from(
    { length: RIPPLES },
    () => new THREE.Vector4(0, 0, -100, 0)
  );
  let nextRipple = 0;

  const asColor = (rgb: [number, number, number]) =>
    new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uPhase: { value: 0 },
      uClock: { value: 0 },
      uFrequency: { value: live0.waveFrequency },
      uAmplitude: { value: 0 },
      uRipples: { value: ripples },
      uField: { value: baked.texture },
      uNotFound: { value: 0 },
      uAspect: { value: stage.aspect },
      uFronts: { value: new THREE.Vector2(0, -EVERYWHERE) },
      uFrontWave: { value: new THREE.Vector2(0, 0) },
      uHeight: { value: HEIGHT_SCALE },
      uFull: { value: 1 },
      uPrimary: { value: asColor(live0.colors.primary) },
      uSecondary: { value: asColor(live0.colors.secondary) },
      uAccent: { value: asColor(live0.colors.accent) },
      uBackground: { value: asColor(live0.colors.background) },
      uGround: { value: new THREE.Color(STAGE_GROUND) },
      uLight: { value: new THREE.Vector3(-0.25, 0.42, -0.87).normalize() },
      uProbe: { value: new THREE.Vector4(0, 0, 0.16, 0) },
      uFog: { value: FOG },
      // Past this the sheet is the horizon's own colour, whatever the fog
      // has left of it: the far edge is never a line.
      uReach: { value: 15 },
      uStrength: { value: 0 },
    },
  });
  const sheet = new THREE.Mesh(geometry, material);
  sheet.frustumCulled = false;
  stage.scene.add(sheet);

  // The air over the water. Distance takes the sheet to a haze of its own
  // colour, and a haze that stopped dead at the sheet's far edge would be a
  // wall: so the same colour is hung behind it, brightest along the level
  // line of sight and gone a few degrees above it. It is what makes the far
  // edge a horizon.
  const skyGeometry = new THREE.PlaneGeometry(400, 120);
  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uGround;
      uniform vec3 uPrimary;
      uniform float uStrength;
      varying vec3 vWorld;
      void main() {
        float rise = normalize(vWorld - cameraPosition).y;
        float glow = exp(-max(rise, 0.0) * 13.0);
        gl_FragColor = vec4(uGround + uPrimary * 0.05 * glow * uStrength, 1.0);
      }
    `,
    uniforms: {
      uGround: { value: new THREE.Color(STAGE_GROUND) },
      uPrimary: { value: material.uniforms.uPrimary.value },
      uStrength: { value: 0 },
    },
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.position.set(0, 20, SHEET_CENTRE_Z - SHEET_DEPTH / 2 - 6);
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  stage.scene.add(sky);

  // ── The pointer ──────────────────────────────────────────────────────────
  const hit = new THREE.Vector3();
  let lastDrop: { x: number; z: number } | null = null;
  let clock = 0;

  const onSheet = (x: number, z: number) =>
    Math.abs(x) < SHEET_WIDTH / 2 - 1 &&
    z > SHEET_CENTRE_Z - SHEET_DEPTH / 2 + 1 &&
    z < SHEET_CENTRE_Z + SHEET_DEPTH / 2;

  const drop = (x: number, z: number, strength: number) => {
    ripples[nextRipple].set(x, z, clock, strength);
    nextRipple = (nextRipple + 1) % RIPPLES;
  };

  const applyPointer = (reading: number) => {
    const pointer = stage.pointer.state;
    const probe = material.uniforms.uProbe.value as THREE.Vector4;
    const quiet = reading > 0.5;

    for (const tap of stage.pointer.takeTaps()) {
      if (quiet) continue;
      if (stage.groundPoint(tap.x, tap.y, 0, hit) && onSheet(hit.x, hit.z)) {
        drop(hit.x, hit.z, 0.8);
      }
    }

    const landed =
      !quiet &&
      pointer.present &&
      stage.groundPoint(pointer.x, pointer.y, 0, hit) &&
      onSheet(hit.x, hit.z);
    probe.w += ((landed ? 1 : 0) - probe.w) * 0.18;
    if (!landed) {
      lastDrop = null;
      return;
    }
    probe.x = hit.x;
    probe.y = hit.z;
    probe.z = pointer.pressed ? 0.24 : 0.15;
    if (!lastDrop) {
      lastDrop = { x: hit.x, z: hit.z };
      return;
    }
    if (Math.hypot(hit.x - lastDrop.x, hit.z - lastDrop.z) >= RIPPLE_EVERY) {
      drop(hit.x, hit.z, pointer.pressed ? 0.46 : 0.2);
      lastDrop = { x: hit.x, z: hit.z };
    }
  };

  // ── The frame ────────────────────────────────────────────────────────────
  const readout = createReadout();
  // Phase is integrated rather than computed as time × speed, so changing
  // the speed changes the rate from here on instead of jumping the wave.
  let phase = 0;
  let reshapeTimer = 0;

  const update: SceneHandle['update'] = frame => {
    const live = settings();
    const on = notFound();
    const { dt } = frame;
    phase += dt * live.globalTimeMultiplier;
    clock += dt;

    // A frozen frame tells the whole story at once; a live one advances it.
    const progress = frame.frozen
      ? sequence.settle(on)
      : sequence.advance(dt, on);
    stage.reading = progress;

    // The field is drawn once per shape and wavelength, the first time it
    // is needed.
    const k = live.waveFrequency * RINGS_PER_FREQUENCY;
    if (progress > 0 && (fieldStale || k !== bakedK)) bake(k);

    if (!frame.frozen) applyPointer(progress);

    const passage = passageOf(frame.intro, frame.outro);
    const u = material.uniforms;
    u.uPhase.value = phase;
    u.uClock.value = clock;
    u.uNotFound.value = progress;
    u.uFrequency.value = live.waveFrequency;
    u.uAmplitude.value = live.waveAmplitude;
    // The three components reach 2.2 between them when they all agree; the
    // number's sources, normalised where they crowd, reach about 1.3.
    const full = Math.max(
      0.05,
      live.waveAmplitude * (2.2 + (1.3 - 2.2) * progress)
    );
    u.uFull.value = full;
    u.uAspect.value = glyphSize.width / glyphSize.height;
    // Flat water first, then the swell across it; and at the other end the
    // calm across it, then the water's light.
    (u.uFronts.value as THREE.Vector2).set(passage.swell, passage.calm);
    (u.uFrontWave.value as THREE.Vector2).set(
      passage.wave * full,
      passage.waveAt
    );
    u.uStrength.value = passage.light;
    skyMaterial.uniforms.uStrength.value = passage.light * (1 - progress);
    // The number is read from overhead, where there is no distance to haze.
    u.uFog.value = FOG * (1 - progress);
    (u.uPrimary.value as THREE.Color).setRGB(
      ...live.colors.primary,
      THREE.SRGBColorSpace
    );
    (u.uSecondary.value as THREE.Color).setRGB(
      ...live.colors.secondary,
      THREE.SRGBColorSpace
    );
    (u.uAccent.value as THREE.Color).setRGB(
      ...live.colors.accent,
      THREE.SRGBColorSpace
    );
    (u.uBackground.value as THREE.Color).setRGB(
      ...live.colors.background,
      THREE.SRGBColorSpace
    );

    readout.write(frame.now, () => {
      let rings = 0;
      for (const ripple of ripples) {
        if (ripple.w > 0 && clock - ripple.z < RIPPLE_LIFE) rings += 1;
      }
      const base = `3 waves · k ${live.waveFrequency.toFixed(1)}`;
      return rings > 0 ? `${base} · ${rings} ripples` : base;
    });
  };

  const resize = () => {
    // The sources are set to the viewport's shape. A URL bar sliding away
    // is not a new shape, and placing them again for it would make the
    // number jump; a real one has them placed again once it has settled.
    const size = { width: stage.width, height: stage.height };
    if (viewportReshaped(glyphSize, size)) {
      window.clearTimeout(reshapeTimer);
      reshapeTimer = window.setTimeout(() => {
        glyphSize = size;
        placeSources();
        syncSourceVectors();
        baked.setSize(FIELD_WIDTH, fieldHeight());
        fieldStale = true;
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
      baked.dispose();
      bakeGeometry.dispose();
      bakeMaterial.dispose();
      geometry.dispose();
      material.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
    },
  };
};

const SimpleWaveBackground: React.FC<
  AnimatedBackgroundProps<SimpleWaveSettings>
> = props => {
  const { className, settings } = props;
  // Nothing here is structural: every setting is a uniform the loop
  // refreshes each frame.
  const containerRef = useStageScene(props, stageOptions, buildScene, []);

  return (
    <StageSurface
      ref={containerRef}
      className={className}
      opacity={settings.opacity}
    />
  );
};

export default SimpleWaveBackground;
