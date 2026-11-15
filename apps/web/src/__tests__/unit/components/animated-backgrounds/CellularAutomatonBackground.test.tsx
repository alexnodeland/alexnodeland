import { act, render } from '@testing-library/react';
import * as THREE from 'three';
import CellularAutomatonBackground, {
  passageOf,
} from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/CellularAutomatonBackground';
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

      // A full reseed of this board — jsdom's 1024x768 viewport at cellSize
      // 24, and the ground around it that the camera looks across — is
      // upwards of 3500 calls. Three's own texture UUIDs account for the
      // handful the thresholds below leave room for.
      const random = jest.spyOn(Math, 'random');

      // The viewport losing height to browser chrome shrinks the grid, so
      // every surviving cell already has a state and nothing needs seeding.
      await resizeTo(originalHeight - 80);
      expect(random.mock.calls.length).toBeLessThan(10);

      // Growing back exposes only the strip that was hidden: a few rows of
      // the view, which is half a dozen of the board's — a tenth of it.
      random.mockClear();
      await resizeTo(originalHeight);
      expect(random.mock.calls.length).toBeGreaterThan(0);
      expect(random.mock.calls.length).toBeLessThan(600);

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

  // Coming on and going off: the board is sown from the middle outward and
  // cleared by a line across it, both in the shaders, from three numbers.
  describe('arriving and leaving', () => {
    interface StubRenderer {
      render: jest.Mock;
    }
    const renderers = (): StubRenderer[] =>
      (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] })
        .instances;

    const frames = async (ms = 120) => {
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, ms));
      });
    };

    /** The uniforms the board and its blocks were last drawn with. */
    const drawnWith = () => {
      const [renderer] = renderers();
      const call = renderer.render.mock.calls.find(
        ([scene]) => (scene as THREE.Scene).children.length >= 2
      );
      const scene = call?.[0] as THREE.Scene;
      const materials = scene.children
        .map(child => (child as THREE.Mesh).material as THREE.ShaderMaterial)
        .filter(material => material?.uniforms?.uPassage);
      return materials.map(material => ({
        passage: material.uniforms.uPassage.value as THREE.Vector3,
        strength: material.uniforms.uStrength.value as number,
        heights: material.uniforms.uHeights?.value as THREE.Vector2 | undefined,
      }));
    };

    beforeEach(() => {
      renderers().length = 0;
    });

    it('is the whole board, at full light, once it has arrived', () => {
      expect(passageOf({ intro: 1, outro: 0 })).toEqual({
        sown: 1,
        cleared: 0,
        light: 1,
      });
    });

    it('starts from nothing and ends at nothing', () => {
      expect(passageOf({ intro: 0, outro: 0 }).light).toBe(0);
      expect(passageOf({ intro: 1, outro: 1 }).light).toBe(0);
      expect(passageOf({ intro: 1, outro: 1 }).cleared).toBe(1);
    });

    it('keeps its light while the line crosses, and loses it only at the end', () => {
      // The clearing is the line's to show: the common light must not fade
      // the board out from under it.
      expect(passageOf({ intro: 1, outro: 0.5 }).light).toBe(1);
      expect(passageOf({ intro: 1, outro: 0.8 }).light).toBe(1);
      const late = passageOf({ intro: 1, outro: 0.95 }).light;
      expect(late).toBeGreaterThan(0);
      expect(late).toBeLessThan(0.5);
    });

    it('holds a still as the settled board: sown, uncleared, lit', async () => {
      const { unmount } = render(
        <CellularAutomatonBackground
          className="bg"
          settings={baseSettings}
          frozen
        />
      );
      await frames();
      const drawn = drawnWith();
      // The board and the blocks, told the same thing.
      expect(drawn).toHaveLength(2);
      for (const { passage, strength } of drawn) {
        expect(passage.x).toBe(1);
        expect(passage.y).toBe(0);
        expect(strength).toBe(1);
      }
      // The blocks stand at their own heights: the rise is the shader's now,
      // and what it is handed is never scaled.
      const heights = drawn.find(entry => entry.heights)?.heights;
      expect(heights?.x).toBeCloseTo(0.34);
      expect(heights?.y).toBeCloseTo(2.3);
      unmount();
    });

    it('is cleared, and dark, by the time it has been given to leave', async () => {
      const { rerender, unmount } = render(
        <CellularAutomatonBackground className="bg" settings={baseSettings} />
      );
      await frames();
      expect(drawnWith()[0].passage.y).toBe(0);

      rerender(
        <CellularAutomatonBackground
          className="bg"
          settings={baseSettings}
          leaving
          leaveMs={100}
        />
      );
      await frames(400);
      for (const { passage, strength } of drawnWith()) {
        expect(passage.y).toBe(1);
        expect(strength).toBe(0);
      }

      // Told it can stay after all, it comes back.
      rerender(
        <CellularAutomatonBackground className="bg" settings={baseSettings} />
      );
      await frames(400);
      for (const { passage } of drawnWith()) expect(passage.y).toBe(0);
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
