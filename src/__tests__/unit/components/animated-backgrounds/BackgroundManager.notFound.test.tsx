import { act, render, screen } from '@testing-library/react';
import BackgroundManager from '../../../../components/animated-backgrounds/BackgroundManager';
import { markNotFound } from '../../../../lib/notFound';

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

const mockSwitchToNextBackground = jest.fn();
const mockSetOverlayOpacity = jest.fn();

jest.mock('../../../../components/BackgroundProvider', () => {
  const React = require('react');
  // The background records what it is handed, so the test can see the flag
  // reach it.
  const Dummy = ({
    className,
    notFound,
  }: {
    className?: string;
    notFound?: boolean;
  }) =>
    React.createElement('div', {
      'data-testid': 'bg',
      className,
      'data-not-found': notFound ? 'yes' : 'no',
    });
  const settings = { opacity: 0.8, elementSize: 0.02, globalTimeMultiplier: 1 };
  const background = {
    id: 'one',
    name: 'One',
    description: 'First',
    component: Dummy,
    defaultSettings: settings,
    settingsSchema: [],
  };
  return {
    useBackground: () => ({
      state: {
        currentBackgroundId: 'one',
        settings: { one: settings },
        showSettingsPanel: false,
        closingSettingsPanel: false,
      },
      switchToNextBackground: mockSwitchToNextBackground,
      switchToPreviousBackground: jest.fn(),
      updateCurrentSettings: jest.fn(),
      resetCurrentSettings: jest.fn(),
      toggleSettingsPanel: jest.fn(),
      closeSettingsPanel: jest.fn(),
      audioControls: { startAudio: null, stopAudio: null, isPlaying: false },
      overlayOpacity: 0,
      setOverlayOpacity: mockSetOverlayOpacity,
      setAudioControls: jest.fn(),
      currentBackground: background,
      currentSettings: settings,
      mounted: true,
    }),
  };
});

describe('BackgroundManager and the 404', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSwitchToNextBackground.mockClear();
  });
  afterEach(() => {
    act(() => markNotFound(false));
    jest.useRealTimers();
  });

  it('hands the flag to the background on screen', () => {
    render(<BackgroundManager />);
    expect(screen.getByTestId('bg')).toHaveAttribute('data-not-found', 'no');
    act(() => markNotFound(true));
    expect(screen.getByTestId('bg')).toHaveAttribute('data-not-found', 'yes');
    act(() => markNotFound(false));
    expect(screen.getByTestId('bg')).toHaveAttribute('data-not-found', 'no');
  });

  it('keeps cycling while the 404 is up, as on every other page', () => {
    render(<BackgroundManager />);
    act(() => markNotFound(true));
    act(() => {
      jest.advanceTimersByTime(60000);
    });
    expect(mockSwitchToNextBackground).toHaveBeenCalled();
    // Each background that comes up is handed the flag.
    expect(screen.getByTestId('bg')).toHaveAttribute('data-not-found', 'yes');
    expect(mockSetOverlayOpacity).toHaveBeenCalled();
  });
});
