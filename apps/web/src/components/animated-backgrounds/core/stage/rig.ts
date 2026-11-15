import type * as THREE from 'three';

/**
 * The camera, and everything that moves it.
 *
 * A scene says where its camera rests and nothing else. What the camera then
 * does is the same on every field, which is a good part of why six different
 * simulations read as one place:
 *
 *   it leans toward the pointer   — a few degrees, eased. The scene shifts
 *                                   behind glass that does not, and that
 *                                   disagreement is the depth.
 *   it drifts                     — a slow breath, so a still reader is not
 *                                   looking at a still picture.
 *   it follows the page           — the window's scroll tips it forward, and
 *                                   each page of the site stands a little
 *                                   further round, so a navigation is a move
 *                                   through the scene rather than a cut.
 *   it steps back for the chrome  — with the content hidden there is nothing
 *                                   to compose around, so it takes the pose
 *                                   that shows the simulation off, and the
 *                                   pointer swings it much further.
 *   it squares up for the 404     — a number has to be read, so the camera
 *                                   comes round to face it and holds still.
 *
 * Poses are spherical about a target: a distance, an azimuth about the
 * vertical (0 looks down −z) and an elevation above the horizon (π/2 looks
 * straight down). The maths is kept free of three so it can be tested as
 * arithmetic.
 */

export interface Pose {
  target: [number, number, number];
  distance: number;
  azimuth: number;
  elevation: number;
  /** Vertical field of view, in degrees. */
  fov: number;
}

/** A pose that depends on the viewport's shape: a phone is not a desktop. */
export type PoseFor = (aspect: number) => Pose;

export interface RigConfig {
  base: PoseFor;
  /** With the page content hidden. Defaults to the base pose. */
  hidden?: PoseFor;
  /** Squared up to read the 404. Defaults to the base pose. */
  reading?: PoseFor;
  /** How far the pointer leans the camera, in radians at the screen's edge;
   * `hiddenGain` multiplies both once the chrome is out of the way. */
  parallax?: { azimuth: number; elevation: number; hiddenGain: number };
  /** The idle breath: radians of sway, over this many seconds. */
  drift?: { azimuth: number; elevation: number; period: number };
  /** What a full band of window scroll adds: radians of elevation, and a
   * fraction of the distance (negative moves in). */
  scroll?: { elevation: number; distance: number };
  /** What the arrival starts from: a fraction further out, radians higher. */
  intro?: { distance: number; elevation: number };
  /** Whether each page of the site stands the camera a little further round. */
  page?: boolean;
  minElevation?: number;
  maxElevation?: number;
}

export interface RigInputs {
  aspect: number;
  /** Seconds since the scene began, for the drift. */
  time: number;
  /** Seconds since the last frame; 0 snaps every ease to its end. */
  dt: number;
  pointerX: number;
  pointerY: number;
  pointerPresent: boolean;
  /** Whether the page content is hidden. */
  hidden: boolean;
  /** 0 → 1 as the 404 sequence forms. */
  reading: number;
  /** 0 → 1 across the first band of the window's scroll. */
  scroll: number;
  /** 0 → 1 as the scene arrives. */
  intro: number;
  pathname: string;
}

const DEFAULTS = {
  parallax: { azimuth: 0.07, elevation: 0.045, hiddenGain: 4 },
  drift: { azimuth: 0.035, elevation: 0.012, period: 46 },
  scroll: { elevation: 0.07, distance: -0.05 },
  intro: { distance: 0.22, elevation: 0.1 },
  minElevation: 0.04,
  maxElevation: Math.PI / 2,
};

// Where each page stands, as an offset from the scene's rest: radians of
// azimuth and of elevation. Small on purpose — the composition is the
// scene's, and a page only turns it. A path not listed (a post, the 404)
// takes the timeline's, being reached from it.
const PAGE_OFFSETS: Array<[RegExp, [number, number]]> = [
  [/^\/$/, [0, 0]],
  [/^\/timeline/, [0.12, 0.025]],
  [/^\/projects/, [-0.12, 0.01]],
  [/^\/apps/, [-0.2, 0.04]],
  [/^\/cv/, [0.2, 0.035]],
  [/^\/consulting/, [0.06, -0.02]],
  [/^\/vocab/, [-0.06, -0.02]],
];

export const pageOffset = (pathname: string): [number, number] => {
  for (const [pattern, offset] of PAGE_OFFSETS) {
    if (pattern.test(pathname)) return offset;
  }
  return [0.12, 0.025];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The shorter way round from one angle to another. */
export const lerpAngle = (a: number, b: number, t: number): number => {
  const turn = Math.PI * 2;
  let delta = (b - a) % turn;
  if (delta > Math.PI) delta -= turn;
  if (delta < -Math.PI) delta += turn;
  return a + delta * t;
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  target: [
    lerp(a.target[0], b.target[0], t),
    lerp(a.target[1], b.target[1], t),
    lerp(a.target[2], b.target[2], t),
  ],
  distance: lerp(a.distance, b.distance, t),
  azimuth: lerpAngle(a.azimuth, b.azimuth, t),
  elevation: lerp(a.elevation, b.elevation, t),
  fov: lerp(a.fov, b.fov, t),
});

/** Where a pose puts the camera. */
export const posePosition = (pose: Pose): [number, number, number] => {
  const ce = Math.cos(pose.elevation);
  return [
    pose.target[0] + pose.distance * Math.sin(pose.azimuth) * ce,
    pose.target[1] + pose.distance * Math.sin(pose.elevation),
    pose.target[2] + pose.distance * Math.cos(pose.azimuth) * ce,
  ];
};

