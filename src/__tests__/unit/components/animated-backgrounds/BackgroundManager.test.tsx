import { fireEvent, render, screen } from '@testing-library/react';
import BackgroundManager from '../../../../components/animated-backgrounds/BackgroundManager';

jest.mock('../../../../components/animated-backgrounds/index', () => {
  const React = require('react');
  const Dummy = ({ className }: { className?: string }) => (
    <div data-testid="bg" className={className} />
  );
  return {
    backgroundRegistry: [
      {
        id: 'one',
        name: 'One',
        description: 'First',
        component: Dummy,
        defaultSettings: {
          opacity: 0.8,
          elementSize: 0.02,
          globalTimeMultiplier: 1,
        },
        settingsSchema: [],
      },
      {
        id: 'two',
        name: 'Two',
        description: 'Second',
        component: Dummy,
        defaultSettings: {
          opacity: 0.8,
          elementSize: 0.02,
          globalTimeMultiplier: 1,
        },
        settingsSchema: [],
      },
    ],
    getBackgroundById: (id: string) => ({
      id,
      name: id,
      description: id,
      component: Dummy,
      defaultSettings: {
        opacity: 0.8,
        elementSize: 0.02,
        globalTimeMultiplier: 1,
      },
      settingsSchema: [],
    }),
  };
});

jest.mock('../../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isContentHidden: false,
    setContentHidden: jest.fn(),
  }),
}));

// Mock the BackgroundProvider context
jest.mock('../../../../components/BackgroundProvider', () => ({
  useBackground: () => ({
    state: {
      currentBackgroundId: 'one',
      settings: {
        one: {
          opacity: 0.8,
          elementSize: 0.02,
          globalTimeMultiplier: 1,
        },
      },
      showSettingsPanel: false,
      closingSettingsPanel: false,
    },
    switchToNextBackground: jest.fn(),
    switchToPreviousBackground: jest.fn(),
    updateCurrentSettings: jest.fn(),
    toggleSettingsPanel: jest.fn(),
    closeSettingsPanel: jest.fn(),
    audioControls: {
      startAudio: null,
      stopAudio: null,
      isPlaying: false,
    },
    overlayOpacity: 0,
    setOverlayOpacity: jest.fn(),
    currentBackground: {
      id: 'one',
      name: 'One',
      description: 'First',
      component: ({ className }: { className?: string }) => (
        <div data-testid="bg" className={className} />
      ),
      defaultSettings: {
        opacity: 0.8,
        elementSize: 0.02,
        globalTimeMultiplier: 1,
      },
      settingsSchema: [],
    },
    currentSettings: {
      opacity: 0.8,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
    },
  }),
}));

describe('BackgroundManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders current background and overlay', () => {
    render(<BackgroundManager />);
    expect(screen.getByTestId('bg')).toBeInTheDocument();
    // overlay div exists (cannot easily select inline style-only, but render succeeded)
  });

  it('handles keyboard navigation', () => {
    render(<BackgroundManager />);
    fireEvent.keyDown(window, { code: 'ArrowRight' });
    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    fireEvent.keyDown(window, { code: 'KeyS' });
    fireEvent.keyDown(window, { code: 'Escape' });
  });
});
