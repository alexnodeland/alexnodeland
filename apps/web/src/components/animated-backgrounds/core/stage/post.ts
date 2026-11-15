import * as THREE from 'three';

/**
 * What happens to a frame between the scene and the screen.
 *
 * The scenes draw in linear light and are allowed to be brighter than white:
 * a live cell, the crest of a wave and the node a search has just reached
 * are all sources, not surfaces, and the honest way to draw a source is to
 * let it exceed the display and have the excess spill. So the scene goes to a
 * half-float target first, and three things are done to it on the way out:
 *
 *   bloom   — the part of the picture above a threshold, blurred across a
 *             chain of halvings and added back. Wide and faint rather than
 *             tight and strong: it should read as light in air, not as a
 *             glow effect.
 *   grade   — exposure, a shoulder that rolls the highlights off instead of
 *             clipping them (so a saturated source goes pale at its core, as
 *             a real one does), a vignette that closes the corners where the
 *             rail's controls sit, and a canopy: the top of the picture,
 *             where the page keeps its title on the bare field, held down.
 *   grain   — a pixel of noise, which is what stops a near-black gradient
 *             from banding on an eight-bit display. Most of every field is a
 *             near-black gradient.
 *
 * It is its own small chain rather than three's EffectComposer: the bloom is
 * kept as a texture and added in the grade's one pass, so the multisampled
 * scene target is resolved once and never drawn back into.
 */

export interface BloomSettings {
  /** How much of the blurred light is added back. */
  strength: number;
  /** Linear luminance above which light starts to spill. */
  threshold: number;
  /** How gradually it starts, as a width around the threshold. */
  knee: number;
  /** 0 → 1: how much the wide end of the chain is favoured. */
  radius: number;
}

export interface GradeSettings {
  exposure: number;
  /** 0 → 1: how far the corners close. */
  vignette: number;
  /** 0 → 1: how far the top of the picture is held down under the title. */
  canopy: number;
  /** Peak-to-peak noise, in display units. */
  grain: number;
  /** 1 leaves saturation alone. */
  saturation: number;
  /** 1 leaves contrast alone. */
  contrast: number;
}

export const DEFAULT_BLOOM: BloomSettings = {
  strength: 0.55,
  threshold: 0.72,
  knee: 0.5,
  radius: 0.65,
};

export const DEFAULT_GRADE: GradeSettings = {
  exposure: 1.0,
  vignette: 0.32,
  canopy: 0.5,
  grain: 0.018,
  saturation: 1.04,
  contrast: 1.06,
};

const FULLSCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Thirteen taps over a 4×4 neighbourhood, weighted so that five overlapping
// 2×2 boxes are averaged: the downsample from Jimenez's 2014 SIGGRAPH course,
// which does not shimmer the way a plain box does when a small bright thing
// moves. The first level also keeps only what is above the threshold.
const DOWNSAMPLE_FRAGMENT = /* glsl */ `
  uniform sampler2D tSource;
  uniform vec2 uTexel;
  uniform float uPrefilter;
  uniform float uThreshold;
  uniform float uKnee;
  varying vec2 vUv;

  vec3 tap(vec2 offset) {
    return texture2D(tSource, vUv + uTexel * offset).rgb;
  }

  void main() {
    vec3 a = tap(vec2(-2.0,  2.0));
    vec3 b = tap(vec2( 0.0,  2.0));
    vec3 c = tap(vec2( 2.0,  2.0));
    vec3 d = tap(vec2(-2.0,  0.0));
    vec3 e = tap(vec2( 0.0,  0.0));
    vec3 f = tap(vec2( 2.0,  0.0));
    vec3 g = tap(vec2(-2.0, -2.0));
    vec3 h = tap(vec2( 0.0, -2.0));
    vec3 i = tap(vec2( 2.0, -2.0));
    vec3 j = tap(vec2(-1.0,  1.0));
    vec3 k = tap(vec2( 1.0,  1.0));
    vec3 l = tap(vec2(-1.0, -1.0));
    vec3 m = tap(vec2( 1.0, -1.0));

    vec3 color = e * 0.125
      + (a + c + g + i) * 0.03125
      + (b + d + f + h) * 0.0625
      + (j + k + l + m) * 0.125;

    if (uPrefilter > 0.5) {
      // A single runaway pixel must not become a screen-wide flare — and one
      // that is not a number at all (a shader that took the root of a
      // negative, somewhere) must not become anything.
      if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
      color = min(color, vec3(24.0));
      float brightness = max(color.r, max(color.g, color.b));
      float soft = clamp(brightness - uThreshold + uKnee, 0.0, 2.0 * uKnee);
      soft = soft * soft / (4.0 * uKnee + 1e-4);
      float contribution = max(soft, brightness - uThreshold) / max(brightness, 1e-4);
      color *= contribution;
    }

    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
  }
`;

