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
 * The other half of the contract every background keeps (see scenes.test):
 * that it can be asked to go.
 *
 * How each one goes is its own — and is what the films are for. What is
 * asked of all six here is what the page depends on: that a scene told to
 * leave keeps drawing without complaint through the whole of it, is not
 * being shown by the time it has gone, and comes back if it is told, partway,
 * that it can stay.
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
  leaving?: boolean;
  leaveMs?: number;
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

describe.each(scenes)('%s, asked to go', (_name, Scene, settings) => {
  beforeEach(() => {
    renderers().length = 0;
  });

  afterEach(() => {
    act(() => setReadout(''));
  });

  const canvasOf = (container: HTMLElement) =>
    container.querySelector('canvas') as HTMLCanvasElement;

  it('is shown once it has arrived', async () => {
    const { container, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames(700);
    expect(canvasOf(container).style.opacity).toBe('');
    unmount();
  });

  it('takes itself off the field, drawing all the way, and is not shown at the end', async () => {
    const { container, rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames(500);
    const [renderer] = renderers();
    const drawn = renderer.render.mock.calls.length;

    rerender(<Scene settings={settings as never} leaving leaveMs={200} />);
    await frames(500);
    expect(renderer.render.mock.calls.length).toBeGreaterThan(drawn);
    expect(canvasOf(container).style.opacity).toBe('0');
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('comes back when it is told it can stay', async () => {
    const { container, rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames(500);
    rerender(<Scene settings={settings as never} leaving leaveMs={200} />);
    await frames(500);
    expect(canvasOf(container).style.opacity).toBe('0');

    rerender(<Scene settings={settings as never} />);
    await frames(600);
    expect(canvasOf(container).style.opacity).toBe('');
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('plays the 404 and leaves in the middle of it without complaint', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} notFound />
    );
    await frames(300);
    rerender(
      <Scene settings={settings as never} notFound leaving leaveMs={150} />
    );
    await frames(400);
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('is simply still there, as a still: a hold has no movement to leave by', async () => {
    const { container, rerender, unmount } = render(
      <Scene settings={settings as never} frozen />
    );
    await frames();
    rerender(
      <Scene settings={settings as never} frozen leaving leaveMs={200} />
    );
    await frames(300);
    expect(canvasOf(container).style.opacity).toBe('');
    expect(complaints()).toEqual([]);
    unmount();
  });

  it('can be taken down in the middle of leaving', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames(300);
    rerender(<Scene settings={settings as never} leaving leaveMs={600} />);
    await frames(150);
    expect(() => unmount()).not.toThrow();
    await frames(100);
    expect(complaints()).toEqual([]);
  });
});
