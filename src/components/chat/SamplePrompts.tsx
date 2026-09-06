import React from 'react';
import { chatConfig } from '../../config/chat';

interface SamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
  isVisible: boolean;
}

// Three things to ask, floating above the input until the first message is
// sent. Each is the site's secondary button holding the prompt's own words —
// a prompt is text, so nothing decorates it.
const SamplePrompts: React.FC<SamplePromptsProps> = ({
  onPromptSelect,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="sample-prompts">
      <div className="sample-prompts-title">try asking:</div>
      <div className="sample-prompts-grid">
        {chatConfig.interface.samplePrompts.map((text, index) => (
          <button
            key={`prompt-${index}`}
            type="button"
            className="sample-prompt-pill"
            onClick={() => onPromptSelect(text)}
            aria-label={`Use sample prompt: ${text}`}
          >
            <span className="prompt-text">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SamplePrompts;
