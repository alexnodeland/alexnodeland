import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import SettingsPanel from '../../../../components/animated-backgrounds/SettingsPanel';

// The panel branches on viewport width; the shared setup stubs matchMedia to
// always miss, so opt this file in to the mobile side.
jest.mock(
  '../../../../components/animated-backgrounds/core/useIsMobileViewport',
  () => ({
    useIsMobileViewport: () => true,
    MOBILE_BREAKPOINT_PX: 768,
  })
);

const settings = {
  opacity: 0.8,
  elementSize: 0.02,
  globalTimeMultiplier: 1,
  waveSpeed: 3,
} as any;

const schema = [
  { key: 'waveSpeed', label: 'Wave Speed', type: 'number', category: 'Waves' },
  { key: 'opacity', label: 'Opacity', type: 'number', category: 'Visual' },
  {
    key: 'globalTimeMultiplier',
    label: 'Speed',
    type: 'number',
    category: 'Animation',
  },
] as any;

const renderPanel = (overrides: Record<string, unknown> = {}) =>
  render(
    <SettingsPanel
      settings={settings}
      settingsSchema={schema}
      onSettingsChange={jest.fn()}
      onClose={jest.fn()}
      currentBackgroundId="one"
      currentBackgroundName="One"
      currentBackgroundDescription="a long description of the background"
      totalBackgrounds={2}
      onPreviousBackground={jest.fn()}
      onNextBackground={jest.fn()}
      isClosing={false}
      {...overrides}
    />
  );

describe('SettingsPanel on mobile', () => {
  it('renders as a sheet with a flat category strip instead of nested sections', () => {
    const { container } = renderPanel();

    expect(container.querySelector('.settings-sidebar')).toHaveClass(
      'settings-sheet'
    );
    expect(container.querySelector('.settings-section')).toBeNull();
    expect(screen.queryByText('custom settings')).not.toBeInTheDocument();

    // Background-specific categories lead, shared ones follow.
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual([
      'waves',
      'visual',
      'animation',
    ]);
  });

  it('shows one category at a time and switches on tap', () => {
    renderPanel();

    expect(screen.getByRole('tab', { name: 'waves' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('wave speed')).toBeInTheDocument();
    expect(screen.queryByText('opacity')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'visual' }));

    expect(screen.getByText('opacity')).toBeInTheDocument();
    expect(screen.queryByText('wave speed')).not.toBeInTheDocument();
  });

  it('keeps the description behind a toggle so the sheet opens onto controls', () => {
    renderPanel();

    const description = 'a long description of the background';
    expect(screen.queryByText(description)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /show background description/i })
    );
    expect(screen.getByText(description)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /hide background description/i })
    );
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });
});
