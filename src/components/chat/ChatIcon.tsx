import React from 'react';
import { useSettingsPanel } from '../SettingsPanelContext';

const ChatIcon: React.FC = () => {
  const {
    isChatPanelOpen,
    isClosingChatPanel,
    setChatPanelOpen,
    setClosingChatPanel,
  } = useSettingsPanel();

  const handleClick = () => {
    if (isChatPanelOpen && !isClosingChatPanel) {
      setClosingChatPanel(true);
      setTimeout(() => {
        setChatPanelOpen(false);
        setClosingChatPanel(false);
      }, 300); // Match animation duration
    } else if (!isChatPanelOpen && !isClosingChatPanel) {
      setChatPanelOpen(true);
    }
  };

  // Don't render the icon when chat is open
  if (isChatPanelOpen) {
    return null;
  }

  return (
    <div className="chat-icon-container">
      <button
        className="chat-icon"
        onClick={handleClick}
        aria-label="Open chat"
      >
        <div className="chat-icon-inner">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="chat-label">chat</span>
        </div>
      </button>
      <div className="keyboard-hint">
        <kbd>C</kbd> chat
      </div>
    </div>
  );
};

export default ChatIcon;
