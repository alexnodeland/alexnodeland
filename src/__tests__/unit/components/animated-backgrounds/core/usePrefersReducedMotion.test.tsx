import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { usePrefersReducedMotion } from '../../../../../components/animated-backgrounds/core/usePrefersReducedMotion';

// A controllable stand-in for the shared setup's inert matchMedia stub, so a
// test can flip the preference the way an OS settings toggle would.
const installMedia = (initial: boolean) => {
  const listeners = new Set<() => void>();
  const media = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn((_: string, fn: () => void) => listeners.add(fn)),
    removeEventListener: jest.fn((_: string, fn: () => void) =>
      listeners.delete(fn)
    ),
    dispatchEvent: jest.fn(),
  };
  (window.matchMedia as unknown as jest.Mock).mockImplementation(() => media);
  return {
    media,
    listeners,
    set(value: boolean) {
      media.matches = value;
      listeners.forEach(fn => fn());
    },
  };
};

const Probe: React.FC = () => (
  <span data-testid="reduced">{String(usePrefersReducedMotion())}</span>
);

describe('usePrefersReducedMotion', () => {
  it('settles on the current preference after mount', () => {
    installMedia(true);
    render(<Probe />);
    expect(screen.getByTestId('reduced')).toHaveTextContent('true');
  });

  it('follows the preference when it is toggled mid-session', () => {
    const control = installMedia(false);
    render(<Probe />);
    expect(screen.getByTestId('reduced')).toHaveTextContent('false');

    // The whole point of the hook over a one-shot `.matches` read: a value
    // latched into a long-lived effect would never see this.
    act(() => control.set(true));
    expect(screen.getByTestId('reduced')).toHaveTextContent('true');

    act(() => control.set(false));
    expect(screen.getByTestId('reduced')).toHaveTextContent('false');
  });

  it('unsubscribes on unmount', () => {
    const control = installMedia(false);
    const { unmount } = render(<Probe />);
    expect(control.listeners.size).toBe(1);
    unmount();
    expect(control.listeners.size).toBe(0);
  });
});
