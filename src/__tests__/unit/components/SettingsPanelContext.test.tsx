import { act, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import {
  SettingsPanelProvider,
  useSettingsPanel,
} from '../../../components/SettingsPanelContext';

describe('SettingsPanelContext', () => {
  describe('SettingsPanelProvider', () => {
    it('should render children correctly', () => {
      render(
        <SettingsPanelProvider>
          <div data-testid="test-child">Test Content</div>
        </SettingsPanelProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should provide initial state values', () => {
      const TestComponent = () => {
        const { isSettingsPanelOpen, isClosingSettingsPanel } =
          useSettingsPanel();
        return (
          <div>
            <span data-testid="panel-open">{String(isSettingsPanelOpen)}</span>
            <span data-testid="panel-closing">
              {String(isClosingSettingsPanel)}
            </span>
          </div>
        );
      };

      render(
        <SettingsPanelProvider>
          <TestComponent />
        </SettingsPanelProvider>
      );

      expect(screen.getByTestId('panel-open')).toHaveTextContent('false');
      expect(screen.getByTestId('panel-closing')).toHaveTextContent('false');
    });

    it('should update panel open state correctly', () => {
      const TestComponent = () => {
        const { isSettingsPanelOpen, setSettingsPanelOpen } =
          useSettingsPanel();
        return (
          <div>
            <span data-testid="panel-open">{String(isSettingsPanelOpen)}</span>
            <button
              data-testid="open-panel"
              onClick={() => setSettingsPanelOpen(true)}
            >
              Open Panel
            </button>
            <button
              data-testid="close-panel"
              onClick={() => setSettingsPanelOpen(false)}
            >
              Close Panel
            </button>
          </div>
        );
      };

      render(
        <SettingsPanelProvider>
          <TestComponent />
        </SettingsPanelProvider>
      );

      const panelOpenElement = screen.getByTestId('panel-open');
      const openButton = screen.getByTestId('open-panel');
      const closeButton = screen.getByTestId('close-panel');

      // Initial state
      expect(panelOpenElement).toHaveTextContent('false');

      // Open panel
      act(() => {
        openButton.click();
      });
      expect(panelOpenElement).toHaveTextContent('true');

      // Close panel
      act(() => {
        closeButton.click();
      });
      expect(panelOpenElement).toHaveTextContent('false');
    });

    it('should update panel closing state correctly', () => {
      const TestComponent = () => {
        const { isClosingSettingsPanel, setClosingSettingsPanel } =
          useSettingsPanel();
        return (
          <div>
            <span data-testid="panel-closing">
              {String(isClosingSettingsPanel)}
            </span>
            <button
              data-testid="start-closing"
              onClick={() => setClosingSettingsPanel(true)}
            >
              Start Closing
            </button>
            <button
              data-testid="stop-closing"
              onClick={() => setClosingSettingsPanel(false)}
            >
              Stop Closing
            </button>
          </div>
        );
      };

      render(
        <SettingsPanelProvider>
          <TestComponent />
        </SettingsPanelProvider>
      );

      const panelClosingElement = screen.getByTestId('panel-closing');
      const startClosingButton = screen.getByTestId('start-closing');
      const stopClosingButton = screen.getByTestId('stop-closing');

      // Initial state
      expect(panelClosingElement).toHaveTextContent('false');

      // Start closing
      act(() => {
        startClosingButton.click();
      });
      expect(panelClosingElement).toHaveTextContent('true');

      // Stop closing
      act(() => {
        stopClosingButton.click();
      });
      expect(panelClosingElement).toHaveTextContent('false');
    });

    it('should handle multiple state changes correctly', () => {
      const TestComponent = () => {
        const {
          isSettingsPanelOpen,
          isClosingSettingsPanel,
          setSettingsPanelOpen,
          setClosingSettingsPanel,
        } = useSettingsPanel();
        return (
          <div>
            <span data-testid="panel-open">{String(isSettingsPanelOpen)}</span>
            <span data-testid="panel-closing">
              {String(isClosingSettingsPanel)}
            </span>
            <button
              data-testid="open-panel"
              onClick={() => setSettingsPanelOpen(true)}
            >
              Open
            </button>
            <button
              data-testid="close-panel"
              onClick={() => setSettingsPanelOpen(false)}
            >
              Close
            </button>
            <button
              data-testid="start-closing"
              onClick={() => setClosingSettingsPanel(true)}
            >
              Start Closing
            </button>
            <button
              data-testid="stop-closing"
              onClick={() => setClosingSettingsPanel(false)}
            >
              Stop Closing
            </button>
          </div>
        );
      };

      render(
        <SettingsPanelProvider>
          <TestComponent />
        </SettingsPanelProvider>
      );

      const panelOpenElement = screen.getByTestId('panel-open');
      const panelClosingElement = screen.getByTestId('panel-closing');

      // Multiple state transitions
      act(() => {
        screen.getByTestId('open-panel').click();
        screen.getByTestId('start-closing').click();
      });

      expect(panelOpenElement).toHaveTextContent('true');
      expect(panelClosingElement).toHaveTextContent('true');

      act(() => {
        screen.getByTestId('stop-closing').click();
        screen.getByTestId('close-panel').click();
      });

      expect(panelOpenElement).toHaveTextContent('false');
      expect(panelClosingElement).toHaveTextContent('false');
    });

    it('should maintain independent state for multiple instances', () => {
      const TestComponent = ({ testId }: { testId: string }) => {
        const { isSettingsPanelOpen, setSettingsPanelOpen } =
          useSettingsPanel();
        return (
          <div>
            <span data-testid={`panel-open-${testId}`}>
              {String(isSettingsPanelOpen)}
            </span>
            <button
              data-testid={`open-panel-${testId}`}
              onClick={() => setSettingsPanelOpen(true)}
            >
              Open
            </button>
          </div>
        );
      };

      // Test that state is shared within the same provider
      render(
        <SettingsPanelProvider>
          <TestComponent testId="1" />
          <TestComponent testId="2" />
        </SettingsPanelProvider>
      );

      const panel1 = screen.getByTestId('panel-open-1');
      const panel2 = screen.getByTestId('panel-open-2');
      const button1 = screen.getByTestId('open-panel-1');

      // Initial state
      expect(panel1).toHaveTextContent('false');
      expect(panel2).toHaveTextContent('false');

      // Opening from one component should affect both
      act(() => {
        button1.click();
      });

      expect(panel1).toHaveTextContent('true');
      expect(panel2).toHaveTextContent('true');
    });
  });

  describe('useSettingsPanel Hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSettingsPanel());
      }).toThrow(
        'useSettingsPanel must be used within a SettingsPanelProvider'
      );
    });

    it('should return context values when used within provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SettingsPanelProvider>{children}</SettingsPanelProvider>
      );

      const { result } = renderHook(() => useSettingsPanel(), { wrapper });

      expect(result.current.isSettingsPanelOpen).toBe(false);
      expect(result.current.isClosingSettingsPanel).toBe(false);
      expect(typeof result.current.setSettingsPanelOpen).toBe('function');
      expect(typeof result.current.setClosingSettingsPanel).toBe('function');
    });

    it('should update state when calling setters', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SettingsPanelProvider>{children}</SettingsPanelProvider>
      );

      const { result } = renderHook(() => useSettingsPanel(), { wrapper });

      // Test setSettingsPanelOpen
      act(() => {
        result.current.setSettingsPanelOpen(true);
      });
      expect(result.current.isSettingsPanelOpen).toBe(true);

      act(() => {
        result.current.setSettingsPanelOpen(false);
      });
      expect(result.current.isSettingsPanelOpen).toBe(false);

      // Test setClosingSettingsPanel
      act(() => {
        result.current.setClosingSettingsPanel(true);
      });
      expect(result.current.isClosingSettingsPanel).toBe(true);

      act(() => {
        result.current.setClosingSettingsPanel(false);
      });
      expect(result.current.isClosingSettingsPanel).toBe(false);
    });

    it('should handle rapid state changes', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SettingsPanelProvider>{children}</SettingsPanelProvider>
      );

      const { result } = renderHook(() => useSettingsPanel(), { wrapper });

      // Rapid state changes
      act(() => {
        result.current.setSettingsPanelOpen(true);
        result.current.setClosingSettingsPanel(true);
        result.current.setSettingsPanelOpen(false);
        result.current.setClosingSettingsPanel(false);
        result.current.setSettingsPanelOpen(true);
      });

      expect(result.current.isSettingsPanelOpen).toBe(true);
      expect(result.current.isClosingSettingsPanel).toBe(false);
    });
  });
});
