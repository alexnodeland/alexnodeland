import { act, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { spectrogramOscilloscopeConfig } from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/config';
import SpectrogramOscilloscopeBackground from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/SpectrogramOscilloscopeBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';

/**
 * The scene's contract with the page is asked of all six backgrounds
 * together (scenes.test.tsx), and the synthesizer it draws is tested as
 * arithmetic (backgrounds/synth.test.ts). What is here is what only this
 * background has: it can be heard, and it comes on and goes off the way an
 * instrument is switched on and off.
 */

const settings = getCompleteSettings(
  spectrogramOscilloscopeConfig as never
) as never;

// Just enough of the Web Audio API for a graph to be built on.
const param = () => ({
  value: 0,
  setValueAtTime: jest.fn(),
  linearRampToValueAtTime: jest.fn(),
});
const node = () => ({
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  type: 'sine',
  frequency: param(),
  gain: param(),
  Q: param(),
});

class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state = 'running';
  currentTime = 0;
  destination = {};
  close = jest.fn();
  resume = jest.fn();
  oscillators: Array<ReturnType<typeof node>> = [];
  constructor() {
    FakeAudioContext.made.push(this);
  }
  createOscillator() {
    const oscillator = node();
    this.oscillators.push(oscillator);
    return oscillator;
  }
  createGain = node;
  createBiquadFilter = node;
}

type AudioWindow = Window & { AudioContext?: unknown };

describe('SpectrogramOscilloscopeBackground, heard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    FakeAudioContext.made = [];
    (window as AudioWindow).AudioContext = FakeAudioContext;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (window as AudioWindow).AudioContext;
  });

  // The transport is async (a context may have to be resumed first) and the
  // page hears about it on a poll.
  const settle = async () => {
    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(150);
    });
  };

  it('hands its transport up to the page, not yet playing', () => {
    const ready = jest.fn();
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground
        settings={settings}
        onAudioControlsReady={ready}
      />
    );
    expect(ready).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      false
    );
    expect(FakeAudioContext.made).toHaveLength(0);
    unmount();
  });

  it('sounds while P is held, at the pitches the controls are set to', async () => {
    const ready = jest.fn();
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground
        settings={settings}
        onAudioControlsReady={ready}
      />
    );

    fireEvent.keyDown(window, { key: 'p' });
    await settle();

    expect(FakeAudioContext.made).toHaveLength(1);
    const [context] = FakeAudioContext.made;
    const custom = settings as Record<string, number>;
    expect(context.oscillators[0].frequency.value).toBe(custom.vco1Frequency);
    expect(context.oscillators[0].start).toHaveBeenCalled();
    // The page is told, and so is anyone looking at it.
    expect(ready).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.any(Function),
      true
    );
    expect(screen.getByRole('status')).toHaveTextContent('audio playing');

    fireEvent.keyUp(window, { key: 'p' });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(context.close).toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
  });

  it('does not start twice for a key that repeats', async () => {
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} />
    );
    fireEvent.keyDown(window, { key: 'p' });
    await settle();
    fireEvent.keyDown(window, { key: 'p', repeat: true });
    await settle();
    expect(FakeAudioContext.made).toHaveLength(1);
    unmount();
  });

  it('takes a P typed into a field for a letter, and one with a modifier for the browser’s', async () => {
    const { unmount } = render(
      <>
        <input aria-label="search" />
        <SpectrogramOscilloscopeBackground settings={settings} />
      </>
    );

    fireEvent.keyDown(screen.getByLabelText('search'), { key: 'p' });
    await settle();
    // ⌘P is the print dialog.
    fireEvent.keyDown(window, { key: 'p', metaKey: true });
    await settle();

    expect(FakeAudioContext.made).toHaveLength(0);
    unmount();
  });

  it('stops with the background that was making the sound', async () => {
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} />
    );
    fireEvent.keyDown(window, { key: 'p' });
    await settle();
    const [context] = FakeAudioContext.made;

    unmount();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(context.close).toHaveBeenCalled();
  });

  it('stays silent, and standing, where there is no audio to be had', async () => {
    delete (window as AudioWindow).AudioContext;
    const ready = jest.fn();
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground
        settings={settings}
        onAudioControlsReady={ready}
      />
    );
    fireEvent.keyDown(window, { key: 'p' });
    await settle();
    expect(ready).not.toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      true
    );
    expect(screen.queryByRole('status')).toBeNull();
    unmount();
  });
});

/**
 * Switched on and switched off (see the note by INTRO_SECONDS in the scene).
 * What the movement looks like is the films' to say; what can be asked here
 * is where it starts and ends: the settled picture is the one there always
 * was, a scene that has left is dark, and one told to stay comes back.
 */
