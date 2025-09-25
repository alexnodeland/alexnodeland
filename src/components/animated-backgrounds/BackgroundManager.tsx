import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackgroundManagerState,
  BackgroundSettings,
} from '../../types/animated-backgrounds';
import BackgroundControls from './BackgroundControls';
import { backgroundRegistry, getBackgroundById } from './index';
// import SettingsPanel from './SettingsPanel';
import { siteConfig } from '../../config';
import { useSettingsPanel } from '../SettingsPanelContext';

interface BackgroundManagerProps {
  className?: string;
  initialBackgroundId?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  className,
  initialBackgroundId = 'cellular-automaton',
}) => {
  // Use settings panel context
  const {
    setSettingsPanelOpen,
    setClosingSettingsPanel,
    isContentHidden,
    setContentHidden,
  } = useSettingsPanel();

  // Initialize state with default settings for all backgrounds
  const [state, setState] = useState<BackgroundManagerState>(() => {
    const initialSettings: Record<string, BackgroundSettings> = {};
    backgroundRegistry.forEach(bg => {
      initialSettings[bg.id] = { ...bg.defaultSettings };
    });

    return {
      currentBackgroundId: initialBackgroundId,
      settings: initialSettings,
      showSettingsPanel: false,
      closingSettingsPanel: false,
    };
  });

  // Get current background configuration
  const currentBackground = useMemo(() => {
    return getBackgroundById(state.currentBackgroundId);
  }, [state.currentBackgroundId]);

  // Get current background settings
  const currentSettings = useMemo(() => {
    return state.settings[state.currentBackgroundId];
  }, [state.settings, state.currentBackgroundId]);

  // Switch to next background
  const switchToNextBackground = useCallback(() => {
    setState(prev => {
      const currentIndex = backgroundRegistry.findIndex(
        bg => bg.id === prev.currentBackgroundId
      );
      const nextIndex = (currentIndex + 1) % backgroundRegistry.length;
      const nextBackgroundId = backgroundRegistry[nextIndex].id;
      return {
        ...prev,
        currentBackgroundId: nextBackgroundId,
      };
    });
  }, []);

  // Switch to previous background
  const switchToPreviousBackground = useCallback(() => {
    setState(prev => {
      const currentIndex = backgroundRegistry.findIndex(
        bg => bg.id === prev.currentBackgroundId
      );
      const previousIndex =
        currentIndex <= 0 ? backgroundRegistry.length - 1 : currentIndex - 1;
      const previousBackgroundId = backgroundRegistry[previousIndex].id;
      return {
        ...prev,
        currentBackgroundId: previousBackgroundId,
      };
    });
  }, []);

  // Close settings panel with animation
  const closeSettingsPanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      closingSettingsPanel: true,
    }));

    // Start closing animation - keep panel "open" state until animation finishes
    setClosingSettingsPanel(true);

    // After animation completes, fully close everything
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        showSettingsPanel: false,
        closingSettingsPanel: false,
      }));

      // Update context - panel is now fully closed
      setSettingsPanelOpen(false);
      setClosingSettingsPanel(false);
    }, 300);
  }, [setSettingsPanelOpen, setClosingSettingsPanel]);

  // Toggle settings panel
  const toggleSettingsPanel = useCallback(() => {
    if (state.showSettingsPanel) {
      // If closing, use the close animation
      closeSettingsPanel();
    } else {
      // If opening, show immediately
      setState(prev => ({
        ...prev,
        showSettingsPanel: true,
        closingSettingsPanel: false,
      }));

      // Update context to trigger layout changes
      setSettingsPanelOpen(true);
      setClosingSettingsPanel(false);
    }
  }, [
    state.showSettingsPanel,
    closeSettingsPanel,
    setSettingsPanelOpen,
    setClosingSettingsPanel,
  ]);

  // Toggle content visibility
  const toggleContentHidden = useCallback(() => {
    setContentHidden(!isContentHidden);
  }, [isContentHidden, setContentHidden]);

  // Update settings for current background
  const updateCurrentSettings = useCallback(
    (newSettings: BackgroundSettings) => {
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          [state.currentBackgroundId]: newSettings,
        },
      }));
    },
    [state.currentBackgroundId]
  );

  // Reset current background to default settings
  // const resetToDefaults = useCallback(() => {
  //   if (currentBackground) {
  //     updateCurrentSettings({ ...currentBackground.defaultSettings });
  //   }
  // }, [currentBackground, updateCurrentSettings]);

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only handle key events if not focused on an input element
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          switchToPreviousBackground();
          break;
        case 'ArrowRight':
          event.preventDefault();
          switchToNextBackground();
          break;
        case 'KeyS':
          event.preventDefault();
          toggleSettingsPanel();
          break;
        case 'KeyH':
          event.preventDefault();
          toggleContentHidden();
          break;
      }
    },
    [
      switchToNextBackground,
      switchToPreviousBackground,
      toggleSettingsPanel,
      toggleContentHidden,
    ]
  );

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('animatedBackgroundSettings', JSON.stringify(state));
    } catch (error) {
      console.warn(
        'Failed to save background settings to localStorage:',
        error
      );
    }
  }, [state]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('animatedBackgroundSettings');
      if (saved) {
        const parsedState = JSON.parse(saved);
        // Validate that the saved background still exists
        if (getBackgroundById(parsedState.currentBackgroundId)) {
          setState(prev => ({
            ...prev,
            ...parsedState,
            showSettingsPanel: false, // Never restore panel open state
          }));
        }
      }
    } catch (error) {
      console.warn(
        'Failed to load background settings from localStorage:',
        error
      );
    }
  }, []);

  // ===== Background cycling with fade to black overlay =====
  const playDurationMs =
    siteConfig.animatedBackgrounds?.playDurationMs ?? 12000;
  const fadeDurationMs = siteConfig.animatedBackgrounds?.fadeDurationMs ?? 1200;
  const cycleEnabled = siteConfig.animatedBackgrounds?.cycleEnabled ?? true;

  const [overlayOpacity, setOverlayOpacity] = useState<number>(1);
  const fadeInTimeoutRef = useRef<number | null>(null);
  const playTimeoutRef = useRef<number | null>(null);
  const fadeOutTimeoutRef = useRef<number | null>(null);
  const resumeFromVisibleRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (fadeInTimeoutRef.current !== null) {
      window.clearTimeout(fadeInTimeoutRef.current);
      fadeInTimeoutRef.current = null;
    }
    if (playTimeoutRef.current !== null) {
      window.clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (fadeOutTimeoutRef.current !== null) {
      window.clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Disable cycling when panel is open or closing
    if (
      !cycleEnabled ||
      state.showSettingsPanel ||
      state.closingSettingsPanel
    ) {
      setOverlayOpacity(0);
      clearTimers();
      return;
    }

    let cancelled = false;

    const startCycle = () => {
      if (cancelled) return;

      if (resumeFromVisibleRef.current) {
        // Panel just closed: keep visible, wait the play duration, then fade out to next
        resumeFromVisibleRef.current = false;
        setOverlayOpacity(0);
        playTimeoutRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setOverlayOpacity(1);
          fadeOutTimeoutRef.current = window.setTimeout(() => {
            if (cancelled) return;
            switchToNextBackground();
            startCycle();
          }, fadeDurationMs);
        }, playDurationMs);
        return;
      }

      // Normal cycle: fade up from black, play, fade to black, switch
      setOverlayOpacity(1);
      fadeInTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setOverlayOpacity(0);
        playTimeoutRef.current = window.setTimeout(() => {
          if (cancelled) return;
          setOverlayOpacity(1);
          fadeOutTimeoutRef.current = window.setTimeout(() => {
            if (cancelled) return;
            switchToNextBackground();
            startCycle();
          }, fadeDurationMs);
        }, playDurationMs + fadeDurationMs);
      }, 20);
    };

    startCycle();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [
    cycleEnabled,
    playDurationMs,
    fadeDurationMs,
    clearTimers,
    switchToNextBackground,
    state.showSettingsPanel,
    state.closingSettingsPanel,
  ]);

  // When the settings panel fully closes, resume cycle from visible phase
  useEffect(() => {
    if (!state.showSettingsPanel && !state.closingSettingsPanel) {
      // Mark to resume from visible on next cycle effect run
      resumeFromVisibleRef.current = true;
    }
  }, [state.showSettingsPanel, state.closingSettingsPanel]);

  // Render current background
  const renderCurrentBackground = () => {
    if (!currentBackground || !currentSettings) {
      return null;
    }

    const BackgroundComponent = currentBackground.component;
    return (
      <BackgroundComponent className={className} settings={currentSettings} />
    );
  };

  return (
    <>
      {renderCurrentBackground()}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          backgroundColor: '#000',
          opacity: overlayOpacity,
          transition: cycleEnabled
            ? `opacity ${fadeDurationMs}ms ease-in-out`
            : 'none',
        }}
      />

      {/* Background Controls */}
      <BackgroundControls
        currentBackgroundId={state.currentBackgroundId}
        currentBackgroundName={currentBackground?.name || 'Unknown'}
        showSettingsPanel={
          state.showSettingsPanel || state.closingSettingsPanel
        }
        closingSettingsPanel={state.closingSettingsPanel}
        onPreviousBackground={switchToPreviousBackground}
        onNextBackground={switchToNextBackground}
        onToggleSettings={toggleSettingsPanel}
        settings={currentSettings}
        settingsSchema={currentBackground?.settingsSchema}
        onSettingsChange={updateCurrentSettings}
        onCloseSettings={closeSettingsPanel}
      />

      {/* Settings panel moved into BackgroundControls anchor */}
    </>
  );
};

export default BackgroundManager;
