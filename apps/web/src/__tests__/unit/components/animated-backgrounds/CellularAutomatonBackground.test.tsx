import { act, render } from '@testing-library/react';
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

  // Mobile browsers fire a resize whenever the URL bar collapses or expands,
  // which happens on the scroll back to the top of the page. Rebuilding the
  // grid from fresh soup there restarts the automaton mid-read.
  describe('resize', () => {
    const originalHeight = window.innerHeight;

    const resizeTo = async (height: number) => {
      // Perturbation is the only other caller of Math.random per frame; the
      // settings below switch it off so the count is all grid seeding.
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        writable: true,
        value: height,
      });
      await act(async () => {
        window.dispatchEvent(new Event('resize'));
        await new Promise(resolve =>
          requestAnimationFrame(() => resolve(null))
        );
      });
    };

    afterEach(() => {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        writable: true,
        value: originalHeight,
      });
    });

    it('carries the simulation over instead of reseeding it', async () => {
      const settings = { ...baseSettings, perturbationRate: 0 };
      const { unmount } = render(
        <CellularAutomatonBackground className="bg" settings={settings} />
      );

      // A full reseed of this grid — jsdom's 1024x768 viewport at cellSize 24
      // — is upwards of 1200 calls. Three's own texture UUIDs account for the
      // handful the thresholds below leave room for.
      const random = jest.spyOn(Math, 'random');

      // The viewport losing height to browser chrome shrinks the grid, so
      // every surviving cell already has a state and nothing needs seeding.
      await resizeTo(originalHeight - 80);
      expect(random.mock.calls.length).toBeLessThan(10);

      // Growing back exposes only the strip that was hidden: a few rows.
      random.mockClear();
      await resizeTo(originalHeight);
      expect(random.mock.calls.length).toBeLessThan(200);

      random.mockRestore();
      unmount();
    });

    it('does not rebuild when the grid shape is unchanged', async () => {
      const settings = { ...baseSettings, perturbationRate: 0 };
      const { unmount } = render(
        <CellularAutomatonBackground className="bg" settings={settings} />
      );

      const random = jest.spyOn(Math, 'random');
      await resizeTo(originalHeight - 1);
      expect(random).not.toHaveBeenCalled();

      random.mockRestore();
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
