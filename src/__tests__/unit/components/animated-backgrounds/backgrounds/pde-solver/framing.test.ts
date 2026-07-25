import {
  BASE_FOV_DEGREES,
  CAMERA_DISTANCE,
  PLANE_SIZE,
  fovForViewport,
} from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';

/**
 * Radius, in screen pixels, of the largest circle the spinning plate is
 * guaranteed to cover — its inscribed circle, projected.
 */
const coveredRadiusPx = (width: number, height: number): number => {
  const fovRadians = (fovForViewport(width, height) * Math.PI) / 180;
  const frustumHalfHeight = CAMERA_DISTANCE * Math.tan(fovRadians / 2);
  return (PLANE_SIZE / 2 / frustumHalfHeight) * (height / 2);
};

const cornerRadiusPx = (width: number, height: number): number =>
  Math.hypot(width, height) / 2;

describe('PDE solver framing', () => {
  it('leaves landscape framing alone', () => {
    expect(fovForViewport(1280, 800)).toBe(BASE_FOV_DEGREES);
    expect(fovForViewport(1920, 1080)).toBe(BASE_FOV_DEGREES);
    expect(fovForViewport(800, 800)).toBe(BASE_FOV_DEGREES);
  });

  it.each([
    ['iPhone SE', 320, 568],
    ['iPhone 12/13/14', 390, 844],
    ['Pixel 7', 412, 915],
    ['iPad portrait', 820, 1180],
    ['absurdly tall', 320, 1600],
  ])('covers the corners on %s', (_name, width, height) => {
    expect(coveredRadiusPx(width, height)).toBeGreaterThanOrEqual(
      cornerRadiusPx(width, height) - 1e-6
    );
  });

  it('only ever zooms in', () => {
    const viewports: Array<[number, number]> = [
      [320, 568],
      [390, 844],
      [412, 915],
      [820, 1180],
      [320, 1600],
      [1280, 800],
    ];
    for (const [width, height] of viewports) {
      expect(fovForViewport(width, height)).toBeLessThanOrEqual(
        BASE_FOV_DEGREES
      );
    }
    expect(fovForViewport(390, 844)).toBeLessThan(BASE_FOV_DEGREES);
  });
});
