import React, { useCallback, useState } from 'react';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import { parseThinkingBlocks } from '../../lib/utils/chat';
import { useChat } from './ChatContext';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingBlock from './ThinkingBlock';

// Pure helper — stable across renders
const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

// Avatar SVGs — static, no need to recreate per render
const UserAvatar = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SystemAvatar = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0.33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0.33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.79a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AssistantAvatar = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="8"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 2v6M8.5 11.5h.01M15.5 11.5h.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 16h6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const getAvatar = (role: 'user' | 'assistant' | 'system') => {
  if (role === 'user') return <UserAvatar />;
  if (role === 'system') return <SystemAvatar />;
  return <AssistantAvatar />;
};

// --- Memoized per-message component ---
interface MessageItemProps {
  message: ChatMessageType;
  isLast: boolean;
  isGenerating: boolean;
  isExpanded: boolean;
  onToggleThinking: (id: string) => void;
}

const MessageItem = React.memo<MessageItemProps>(
  ({ message, isLast, isGenerating, isExpanded, onToggleThinking }) => {
    const hasThinking =
      message.thinking ||
      (message.content && message.content.includes('<think>'));
    const displayContent = message.thinking
      ? message.content
      : message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    const thinkingContent =
      message.thinking ||
      (hasThinking ? parseThinkingBlocks(message.content).thinking : '');
    const isThinkingIncomplete =
      isLast &&
      isGenerating &&
      message.content?.includes('<think>') &&
      !message.content?.includes('</think>');

    return (
      <div className={`chat-message ${message.role}`}>
        <div className={`message-avatar ${message.role}`}>
          {getAvatar(message.role)}
        </div>
        <div className="message-content">
          {message.role === 'assistant' &&
            (hasThinking || isThinkingIncomplete) && (
              <ThinkingBlock
                content={thinkingContent}
                isExpanded={isExpanded}
                isTyping={!!isThinkingIncomplete}
                onToggle={() => onToggleThinking(message.id)}
              />
            )}

          {displayContent &&
            (message.role === 'assistant' ? (
              <MarkdownRenderer content={displayContent} />
            ) : (
              <p>{displayContent}</p>
            ))}

          <div className="message-timestamp">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = 'MessageItem';

// --- Container component ---
const ChatMessage: React.FC = () => {
  const { messages, isLoading, isGenerating } = useChat();
  const [expandedThinking, setExpandedThinking] = useState<{
    [messageId: string]: boolean;
  }>({});

  const toggleThinking = useCallback((messageId: string) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  return (
    <>
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
          isGenerating={!!isGenerating}
          isExpanded={expandedThinking[message.id] || false}
          onToggleThinking={toggleThinking}
        />
      ))}

      {isLoading && (
        <div className="chat-loading">
          <div className="message-avatar assistant">
            <AssistantAvatar />
          </div>
          <div className="loading-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatMessage;
