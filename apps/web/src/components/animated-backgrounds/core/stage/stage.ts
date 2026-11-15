import * as THREE from 'three';
import { acquirePointer, PointerHandle, PointerState } from './pointer';
import {
  BloomSettings,
  DEFAULT_BLOOM,
  DEFAULT_GRADE,
  GradeSettings,
  PostChain,
} from './post';
import { Governor, governorEnabled, Quality, resolveQuality } from './quality';
import { CameraRig, RigConfig } from './rig';

/**
 * The stage: the one way a background gets a picture onto the field.
 *
 * Each of the six used to stand up its own renderer, its own resize
 * handling, its own frame loop and its own idea of what a pointer was. They
 * are the same six simulations; what they share now is everything around
 * the simulation. A scene builds its objects into `scene`, says where its
 * camera rests, and is called once a frame. The stage owns the rest: the
 * renderer and the chain a frame goes through on its way out (see post.ts),
 * the camera's behaviour (rig.ts), the pointer (pointer.ts), how much
 * picture the device is asked for (quality.ts), and the two ways a loop is
 * allowed to stop — a still for a reader who asked for less motion, and a
 * lost context.
 */

/** `--bg-stage`: the ground every field is composited onto. */
export const STAGE_GROUND = 0x07080a;

// The mark on the body while the page content is hidden (the H key, or the
// phone's explore mode). Set by MobileInteractivity on every viewport.
const HIDDEN_CLASS = 'mobile-explore-active';

// How much of the window's scroll counts as "all the way" for the camera: a
// little past the band the hero folds across, at every width.
const SCROLL_REACH_PX = 520;

export interface StageOptions {
  rig: RigConfig;
  near?: number;
  far?: number;
  bloom?: Partial<BloomSettings> | false;
  grade?: Partial<GradeSettings>;
  /** How long a scene takes to arrive, in seconds. */
  introSeconds?: number;
}

export interface Frame {
  /** Seconds since the last frame, clamped; 0 on a still. */
  dt: number;
  /** Seconds this scene has been running. */
  time: number;
  /** `performance.now()` for this frame. */
  now: number;
  /** 0 → 1, linear, as the scene arrives. 1 from the start on a still. */
  intro: number;
  /** One frame, drawn settled, and then nothing: reduced motion. */
  frozen: boolean;
  /** Whether the page content is hidden, leaving the field bare. */
  hidden: boolean;
  width: number;
  height: number;
  aspect: number;
  pointer: Readonly<PointerState>;
}

export interface Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly rig: CameraRig;
  readonly pointer: PointerHandle;
  readonly quality: Quality;
  readonly post: PostChain;
  /** How far the 404 has formed, 0 → 1: the camera squares up by this much. */
  reading: number;
  readonly width: number;
  readonly height: number;
  readonly aspect: number;
  /** Device pixels per CSS pixel the scene is being drawn at right now. */
  readonly pixelRatio: number;
  /**
   * Begin drawing. `update` runs once a frame, before the frame is drawn;
   * `resize` after the viewport changes.
   */
  start(update: (frame: Frame) => void, resize?: () => void): void;
  setFrozen(frozen: boolean): void;
  /** Draw one more frame — for a still whose inputs have changed. */
  requestFrame(): void;
  /**
   * Where the ray through a point on screen (NDC) meets the horizontal plane
   * at `height`. False when it never does: the ray runs level, or away.
   */
  groundPoint(
    ndcX: number,
    ndcY: number,
    height: number,
    out: THREE.Vector3
  ): boolean;
  /** The ray through a point on screen, from the camera. */
  ray(
    ndcX: number,
    ndcY: number,
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): void;
  dispose(): void;
}

