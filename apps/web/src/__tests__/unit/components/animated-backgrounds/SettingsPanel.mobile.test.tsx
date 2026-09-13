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

  // A disclosure rather than a mount: the block stays in the tree so it can be
  // eased open and shut, and shut it is zero-height and hidden from assistive
  // tech rather than absent (see .background-info in animated-backgrounds.scss).
  it('keeps the description behind a toggle so the sheet opens onto controls', () => {
    const { container } = renderPanel();
    const info = () => container.querySelector('.background-info')!;

    expect(info()).toHaveAttribute('aria-hidden', 'true');
    expect(info().className).not.toContain('is-open');

    fireEvent.click(
      screen.getByRole('button', { name: /show background description/i })
    );
    expect(info()).toHaveAttribute('aria-hidden', 'false');
    expect(info().className).toContain('is-open');
    expect(
      screen.getByText('a long description of the background')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /hide background description/i })
    );
    expect(info()).toHaveAttribute('aria-hidden', 'true');
    expect(info().className).not.toContain('is-open');
  });

  // The controls are the reason the sheet is open; the description is read
  // once. Going looking for a setting puts it away.
  it('folds the description away as soon as the settings are scrolled', () => {
    const { container } = renderPanel();
    fireEvent.click(
      screen.getByRole('button', { name: /show background description/i })
    );
    expect(container.querySelector('.background-info')!.className).toContain(
      'is-open'
    );

    // The gesture, not the scroll it causes: opening the description resizes
    // the list under it, and a list that has just been resized emits a scroll
    // on its own (see SettingsPanel.tsx).
    fireEvent.wheel(container.querySelector('.settings-content')!);
    expect(
      container.querySelector('.background-info')!.className
    ).not.toContain('is-open');
  });
});
