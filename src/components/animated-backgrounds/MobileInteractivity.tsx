import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBackground } from '../BackgroundProvider';
import { useSettingsPanel } from '../SettingsPanelContext';
import { useIsMobileViewport } from './core/useIsMobileViewport';
import '../../styles/mobile-interactivity.scss';

/**
 * Mobile entry point into the animated backgrounds.
 *
 * Desktop drives the backgrounds from the keyboard (arrows / S / H), which
 * leaves touch devices with nothing, so this renders the same capabilities as
 * an explicit three-state flow:
 *
 *   browsing  — the site as normal, with an "interactivity" pill offering the
 *               way in.
 *   explore   — page content is hidden (the same `isContentHidden` flag the
 *               H key toggles), leaving the background full-bleed behind a
 *               transparent control bar: prev / name / next, plus settings.
 *   immersive — tapping the background dismisses that bar too, leaving nothing
 *               but the animation. Tapping again brings it back.
 *
 * Everything here is hidden above the mobile breakpoint by CSS; desktop keeps
 * its own controls.
 */
const MobileInteractivity: React.FC = () => {
  const { isContentHidden, setContentHidden } = useSettingsPanel();
  const {
    state,
    currentBackground,
    switchToNextBackground,
    switchToPreviousBackground,
    toggleSettingsPanel,
  } = useBackground();

  const isMobile = useIsMobileViewport();

  const [controlsVisible, setControlsVisible] = useState(true);
  const [hintVisible, setHintVisible] = useState(false);

  // Distinguishes "content is hidden because this component hid it" from
  // desktop's H key, which shares the same flag.
  const enteredHereRef = useRef(false);

  const settingsOpen = state.showSettingsPanel || state.closingSettingsPanel;

  const enterExplore = useCallback(() => {
    enteredHereRef.current = true;
    setContentHidden(true);
    setControlsVisible(true);
    setHintVisible(true);
  }, [setContentHidden]);

  const exitExplore = useCallback(() => {
    enteredHereRef.current = false;
    setContentHidden(false);
    setControlsVisible(true);
    setHintVisible(false);
  }, [setContentHidden]);

  // Rotating to landscape or widening past the breakpoint takes the explore
  // chrome away with it (it is mobile-only in CSS), which would otherwise
  // strand the visitor on a page with no content and no way back.
  useEffect(() => {
    if (!isMobile && enteredHereRef.current && isContentHidden) {
      enteredHereRef.current = false;
      setContentHidden(false);
    }
  }, [isMobile, isContentHidden, setContentHidden]);

  // The "tap to hide" nudge is only useful the first moment of a session in
  // explore mode; retire it so the chrome settles into just the controls.
  useEffect(() => {
    if (!hintVisible) return;
    const timer = window.setTimeout(() => setHintVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [hintVisible]);

  // H on a keyboard (or leaving the page) can flip content visibility without
  // going through the pill, so keep the local chrome state in step.
  useEffect(() => {
    if (!isContentHidden) {
      setControlsVisible(true);
      setHintVisible(false);
    }
  }, [isContentHidden]);

  // Lets page-level chrome (the chat launcher) opt out while the background is
  // full-bleed, without those components needing to know about explore mode.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('mobile-explore-active', isContentHidden);
    return () => document.body.classList.remove('mobile-explore-active');
  }, [isContentHidden]);

  if (!isContentHidden) {
    return (
      <div className="mobile-interactivity-launcher">
        <button
          type="button"
          className="mobile-interactivity-btn"
          onClick={enterExplore}
          aria-label="Explore the animated background"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 17V7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M4 14.5 8.5 10l3.5 3.5L15 11l5 4.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="mobile-interactivity-label">interactivity</span>
        </button>
      </div>
    );
  }

  // While the settings sheet is up it owns the whole screen, so the explore
  // chrome would only fight with it.
  const chromeHidden = !controlsVisible || settingsOpen;

  return (
    <div
      className={`mobile-explore ${chromeHidden ? 'chrome-hidden' : 'chrome-visible'}`}
    >
      <button
        type="button"
        className="mobile-explore-surface"
        onClick={() => setControlsVisible(visible => !visible)}
        aria-label={
          controlsVisible
            ? 'Hide background controls'
            : 'Show background controls'
        }
      />

      <div className="mobile-explore-chrome">
        <button
          type="button"
          className="mobile-explore-exit"
          onClick={exitExplore}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>close</span>
        </button>

        <div className="mobile-explore-bar">
          <button
            type="button"
            className="mobile-explore-step"
            onClick={switchToPreviousBackground}
            aria-label="Previous background"
          >
            ‹
          </button>
          <button
            type="button"
            className="mobile-explore-name"
            onClick={toggleSettingsPanel}
          >
            <span className="mobile-explore-title">
              {currentBackground?.name?.toLowerCase() ?? 'background'}
            </span>
            <span className="mobile-explore-sub">tap to tune</span>
          </button>
          <button
            type="button"
            className="mobile-explore-step"
            onClick={switchToNextBackground}
            aria-label="Next background"
          >
            ›
          </button>
        </div>

        <div
          className={`mobile-explore-hint ${hintVisible ? 'visible' : ''}`}
          aria-hidden="true"
        >
          tap anywhere to hide the controls
        </div>
      </div>
    </div>
  );
};

export default MobileInteractivity;
