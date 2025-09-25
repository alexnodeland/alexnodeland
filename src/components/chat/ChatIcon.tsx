import React from 'react';
import { useChat } from './ChatContext';

const ChatIcon: React.FC = () => {
  const { isChatOpen, isClosing, setChatOpen, setClosing } = useChat();

  const handleClick = () => {
    if (isChatOpen && !isClosing) {
      setClosing(true);
      setTimeout(() => {
        setChatOpen(false);
        setClosing(false);
      }, 300); // Match animation duration
    } else if (!isChatOpen && !isClosing) {
      setChatOpen(true);
    }
  };

  return (
    <button
      className={`chat-icon ${isChatOpen ? 'open' : ''}`}
      onClick={handleClick}
      aria-label={isChatOpen ? 'Close chat' : 'Open chat'}
    >
      <div className="chat-icon-inner">
        {isChatOpen ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
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
        )}
      </div>
    </button>
  );
};

export default ChatIcon;
