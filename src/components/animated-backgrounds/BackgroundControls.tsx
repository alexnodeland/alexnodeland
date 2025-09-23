import React from 'react';
import { backgroundRegistry } from './backgroundRegistry';
import SettingsPanel from './SettingsPanel';
import { BackgroundSettings, SettingsSchema } from '../../types/animated-backgrounds';

interface BackgroundControlsProps {
  currentBackgroundId: string;
  currentBackgroundName: string;
  showSettingsPanel: boolean;
  closingSettingsPanel: boolean;
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
  closingSettingsPanel,
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
    <>
      {/* Settings sidebar */}
      {showSettingsPanel && settings && settingsSchema && onSettingsChange && onCloseSettings && (
        <SettingsPanel
          settings={settings}
          settingsSchema={settingsSchema}
          onSettingsChange={onSettingsChange}
          onClose={onCloseSettings}
          currentBackgroundId={currentBackgroundId}
          currentBackgroundName={currentBackgroundName}
          currentBackgroundDescription={backgroundRegistry[currentIndex]?.description || ''}
          totalBackgrounds={totalBackgrounds}
          onPreviousBackground={onPreviousBackground}
          onNextBackground={onNextBackground}
          isClosing={closingSettingsPanel}
        />
      )}

      {/* Background controls - shown when sidebar is hidden or closing */}
      {(!showSettingsPanel || closingSettingsPanel) && (
        <div className="background-controls">
          {/* Main toolbar */}
          <div 
          className="background-toolbar"
          onClick={onToggleSettings}
          title="Click to open settings (S)"
        >
          <div className="toolbar-header">
            <div className="background-name">{currentBackgroundName}</div>
          </div>

      </div>

          {/* Keyboard Hints */}
          <div className="keyboard-hint">
            <kbd>←</kbd><kbd>→</kbd> switch • <kbd>S</kbd> settings • <kbd>Esc</kbd> close
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundControls;
