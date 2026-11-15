import type * as THREE from 'three';
import {
  COLOR_STEPS,
  colorTableFor,
} from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';
import type { PDESolverSettings } from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/config';

/**
 * The plate's colours come out of a table rather than being worked out per
 * vertex per frame. The table has to be the scale, and it has to notice when
 * the scale is changed under it.
 */
describe('PDE solver colour table', () => {
  // The scale and what it runs between are all the table reads.
  const settingsWith = (over: Partial<PDESolverSettings> = {}) =>
    ({
      colorScale: 'wave',
      colors: {
        negative: [1, 0.25, 0.5],
        zero: [0, 0.125, 0.25],
        positive: [0.5, 0.75, 1],
      },
      ...over,
    }) as PDESolverSettings;
  const plate = () => ({}) as THREE.BufferGeometry;
  const entry = (table: Float32Array, step: number) =>
    Array.from(table.subarray(step * 3, step * 3 + 3));

  it('runs the wave scale from the negative colour, through zero, to the positive', () => {
    const table = colorTableFor(plate(), settingsWith());
    expect(table.length).toBe(COLOR_STEPS * 3);
    expect(entry(table, 0)).toEqual([1, 0.25, 0.5]);
    expect(entry(table, COLOR_STEPS - 1)).toEqual([0.5, 0.75, 1]);

    // There is no entry at exactly zero in an even count; the two either
    // side of it are within a step of the zero colour.
    const step = 1 / (COLOR_STEPS / 2);
    for (const middle of [COLOR_STEPS / 2 - 1, COLOR_STEPS / 2]) {
      const [r, g, b] = entry(table, middle);
      expect(Math.abs(r - 0)).toBeLessThan(step);
      expect(Math.abs(g - 0.125)).toBeLessThan(step);
      expect(Math.abs(b - 0.25)).toBeLessThan(step);
    }
  });

  it('is fine enough that neighbouring entries are under a step of an 8-bit channel apart', () => {
    for (const colorScale of ['wave', 'thermal', 'monochrome'] as const) {
      const table = colorTableFor(plate(), settingsWith({ colorScale }));
      let widest = 0;
      for (let at = 3; at < table.length; at++) {
        widest = Math.max(widest, Math.abs(table[at] - table[at - 3]));
      }
      expect(widest).toBeLessThan(1 / 255);
    }
  });

  it('is built once for a plate, and kept', () => {
    const geometry = plate();
    const settings = settingsWith();
    const first = colorTableFor(geometry, settings);
    expect(colorTableFor(geometry, settings)).toBe(first);
    // A new settings object with the same scale in it is the same scale.
    expect(colorTableFor(geometry, settingsWith())).toBe(first);
  });

  it('is built again when the scale or one of its colours changes', () => {
    const geometry = plate();
    const settings = settingsWith();
    const first = colorTableFor(geometry, settings);

    // In place, the way a colour control might: the table is checked by
    // value, not by which object it was given.
    settings.colors.positive[1] = 0.5;
    const recoloured = colorTableFor(geometry, settings);
    expect(recoloured).not.toBe(first);
    expect(entry(recoloured, COLOR_STEPS - 1)).toEqual([0.5, 0.5, 1]);

    const rescaled = colorTableFor(
      geometry,
      settingsWith({ colorScale: 'monochrome' })
    );
    expect(entry(rescaled, 0)).toEqual([0, 0, 0]);
    expect(entry(rescaled, COLOR_STEPS - 1)).toEqual([1, 1, 1]);
  });

  it('keeps one plate’s table apart from another’s', () => {
    const one = colorTableFor(plate(), settingsWith());
    const other = colorTableFor(
      plate(),
      settingsWith({ colorScale: 'thermal' })
    );
    expect(other).not.toBe(one);
  });
});
