import { act, render } from '@testing-library/react';
import BackgroundManager, {
  TOUCH_HOLD_MS,
  touchHoldRemaining,
} from '../../../../components/animated-backgrounds/BackgroundManager';

// What the manager is told about the field: when a hand was last on it.
let mockTouchedAt = 0;
jest.mock(
  '../../../../components/animated-backgrounds/core/stage/pointer',
  () => ({
    fieldTouchedAt: () => mockTouchedAt,
  })
);

const mockNext = jest.fn();

jest.mock('../../../../components/animated-backgrounds/index', () => ({
  backgroundRegistry: [],
  getBackgroundById: () => undefined,
}));

jest.mock('../../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isContentHidden: false,
    setContentHidden: jest.fn(),
  }),
}));

jest.mock('../../../../components/BackgroundProvider', () => {
  const Dummy = () => null;
  const state = {
    currentBackgroundId: 'one',
    settings: { one: { opacity: 0.8 } },
    showSettingsPanel: false,
    closingSettingsPanel: false,
  };
  const audioControls = { startAudio: null, stopAudio: null, isPlaying: false };
  const currentBackground = {
    id: 'one',
    name: 'One',
    description: 'First',
    component: Dummy,
    defaultSettings: { opacity: 0.8 },
    settingsSchema: [],
  };
  const noop = () => undefined;
  return {
    useBackground: () => ({
      state,
      switchToNextBackground: mockNext,
      switchToPreviousBackground: noop,
      updateCurrentSettings: noop,
      resetCurrentSettings: noop,
      toggleSettingsPanel: noop,
      closeSettingsPanel: noop,
      audioControls,
      setAudioControls: noop,
      currentBackground,
      currentSettings: state.settings.one,
      mounted: true,
    }),
  };
});

// The site's own timings (config: twelve seconds of play, and 1.1 for the
// one before to leave in, which every turn after the first also waits out).
const PLAY_MS = 12_000;
const LEAVE_MS = 1_100;

describe('how long the cycle waits for a hand on the field', () => {
  it('does not wait for a field nobody has touched', () => {
    expect(touchHoldRemaining(50_000, 0)).toBe(0);
  });

  it('waits out what is left of the hold', () => {
    expect(touchHoldRemaining(10_000, 9_000)).toBe(TOUCH_HOLD_MS - 1_000);
    expect(touchHoldRemaining(10_000, 10_000)).toBe(TOUCH_HOLD_MS);
  });

  it('does not wait once the hold has run out', () => {
    expect(touchHoldRemaining(10_000 + TOUCH_HOLD_MS, 10_000)).toBe(0);
    expect(touchHoldRemaining(10_000 + TOUCH_HOLD_MS * 5, 10_000)).toBe(0);
  });
});

describe('the cycle, and a hand on the field', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockTouchedAt = 0;
    mockNext.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const movedOn = () => mockNext.mock.calls.length > 0;

  it('moves on after a background’s turn when the field is left alone', () => {
    const { unmount } = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(PLAY_MS - 100);
    });
    expect(movedOn()).toBe(false);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('gives each later turn the time the one before spent leaving', () => {
    const { unmount } = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(PLAY_MS);
    });
    expect(mockNext).toHaveBeenCalledTimes(1);

    // Twelve seconds on, the second is still a second short of its turn.
    act(() => {
      jest.advanceTimersByTime(PLAY_MS + LEAVE_MS - 100);
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(mockNext).toHaveBeenCalledTimes(2);
    unmount();
  });

  it('does not take a simulation out from under a hand that is on it', () => {
    const { unmount } = render(<BackgroundManager />);
    // Pressed a second before the turn would have ended.
    act(() => {
      jest.advanceTimersByTime(PLAY_MS - 1_000);
    });
    mockTouchedAt = performance.now();
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(mockNext).not.toHaveBeenCalled();

    // Left alone for the length of the hold, it moves on.
    act(() => {
      jest.advanceTimersByTime(TOUCH_HOLD_MS);
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('keeps waiting for as long as the hand keeps coming back', () => {
    const { unmount } = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(PLAY_MS - 500);
    });
    // Three more presses, each inside the hold the last one started.
    for (let i = 0; i < 3; i++) {
      mockTouchedAt = performance.now();
      act(() => {
        jest.advanceTimersByTime(TOUCH_HOLD_MS - 1_000);
      });
      expect(movedOn()).toBe(false);
    }
    act(() => {
      jest.advanceTimersByTime(1_500);
    });
    expect(movedOn()).toBe(true);
    unmount();
  });

  it('forgets the wait when it is taken down mid-hold', () => {
    const { unmount } = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(PLAY_MS - 500);
    });
    mockTouchedAt = performance.now();
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(TOUCH_HOLD_MS * 3);
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
