import { render } from '@testing-library/react';
import CellularAutomatonBackground from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/CellularAutomatonBackground';
import { LIFE_RULES } from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/config';

const baseSettings: any = {
  opacity: 0.9,
  elementSize: 0.02,
  globalTimeMultiplier: 1,
  rule: 'conway',
  cellSize: 24,
  generationsPerSecond: 3,
  initialDensity: 0.3,
  perturbationRate: 0.0005,
  cellScale: 0.55,
  connectionLineWidth: 0.06,
  activityIntensity: 1.2,
  colors: {
    primary: [1, 0, 0],
    secondary: [0, 1, 0],
    accent: [0, 0, 1],
    background: [0, 0, 0],
    grid: [0.5, 0.5, 0.5],
  },
};

describe('CellularAutomatonBackground', () => {
  it('mounts and unmounts', () => {
    const { unmount } = render(
      <CellularAutomatonBackground className="bg" settings={baseSettings} />
    );
    unmount();
  });

  it('mounts for every available rule', () => {
    Object.keys(LIFE_RULES).forEach(rule => {
      const { unmount } = render(
        <CellularAutomatonBackground
          className="bg"
          settings={{ ...baseSettings, rule }}
        />
      );
      unmount();
    });
  });

  it('falls back to Conway for an unknown rule', () => {
    const { unmount } = render(
      <CellularAutomatonBackground
        className="bg"
        settings={{ ...baseSettings, rule: 'not-a-rule' }}
      />
    );
    unmount();
  });
});
