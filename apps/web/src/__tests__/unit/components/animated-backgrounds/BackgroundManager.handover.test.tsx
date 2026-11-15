import { act, render, screen } from '@testing-library/react';
import BackgroundManager, {
  ASKED_LEAVE_MS,
} from '../../../../components/animated-backgrounds/BackgroundManager';

/**
 * The hand-over: what is on the field while one background gives way to
 * another. The provider's state changes at once; the scene that was up is
 * told it is leaving, keeps the field for as long as it was given, and is
 * then replaced by whichever background is current by then.
 */

jest.mock(
  '../../../../components/animated-backgrounds/core/stage/pointer',
  () => ({ fieldTouchedAt: () => 0 })
);

let mockReducedMotion = false;
jest.mock(
  '../../../../components/animated-backgrounds/core/usePrefersReducedMotion',
  () => ({ usePrefersReducedMotion: () => mockReducedMotion })
);

const mockPreloads: string[] = [];

jest.mock('../../../../components/animated-backgrounds/index', () => {
  const React = require('react');
  const scene = (id: string) => {
    const Scene = (props: {
      leaving?: boolean;
      leaveMs?: number;
      settings: { mark: string };
    }) =>
      React.createElement('div', {
        'data-testid': 'scene',
        'data-id': id,
        'data-leaving': props.leaving ? 'yes' : 'no',
        'data-leave-ms': String(props.leaveMs ?? ''),
        'data-settings': props.settings?.mark,
      });
    return {
      id,
      name: id,
      shortName: id,
      description: id,
      component: Scene,
      preload: () => {
        mockPreloads.push(id);
        return Promise.resolve();
      },
      defaultSettings: { mark: id },
      settingsSchema: [],
    };
  };
  const backgroundRegistry = ['one', 'two', 'three', 'four'].map(scene);
  return {
    backgroundRegistry,
    getBackgroundById: (id: string) =>
      backgroundRegistry.find((bg: { id: string }) => bg.id === id),
  };
});

jest.mock('../../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isContentHidden: false,
    setContentHidden: jest.fn(),
  }),
}));

// The provider, reduced to what the manager reads and a way to move it.
let mockCurrent = 'one';
let mockMounted = true;
const mockNext = jest.fn();

jest.mock('../../../../components/BackgroundProvider', () => {
  const { getBackgroundById } = jest.requireMock(
    '../../../../components/animated-backgrounds/index'
  );
  const audioControls = { startAudio: null, stopAudio: null, isPlaying: false };
  const noop = () => undefined;
  const settings = {
    one: { mark: 'one' },
    two: { mark: 'two' },
    three: { mark: 'three' },
    four: { mark: 'four' },
  };
  return {
    useBackground: () => ({
      state: {
        currentBackgroundId: mockCurrent,
        settings,
        showSettingsPanel: false,
        closingSettingsPanel: false,
      },
      switchToNextBackground: mockNext,
      switchToPreviousBackground: noop,
      updateCurrentSettings: noop,
      resetCurrentSettings: noop,
      toggleSettingsPanel: noop,
      closeSettingsPanel: noop,
      audioControls,
      setAudioControls: noop,
      currentBackground: getBackgroundById(mockCurrent),
      currentSettings: settings[mockCurrent as keyof typeof settings],
      mounted: mockMounted,
    }),
  };
});

const CYCLE_LEAVE_MS = 1_100;
const PLAY_MS = 12_000;

const scene = () => screen.getByTestId('scene');

