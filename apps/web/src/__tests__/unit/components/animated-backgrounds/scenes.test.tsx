import { act, render } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import CellularAutomatonBackground from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/CellularAutomatonBackground';
import { cellularAutomatonConfig } from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/config';
import { graphTopologyConfig } from '../../../../components/animated-backgrounds/backgrounds/graph-topology/config';
import GraphTopologyBackground from '../../../../components/animated-backgrounds/backgrounds/graph-topology/GraphTopologyBackground';
import { pdeSolverConfig } from '../../../../components/animated-backgrounds/backgrounds/pde-solver/config';
import PDESolverBackground from '../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';
import { shortestPathLabConfig } from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/config';
import ShortestPathLabBackground from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/ShortestPathLabBackground';
import { simpleWaveConfig } from '../../../../components/animated-backgrounds/backgrounds/simple-waves/config';
import SimpleWaveBackground from '../../../../components/animated-backgrounds/backgrounds/simple-waves/SimpleWaveBackground';
import { spectrogramOscilloscopeConfig } from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/config';
import SpectrogramOscilloscopeBackground from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/SpectrogramOscilloscopeBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';
import { setReadout } from '../../../../components/animated-backgrounds/core/stage/telemetry';

/**
 * The contract every background keeps with the page, asked of all six.
 *
 * three is real here and only its renderer is a stand-in (see setupTests), so
 * each scene builds what it would build in a browser — its geometry, its
 * materials, its simulation — and runs real frames of it. What cannot be
 * asked in jsdom is what the frames look like; that is what the screenshots
 * are for. What can be asked is everything around the picture: that a scene
 * starts without complaint, draws, holds still when asked to, plays the 404,
 * and leaves nothing behind.
 */

interface StubRenderer {
  domElement: HTMLCanvasElement;
  render: jest.Mock;
  dispose: jest.Mock;
  forceContextLoss: jest.Mock;
}

