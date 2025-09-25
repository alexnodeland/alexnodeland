import React, { useCallback, useEffect } from 'react';
import { useChat } from './ChatContext';

const KeyboardShortcuts: React.FC = () => {
  const { isChatOpen, setChatOpen, setClosing } = useChat();

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
          if (isChatOpen) {
            // Close the chat
            setClosing(true);
            setTimeout(() => {
              setChatOpen(false);
              setClosing(false);
            }, 300);
          } else {
            // Open the chat
            setChatOpen(true);
          }
          break;
      }
    },
    [isChatOpen, setChatOpen, setClosing]
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
