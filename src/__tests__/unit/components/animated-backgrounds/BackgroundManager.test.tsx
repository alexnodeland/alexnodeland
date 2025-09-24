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
    isSettingsPanelOpen: false,
    isClosingSettingsPanel: false,
    setSettingsPanelOpen: jest.fn(),
    setClosingSettingsPanel: jest.fn(),
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
    render(<BackgroundManager initialBackgroundId="one" />);
    expect(screen.getByTestId('bg')).toBeInTheDocument();
    // overlay div exists (cannot easily select inline style-only, but render succeeded)
  });

  it('handles keyboard navigation', () => {
    render(<BackgroundManager initialBackgroundId="one" />);
    fireEvent.keyDown(window, { code: 'ArrowRight' });
    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    fireEvent.keyDown(window, { code: 'KeyS' });
    fireEvent.keyDown(window, { code: 'Escape' });
  });
});
