import {
  readingPose,
  restPose,
  showPose,
} from '../../../../components/animated-backgrounds/backgrounds/simple-waves/SimpleWaveBackground';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';

/**
 * The scene's contract with the page is asked of all six backgrounds
 * together (scenes.test.tsx). The waves are drawn entirely in a shader, so
 * what is left to ask here is where the camera stands over them.
 */
describe('where the camera stands over the waves', () => {
  it.each([
    ['a desktop', 16 / 9],
    ['a phone', 390 / 844],
  ])('looks across the water, low, on %s', (_name, aspect) => {
    const pose = restPose(aspect);
    // A few degrees over the horizon: a surface seen edge-on is what turns
    // three sines into swell.
    expect(pose.elevation).toBeGreaterThan(0.1);
    expect(pose.elevation).toBeLessThan(0.4);
  });

  it('rises a little with the page out of the way, to show the pattern', () => {
    expect(showPose(1.6).elevation).toBeGreaterThan(restPose(1.6).elevation);
  });

  it('reads the number from straight overhead, where the screen is the plane it was drawn on', () => {
    const pose = readingPose();
    expect(pose.elevation).toBeCloseTo(Math.PI / 2);
    expect(pose.azimuth).toBe(0);
    expect(pose.distance).toBeCloseTo(distanceToFit(1, pose.fov));
  });
});