export const createStage = (
  container: HTMLElement,
  options: StageOptions
): Stage => {
  const quality = resolveQuality();

  // The drawing buffer itself is only ever the last pass's destination: the
  // scene has its own multisampled, depth-buffered target (see post.ts), so
  // the canvas needs neither.
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(new THREE.Color(STAGE_GROUND), 1);
  const canvas = renderer.domElement;
  // A block, so no line box's worth of descender sits under it. Its size is
  // three's to write, in the viewport's own pixels (see applySize): the
  // container is 100vh tall, which on a phone is the screen with the toolbar
  // put away, and a canvas stretched to that would be drawn taller than the
  // buffer it shows.
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    40,
    1,
    options.near ?? 0.05,
    options.far ?? 200
  );
  const rig = new CameraRig(options.rig);
  const pointer = acquirePointer();

  const post = new PostChain(renderer, {
    samples: quality.samples,
    levels: quality.bloomLevels,
    bloom:
      options.bloom === false ? false : { ...DEFAULT_BLOOM, ...options.bloom },
    grade: { ...DEFAULT_GRADE, ...options.grade },
  });

  const governor = governorEnabled() ? new Governor() : null;
  const introSeconds = options.introSeconds ?? 1.6;

  let width = 1;
  let height = 1;
  let pixelRatio = quality.pixelRatio;
  const buffer = new THREE.Vector2();

  const applySize = () => {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    pixelRatio = quality.pixelRatio * (governor?.scale ?? 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    renderer.getDrawingBufferSize(buffer);
    post.setSize(buffer.x, buffer.y);
  };
  applySize();

  let update: ((frame: Frame) => void) | null = null;
  let onResize: (() => void) | null = null;
  let raf = 0;
  let last = 0;
  let frozen = false;
  let disposed = false;
  let lost = false;
  let ready = false;
  let scrollTop = 0;

  const frame: Frame = {
    dt: 0,
    time: 0,
    now: 0,
    intro: 0,
    frozen: false,
    hidden: false,
    width,
    height,
    aspect: width / height,
    pointer: pointer.state,
  };

  const stage: Stage = {
    renderer,
    scene,
    camera,
    rig,
    pointer,
    quality,
    post,
    reading: 0,
    get width() {
      return width;
    },
    get height() {
      return height;
    },
    get aspect() {
      return width / height;
    },
    get pixelRatio() {
      return pixelRatio;
    },
    start(nextUpdate, nextResize) {
      update = nextUpdate;
      onResize = nextResize ?? null;
      // Shaders are compiled before the first frame is asked for, off the
      // main thread where the driver can: a scene's first frame otherwise
      // blocks for as long as its slowest program takes to link. Compiled
      // against the scene's own target, since what a program is depends on
      // what it is drawing into.
      const begin = () => {
        if (disposed) return;
        ready = true;
        stage.requestFrame();
      };
      renderer.setRenderTarget(post.sceneTarget);
      const compiling =
        typeof renderer.compileAsync === 'function'
          ? renderer.compileAsync(scene, camera)
          : null;
      renderer.setRenderTarget(null);
      if (compiling) compiling.then(begin, begin);
      else begin();
    },
    setFrozen(next) {
      if (frozen === next) return;
      frozen = next;
      // A hold being lifted picks the clock up from now, not from when it
      // was put down.
      last = 0;
      stage.requestFrame();
    },
    requestFrame() {
      if (!ready || disposed || lost || raf) return;
      raf = requestAnimationFrame(tick);
    },
    ray(ndcX, ndcY, origin, direction) {
      origin.copy(camera.position);
      direction.set(ndcX, ndcY, 0.5).unproject(camera).sub(origin).normalize();
    },
    groundPoint(ndcX, ndcY, groundHeight, out) {
      stage.ray(ndcX, ndcY, rayOrigin, rayDirection);
      if (Math.abs(rayDirection.y) < 1e-6) return false;
      const t = (groundHeight - rayOrigin.y) / rayDirection.y;
      if (!(t > 0) || !Number.isFinite(t)) return false;
      out.copy(rayOrigin).addScaledVector(rayDirection, t);
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('scroll', handleScroll, true);
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
      pointer.release();
      post.dispose();
      renderer.dispose();
      // dispose() releases three's own objects but leaves the GL context
      // alive until the canvas is collected, and the backgrounds cycle: left
      // to the collector, a session walks past the browser's cap on live
      // contexts and the newest field comes up blank.
      renderer.forceContextLoss();
      if (canvas.parentNode === container) container.removeChild(canvas);
    },
  };

  const rayOrigin = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();

  function tick(now: number) {
    raf = 0;
    if (disposed || lost || !update) return;

    const elapsed = last ? now - last : 0;
    last = now;
    // Clamped, so a tab coming back from the background plays one long
    // frame rather than the whole time it was away.
    const dt = frozen ? 0 : Math.min(elapsed / 1000, 0.1);

    frame.dt = dt;
    frame.now = now;
    frame.time += dt;
    frame.intro = frozen ? 1 : Math.min(1, frame.intro + dt / introSeconds);
    frame.frozen = frozen;
    frame.hidden = document.body.classList.contains(HIDDEN_CLASS);
    frame.width = width;
    frame.height = height;
    frame.aspect = width / height;

    rig.update({
      aspect: frame.aspect,
      time: frame.time,
      dt: frozen ? 0 : dt,
      pointerX: pointer.state.x,
      pointerY: pointer.state.y,
      // A still does not lean: it was asked to hold.
      pointerPresent: pointer.state.present && !frozen,
      hidden: frame.hidden,
      reading: stage.reading,
      scroll: Math.min(1, Math.max(0, scrollTop / SCROLL_REACH_PX)),
      intro: frame.intro,
      pathname: window.location.pathname,
    });
    rig.apply(camera, frame.aspect);

    // The canopy comes off when there is no title for it to make room for:
    // the page's content is hidden and the field has the screen, or the 404
    // is forming its number across the middle of it.
    const lift = Math.max(frame.hidden ? 1 : 0, stage.reading);
    post.canopyLift = frozen
      ? lift
      : post.canopyLift + (lift - post.canopyLift) * (1 - Math.exp(-dt * 3.2));

    try {
      update(frame);
      post.render(scene, camera, frame.time);
    } catch (error) {
      // A background is decoration. One that fails mid-flight stops, with a
      // note for whoever is looking; it does not take the page with it.
      console.warn('The background stopped:', error);
      update = null;
      return;
    }

    if (frozen) return;

    if (governor && elapsed > 0) {
      const scale = governor.sample(elapsed);
      if (scale !== null) applySize();
    }
    raf = requestAnimationFrame(tick);
  }

  // At most once a frame: a phone's URL bar sliding in and out fires resize
  // over and over through a single flick, and every one of those would
  // reallocate the whole chain mid-scroll.
  let resizeFrame = 0;
  const handleResize = () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (disposed) return;
      applySize();
      onResize?.();
      stage.requestFrame();
    });
  };

  // Scroll events do not bubble, but they can be caught on the way down. The
  // window's scroller is the only one the camera answers.
  const handleScroll = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.classList.contains('layout'))
      scrollTop = target.scrollTop;
  };

  const handleLost = (event: Event) => {
    // Without this the browser is free never to give the context back.
    event.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const handleRestored = () => {
    if (disposed) return;
    lost = false;
    last = 0;
    applySize();
    stage.requestFrame();
  };

  window.addEventListener('resize', handleResize);
  document.addEventListener('scroll', handleScroll, {
    capture: true,
    passive: true,
  });
  canvas.addEventListener('webglcontextlost', handleLost);
  canvas.addEventListener('webglcontextrestored', handleRestored);
  scrollTop = document.querySelector<HTMLElement>('.layout')?.scrollTop ?? 0;

  return stage;
};
