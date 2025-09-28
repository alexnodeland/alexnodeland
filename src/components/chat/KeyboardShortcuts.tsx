import React, { useCallback, useEffect } from 'react';
import { useSettingsPanel } from '../SettingsPanelContext';

const KeyboardShortcuts: React.FC = () => {
  const { isChatPanelOpen, setChatPanelOpen, setClosingChatPanel } =
    useSettingsPanel();

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
        case 'KeyC':
          event.preventDefault();
          if (isChatPanelOpen) {
            // Close the chat panel with animation
            setClosingChatPanel(true);
            setTimeout(() => {
              setChatPanelOpen(false);
              setClosingChatPanel(false);
            }, 300);
          } else {
            // Open the chat panel
            setChatPanelOpen(true);
          }
          break;
      }
    },
    [isChatPanelOpen, setChatPanelOpen, setClosingChatPanel]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
