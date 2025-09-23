import React from 'react';
import { backgroundRegistry } from './backgroundRegistry';
import SettingsPanel from './SettingsPanel';
import { BackgroundSettings, SettingsSchema } from '../../types/animated-backgrounds';

interface BackgroundControlsProps {
  currentBackgroundId: string;
  currentBackgroundName: string;
  showSettingsPanel: boolean;
  onPreviousBackground: () => void;
  onNextBackground: () => void;
  onToggleSettings: () => void;
  // Settings panel props
  settings?: BackgroundSettings;
  settingsSchema?: SettingsSchema[];
  onSettingsChange?: (newSettings: BackgroundSettings) => void;
  onCloseSettings?: () => void;
}

const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  currentBackgroundId,
  currentBackgroundName,
  showSettingsPanel,
  onPreviousBackground,
  onNextBackground,
  onToggleSettings,
  settings,
  settingsSchema,
  onSettingsChange,
  onCloseSettings,
}) => {
  const currentIndex = backgroundRegistry.findIndex(bg => bg.id === currentBackgroundId);
  const totalBackgrounds = backgroundRegistry.length;

  return (
    <div className="background-controls">
      {/* Settings panel anchored above toolbar */}
      {showSettingsPanel && settings && settingsSchema && onSettingsChange && onCloseSettings && (
        <div className="settings-panel-anchor">
          <SettingsPanel
            settings={settings}
            settingsSchema={settingsSchema}
            onSettingsChange={onSettingsChange}
            onClose={onCloseSettings}
          />
        </div>
      )}

      {/* Toolbar stacked: title/description top, nav+settings bottom */}
      <div className="background-toolbar">
        <div className="toolbar-top">
          <div className="background-name">{currentBackgroundName}</div>
          <div className="description-wrapper">
            <div className="background-description">
              {backgroundRegistry[currentIndex]?.description}
            </div>
            <div className="info-bubble" aria-label="Show description">i</div>
            <div className="description-tooltip">
              {backgroundRegistry[currentIndex]?.description}
            </div>
          </div>
        </div>

        <div className="toolbar-bottom">
          <div className="nav-group">
            {totalBackgrounds > 1 && (
              <>
                <button
                  className="switch-button switch-previous"
                  onClick={onPreviousBackground}
                  title="Previous background (Left arrow)"
                >
                  ‹
                </button>
                <span className="background-counter">
                  {currentIndex + 1} / {totalBackgrounds}
                </span>
                <button
                  className="switch-button switch-next"
                  onClick={onNextBackground}
                  title="Next background (Right arrow)"
                >
                  ›
                </button>
              </>
            )}
          </div>
          <button 
            className="settings-toggle-button"
            onClick={onToggleSettings}
            title="Toggle settings (S)"
            data-active={showSettingsPanel}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="keyboard-hint">
        <kbd>←</kbd><kbd>→</kbd> switch • <kbd>S</kbd> settings • <kbd>Esc</kbd> close
      </div>
    </div>
  );
};

export default BackgroundControls;
