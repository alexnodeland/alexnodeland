import React, { useEffect, useRef, useState } from 'react';
import { useChat } from './ChatContext';

const ChatInput: React.FC = () => {
  const { addMessage, setLoading, isLoading } = useChat();
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

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

    // Simulate AI response
    setLoading(true);

    // Simulate processing delay
    setTimeout(() => {
      const responses = [
        "That's an interesting question! Let me think about that...",
        "I understand what you're asking. Here's my perspective on that topic.",
        'Great question! Based on my knowledge, I can help you with that.',
        "I'd be happy to help you with that. Let me provide some insights.",
        "That's a fascinating topic! Here's what I think about it...",
      ];

      const randomResponse =
        responses[Math.floor(Math.random() * responses.length)];

      addMessage({
        content: randomResponse,
        role: 'assistant',
      });

      setLoading(false);

      // Re-focus the textarea after the response is added
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }, 100); // Shorter delay for testing
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
        placeholder="Type your message here..."
        disabled={isLoading}
        rows={1}
      />
      <button
        type="submit"
        className="chat-send-button"
        disabled={!inputValue.trim() || isLoading}
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