describe('SpectrogramOscilloscopeBackground, switched on and off', () => {
  type Uniforms = Record<string, { value: unknown }>;
  interface StubRenderer {
    render: jest.Mock;
  }
  const renderers = (): StubRenderer[] =>
    (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

  beforeEach(() => {
    renderers().length = 0;
  });

  const frames = async (ms = 120) => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  };

  // A frame is drawn when the machine gets round to it, which on a busy one
  // is not soon: wait for what is being asked about rather than for a time.
  const until = async (settled: () => boolean) => {
    for (let i = 0; i < 100; i++) {
      try {
        if (settled()) return;
      } catch {
        // Nothing drawn yet.
      }
      await frames(40);
    }
  };

  /** The uniforms of the material that has one called `name`. */
  const uniformsWith = (name: string): Uniforms => {
    for (const { render: draw } of renderers()) {
      for (const [scene] of draw.mock.calls as Array<[THREE.Object3D]>) {
        let found: Uniforms | null = null;
        scene.traverse(object => {
          const uniforms = (
            (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined
          )?.uniforms as Uniforms | undefined;
          if (uniforms && name in uniforms) found = uniforms;
        });
        if (found) return found;
      }
    }
    throw new Error(`nothing was drawn with a ${name}`);
  };

  const state = () => {
    const terrain = uniformsWith('uLaid');
    const trace = uniformsWith('uDrawn');
    const laid = terrain.uLaid.value as THREE.Vector2;
    const drawn = trace.uDrawn.value as THREE.Vector3;
    return {
      strength: terrain.uStrength.value as number,
      height: (terrain.uSize.value as THREE.Vector3).y,
      laid: laid.x,
      edge: laid.y,
      trace: trace.uBrightness.value as number,
      drawn: drawn.x,
      spot: drawn.y,
    };
  };

  it('is the whole display, with nothing of the switching-on left in it, once it has arrived', async () => {
    // A still is drawn arrived.
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} frozen />
    );
    await until(() => state().strength === 1);

    const still = state();
    expect(still.strength).toBe(1);
    // Every row standing at its full height: the edge is past the far end
    // by more than the depth a row takes to stand up over.
    expect(still.laid).toBeGreaterThan(1.1);
    expect(still.height).toBeCloseTo(0.6);
    // The whole trace drawn, at the brightness the controls ask for, and
    // neither the laying edge nor the drawing spot alight.
    expect(still.drawn).toBeGreaterThan(1);
    expect(still.trace).toBeCloseTo(
      (settings as Record<string, number>).waveformBrightness
    );
    expect(still.edge).toBe(0);
    expect(still.spot).toBe(0);
    unmount();
  });

  it('starts with nothing drawn and nothing laid out', async () => {
    const { unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} />
    );
    // A few frames into an arrival of two seconds.
    await until(() => state().strength > 0);

    const early = state();
    expect(early.laid).toBe(0);
    expect(early.drawn).toBeLessThan(0.5);
    expect(early.strength).toBeLessThan(1);
    unmount();
  });

  it('is dark by the end of a leaving', async () => {
    const { rerender, unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} />
    );
    await frames(60);
    rerender(
      <SpectrogramOscilloscopeBackground
        settings={settings}
        leaving
        leaveMs={40}
      />
    );
    await until(() => state().strength === 0);

    const gone = state();
    // No history standing or lit, and no trace: nothing emits.
    expect(gone.laid).toBe(0);
    expect(gone.strength).toBe(0);
    expect(gone.trace).toBe(0);
    unmount();
  });

  it('comes back when the leaving is taken back', async () => {
    const { rerender, unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} />
    );
    await until(() => state().strength > 0);
    rerender(
      <SpectrogramOscilloscopeBackground
        settings={settings}
        leaving
        leaveMs={40}
      />
    );
    await until(() => state().strength === 0);
    expect(state().trace).toBe(0);

    rerender(<SpectrogramOscilloscopeBackground settings={settings} />);
    await until(() => state().strength > 0 && state().trace > 0);
    expect(state().strength).toBeGreaterThan(0);
    expect(state().trace).toBeGreaterThan(0);
    unmount();
  });

  it('is left whole as a still, which has no movement to leave by', async () => {
    const { rerender, unmount } = render(
      <SpectrogramOscilloscopeBackground settings={settings} frozen />
    );
    await until(() => state().strength === 1);
    const before = state();

    rerender(
      <SpectrogramOscilloscopeBackground settings={settings} frozen leaving />
    );
    await frames();
    expect(state()).toEqual(before);
    unmount();
  });
});
