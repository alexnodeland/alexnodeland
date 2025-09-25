import React, { useEffect, useRef, useState } from 'react';
import { useChat } from './ChatContext';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

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
  } = useChat();
  const [isAnimating, setIsAnimating] = useState(false);
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
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
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

      <div className="chat-messages">
        <ChatMessage />
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatModal;
