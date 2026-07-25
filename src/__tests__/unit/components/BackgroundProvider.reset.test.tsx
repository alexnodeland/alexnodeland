import { act, render, screen } from '@testing-library/react';
import React from 'react';
import {
  BackgroundProvider,
  useBackground,
} from '../../../components/BackgroundProvider';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';

jest.mock('../../../components/animated-backgrounds/index', () => {
  const Dummy = () => null;
  const registry = [
    {
      id: 'one',
      name: 'One',
      description: 'First',
      component: Dummy,
      defaultSettings: {
        opacity: 0.8,
        elementSize: 0.02,
        globalTimeMultiplier: 1,
        colors: { primary: [1, 0, 0] },
      },
      settingsSchema: [],
    },
  ];
  return {
    backgroundRegistry: registry,
    getBackgroundById: (id: string) => registry.find(bg => bg.id === id),
  };
});

const Probe: React.FC = () => {
  const { currentSettings, updateCurrentSettings, resetCurrentSettings } =
    useBackground();
  return (
    <div>
      <span data-testid="opacity">{String(currentSettings.opacity)}</span>
      <span data-testid="primary">
        {JSON.stringify((currentSettings as any).colors?.primary)}
      </span>
      <button
        onClick={() =>
          updateCurrentSettings({
            opacity: 0.1,
            colors: { primary: [0, 0, 1] },
          } as any)
        }
      >
        edit
      </button>
      <button onClick={resetCurrentSettings}>reset</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <SettingsPanelProvider>
      <BackgroundProvider initialBackgroundId="one">
        <Probe />
      </BackgroundProvider>
    </SettingsPanelProvider>
  );

describe('resetCurrentSettings', () => {
  it('puts edited settings back to the background defaults', () => {
    renderProbe();

    expect(screen.getByTestId('opacity')).toHaveTextContent('0.8');

    act(() => {
      screen.getByText('edit').click();
    });
    expect(screen.getByTestId('opacity')).toHaveTextContent('0.1');
    expect(screen.getByTestId('primary')).toHaveTextContent('[0,0,1]');

    act(() => {
      screen.getByText('reset').click();
    });
    expect(screen.getByTestId('opacity')).toHaveTextContent('0.8');
    expect(screen.getByTestId('primary')).toHaveTextContent('[1,0,0]');
  });
});
