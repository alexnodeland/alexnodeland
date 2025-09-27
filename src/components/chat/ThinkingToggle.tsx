import React from 'react';
import { useChat } from './ChatContext';

interface ThinkingToggleProps {
  className?: string;
}

const ThinkingToggle: React.FC<ThinkingToggleProps> = ({ className = '' }) => {
  const {
    isThinkingEnabled,
    toggleThinking,
    selectedModel,
    availableModels,
    modelState,
  } = useChat();

  const currentModel = availableModels.find(m => m.id === selectedModel);

  // Don't render if model doesn't support thinking or isn't ready
  if (!currentModel?.supportsThinking || modelState?.status !== 'ready') {
    return null;
  }

  const handleToggle = () => {
    if (toggleThinking) {
      toggleThinking();
    }
  };

  const tooltipText = isThinkingEnabled
    ? 'Disable thinking'
    : 'Enable thinking';

  return (
    <div className={`thinking-toggle-container ${className}`}>
      <button
        className={`thinking-toggle ${isThinkingEnabled ? 'enabled' : 'disabled'}`}
        onClick={handleToggle}
        aria-label={tooltipText}
        title={tooltipText}
      >
        {/* Thinking/lightbulb icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
};

export default ThinkingToggle;
