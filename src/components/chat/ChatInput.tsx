import React, { useEffect, useRef, useState } from 'react';
import { chatConfig } from '../../config/chat';
import { useChat } from './ChatContext';

interface ChatInputProps {
  initialValue?: string;
  onValueChange?: (value: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  initialValue,
  onValueChange,
}) => {
  const {
    addMessage,
    isLoading,
    messages,
    isGenerating,
    generateResponse,
    modelState,
  } = useChat();
  const [inputValue, setInputValue] = useState(initialValue || '');

  // Update input value when initialValue changes (for sample prompts)
  useEffect(() => {
    if (initialValue !== undefined) {
      setInputValue(initialValue);
      // Focus the textarea after setting value
      setTimeout(() => {
        textareaRef.current?.focus();
        // Move cursor to end
        if (textareaRef.current) {
          const length = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(length, length);
        }
      }, 50);
    }
  }, [initialValue]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    // Notify parent of value changes if callback provided
    if (onValueChange) {
      onValueChange(inputValue);
    }
  }, [inputValue, onValueChange]);

  const isModelReady = modelState?.status === 'ready';
  const isModelLoading = modelState?.status === 'loading';
  // Allow input when model is idle (user can type and we'll show appropriate feedback)
  const isInputDisabled = isLoading && isModelLoading;
  const isSendDisabled =
    !inputValue.trim() ||
    isLoading ||
    isGenerating ||
    (!isModelReady && !isModelLoading);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSendDisabled) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Keep focus on the textarea after clearing
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    // Add user message
    addMessage({
      content: userMessage,
      role: 'user',
    });

    // Generate response — pass all messages including the new one.
    // Rolling context is applied once in generateResponse with the proper config window.
    if (generateResponse) {
      const allMessages = [
        ...messages,
        {
          id: 'temp',
          content: userMessage,
          role: 'user' as const,
          timestamp: new Date(),
        },
      ];
      generateResponse(allMessages);
    }
  };

  const getPlaceholderText = () => {
    if (modelState?.status === 'loading') {
      return chatConfig.interface.placeholderText.loading;
    }
    if (modelState?.status === 'idle') {
      return chatConfig.interface.placeholderText.idle;
    }
    return chatConfig.interface.placeholderText.ready;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholderText()}
        disabled={isInputDisabled}
        rows={1}
      />
      <button
        type="submit"
        className="chat-send-button"
        disabled={isSendDisabled}
        aria-label="Send message"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
};

export default ChatInput;
