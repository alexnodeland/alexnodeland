import React from 'react';

interface SamplePromptsProps {
  onPromptSelect: (prompt: string) => void;
  isVisible: boolean;
}

const SAMPLE_PROMPTS = [
  {
    id: 'explain-concept',
    text: 'explain a complex concept in simple terms',
    icon: '🧠',
  },
  {
    id: 'help-with-task',
    text: 'help me brainstorm ideas for a project',
    icon: '💡',
  },
];

const SamplePrompts: React.FC<SamplePromptsProps> = ({
  onPromptSelect,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <div className="sample-prompts">
      <div className="sample-prompts-title">try asking:</div>
      <div className="sample-prompts-grid">
        {SAMPLE_PROMPTS.map(prompt => (
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
