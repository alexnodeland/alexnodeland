import * as THREE from 'three';
import {
  coverDistance,
  FOV_DEGREES,
  PLANE_SIZE,
  readingPose,
  restPose,
  showPose,
} from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';
import {
  CameraRig,
  Pose,
} from '../../../../../../components/animated-backgrounds/core/stage/rig';

const HALF = PLANE_SIZE / 2;

// A real camera stood where a pose says, so the questions below are asked of
// the projection the scene will actually be drawn with.
const cameraAt = (pose: Pose, aspect: number): THREE.PerspectiveCamera => {
  const camera = new THREE.PerspectiveCamera(pose.fov, aspect, 0.05, 200);
  const rig = new CameraRig({ base: () => pose });
  rig.pose = pose;
  rig.apply(camera, aspect);
  return camera;
};

/** Where the ray through a point on screen lands on the plate's plane. */
const landing = (
  camera: THREE.PerspectiveCamera,
  x: number,
  y: number
): THREE.Vector3 | null => {
  const origin = camera.position.clone();
  const direction = new THREE.Vector3(x, y, 0.5)
    .unproject(camera)
    .sub(origin)
    .normalize();
  if (direction.y >= -1e-9) return null;
  return origin.addScaledVector(direction, -origin.y / direction.y);
};

/** How far from the plate's centre the furthest corner of the screen lands. */
const cornerReach = (pose: Pose, aspect: number): number => {
  const camera = cameraAt(pose, aspect);
  let reach = 0;
  for (const [x, y] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const hit = landing(camera, x, y);
    if (!hit) return Infinity;
    reach = Math.max(reach, Math.hypot(hit.x, hit.z));
  }
  return reach;
};

const phones: Array<[string, number, number]> = [
  ['iPhone SE', 320, 568],
  ['iPhone 12/13/14', 390, 844],
  ['Pixel 7', 412, 915],
  ['a folding phone’s cover', 280, 653],
  ['absurdly tall', 320, 1600],
];

describe('PDE solver framing', () => {
  describe('the distance that covers the view', () => {
    it.each([
      ['a phone', 390 / 844, 0.9],
      ['a tablet upright', 820 / 1180, 0.9],
      ['a square', 1, 0.9],
      ['a desktop', 16 / 9, 0.9],
      ['a lower camera', 16 / 9, 0.6],
      ['straight overhead', 390 / 844, Math.PI / 2],
    ])(
      'puts the furthest corner of %s on the plate’s inscribed circle',
      (_name, aspect, elevation) => {
        const pose: Pose = {
          target: [0, 0, 0],
          distance: coverDistance(aspect, elevation),
          azimuth: 0,
          elevation,
          fov: FOV_DEGREES,
        };
        // Exactly on it: any closer wastes plate, any further shows its edge
        // at some angle of the spin.
        expect(cornerReach(pose, aspect)).toBeCloseTo(HALF, 5);
      }
    );

    it('is nowhere when a corner of the view is above the horizon', () => {
      // No distance covers a view that looks past the plate's plane.
      expect(coverDistance(1, 0.1)).toBe(0);
    });

    it('closes in as the screen gets taller or the camera lower', () => {
      expect(coverDistance(0.4)).toBeGreaterThan(coverDistance(1));
      expect(coverDistance(1)).toBeGreaterThan(coverDistance(2));
      expect(coverDistance(1, 1.2)).toBeGreaterThan(coverDistance(1, 0.7));
    });
  });

  describe('at rest', () => {
    it.each(phones)('covers the corners on %s', (_name, width, height) => {
      const aspect = width / height;
      // The plate spins, so what is guaranteed to be under any point of the
      // screen is its inscribed circle.
      expect(cornerReach(restPose(aspect), aspect)).toBeLessThanOrEqual(
        HALF + 1e-6
      );
    });

    it.each([
      ['a laptop', 1440, 900],
      ['a desktop', 1920, 1080],
      ['an ultrawide', 2560, 1080],
    ])('is an object with its edges in view on %s', (_name, width, height) => {
      const aspect = width / height;
      const camera = cameraAt(restPose(aspect), aspect);
      // The plate's side edge, on the line through its centre: inside the
      // screen, and outside the window that sits over the middle of it.
      const edge = new THREE.Vector3(HALF, 0, 0).project(camera);
      expect(edge.x).toBeLessThan(1);
      expect(edge.x).toBeGreaterThan(0.8);
    });

    it('moves between the two without a jump', () => {
      let last = restPose(0.6).distance;
      for (let aspect = 0.61; aspect <= 1.6; aspect += 0.01) {
        const distance = restPose(aspect).distance;
        expect(Math.abs(distance - last)).toBeLessThan(0.12);
        last = distance;
      }
    });
  });

  describe('with the page out of the way', () => {
    it.each([
      ['a laptop', 1440 / 900],
      ['a desktop', 1920 / 1080],
      ['a phone', 390 / 844],
    ])('stands back far enough to take the plate in on %s', (_name, aspect) => {
      const camera = cameraAt(showPose(aspect), aspect);
      // The corners sweep a circle as the plate turns; the widest point of
      // that circle, on the line through the centre, is inside the screen.
      const corner = new THREE.Vector3(HALF * Math.SQRT2, 0, 0).project(camera);
      expect(Math.abs(corner.x)).toBeLessThan(1);
    });

    it('is lower than the rest pose, so the relief reads', () => {
      expect(showPose(1.6).elevation).toBeLessThan(restPose(1.6).elevation);
    });
  });

  describe('squared up for the number', () => {
    it('looks straight down', () => {
      for (const aspect of [0.46, 1, 1.78]) {
        expect(readingPose(aspect).elevation).toBeCloseTo(Math.PI / 2);
        expect(readingPose(aspect).azimuth).toBe(0);
      }
    });

    it('fits the plate across a wide screen with a little to spare', () => {
      const aspect = 16 / 9;
      const camera = cameraAt(readingPose(aspect), aspect);
      const edge = new THREE.Vector3(HALF, 0, 0).project(camera);
      expect(edge.x).toBeLessThan(1);
      expect(edge.x).toBeGreaterThan(0.85);
    });

    it.each(phones)(
      'covers the corners on %s, where the number is set to that width',
      (_name, width, height) => {
        const aspect = width / height;
        expect(cornerReach(readingPose(aspect), aspect)).toBeCloseTo(HALF, 5);
      }
    );
  });
});
