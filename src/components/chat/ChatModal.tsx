import React, { useEffect, useRef, useState } from 'react';
import { useChat } from './ChatContext';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ClearConfirmDialog from './ClearConfirmDialog';
import Progress from './Progress';

const ChatModal: React.FC = () => {
  const {
    isChatOpen,
    isClosing,
    messages,
    selectedModel,
    availableModels,
    setSelectedModel,
    setChatOpen,
    setClosing,
    modelState,
    cachedModels,
    clearChatHistory,
  } = useChat();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen && !isAnimating) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isChatOpen, isAnimating]);

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
  }, [isChatOpen, messages]);

  if (!isChatOpen) return null;

  const modalClasses = [
    'chat-modal',
    isAnimating && !isClosing ? 'opening' : '',
    isClosing ? 'closing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={modalClasses}>
      <div className="chat-header">
        <h3 className="chat-title">AI Assistant</h3>
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
                const displayName = `${model.name}${isCached ? ' ✓' : ''}`;
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
            <div className="model-info">
              {(() => {
                const currentModel = availableModels.find(
                  m => m.id === selectedModel
                );
                if (!currentModel) return null;
                const isCached = cachedModels?.includes(selectedModel);
                return (
                  <div className="model-details">
                    <span className="model-size">
                      {currentModel.size || 'Unknown size'}
                    </span>
                    {isCached && <span className="cached-badge">Cached</span>}
                    {currentModel.device && (
                      <span
                        className={`device-badge device-${currentModel.device}`}
                      >
                        {currentModel.device === 'webgpu' ? 'GPU' : 'CPU'}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              className="chat-clear-button"
              onClick={() => setShowClearConfirm(true)}
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
            onClick={() => {
              setClosing(true);
              setTimeout(() => {
                setChatOpen(false);
                setClosing(false);
              }, 300);
            }}
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

      {/* Non-breaking loading UI (visible only if modelState is loading) */}
      {modelState?.status === 'loading' && (
        <div className="chat-input-container" aria-live="polite">
          <div style={{ width: '100%' }}>
            {modelState.loadingMessage && (
              <div style={{ marginBottom: '0.5rem' }}>
                {modelState.loadingMessage}
              </div>
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

      <div className="chat-messages">
        <ChatMessage />
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <ChatInput />
      </div>

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
      />
    </div>
  );
};

export default ChatModal;
