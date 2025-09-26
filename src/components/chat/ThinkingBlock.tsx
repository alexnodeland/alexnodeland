import React, { useState } from 'react';

interface ThinkingBlockProps {
  content: string;
  isExpanded?: boolean;
  isTyping?: boolean;
  onToggle?: () => void;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  isExpanded = false,
  isTyping = false,
  onToggle,
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);

  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  return (
    <div className="thinking-block">
      <button
        className="thinking-toggle"
        onClick={handleToggle}
        aria-expanded={expanded}
        aria-label={
          expanded ? 'collapse thinking process' : 'expand thinking process'
        }
      >
        <div className="thinking-header">
          <div className="thinking-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="thinking-label">thinking...</span>
          {isTyping && (
            <div className="thinking-typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div className={`thinking-chevron ${expanded ? 'expanded' : ''}`}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 9L12 15L18 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="thinking-content">
          <div className="thinking-text">
            {content || (isTyping ? '' : 'no thinking content yet...')}
            {isTyping && <span className="thinking-cursor">|</span>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