const renderers = (): StubRenderer[] =>
  (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

type SceneProps = {
  className?: string;
  settings: never;
  frozen?: boolean;
  notFound?: boolean;
};

const scenes: Array<
  [string, React.ComponentType<SceneProps>, Record<string, unknown>]
> = (
  [
    ['the automaton', CellularAutomatonBackground, cellularAutomatonConfig],
    ['the waves', SimpleWaveBackground, simpleWaveConfig],
    ['the scheduler', GraphTopologyBackground, graphTopologyConfig],
    [
      'the oscillator',
      SpectrogramOscilloscopeBackground,
      spectrogramOscilloscopeConfig,
    ],
    ['the pathfinder', ShortestPathLabBackground, shortestPathLabConfig],
    ['the membrane', PDESolverBackground, pdeSolverConfig],
  ] as const
).map(([name, component, config]) => [
  name,
  component as unknown as React.ComponentType<SceneProps>,
  getCompleteSettings(config as never) as Record<string, unknown>,
]);

// Long enough for the shaders' (stood-in) compile to resolve and a handful
// of animation frames to run.
const frames = async (ms = 120) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

const complaints = () =>
  (console.warn as jest.Mock).mock.calls.filter(([message]) =>
    /background (could not start|stopped)/i.test(String(message))
  );

describe.each(scenes)('%s, as a background', (_name, Scene, settings) => {
  beforeEach(() => {
    renderers().length = 0;
  });

  afterEach(() => {
    act(() => setReadout(''));
  });

  it('puts one canvas on the surface it was given and starts without complaint', async () => {
    const { container, unmount } = render(
      <Scene className="field" settings={settings as never} />
    );
    await frames();

    const surface = container.querySelector('.field') as HTMLElement;
    expect(surface).toBeInTheDocument();
    // Under the page, and blind to the pointer: everything the visitor
    // reads or taps is above it.
    expect(surface.style.pointerEvents).toBe('none');
    expect(surface.getAttribute('aria-hidden')).toBe('true');
    expect(surface.querySelectorAll('canvas')).toHaveLength(1);
    expect(renderers()).toHaveLength(1);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('draws, and keeps drawing', async () => {
    const { unmount } = render(<Scene settings={settings as never} />);
    await frames();
    const [renderer] = renderers();
    const drawn = renderer.render.mock.calls.length;
    expect(drawn).toBeGreaterThan(0);

    await frames();
    expect(renderer.render.mock.calls.length).toBeGreaterThan(drawn);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('draws a still and holds it for a reader who asked for less motion', async () => {
    const { unmount } = render(<Scene settings={settings as never} frozen />);
    await frames();
    const [renderer] = renderers();
    const drawn = renderer.render.mock.calls.length;
    // One frame, settled — not none.
    expect(drawn).toBeGreaterThan(0);

    await frames();
    expect(renderer.render.mock.calls.length).toBe(drawn);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('picks the motion back up when the hold is lifted', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} frozen />
    );
    await frames();
    const [renderer] = renderers();
    const still = renderer.render.mock.calls.length;

    rerender(<Scene settings={settings as never} frozen={false} />);
    await frames();
    expect(renderer.render.mock.calls.length).toBeGreaterThan(still);
    // The same scene, carried on: not torn down and built again.
    expect(renderers()).toHaveLength(1);
    unmount();
  });

  it('plays the 404, live and as a still', async () => {
    const live = render(<Scene settings={settings as never} notFound />);
    await frames(200);
    expect(renderers()[0].render).toHaveBeenCalled();
    expect(complaints()).toEqual([]);
    live.unmount();

    renderers().length = 0;
    const still = render(
      <Scene settings={settings as never} notFound frozen />
    );
    await frames();
    expect(renderers()[0].render).toHaveBeenCalled();
    expect(complaints()).toEqual([]);
    still.unmount();
  });

  it('goes into the 404 and comes back out of it without being rebuilt', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames();
    rerender(<Scene settings={settings as never} notFound />);
    await frames();
    rerender(<Scene settings={settings as never} />);
    await frames();
    expect(renderers()).toHaveLength(1);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('takes a new look without starting the simulation over', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames();

    // Opacity, speed and the colours are read every frame; none of them is
    // a reason to tear a running simulation down.
    const colors = Object.fromEntries(
      Object.keys((settings.colors as Record<string, unknown>) ?? {}).map(
        name => [name, [0.9, 0.2, 0.4]]
      )
    );
    const restyled = {
      ...settings,
      opacity: 0.5,
      globalTimeMultiplier: 2,
      colors,
    };
    rerender(<Scene settings={restyled as never} />);
    await frames();

    expect(renderers()).toHaveLength(1);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('runs where there is no graphics hardware, on the least picture there is', async () => {
    const stub = THREE.WebGLRenderer as unknown as {
      rendererName: string | null;
    };
    stub.rendererName = 'ANGLE (Google, Vulkan (SwiftShader Device))';
    try {
      const { container, unmount } = render(
        <Scene className="field" settings={settings as never} />
      );
      await frames();
      const [renderer] = renderers();
      expect(renderer.render).toHaveBeenCalled();
      // An eighth of the pixels from the first frame, not after ten seconds
      // of finding out.
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas.width).toBeLessThan(window.innerWidth * 0.5);
      expect(complaints()).toEqual([]);
      unmount();
    } finally {
      stub.rendererName = null;
    }
  });

  it('follows the viewport', async () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const { container, unmount } = render(
      <Scene className="field" settings={settings as never} />
    );
    await frames();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 844,
    });
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });
    await frames();

    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width / canvas.height).toBeCloseTo(390 / 844, 2);
    expect(complaints()).toEqual([]);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: height,
    });
    unmount();
  });

  it('leaves nothing behind', async () => {
    const { container, unmount } = render(
      <Scene className="field" settings={settings as never} />
    );
    await frames();
    const [renderer] = renderers();
    const drawn = () => renderer.render.mock.calls.length;

    unmount();
    expect(container.querySelector('canvas')).toBeNull();
    expect(renderer.dispose).toHaveBeenCalled();
    // The GL context is given back now, not when the collector gets round
    // to the canvas: the backgrounds cycle, and a browser caps how many
    // contexts a page may hold.
    expect(renderer.forceContextLoss).toHaveBeenCalled();
    // The pointer's marks on the root go with the last listener.
    expect(document.documentElement.classList.contains('over-field')).toBe(
      false
    );

    const after = drawn();
    await frames();
    expect(drawn()).toBe(after);
  });
});

describe('a background that cannot start', () => {
  it('leaves the page standing', () => {
    renderers().length = 0;
    // No WebGL: the renderer's constructor throws, as three's does.
    const stub = THREE.WebGLRenderer as unknown as { unavailable: boolean };
    stub.unavailable = true;
    try {
      const { container, unmount } = render(
        <div>
          <SimpleWaveBackground
            className="field"
            settings={getCompleteSettings(simpleWaveConfig as never) as never}
          />
          <p>the page</p>
        </div>
      );
      // The field stays the flat ground; the page above it is untouched.
      expect(container.querySelector('p')).toHaveTextContent('the page');
      expect(container.querySelector('canvas')).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'The background could not start:',
        expect.any(Error)
      );
      unmount();
    } finally {
      stub.unavailable = false;
    }
  });
});