describe('one background giving way to another', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockCurrent = 'one';
    mockMounted = true;
    mockReducedMotion = false;
    mockNext.mockReset();
    mockPreloads.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const switchTo = (id: string, view: ReturnType<typeof render>) => {
    mockCurrent = id;
    view.rerender(<BackgroundManager />);
  };

  it('puts nothing on the field before the provider has mounted', () => {
    mockMounted = false;
    render(<BackgroundManager />);
    expect(screen.queryByTestId('scene')).toBeNull();
  });

  it('shows the current background, staying', () => {
    render(<BackgroundManager />);
    expect(scene()).toHaveAttribute('data-id', 'one');
    expect(scene()).toHaveAttribute('data-leaving', 'no');
  });

  it('keeps the old scene up, leaving, when another is asked for', () => {
    const view = render(<BackgroundManager />);
    switchTo('two', view);
    expect(scene()).toHaveAttribute('data-id', 'one');
    expect(scene()).toHaveAttribute('data-leaving', 'yes');
    expect(scene()).toHaveAttribute('data-leave-ms', String(ASKED_LEAVE_MS));
    // Its own settings, not the newcomer's.
    expect(scene()).toHaveAttribute('data-settings', 'one');

    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS - 50);
    });
    expect(scene()).toHaveAttribute('data-id', 'one');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(scene()).toHaveAttribute('data-id', 'two');
    expect(scene()).toHaveAttribute('data-leaving', 'no');
    expect(scene()).toHaveAttribute('data-settings', 'two');
  });

  it('goes straight to the latest when asked twice in one leaving', () => {
    const view = render(<BackgroundManager />);
    switchTo('two', view);
    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS / 2);
    });
    switchTo('three', view);
    // The second ask does not start the leaving over.
    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS / 2 + 50);
    });
    expect(scene()).toHaveAttribute('data-id', 'three');
    expect(scene()).toHaveAttribute('data-leaving', 'no');
  });

  it('lets a scene stay when the reader turns back to it', () => {
    const view = render(<BackgroundManager />);
    switchTo('two', view);
    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS / 2);
    });
    switchTo('one', view);
    expect(scene()).toHaveAttribute('data-id', 'one');
    expect(scene()).toHaveAttribute('data-leaving', 'no');
    // And the leaving it was halfway through never completes.
    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS * 3);
    });
    expect(scene()).toHaveAttribute('data-id', 'one');
  });

  it('gives a scene longer to leave when it is the cycle moving on', () => {
    // The cycle's own step: the mock stands in for the provider's switch.
    let view: ReturnType<typeof render> | null = null;
    mockNext.mockImplementation(() => {
      mockCurrent = 'two';
    });
    view = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(PLAY_MS + 10);
    });
    expect(mockNext).toHaveBeenCalledTimes(1);
    view.rerender(<BackgroundManager />);
    expect(scene()).toHaveAttribute('data-id', 'one');
    expect(scene()).toHaveAttribute('data-leaving', 'yes');
    expect(scene()).toHaveAttribute('data-leave-ms', String(CYCLE_LEAVE_MS));

    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS + 50);
    });
    expect(scene()).toHaveAttribute('data-id', 'one');
    act(() => {
      jest.advanceTimersByTime(CYCLE_LEAVE_MS - ASKED_LEAVE_MS);
    });
    expect(scene()).toHaveAttribute('data-id', 'two');

    // The next one the reader asks for is quick again.
    switchTo('three', view);
    expect(scene()).toHaveAttribute('data-leave-ms', String(ASKED_LEAVE_MS));
  });

  it('simply replaces a still, which has no movement to leave by', () => {
    mockReducedMotion = true;
    const view = render(<BackgroundManager />);
    switchTo('two', view);
    expect(scene()).toHaveAttribute('data-id', 'two');
    expect(scene()).toHaveAttribute('data-leaving', 'no');
  });

  it('fetches the neighbours once a scene has settled in', () => {
    render(<BackgroundManager />);
    expect(mockPreloads).toEqual([]);
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    // The one after and the one before, the set being a ring.
    expect(mockPreloads.sort()).toEqual(['four', 'two']);
  });

  it('does not fetch for a scene that is on its way out', () => {
    const view = render(<BackgroundManager />);
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    switchTo('three', view);
    act(() => {
      jest.advanceTimersByTime(ASKED_LEAVE_MS - 50);
    });
    expect(mockPreloads).toEqual([]);
  });
});
