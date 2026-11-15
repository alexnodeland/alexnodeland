import React, { useCallback, useEffect, useRef, useState } from 'react';
import { siteConfig } from '../../config';
import { useNotFound } from '../../lib/notFound';
import { isShortcutKey } from '../../lib/utils/keys';
import { useBackground } from '../BackgroundProvider';
import { useSettingsPanel } from '../SettingsPanelContext';
import PointerLight from '../ui/PointerLight';
import { backgroundRegistry, getBackgroundById } from './index';
import BackgroundControls from './BackgroundControls';
import MobileInteractivity from './MobileInteractivity';
import { fieldTouchedAt } from './core/stage/pointer';
import { useIsMobileViewport } from './core/useIsMobileViewport';
import { usePrefersReducedMotion } from './core/usePrefersReducedMotion';

// How long the cycle waits after the field was last pressed, dragged across
// or tapped before it will move on. A simulation somebody is in the middle of
// pushing around is not taken out from under their hand: the twelve seconds
// are for watching, and this is for playing.
export const TOUCH_HOLD_MS = 9000;

// How long a background is given to leave when the reader asked for the next
// one by hand. Shorter than the cycle's: an arrow key is waiting on it.
export const ASKED_LEAVE_MS = 650;

// How long a background has had the field before the ones either side of it
// are fetched, so the first step in either direction has nothing to wait on.
const PRELOAD_AFTER_MS = 2500;

/**
 * How much longer the cycle has to wait for a hand on the field, in
 * milliseconds: zero when the field has not been touched, or was last touched
 * longer ago than the hold.
 */
export const touchHoldRemaining = (
  now: number,
  touchedAt: number,
  holdMs: number = TOUCH_HOLD_MS
): number => {
  if (!(touchedAt > 0)) return 0;
  return Math.max(0, holdMs - (now - touchedAt));
};

interface BackgroundManagerProps {
  className?: string;
}

