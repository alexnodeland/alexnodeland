import React from 'react';
import { chatConfig } from '../../config/chat';

interface SamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
  isVisible: boolean;
}

const getSamplePrompts = () => {
  const icons = ['🧠', '💡', '🚀', '⚡', '🔧'];
  return chatConfig.interface.samplePrompts.map((text, index) => ({
    id: `prompt-${index}`,
    text,
    icon: icons[index % icons.length],
  }));
};

const SamplePrompts: React.FC<SamplePromptsProps> = ({
  onPromptSelect,
  isVisible,
}) => {
  if (!isVisible) return null;

  const samplePrompts = getSamplePrompts();

  return (
    <div className="sample-prompts">
      <div className="sample-prompts-title">try asking:</div>
      <div className="sample-prompts-grid">
        {samplePrompts.map(prompt => (
          <button
            key={prompt.id}
            className="sample-prompt-pill"
            onClick={() => onPromptSelect(prompt.text)}
            aria-label={`Use sample prompt: ${prompt.text}`}
          >
            <span className="prompt-icon">{prompt.icon}</span>
            <span className="prompt-text">{prompt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SamplePrompts;
