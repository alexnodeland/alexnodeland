import React, { useState } from 'react';
import { chatConfig } from '../../config/chat';

interface ChatSettingsProps {
  onSystemPromptChange?: (systemPrompt: string) => void;
  onSettingChange?: (setting: string, value: any) => void;
}

const ChatSettings: React.FC<ChatSettingsProps> = ({
  onSystemPromptChange,
  onSettingChange,
}) => {
  const [systemPrompt, setSystemPrompt] = useState(
    chatConfig.generation.defaultSystemPromptText
  );
  const [enableThinking, setEnableThinking] = useState(
    chatConfig.interface.enableThinking
  );
  const [maxTokens, setMaxTokens] = useState(
    chatConfig.generation.maxTokens.default
  );
  const [temperature, setTemperature] = useState(
    chatConfig.generation.temperature.default
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    if (onSystemPromptChange) {
      onSystemPromptChange(value);
    }
    if (onSettingChange) {
      onSettingChange('systemPrompt', value);
    }
  };

  const handleThinkingToggle = (value: boolean) => {
    setEnableThinking(value);
    if (onSettingChange) {
      onSettingChange('enableThinking', value);
    }
  };

  const handleMaxTokensChange = (value: number) => {
    setMaxTokens(value);
    if (onSettingChange) {
      onSettingChange('maxTokens', value);
    }
  };

  const handleTemperatureChange = (value: number) => {
    setTemperature(value);
    if (onSettingChange) {
      onSettingChange('temperature', value);
    }
  };

  const resetToDefaults = () => {
    setSystemPrompt(chatConfig.generation.defaultSystemPromptText);
    setEnableThinking(chatConfig.interface.enableThinking);
    setMaxTokens(chatConfig.generation.maxTokens.default);
    setTemperature(chatConfig.generation.temperature.default);

    if (onSystemPromptChange) {
      onSystemPromptChange(chatConfig.generation.defaultSystemPromptText);
    }
    if (onSettingChange) {
      onSettingChange(
        'systemPrompt',
        chatConfig.generation.defaultSystemPromptText
      );
      onSettingChange('enableThinking', chatConfig.interface.enableThinking);
      onSettingChange('maxTokens', chatConfig.generation.maxTokens.default);
      onSettingChange('temperature', chatConfig.generation.temperature.default);
    }
  };

  return (
    <div className="chat-settings">
      <div className="settings-header">
        <h3>Chat Configuration</h3>
        <button
          className="reset-button"
          onClick={resetToDefaults}
          title="Reset to defaults"
        >
          🔄 Reset
        </button>
      </div>

      <div className="settings-section">
        <h4>System Prompt</h4>
        <p className="setting-description">
          Configure how the AI assistant behaves and responds
        </p>
        <textarea
          value={systemPrompt}
          onChange={e => handleSystemPromptChange(e.target.value)}
          placeholder="Enter system prompt..."
          rows={8}
          className="system-prompt-input"
        />
      </div>

      <div className="settings-section">
        <h4>Interface Options</h4>
        <div className="setting-item">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enableThinking}
              onChange={e => handleThinkingToggle(e.target.checked)}
            />
            <span className="toggle-text">Enable thinking mode</span>
          </label>
          <p className="setting-description">
            Show the AI&apos;s reasoning process before responses
          </p>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-toggle">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="advanced-toggle"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Settings
          </button>
        </div>

        {showAdvanced && (
          <div className="advanced-settings">
            <div className="setting-item">
              <label className="range-label">
                <span>Max Tokens: {maxTokens}</span>
                <input
                  type="range"
                  min="50"
                  max="2048"
                  step="50"
                  value={maxTokens}
                  onChange={e =>
                    handleMaxTokensChange(parseInt(e.target.value))
                  }
                  className="range-input"
                />
              </label>
              <p className="setting-description">
                Maximum number of tokens in the response
              </p>
            </div>

            <div className="setting-item">
              <label className="range-label">
                <span>Temperature: {temperature}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={e =>
                    handleTemperatureChange(parseFloat(e.target.value))
                  }
                  className="range-input"
                />
              </label>
              <p className="setting-description">
                Controls creativity (0 = deterministic, 1 = creative)
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="settings-info">
        <p>
          💡 <strong>Tip:</strong> Changes take effect for new conversations.
          Clear chat history to apply immediately.
        </p>
      </div>
    </div>
  );
};

export default ChatSettings;