// A 3×3 tent on the way back up, added onto the level it lands on.
const UPSAMPLE_FRAGMENT = /* glsl */ `
  uniform sampler2D tSource;
  uniform vec2 uTexel;
  uniform float uGain;
  varying vec2 vUv;

  void main() {
    vec2 t = uTexel;
    vec3 color = texture2D(tSource, vUv).rgb * 4.0;
    color += texture2D(tSource, vUv + vec2(-t.x, 0.0)).rgb * 2.0;
    color += texture2D(tSource, vUv + vec2( t.x, 0.0)).rgb * 2.0;
    color += texture2D(tSource, vUv + vec2(0.0, -t.y)).rgb * 2.0;
    color += texture2D(tSource, vUv + vec2(0.0,  t.y)).rgb * 2.0;
    color += texture2D(tSource, vUv + vec2(-t.x, -t.y)).rgb;
    color += texture2D(tSource, vUv + vec2( t.x, -t.y)).rgb;
    color += texture2D(tSource, vUv + vec2(-t.x,  t.y)).rgb;
    color += texture2D(tSource, vUv + vec2( t.x,  t.y)).rgb;
    gl_FragColor = vec4(color * (uGain / 16.0), 1.0);
  }
`;

const GRADE_FRAGMENT = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tBloom;
  uniform float uBloom;
  uniform float uExposure;
  uniform float uVignette;
  uniform float uCanopy;
  uniform float uGrain;
  uniform float uSaturation;
  uniform float uContrast;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  vec3 toDisplay(vec3 c) {
    return mix(
      c * 12.92,
      1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
      step(vec3(0.0031308), c)
    );
  }

  void main() {
    vec3 color = texture2D(tScene, vUv).rgb;
    if (any(isnan(color)) || any(isinf(color))) color = vec3(0.0);
    #ifdef USE_BLOOM
      color += texture2D(tBloom, vUv).rgb * uBloom;
    #endif

    // The corners close a little: wider than tall on a wide screen, so the
    // falloff follows the screen's own shape rather than drawing a circle.
    vec2 q = vUv - 0.5;
    q.x *= mix(1.0, uAspect, 0.35);
    float edge = smoothstep(0.35, 1.05, length(q) * 1.55);
    color *= 1.0 - uVignette * edge;

    // The canopy. The page's title and its tagline sit at the top of the
    // screen on the bare field, with nothing behind them but this picture,
    // and a halo on the letters only goes so far against a field that is
    // allowed to be brighter than white. So the picture itself gives way
    // there: it dims towards the top, in light, before the shoulder — which
    // reads as the scene receding rather than as a band laid over it.
    color *= 1.0 - uCanopy * smoothstep(0.4, 0.97, vUv.y);

    // The shoulder. Linear near black, so nothing in the shadows is crushed,
    // and asymptotic to white, per channel — which is what takes a saturated
    // source to a pale core as it gets brighter.
    color = 1.0 - exp(-color * uExposure);

    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, uSaturation);
    color = toDisplay(color);
    color = (color - 0.5) * uContrast + 0.5;

    // Grain, lighter in the highlights where it reads as dirt.
    float noise = hash(gl_FragCoord.xy + fract(uTime * 7.31) * vec2(173.3, 291.7)) - 0.5;
    color += noise * uGrain * (1.0 - 0.6 * luma);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

/** One oversized triangle: a fullscreen pass with no diagonal seam. */
const makeFullscreenGeometry = (): THREE.BufferGeometry => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
      3
    )
  );
  return geometry;
};

const makePass = (
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
  additive = false
): THREE.ShaderMaterial =>
  new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    transparent: additive,
    blending: additive ? THREE.CustomBlending : THREE.NoBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  });

export class PostChain {
  bloom: BloomSettings;
  grade: GradeSettings;
  /**
   * 0 → 1: how much of the canopy is lifted. The stage raises it when there
   * is no title to make room for — the page's content hidden, the 404's
   * number forming.
   */
  canopyLift = 0;

  /** The target scenes are drawn into: linear, half-float, multisampled. */
  readonly sceneTarget: THREE.WebGLRenderTarget;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly levels: number;
  private readonly mips: THREE.WebGLRenderTarget[] = [];
  private readonly geometry = makeFullscreenGeometry();
  private readonly quad: THREE.Mesh;
  private readonly quadScene = new THREE.Scene();
  private readonly quadCamera = new THREE.OrthographicCamera(
    -1,
    1,
    1,
    -1,
    0,
    1
  );
  private readonly downsample: THREE.ShaderMaterial;
  private readonly upsample: THREE.ShaderMaterial;
  private readonly gradePass: THREE.ShaderMaterial;
  private bloomEnabled: boolean;