/**
 * Which way is up on screen for a pose: the direction the camera would move
 * if its elevation rose. Unlike a fixed world "up" it is defined all the way
 * to straight overhead, where it is simply "away from the viewer along the
 * ground" — so a camera can swing from an oblique view to a plan view
 * without the picture spinning as it crosses the pole.
 */
export const poseUp = (pose: Pose): [number, number, number] => {
  const se = Math.sin(pose.elevation);
  return [
    -Math.sin(pose.azimuth) * se,
    Math.cos(pose.elevation),
    -Math.cos(pose.azimuth) * se,
  ];
};

/** 1 − e^(−dt/τ): how far an ease with time constant τ gets in dt. */
export const easeTowards = (dt: number, tau: number): number =>
  dt <= 0 ? 1 : 1 - Math.exp(-dt / tau);

const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export class CameraRig {
  config: RigConfig;
  /** The pose the last update arrived at. */
  pose: Pose;

  // Eased inputs. Each has its own time constant: the pointer is quick, a
  // page turn is a glide, and the chrome coming or going is in between.
  private pointerX = 0;
  private pointerY = 0;
  private hiddenMix = 0;
  private scroll = 0;
  private pageAzimuth = 0;
  private pageElevation = 0;
  private started = false;

  constructor(config: RigConfig) {
    this.config = config;
    this.pose = config.base(1);
  }

  update(inputs: RigInputs): Pose {
    const config = this.config;
    const parallax = config.parallax ?? DEFAULTS.parallax;
    const drift = config.drift ?? DEFAULTS.drift;
    const scroll = config.scroll ?? DEFAULTS.scroll;
    const intro = config.intro ?? DEFAULTS.intro;

    // The first frame lands where it should rather than easing in from zero:
    // an arrival is the intro's to choreograph, not the smoothing's.
    const dt = this.started ? inputs.dt : 0;
    this.started = true;

    const [pageAz, pageEl] =
      config.page === false ? [0, 0] : pageOffset(inputs.pathname);

    const pointerEase = easeTowards(dt, 0.4);
    const wantX = inputs.pointerPresent ? inputs.pointerX : 0;
    const wantY = inputs.pointerPresent ? inputs.pointerY : 0;
    this.pointerX += (wantX - this.pointerX) * pointerEase;
    this.pointerY += (wantY - this.pointerY) * pointerEase;
    this.hiddenMix +=
      ((inputs.hidden ? 1 : 0) - this.hiddenMix) * easeTowards(dt, 0.55);
    this.scroll += (inputs.scroll - this.scroll) * easeTowards(dt, 0.25);
    const pageEase = easeTowards(dt, 0.9);
    this.pageAzimuth += (pageAz - this.pageAzimuth) * pageEase;
    this.pageElevation += (pageEl - this.pageElevation) * pageEase;

    const hiddenMix = smootherstep(this.hiddenMix);
    const reading = smootherstep(Math.min(1, Math.max(0, inputs.reading)));

    let pose = config.base(inputs.aspect);
    if (config.hidden && hiddenMix > 0) {
      pose = lerpPose(pose, config.hidden(inputs.aspect), hiddenMix);
    }

    // Everything that moves the camera for the sake of feel stands down as
    // the number forms: a 404 is read, and the camera holds still for it.
    const free = 1 - reading;
    const gain = 1 + (parallax.hiddenGain - 1) * hiddenMix;
    const phase = (inputs.time / drift.period) * Math.PI * 2;
    // With the content hidden the page has no say: there is no window to
    // scroll and no page being read.
    const paged = 1 - hiddenMix;

    const azimuth =
      pose.azimuth +
      free *
        (this.pointerX * parallax.azimuth * gain +
          Math.sin(phase) * drift.azimuth +
          this.pageAzimuth * paged);
    let elevation =
      pose.elevation +
      free *
        (-this.pointerY * parallax.elevation * gain +
          Math.sin(phase * 0.71 + 1.3) * drift.elevation +
          (this.scroll * scroll.elevation + this.pageElevation) * paged);

    const arriving = 1 - smootherstep(Math.min(1, Math.max(0, inputs.intro)));
    elevation += arriving * intro.elevation * free;
    const distance =
      pose.distance *
      (1 + arriving * intro.distance) *
      (1 + this.scroll * scroll.distance * paged * free);

    pose = { ...pose, azimuth, elevation, distance };

    if (config.reading && reading > 0) {
      pose = lerpPose(pose, config.reading(inputs.aspect), reading);
    }

    pose.elevation = Math.min(
      config.maxElevation ?? DEFAULTS.maxElevation,
      Math.max(config.minElevation ?? DEFAULTS.minElevation, pose.elevation)
    );

    this.pose = pose;
    return pose;
  }

  /** Write the current pose onto a camera. */
  apply(camera: THREE.PerspectiveCamera, aspect: number): void {
    const pose = this.pose;
    const [x, y, z] = posePosition(pose);
    const [ux, uy, uz] = poseUp(pose);
    camera.position.set(x, y, z);
    camera.up.set(ux, uy, uz);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    if (camera.fov !== pose.fov || camera.aspect !== aspect) {
      camera.fov = pose.fov;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }
}

/**
 * The distance at which a camera with this field of view sees `halfHeight`
 * world units above and below its target — what turns "the plate should
 * fill four fifths of the screen" into a number.
 */
export const distanceToFit = (halfHeight: number, fovDegrees: number): number =>
  halfHeight / Math.tan((fovDegrees * Math.PI) / 360);
