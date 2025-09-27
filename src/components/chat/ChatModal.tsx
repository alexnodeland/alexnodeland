import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsPanel } from '../SettingsPanelContext';
import { useChat } from './ChatContext';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ClearConfirmDialog from './ClearConfirmDialog';
import Progress from './Progress';
import SamplePrompts from './SamplePrompts';
import WelcomeScreen from './WelcomeScreen';

const ChatModal: React.FC = () => {
  // Use settings panel context for panel state management
  const {
    isChatPanelOpen,
    isClosingChatPanel,
    setChatPanelOpen,
    setClosingChatPanel,
  } = useSettingsPanel();

  // Use chat context for chat functionality
  const {
    messages,
    selectedModel,
    availableModels,
    setSelectedModel,
    modelState,
    cachedModels,
    clearChatHistory,
  } = useChat();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [promptValue, setPromptValue] = useState<string | undefined>(undefined);
  const [skipConfirm, setSkipConfirm] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chat-skip-clear-confirm') === 'true';
    }
    return false;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close chat panel with animation
  const closeChatPanel = useCallback(() => {
    setClosingChatPanel(true);

    // After animation completes, fully close
    setTimeout(() => {
      setChatPanelOpen(false);
      setClosingChatPanel(false);
    }, 300);
  }, [setChatPanelOpen, setClosingChatPanel]);

  const handlePromptSelect = (prompt: string) => {
    setPromptValue(prompt);
    // Clear the prompt value after a brief moment to allow ChatInput to pick it up
    setTimeout(() => setPromptValue(undefined), 100);
  };

  useEffect(() => {
    if (isChatPanelOpen && !isAnimating) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isChatPanelOpen, isAnimating]);

  const scrollToBottom = () => {
    if (
      messagesEndRef.current &&
      typeof messagesEndRef.current.scrollIntoView === 'function'
    ) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [isChatPanelOpen, messages]);

  if (!isChatPanelOpen) return null;

  const modalClasses = [
    'chat-sidebar',
    isAnimating && !isClosingChatPanel ? 'opening' : '',
    isClosingChatPanel ? 'closing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={modalClasses}>
      <div className="chat-header">
        <h3 className="chat-title">Chat</h3>
        <div className="chat-header-controls">
          <div className="model-selector">
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              aria-label="Select AI model"
              className="model-select"
            >
              {availableModels.map(model => {
                const isCached = cachedModels?.includes(model.id);
                const displayName = model.name;
                const sizeInfo = model.size ? ` (${model.size})` : '';
                return (
                  <option
                    key={model.id}
                    value={model.id}
                    title={`${model.description}${sizeInfo}${isCached ? ' - Cached' : ''}`}
                  >
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>
          {messages.length > 0 && (
            <button
              className="chat-clear-button"
              onClick={() => {
                if (skipConfirm && clearChatHistory) {
                  clearChatHistory();
                } else {
                  setShowClearConfirm(true);
                }
              }}
              aria-label="Clear chat history"
              title="Clear all chat messages"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM10 11V17M14 11V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            className="chat-close-button"
            onClick={closeChatPanel}
            aria-label="Close chat"
          >
            <svg
              width="20"
              height="20"
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
          </button>
        </div>
      </div>

      {/* Show welcome screen when no model is loaded and no messages exist */}
      {modelState?.status === 'idle' && messages.length === 0 && (
        <WelcomeScreen />
      )}

      {/* Non-breaking loading UI (visible only if modelState is loading) */}
      {modelState?.status === 'loading' && (
        <div className="chat-input-container" aria-live="polite">
          <div style={{ width: '100%' }}>
            {modelState.loadingMessage && (
              <div className="loading-message">{modelState.loadingMessage}</div>
            )}
            {modelState.progress && modelState.progress.length > 0 ? (
              modelState.progress.map((item: any, i: number) => {
                const fileName = item.file
                  ? item.file.split('/').pop()
                  : 'model file';
                return (
                  <Progress
                    key={`${item.file || 'file'}-${i}`}
                    text={fileName}
                    percentage={Number((item.progress || 0).toFixed(2))}
                    total={item.total ? Number(item.total) : undefined}
                    loaded={item.loaded ? Number(item.loaded) : undefined}
                  />
                );
              })
            ) : (
              <Progress text="Initializing model loading..." percentage={0} />
            )}
          </div>
        </div>
      )}

      {/* Chat messages and input - hidden when showing welcome screen */}
      {!(modelState?.status === 'idle' && messages.length === 0) && (
        <>
          <div className="chat-messages">
            <ChatMessage />
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            {/* Show sample prompts floating above input when model is ready but no messages sent yet */}
            <SamplePrompts
              onPromptSelect={handlePromptSelect}
              isVisible={
                modelState?.status === 'ready' && messages.length === 0
              }
            />

            <ChatInput
              initialValue={promptValue}
              onValueChange={() => {}} // We don't need to track changes from input
            />
          </div>
        </>
      )}

      <ClearConfirmDialog
        isOpen={showClearConfirm}
        onConfirm={() => {
          if (clearChatHistory) {
            clearChatHistory();
          }
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
        messageCount={messages.length}
        skipConfirm={skipConfirm}
        onSkipConfirmChange={value => {
          setSkipConfirm(value);
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'chat-skip-clear-confirm',
              value ? 'true' : 'false'
            );
          }
        }}
      />
    </div>
  );
};

export default ChatModal;
