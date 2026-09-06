import React, { useCallback, useEffect, useRef } from 'react';
import { siteConfig } from '../../config';
import { useNotFound } from '../../lib/notFound';
import { useBackground } from '../BackgroundProvider';
import { useSettingsPanel } from '../SettingsPanelContext';
import BackgroundControls from './BackgroundControls';
import MobileInteractivity from './MobileInteractivity';
import { useIsMobileViewport } from './core/useIsMobileViewport';
import { usePrefersReducedMotion } from './core/usePrefersReducedMotion';

interface BackgroundManagerProps {
  className?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({ className }) => {
  // Use contexts
  const { isContentHidden, setContentHidden } = useSettingsPanel();
  const isMobile = useIsMobileViewport();

  // The 404 page is a sequence the background plays — it comes apart into
  // the number over several seconds and then holds. Whichever background was
  // on screen when the reader hit the missing page is the one that plays it:
  // arriving from inside the site that is the one they were looking at, and
  // on a cold load it is the one the visit drew. The cycle holds while the
  // page is up, because advancing would fade the field to black and start a
  // different background's sequence from nothing every twelve seconds. The
  // arrow keys still switch, and the next background plays its own.
  const notFound = useNotFound();

  // Mobile reaches the backgrounds by hiding the page content (see
  // MobileInteractivity), which is a deliberate "let me look at / tune this
  // one" gesture — auto-advancing out from under it would fight the user.
  // Desktop's H key is a passive lean-back view, so it keeps cycling.
  const cyclePaused = (isMobile && isContentHidden) || notFound;
  const {
    state,
    switchToNextBackground,
    switchToPreviousBackground,
    updateCurrentSettings,
    resetCurrentSettings,
    toggleSettingsPanel,
    closeSettingsPanel,
    audioControls,
    setAudioControls,
    overlayOpacity,
    setOverlayOpacity,
    currentBackground,
    currentSettings,
    mounted,
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

      // Already taken by something closer to the user — the shortcuts list
      // closing on Escape, say.
      if (event.defaultPrevented) return;

      switch (event.code) {
        case 'Escape':
          if (state.showSettingsPanel && !state.closingSettingsPanel) {
            event.preventDefault();
            closeSettingsPanel();
          }
          break;
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
      closeSettingsPanel,
      state.showSettingsPanel,
      state.closingSettingsPanel,
    ]
  );

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Safety mechanism: ensure the background is visible on mount. Reads the
  // overlay through a ref because an empty dep array otherwise pins the check
  // to the mount-time value, which is always 0 — the guard could never fire.
  const overlayOpacityRef = useRef(overlayOpacity);
  overlayOpacityRef.current = overlayOpacity;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (overlayOpacityRef.current === 1) {
        // If overlay is still black after 500ms, make background visible
        setOverlayOpacity(0);
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // ===== Background cycling with fade to black overlay =====
  const playDurationMs =
    siteConfig.animatedBackgrounds?.playDurationMs ?? 12000;
  const fadeDurationMs = siteConfig.animatedBackgrounds?.fadeDurationMs ?? 1200;
  const cycleEnabled = siteConfig.animatedBackgrounds?.cycleEnabled ?? true;

  // Someone who asked the OS for less motion gets a still: the cycle stops
  // (no fullscreen fade-to-black and fresh WebGL scene every twelve seconds)
  // and the current background draws one frame and holds it — `frozen` below.
  // Read through the hook rather than sampled inside the cycling effect, so
  // that toggling the preference mid-session takes effect instead of waiting
  // for some unrelated dependency to change.
  const prefersReducedMotion = usePrefersReducedMotion();

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
      cyclePaused ||
      prefersReducedMotion ||
      !cycleEnabled
    ) {
      clearTimers();
      setOverlayOpacity(0); // Never strand the user on the fade-to-black frame
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
    cyclePaused,
    prefersReducedMotion,
  ]);

  // When the settings panel fully closes, resume cycle from visible phase
  useEffect(() => {
    if (!state.showSettingsPanel && !state.closingSettingsPanel) {
      // Mark to resume from visible on next cycle effect run
      resumeFromVisibleRef.current = true;
    }
  }, [state.showSettingsPanel, state.closingSettingsPanel]);

  // Backgrounds that make sound hand their transport up through this; the
  // settings panel's play button is the only way to reach it without a
  // keyboard. Held in a ref-stable callback so publishing controls cannot
  // remount the background that just published them.
  const publishAudioControls = useCallback(
    (startAudio: () => void, stopAudio: () => void, isPlaying: boolean) => {
      setAudioControls({ startAudio, stopAudio, isPlaying });
    },
    [setAudioControls]
  );

  // A silent background must not inherit the previous one's transport.
  useEffect(() => {
    return () => {
      setAudioControls({ startAudio: null, stopAudio: null, isPlaying: false });
    };
  }, [state.currentBackgroundId, setAudioControls]);

  // Render current background. The components are React.lazy (see each
  // background's config.ts) so the simulations — and three.js — stay out of
  // the page bundles; the null fallback is invisible because a background
  // fades in from the black overlay anyway.
  const renderCurrentBackground = () => {
    if (!currentBackground) return null;

    const BackgroundComponent = currentBackground.component;
    return (
      <React.Suspense fallback={null}>
        <BackgroundComponent
          className={className}
          settings={currentSettings}
          frozen={prefersReducedMotion}
          notFound={notFound}
          onAudioControlsReady={publishAudioControls}
        />
      </React.Suspense>
    );
  };

  // Defer all background DOM until after client mount. SSR renders nothing for
  // the background (no gatsby-ssr wrapRootElement), so rendering null on the
  // first client render keeps hydration identical and avoids mismatches.
  if (!mounted) return null;

  return (
    <>
      {/* Constant backing the simulations composite onto, so the set reads the
          same in both themes rather than picking up the page colour. */}
      <div className="background-stage" aria-hidden="true" />
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
        currentBackgroundName={
          currentBackground?.shortName || currentBackground?.name || 'unknown'
        }
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
        onResetSettings={resetCurrentSettings}
        onCloseSettings={closeSettingsPanel}
        onStartAudio={audioControls.startAudio || undefined}
        onStopAudio={audioControls.stopAudio || undefined}
        isAudioPlaying={audioControls.isPlaying}
      />

      {/* Touch equivalent of the keyboard controls; mobile-only via CSS */}
      <MobileInteractivity />
    </>
  );
};

export default BackgroundManager;
