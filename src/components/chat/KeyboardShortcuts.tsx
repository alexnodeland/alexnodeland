import React, { useEffect } from 'react';
import { isShortcutKey } from '../../lib/utils/keys';
import { useSettingsPanel } from '../SettingsPanelContext';

// `C` opens and closes the chat. Unmodified only — ⌘C is a copy, and it used
// to open the chat on every one.
const KeyboardShortcuts: React.FC = () => {
  const { toggleChatPanel } = useSettingsPanel();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isShortcutKey(event)) return;
      if (event.code !== 'KeyC') return;
      event.preventDefault();
      toggleChatPanel();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleChatPanel]);

  return null; // This component doesn't render anything
};

export default KeyboardShortcuts;
