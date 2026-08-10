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
  onResetSettings?: () => void;
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
  onResetSettings,
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
            onResetSettings={onResetSettings}
            onClose={onCloseSettings}
            currentBackgroundId={currentBackgroundId}
            currentBackgroundName={currentBackgroundName}
            currentBackgroundDescription={
              backgroundRegistry[currentIndex]?.description || ''
            }
            currentBackgroundBlogPostSection={
              backgroundRegistry[currentIndex]?.blogPostSection || undefined
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
              {/* Same grammar as the chat pill: a monoline glyph then the
                  label — here a cog, since the pill opens the settings. */}
              <svg
                className="toolbar-glyph"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <div className="background-name">
                {currentBackgroundName?.toLowerCase?.() || ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BackgroundControls;
