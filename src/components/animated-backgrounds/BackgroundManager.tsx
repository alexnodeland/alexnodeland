import React, { useCallback, useEffect, useRef } from 'react';
import { siteConfig } from '../../config';
import { useBackground } from '../BackgroundProvider';
import { useSettingsPanel } from '../SettingsPanelContext';
import BackgroundControls from './BackgroundControls';

interface BackgroundManagerProps {
  className?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({ className }) => {
  // Use contexts
  const { isContentHidden, setContentHidden } = useSettingsPanel();
  const {
    state,
    switchToNextBackground,
    switchToPreviousBackground,
    updateCurrentSettings,
    toggleSettingsPanel,
    closeSettingsPanel,
    audioControls,
    overlayOpacity,
    setOverlayOpacity,
    currentBackground,
    currentSettings,
  } = useBackground();

  // Toggle content visibility
  const toggleContentHidden = useCallback(() => {
    setContentHidden(!isContentHidden);
  }, [isContentHidden, setContentHidden]);

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

  // Safety mechanism: ensure background is visible on mount
  useEffect(() => {
    // Set a short delay to ensure background is visible regardless of cycling state
    const timer = setTimeout(() => {
      if (overlayOpacity === 1) {
        // If overlay is still black after 500ms, make background visible
        setOverlayOpacity(0);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

  // ===== Background cycling with fade to black overlay =====
  const playDurationMs =
    siteConfig.animatedBackgrounds?.playDurationMs ?? 12000;
  const fadeDurationMs = siteConfig.animatedBackgrounds?.fadeDurationMs ?? 1200;
  const cycleEnabled = siteConfig.animatedBackgrounds?.cycleEnabled ?? true;

  const fadeInTimeoutRef = useRef<number | null>(null);
  const playTimeoutRef = useRef<number | null>(null);
  const fadeOutTimeoutRef = useRef<number | null>(null);
  const resumeFromVisibleRef = useRef<boolean>(false);

  const clearTimers = useCallback(() => {
    if (fadeInTimeoutRef.current) {
      clearTimeout(fadeInTimeoutRef.current);
      fadeInTimeoutRef.current = null;
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
      fadeOutTimeoutRef.current = null;
    }
  }, []);

  // Background cycling effect
  useEffect(() => {
    // Disable cycling when panel is open or closing
    if (
      state.showSettingsPanel ||
      state.closingSettingsPanel ||
      !cycleEnabled
    ) {
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

      // Normal cycle: show background immediately, then after play duration fade to black and switch
      setOverlayOpacity(0); // Ensure background is visible
      playTimeoutRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setOverlayOpacity(1); // Fade to black
        fadeOutTimeoutRef.current = window.setTimeout(() => {
          if (cancelled) return;
          switchToNextBackground();
          setOverlayOpacity(0); // Show new background immediately
          startCycle(); // Continue cycle
        }, fadeDurationMs);
      }, playDurationMs);
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
    setOverlayOpacity,
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
    if (!currentBackground) return null;

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
        onStartAudio={audioControls.startAudio || undefined}
        onStopAudio={audioControls.stopAudio || undefined}
        isAudioPlaying={audioControls.isPlaying}
      />
    </>
  );
};

export default BackgroundManager;