const BackgroundManager: React.FC<BackgroundManagerProps> = ({ className }) => {
  // Use contexts
  const { isContentHidden, setContentHidden } = useSettingsPanel();
  const isMobile = useIsMobileViewport();

  // The 404 page is a sequence every background has — its own problem with
  // the number as the input — and the flag is simply handed to whichever
  // background is on screen. The cycle runs on the 404 as it does on every
  // other page: each background that comes up plays its sequence from the
  // start, and the arrow keys switch the same way.
  const notFound = useNotFound();

  // Mobile reaches the backgrounds by hiding the page content (see
  // MobileInteractivity), which is a deliberate "let me look at / tune this
  // one" gesture — auto-advancing out from under it would fight the user.
  // Desktop's H key is a passive lean-back view, so it keeps cycling.
  const cyclePaused = isMobile && isContentHidden;
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
    currentBackground,
    currentSettings,
    mounted,
  } = useBackground();

  // Toggle content visibility
  const toggleContentHidden = useCallback(() => {
    setContentHidden(!isContentHidden);
  }, [isContentHidden, setContentHidden]);

  // Keyboard event handler. Single, unmodified keys only, typed into nothing
  // — ⌘S is the browser's save and Ctrl+H its history, and a select in the
  // settings panel owns its own arrow keys. Anything already taken by
  // something closer to the user (the shortcuts list closing on Escape, say)
  // is left alone too.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isShortcutKey(event)) return;

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

  // ===== The cycle, and the hand-over between two backgrounds =====
  const playDurationMs =
    siteConfig.animatedBackgrounds?.playDurationMs ?? 12000;
  const leaveDurationMs =
    siteConfig.animatedBackgrounds?.leaveDurationMs ?? 1100;
  const cycleEnabled = siteConfig.animatedBackgrounds?.cycleEnabled ?? true;

  // Someone who asked the OS for less motion gets a still: the cycle stops
  // (no scene taking itself apart and another assembling every twelve seconds)
  // and the current background draws one frame and holds it — `frozen` below.
  // Read through the hook rather than sampled inside the cycling effect, so
  // that toggling the preference mid-session takes effect instead of waiting
  // for some unrelated dependency to change.
  const prefersReducedMotion = usePrefersReducedMotion();

  // Which background is on the field, as against which one is current.
  //
  // They differ for as long as a leaving takes. Changing background changes
  // the provider's state at once — the pill says the new name, the panel
  // holds the new settings — but the scene that was up is not cut: it is told
  // it is leaving, given its time to go in its own way (core/stage/passage.ts),
  // and only then replaced. Asked for twice in that time, the field goes
  // straight to the latest; asked to go back to the one still leaving, it is
  // told to stay and returns from wherever it had got to.
  const currentId = state.currentBackgroundId;
  const [shownId, setShownId] = useState<string | null>(null);
  const displayId = mounted ? (shownId ?? currentId) : null;
  const leaving = displayId !== null && displayId !== currentId;

  const currentIdRef = useRef(currentId);
  currentIdRef.current = currentId;
  // Whether the step being taken is the cycle's own, which is unhurried, or
  // the reader's. Settled once, in the render the leaving begins in, because
  // that is the render the scene is told in.
  const cycleStepRef = useRef(false);
  const leaveMsRef = useRef(ASKED_LEAVE_MS);
  const wasLeavingRef = useRef(false);
  if (leaving && !wasLeavingRef.current) {
    leaveMsRef.current = cycleStepRef.current
      ? leaveDurationMs
      : ASKED_LEAVE_MS;
  }
  if (leaving !== wasLeavingRef.current) cycleStepRef.current = false;
  wasLeavingRef.current = leaving;

  useEffect(() => {
    if (!mounted) return;
    if (!leaving || prefersReducedMotion) {
      // Nothing up yet, nothing to leave, or a still — which has no movement
      // to leave by, and is simply replaced.
      setShownId(currentIdRef.current);
      return;
    }
    const timer = window.setTimeout(
      () => setShownId(currentIdRef.current),
      leaveMsRef.current
    );
    return () => window.clearTimeout(timer);
  }, [mounted, leaving, prefersReducedMotion]);

  // The neighbours' code, fetched once the one on the field has settled in.
  useEffect(() => {
    if (!displayId || leaving) return;
    const timer = window.setTimeout(() => {
      const index = backgroundRegistry.findIndex(bg => bg.id === displayId);
      if (index < 0) return;
      const count = backgroundRegistry.length;
      for (const step of [1, count - 1]) {
        backgroundRegistry[(index + step) % count].preload?.().catch(() => {
          // Not there to be had: it will be asked for again when it is due.
        });
      }
    }, PRELOAD_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [displayId, leaving]);

  const playTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
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
      return;
    }

    let cancelled = false;

    // The end of a background's turn — unless a hand is on the field, or was
    // a moment ago, in which case the turn is extended until it has been off
    // it for the hold. Asked again each time the extension runs out, since
    // the hand may not have left.
    const whenFieldIsFree = (proceed: () => void) => {
      if (cancelled) return;
      const wait = touchHoldRemaining(performance.now(), fieldTouchedAt());
      if (wait <= 0) {
        proceed();
        return;
      }
      playTimeoutRef.current = window.setTimeout(
        () => whenFieldIsFree(proceed),
        wait
      );
    };

    // A turn is the play time, and for every turn but the first the time the
    // one before spent leaving, which the new one does not get to be seen in.
    const takeTurn = (handOverMs: number) => {
      if (cancelled) return;
      playTimeoutRef.current = window.setTimeout(() => {
        whenFieldIsFree(() => {
          cycleStepRef.current = true;
          switchToNextBackground();
          takeTurn(leaveDurationMs);
        });
      }, playDurationMs + handOverMs);
    };

    takeTurn(0);

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [
    cycleEnabled,
    playDurationMs,
    leaveDurationMs,
    clearTimers,
    switchToNextBackground,
    state.showSettingsPanel,
    state.closingSettingsPanel,
    cyclePaused,
    prefersReducedMotion,
  ]);

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
  // the page bundles; the null fallback is invisible because what a scene
  // arrives onto is the same flat ground.
  const shownBackground =
    displayId === null || displayId === currentId
      ? currentBackground
      : getBackgroundById(displayId);
  const shownSettings =
    displayId === null || displayId === currentId
      ? currentSettings
      : state.settings[displayId];

  const renderCurrentBackground = () => {
    if (!shownBackground) return null;

    const BackgroundComponent = shownBackground.component;
    return (
      <React.Suspense fallback={null}>
        {/* The layer the simulation arrives on, and the reason it is a layer
            rather than nothing.

            A background is lazy twice over — a chunk to fetch, then three.js,
            then a first frame to compute — so on a phone it lands a couple of
            seconds after the page. How it then comes on is the scene's own
            business (it assembles: see core/stage/passage.ts); this is only
            the short lift that covers a canvas appearing at all.

            Inside the Suspense boundary on purpose: React commits this and the
            simulation in the same pass. Fixed, on the stage's own depth and a
            stacking context of its own (see .background-arrival), so the
            canvas's negative z-index resolves in here rather than at the
            root. Keyed, so that one background following another is a new
            scene rather than the old one handed new settings. */}
        <div className="background-arrival" key={shownBackground.id}>
          <BackgroundComponent
            className={className}
            settings={shownSettings}
            frozen={prefersReducedMotion}
            notFound={notFound}
            leaving={leaving}
            leaveMs={leaveMsRef.current}
            onAudioControlsReady={publishAudioControls}
          />
        </div>
      </React.Suspense>
    );
  };

  // What has to wait for the client, and what does not.
  //
  // The simulation does: it is React.lazy, it is WebGL, and which one runs is
  // a random pick or a restored setting — none of which the server can render.
  // The chrome around it does not. The provider starts on a fixed default (see
  // BackgroundProvider), so the pill's markup is the same on the server as it
  // is on the first client render, which is the whole condition for shipping
  // it: it can be in the page from the first frame and enter alongside the
  // chat pill in the opposite corner, rather than popping into the corner a
  // second later once the bundle has landed. Past mount the name inside it may
  // swap for the one actually running — a word changing inside a pill whose
  // width is the rail's own, so nothing moves.
  //
  // The ground goes down early for the same reason: it is one flat colour, and
  // it is what the page is composited over.

  return (
    <>
      {/* Constant backing the simulations composite onto, so the set reads the
          same in both themes rather than picking up the page colour. */}
      <div className="background-stage" aria-hidden="true" />
      {mounted && renderCurrentBackground()}
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

      {/* The light the pointer carries across the glass (ui/PointerLight):
          the page's answer to the pointer, where the field's own is the
          simulation's. Here because this is where the field's chrome is
          mounted, once, for the whole site. */}
      <PointerLight />
    </>
  );
};

export default BackgroundManager;