  constructor(
    renderer: THREE.WebGLRenderer,
    options: {
      samples: number;
      levels: number;
      bloom: BloomSettings | false;
      grade: GradeSettings;
    }
  ) {
    this.renderer = renderer;
    // No bloom is no chain: not a level allocated, not a pass drawn, and
    // not a sample taken for it in the grade.
    this.bloomEnabled = options.bloom !== false && options.levels > 0;
    this.levels = this.bloomEnabled ? options.levels : 0;
    this.bloom = options.bloom === false ? DEFAULT_BLOOM : options.bloom;
    this.grade = options.grade;

    // Half-float where the device can draw to it, which is everything current.
    // Without it the picture is simply clamped at white before the bloom sees
    // it: flatter, never broken.
    const hdr =
      renderer.extensions.has('EXT_color_buffer_float') ||
      renderer.extensions.has('EXT_color_buffer_half_float');
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.sceneTarget = new THREE.WebGLRenderTarget(4, 4, {
      type,
      samples: options.samples,
      depthBuffer: true,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    for (let i = 0; i < this.levels; i++) {
      this.mips.push(
        new THREE.WebGLRenderTarget(2, 2, {
          type,
          depthBuffer: false,
          stencilBuffer: false,
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
        })
      );
    }

    this.downsample = makePass(DOWNSAMPLE_FRAGMENT, {
      tSource: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uPrefilter: { value: 0 },
      uThreshold: { value: 1 },
      uKnee: { value: 0.5 },
    });
    this.upsample = makePass(
      UPSAMPLE_FRAGMENT,
      {
        tSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uGain: { value: 1 },
      },
      true
    );
    this.gradePass = makePass(GRADE_FRAGMENT, {
      tScene: { value: this.sceneTarget.texture },
      tBloom: { value: this.mips[0]?.texture ?? null },
      uBloom: { value: 0 },
      uExposure: { value: 1 },
      uVignette: { value: 0 },
      uCanopy: { value: 0 },
      uGrain: { value: 0 },
      uSaturation: { value: 1 },
      uContrast: { value: 1 },
      uTime: { value: 0 },
      uAspect: { value: 1 },
    });

    if (this.bloomEnabled) this.gradePass.defines = { USE_BLOOM: '' };

    this.quad = new THREE.Mesh(this.geometry, this.gradePass);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }

  /** Size every target for a drawing buffer of `width` × `height` pixels. */
  setSize(width: number, height: number): void {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    this.sceneTarget.setSize(w, h);
    let mw = w;
    let mh = h;
    for (const mip of this.mips) {
      mw = Math.max(2, Math.round(mw / 2));
      mh = Math.max(2, Math.round(mh / 2));
      mip.setSize(mw, mh);
    }
    this.gradePass.uniforms.uAspect.value = w / h;
  }

  private draw(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget | null
  ): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  /** Draw `scene` through the chain to the screen. */
  render(scene: THREE.Scene, camera: THREE.Camera, time: number): void {
    const renderer = this.renderer;
    const autoClear = renderer.autoClear;

    renderer.autoClear = true;
    renderer.setRenderTarget(this.sceneTarget);
    renderer.render(scene, camera);

    if (this.bloomEnabled && this.bloom.strength > 0) {
      // Down: each level a half of the one before, the first one thresholded.
      let source: THREE.WebGLRenderTarget = this.sceneTarget;
      const down = this.downsample.uniforms;
      down.uThreshold.value = this.bloom.threshold;
      down.uKnee.value = Math.max(1e-3, this.bloom.knee);
      for (let i = 0; i < this.mips.length; i++) {
        down.tSource.value = source.texture;
        down.uTexel.value.set(1 / source.width, 1 / source.height);
        down.uPrefilter.value = i === 0 ? 1 : 0;
        this.draw(this.downsample, this.mips[i]);
        source = this.mips[i];
      }

      // And back up, each level added onto the next larger.
      renderer.autoClear = false;
      const up = this.upsample.uniforms;
      up.uGain.value = 0.55 + 0.6 * this.bloom.radius;
      for (let i = this.mips.length - 1; i > 0; i--) {
        const from = this.mips[i];
        up.tSource.value = from.texture;
        up.uTexel.value.set(1 / from.width, 1 / from.height);
        this.draw(this.upsample, this.mips[i - 1]);
      }
      renderer.autoClear = true;
    }

    const grade = this.gradePass.uniforms;
    grade.uBloom.value =
      this.bloomEnabled && this.bloom.strength > 0 ? this.bloom.strength : 0;
    grade.uExposure.value = this.grade.exposure;
    grade.uVignette.value = this.grade.vignette;
    grade.uCanopy.value =
      this.grade.canopy * (1 - Math.min(1, Math.max(0, this.canopyLift)));
    grade.uGrain.value = this.grade.grain;
    grade.uSaturation.value = this.grade.saturation;
    grade.uContrast.value = this.grade.contrast;
    grade.uTime.value = time;
    this.draw(this.gradePass, null);

    renderer.autoClear = autoClear;
  }

  dispose(): void {
    this.sceneTarget.dispose();
    this.mips.forEach(mip => mip.dispose());
    this.geometry.dispose();
    this.downsample.dispose();
    this.upsample.dispose();
    this.gradePass.dispose();
  }
}
