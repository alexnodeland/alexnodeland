import React from 'react';
import {
  BackgroundSettings,
  SettingsSchema,
} from '../../types/animated-backgrounds';
import { useSettingsPanel } from '../SettingsPanelContext';
import { backgroundRegistry } from './index';
import SettingsPanel from './SettingsPanel';

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
  // Audio playback functions for special controls
  onStartAudio?: () => void;
  onStopAudio?: () => void;
  isAudioPlaying?: boolean;
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
  onStartAudio,
  onStopAudio,
  isAudioPlaying,
}) => {
  const {
    isSettingsPanelOpen,
    isClosingSettingsPanel,
    isChatPanelOpen,
    isClosingChatPanel,
  } = useSettingsPanel();
  const currentIndex = backgroundRegistry.findIndex(
    bg => bg.id === currentBackgroundId
  );
  const totalBackgrounds = backgroundRegistry.length;

  // Determine CSS classes for background controls based on panel states
  const backgroundControlsClasses = [
    'background-controls',
    isSettingsPanelOpen && 'settings-panel-open',
    isClosingSettingsPanel && 'settings-panel-closing',
    isChatPanelOpen && 'chat-panel-open',
    isClosingChatPanel && 'chat-panel-closing',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* Settings sidebar */}
      {showSettingsPanel &&
        settings &&
        settingsSchema &&
        onSettingsChange &&
        onCloseSettings && (
          <SettingsPanel
            settings={settings}
            settingsSchema={settingsSchema}
            onSettingsChange={onSettingsChange}
            onClose={onCloseSettings}
            currentBackgroundId={currentBackgroundId}
            currentBackgroundName={currentBackgroundName}
            currentBackgroundDescription={
              backgroundRegistry[currentIndex]?.description || ''
            }
            totalBackgrounds={totalBackgrounds}
            onPreviousBackground={onPreviousBackground}
            onNextBackground={onNextBackground}
            isClosing={closingSettingsPanel}
            onStartAudio={onStartAudio}
            onStopAudio={onStopAudio}
            isAudioPlaying={isAudioPlaying}
          />
        )}

      {/* Background controls - shown when sidebar is hidden or closing */}
      {(!showSettingsPanel || closingSettingsPanel) && (
        <div className={backgroundControlsClasses}>
          {/* Main toolbar */}
          <div
            className="background-toolbar"
            onClick={onToggleSettings}
            title="Click to open settings (S)"
          >
            <div className="toolbar-header">
              <div className="background-name">
                {currentBackgroundName?.toLowerCase?.() || ''}
              </div>
            </div>
          </div>

          {/* Keyboard Hints */}
          <div className="keyboard-hint">
            <kbd>←</kbd>
            <kbd>→</kbd> switch • <kbd>S</kbd> settings • <kbd>H</kbd> hide
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundControls;
