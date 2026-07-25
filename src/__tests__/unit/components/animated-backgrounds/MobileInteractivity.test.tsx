import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import MobileInteractivity from '../../../../components/animated-backgrounds/MobileInteractivity';

const mockSetContentHidden = jest.fn();
const mockSwitchToNext = jest.fn();
const mockSwitchToPrevious = jest.fn();
const mockToggleSettingsPanel = jest.fn();
const mockCloseSettingsPanel = jest.fn();

let mockIsContentHidden = false;
let mockShowSettingsPanel = false;

jest.mock('../../../../components/SettingsPanelContext', () => ({
  useSettingsPanel: () => ({
    isContentHidden: mockIsContentHidden,
    setContentHidden: mockSetContentHidden,
  }),
}));

jest.mock('../../../../components/BackgroundProvider', () => ({
  useBackground: () => ({
    state: {
      currentBackgroundId: 'one',
      showSettingsPanel: mockShowSettingsPanel,
      closingSettingsPanel: false,
    },
    currentBackground: { id: 'one', name: 'Simple Sine Waves' },
    switchToNextBackground: mockSwitchToNext,
    switchToPreviousBackground: mockSwitchToPrevious,
    toggleSettingsPanel: mockToggleSettingsPanel,
    closeSettingsPanel: mockCloseSettingsPanel,
  }),
}));

describe('MobileInteractivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsContentHidden = false;
    mockShowSettingsPanel = false;
    document.body.className = '';
  });

  describe('browsing state', () => {
    it('offers the launcher and hides the page content when it is tapped', () => {
      render(<MobileInteractivity />);

      const launcher = screen.getByRole('button', {
        name: /explore the animated background/i,
      });
      expect(launcher).toHaveTextContent('interactivity');

      fireEvent.click(launcher);
      expect(mockSetContentHidden).toHaveBeenCalledWith(true);
    });

    it('leaves the body class alone', () => {
      render(<MobileInteractivity />);
      expect(document.body.classList.contains('mobile-explore-active')).toBe(
        false
      );
    });
  });

  describe('explore state', () => {
    beforeEach(() => {
      mockIsContentHidden = true;
    });

    it('names the current background and exposes both step directions', () => {
      render(<MobileInteractivity />);

      expect(screen.getByText('simple sine waves')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /next background/i }));
      expect(mockSwitchToNext).toHaveBeenCalled();

      fireEvent.click(
        screen.getByRole('button', { name: /previous background/i })
      );
      expect(mockSwitchToPrevious).toHaveBeenCalled();
    });

    it('opens the settings panel from the background name', () => {
      render(<MobileInteractivity />);

      fireEvent.click(screen.getByText('simple sine waves'));
      expect(mockToggleSettingsPanel).toHaveBeenCalled();
    });

    it('toggles the chrome when the background surface is tapped', () => {
      const { container } = render(<MobileInteractivity />);
      const root = container.querySelector('.mobile-explore')!;
      const surface = screen.getByRole('button', {
        name: /hide background controls/i,
      });

      expect(root).toHaveClass('chrome-visible');

      fireEvent.click(surface);
      expect(root).toHaveClass('chrome-hidden');

      fireEvent.click(
        screen.getByRole('button', { name: /show background controls/i })
      );
      expect(root).toHaveClass('chrome-visible');
    });

    it('stands the chrome down while the settings panel owns the screen', () => {
      mockShowSettingsPanel = true;
      const { container } = render(<MobileInteractivity />);

      expect(container.querySelector('.mobile-explore')).toHaveClass(
        'chrome-hidden'
      );
    });

    it('dismisses an open settings sheet when the background behind it is tapped', () => {
      mockShowSettingsPanel = true;
      render(<MobileInteractivity />);

      fireEvent.click(screen.getByRole('button', { name: /close settings/i }));

      expect(mockCloseSettingsPanel).toHaveBeenCalled();
      // The sheet's backdrop must not double as the chrome toggle, or closing
      // it would leave the control bar in whatever state the tap flipped it to.
      expect(mockToggleSettingsPanel).not.toHaveBeenCalled();
    });

    it('restores the page content on close', () => {
      render(<MobileInteractivity />);

      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockSetContentHidden).toHaveBeenCalledWith(false);
    });

    it('flags explore mode on the body so page chrome can stand down', () => {
      const { unmount } = render(<MobileInteractivity />);
      expect(document.body.classList.contains('mobile-explore-active')).toBe(
        true
      );

      unmount();
      expect(document.body.classList.contains('mobile-explore-active')).toBe(
        false
      );
    });
  });

  describe('the tap hint', () => {
    it('retires itself after a few seconds', () => {
      jest.useFakeTimers();
      try {
        const { container, rerender } = render(<MobileInteractivity />);

        fireEvent.click(
          screen.getByRole('button', {
            name: /explore the animated background/i,
          })
        );
        mockIsContentHidden = true;
        rerender(<MobileInteractivity />);

        expect(container.querySelector('.mobile-explore-hint')).toHaveClass(
          'visible'
        );

        act(() => {
          jest.advanceTimersByTime(5000);
        });

        expect(container.querySelector('.mobile-explore-hint')).not.toHaveClass(
          'visible'
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
