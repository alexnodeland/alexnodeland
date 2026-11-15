import { act, fireEvent, render, screen } from '@testing-library/react';
import { spectrogramOscilloscopeConfig } from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/config';
import SpectrogramOscilloscopeBackground from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/SpectrogramOscilloscopeBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';

/**
 * The scene's contract with the page is asked of all six backgrounds
 * together (scenes.test.tsx), and the synthesizer it draws is tested as
 * arithmetic (backgrounds/synth.test.ts). What is here is the one thing
 * only this background has: it can be heard.
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
