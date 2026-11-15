import {
  CameraRig,
  distanceToFit,
  easeTowards,
  lerpAngle,
  lerpPose,
  pageOffset,
  Pose,
  posePosition,
  poseUp,
  RigConfig,
  RigInputs,
} from '../../../../../../components/animated-backgrounds/core/stage/rig';

const base: Pose = {
  target: [0, 0, 0],
  distance: 10,
  azimuth: 0.2,
  elevation: 0.5,
  fov: 36,
};

// Everything that moves the camera for feel, switched off: what is left is
// the one thing a test is asking about.
const still: Partial<RigConfig> = {
  drift: { azimuth: 0, elevation: 0, period: 1 },
  intro: { distance: 0, elevation: 0, azimuth: 0 },
  page: false,
};

const inputs = (over: Partial<RigInputs> = {}): RigInputs => ({
  aspect: 16 / 9,
  time: 0,
  dt: 0,
  pointerX: 0,
  pointerY: 0,
  pointerPresent: false,
  hidden: false,
  reading: 0,
  scroll: 0,
  intro: 1,
  pathname: '/',
  ...over,
});

// Long enough for every ease in the rig to have arrived.
const settle = (rig: CameraRig, over: Partial<RigInputs>) => {
  rig.update(inputs(over));
  return rig.update(inputs({ ...over, dt: 60 }));
};

describe('the camera rig', () => {
  describe('the arithmetic under it', () => {
    it('stands the home page at the rest pose and every other page off it', () => {
      expect(pageOffset('/')).toEqual([0, 0]);
      const pages = ['/timeline/', '/projects/', '/apps/', '/cv/'];
      const seen = new Set(pages.map(page => pageOffset(page).join()));
      expect(seen.size).toBe(pages.length);
      expect(seen.has('0,0')).toBe(false);
    });

    it('gives a page it does not know the timeline standing, not the cover', () => {
      // A post is reached from the timeline, and so is the 404.
      expect(pageOffset('/timeline/some-post/')).toEqual(
        pageOffset('/timeline/')
      );
      expect(pageOffset('/nowhere')).toEqual(pageOffset('/timeline/'));
    });

    it('turns the short way round', () => {
      // From just short of a half turn one way to just short of it the
      // other is a few tenths of a radian, not the six the numbers suggest.
      const halfway = lerpAngle(3, -3, 0.5);
      expect(Math.abs(halfway)).toBeGreaterThan(3);
      expect(lerpAngle(0.1, 0.3, 0.5)).toBeCloseTo(0.2);
    });

    it('puts the camera on a sphere about its target', () => {
      const level = posePosition({ ...base, azimuth: 0, elevation: 0 });
      expect(level[0]).toBeCloseTo(0);
      expect(level[1]).toBeCloseTo(0);
      expect(level[2]).toBeCloseTo(10);

      const overhead = posePosition({
        ...base,
        target: [1, 2, 3],
        elevation: Math.PI / 2,
      });
      expect(overhead[0]).toBeCloseTo(1);
      expect(overhead[1]).toBeCloseTo(12);
      expect(overhead[2]).toBeCloseTo(3);
    });

    it('knows which way is up straight overhead, where a world up does not', () => {
      const up = poseUp({ ...base, azimuth: 0, elevation: Math.PI / 2 });
      // Away from the viewer along the ground: the far edge is the top.
      expect(up[0]).toBeCloseTo(0);
      expect(up[1]).toBeCloseTo(0);
      expect(up[2]).toBeCloseTo(-1);

      // And it is always at right angles to the line of sight.
      for (const elevation of [0.1, 0.7, 1.3, Math.PI / 2]) {
        const pose = { ...base, azimuth: 0.9, elevation };
        const [x, y, z] = posePosition(pose);
        const [ux, uy, uz] = poseUp(pose);
        expect(x * ux + y * uy + z * uz).toBeCloseTo(0);
      }
    });

    it('eases by time constant, and snaps when no time has passed', () => {
      expect(easeTowards(0, 0.4)).toBe(1);
      expect(easeTowards(0.4, 0.4)).toBeCloseTo(1 - 1 / Math.E);
      expect(easeTowards(100, 0.4)).toBeCloseTo(1);
    });

    it('blends two poses field by field', () => {
      const other: Pose = { ...base, distance: 20, elevation: 1.5, fov: 40 };
      const mid = lerpPose(base, other, 0.5);
      expect(mid.distance).toBeCloseTo(15);
      expect(mid.elevation).toBeCloseTo(1);
      expect(mid.fov).toBeCloseTo(38);
    });

    it('finds the distance at which a height fills the view', () => {
      const distance = distanceToFit(2, 40);
      expect(distance * Math.tan((20 * Math.PI) / 180)).toBeCloseTo(2);
    });
  });

  describe('what it does to a pose', () => {
    it('lands on the rest pose on its first frame rather than easing to it', () => {
      const rig = new CameraRig({ ...still, base: () => base });
      const pose = rig.update(inputs({ dt: 0.016 }));
      expect(pose.azimuth).toBeCloseTo(base.azimuth);
      expect(pose.elevation).toBeCloseTo(base.elevation);
      expect(pose.distance).toBeCloseTo(base.distance);
    });

    it('leans toward the pointer, and comes back when it leaves', () => {
      const rig = new CameraRig({
        ...still,
        base: () => base,
        parallax: { azimuth: 0.1, elevation: 0.05, hiddenGain: 4 },
      });
      const leaning = settle(rig, {
        pointerX: 1,
        pointerY: 1,
        pointerPresent: true,
      });
      expect(leaning.azimuth).toBeCloseTo(base.azimuth + 0.1);
      // The pointer going up the screen looks further over the top.
      expect(leaning.elevation).toBeCloseTo(base.elevation - 0.05);

      const back = rig.update(inputs({ dt: 60 }));
      expect(back.azimuth).toBeCloseTo(base.azimuth);
      expect(back.elevation).toBeCloseTo(base.elevation);
    });

    it('takes the show pose, and swings further, with the content hidden', () => {
      const hidden: Pose = { ...base, distance: 6, elevation: 0.9 };
      const rig = new CameraRig({
        ...still,
        base: () => base,
        hidden: () => hidden,
        parallax: { azimuth: 0.1, elevation: 0, hiddenGain: 4 },
      });
      const shown = settle(rig, { hidden: true });
      expect(shown.distance).toBeCloseTo(hidden.distance);
      expect(shown.elevation).toBeCloseTo(hidden.elevation);

      const swung = rig.update(
        inputs({ hidden: true, pointerX: 1, pointerPresent: true, dt: 60 })
      );
      expect(swung.azimuth).toBeCloseTo(hidden.azimuth + 0.4);
    });

    it('squares up to read the number and holds still for it', () => {
      const reading: Pose = {
        ...base,
        azimuth: 0,
        elevation: Math.PI / 2,
        distance: 3,
      };
      const rig = new CameraRig({
        ...still,
        base: () => base,
        reading: () => reading,
        drift: { azimuth: 0.2, elevation: 0.2, period: 10 },
      });
      // A pointer in the corner, a page scrolled and the breath mid-swing:
      // none of it reaches the camera once the number has formed.
      const pose = settle(rig, {
        reading: 1,
        pointerX: 1,
        pointerY: -1,
        pointerPresent: true,
        scroll: 1,
        time: 2.5,
      });
      expect(pose.azimuth).toBeCloseTo(reading.azimuth);
      expect(pose.elevation).toBeCloseTo(reading.elevation);
      expect(pose.distance).toBeCloseTo(reading.distance);
    });

    it('tips forward and moves in as the window scrolls', () => {
      const rig = new CameraRig({
        ...still,
        base: () => base,
        scroll: { elevation: 0.1, distance: -0.2 },
      });
      const pose = settle(rig, { scroll: 1 });
      expect(pose.elevation).toBeCloseTo(base.elevation + 0.1);
      expect(pose.distance).toBeCloseTo(base.distance * 0.8);
    });

    it('arrives from further out and higher up', () => {
      const rig = new CameraRig({
        ...still,
        base: () => base,
        intro: { distance: 0.5, elevation: 0.2 },
      });
      const start = rig.update(inputs({ intro: 0 }));
      expect(start.distance).toBeCloseTo(base.distance * 1.5);
      expect(start.elevation).toBeCloseTo(base.elevation + 0.2);
      const end = rig.update(inputs({ intro: 1, dt: 0.016 }));
      expect(end.distance).toBeCloseTo(base.distance);
    });

    it('never goes under the floor or over the top', () => {
      const rig = new CameraRig({
        ...still,
        base: () => ({ ...base, elevation: 0.05 }),
        parallax: { azimuth: 0, elevation: 1, hiddenGain: 1 },
        minElevation: 0.04,
        maxElevation: 1,
      });
      const low = settle(rig, { pointerY: 1, pointerPresent: true });
      expect(low.elevation).toBe(0.04);
      const high = rig.update(
        inputs({ pointerY: -1, pointerPresent: true, dt: 60 })
      );
      expect(high.elevation).toBe(1);
    });

    it('stands each page a little further round, eased', () => {
      const rig = new CameraRig({
        base: () => base,
        drift: { azimuth: 0, elevation: 0, period: 1 },
        intro: { distance: 0, elevation: 0 },
      });
      const home = settle(rig, { pathname: '/' });
      const [azimuth, elevation] = pageOffset('/cv/');
      const turning = rig.update(inputs({ pathname: '/cv/', dt: 0.1 }));
      const turned = rig.update(inputs({ pathname: '/cv/', dt: 60 }));
      expect(turned.azimuth).toBeCloseTo(home.azimuth + azimuth);
      expect(turned.elevation).toBeCloseTo(home.elevation + elevation);
      // A navigation is a move through the scene, not a cut.
      expect(turning.azimuth).toBeGreaterThan(home.azimuth);
      expect(turning.azimuth).toBeLessThan(turned.azimuth);
    });
  });
  describe('coming on and going off', () => {
    const config: RigConfig = {
      base: () => base,
      drift: { azimuth: 0, elevation: 0, period: 1 },
      page: false,
    };

    it('arrives from the side, further out and higher, and settles at rest', () => {
      const rig = new CameraRig(config);
      const start = rig.update(inputs({ intro: 0, arrivedHeading: 1 }));
      expect(start.azimuth).toBeLessThan(base.azimuth - 0.2);
      expect(start.distance).toBeGreaterThan(base.distance);
      expect(start.elevation).toBeGreaterThan(base.elevation);

      const rest = rig.update(inputs({ intro: 1, arrivedHeading: 1 }));
      expect(rest.azimuth).toBeCloseTo(base.azimuth);
      expect(rest.distance).toBeCloseTo(base.distance);
      expect(rest.elevation).toBeCloseTo(base.elevation);
    });

    it('arrives from the other side when the set is being walked backwards', () => {
      const rig = new CameraRig(config);
      const start = rig.update(inputs({ intro: 0, arrivedHeading: -1 }));
      expect(start.azimuth).toBeGreaterThan(base.azimuth + 0.2);
    });

    it('swings on the way it was going as the scene leaves', () => {
      const rig = new CameraRig(config);
      const azimuths = [0, 0.25, 0.5, 0.75, 1].map(
        outro => rig.update(inputs({ outro, heading: 1 })).azimuth
      );
      for (let i = 1; i < azimuths.length; i++) {
        expect(azimuths[i]).toBeGreaterThan(azimuths[i - 1]);
      }
      // Forward, the arrival turned the same way to get to rest.
      const arriving = new CameraRig(config);
      const from = arriving.update(inputs({ intro: 0, arrivedHeading: 1 }));
      expect(Math.sign(azimuths[4] - base.azimuth)).toBe(
        Math.sign(base.azimuth - from.azimuth)
      );
    });

    it('lets go slowly: most of the swing is in the second half', () => {
      const rig = new CameraRig(config);
      const half = rig.update(inputs({ outro: 0.5, heading: 1 })).azimuth;
      const whole = rig.update(inputs({ outro: 1, heading: 1 })).azimuth;
      expect(half - base.azimuth).toBeLessThan((whole - base.azimuth) * 0.3);
    });

    it('pulls back and up on the way out', () => {
      const rig = new CameraRig(config);
      const gone = rig.update(inputs({ outro: 1, heading: -1 }));
      expect(gone.azimuth).toBeLessThan(base.azimuth - 0.2);
      expect(gone.distance).toBeGreaterThan(base.distance);
      expect(gone.elevation).toBeGreaterThan(base.elevation);
    });

    it('goes by the scene’s own measure when it gives one', () => {
      const rig = new CameraRig({
        ...config,
        outro: { distance: 0.5, elevation: 0, azimuth: 0 },
      });
      const gone = rig.update(inputs({ outro: 1, heading: 1 }));
      expect(gone.azimuth).toBeCloseTo(base.azimuth);
      expect(gone.elevation).toBeCloseTo(base.elevation);
      expect(gone.distance).toBeCloseTo(base.distance * 1.5);
    });

    it('does not move at all for a scene that is not leaving', () => {
      const rig = new CameraRig(config);
      const pose = rig.update(inputs({ heading: -1 }));
      expect(pose.azimuth).toBeCloseTo(base.azimuth);
      expect(pose.distance).toBeCloseTo(base.distance);
    });

    it('holds still for the 404’s number whichever it is doing', () => {
      const reading: Pose = { ...base, azimuth: 0, elevation: 1.2 };
      const rig = new CameraRig({ ...config, reading: () => reading });
      const pose = settle(rig, { reading: 1, intro: 0, outro: 1 });
      expect(pose.azimuth).toBeCloseTo(reading.azimuth);
      expect(pose.elevation).toBeCloseTo(reading.elevation);
      expect(pose.distance).toBeCloseTo(reading.distance);
    });
  });
});
