import React, { useState } from 'react';
import { parseThinkingBlocks } from '../../lib/utils/chat';
import { useChat } from './ChatContext';
import MarkdownRenderer from './MarkdownRenderer';
import ThinkingBlock from './ThinkingBlock';

const ChatMessage: React.FC = () => {
  const { messages, isLoading, isGenerating } = useChat();
  const [expandedThinking, setExpandedThinking] = useState<{
    [messageId: string]: boolean;
  }>({});

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const toggleThinking = (messageId: string) => {
    setExpandedThinking(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const isThinkingTyping = (message: any, index: number) => {
    // Check if this is the last message, we're generating, and it has incomplete thinking
    const isLastMessage = index === messages.length - 1;
    const hasIncompleteThinking =
      message.content &&
      message.content.includes('<think>') &&
      !message.content.includes('</think>');
    return isLastMessage && isGenerating && hasIncompleteThinking;
  };

  return (
    <>
      {messages.map((message, index) => {
        // Parse the message for thinking blocks
        const hasThinking =
          message.thinking ||
          (message.content && message.content.includes('<think>'));
        const displayContent = message.thinking
          ? message.content
          : message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const thinkingContent =
          message.thinking ||
          (hasThinking ? parseThinkingBlocks(message.content).thinking : '');
        const isThinkingIncomplete = isThinkingTyping(message, index);

        return (
          <div key={message.id} className={`chat-message ${message.role}`}>
            <div className="message-content">
              {/* Thinking Block - only show for assistant messages with thinking content */}
              {message.role === 'assistant' &&
                (hasThinking || isThinkingIncomplete) && (
                  <ThinkingBlock
                    content={thinkingContent}
                    isExpanded={
                      expandedThinking[message.id] !== undefined
                        ? expandedThinking[message.id]
                        : true
                    }
                    isTyping={isThinkingIncomplete}
                    onToggle={() => toggleThinking(message.id)}
                  />
                )}

              {/* Regular message content */}
              {displayContent &&
                (message.role === 'assistant' ? (
                  <MarkdownRenderer content={displayContent} />
                ) : (
                  <p>{displayContent}</p>
                ))}

              <div className="message-timestamp">
                {message.role.toUpperCase()} • {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="chat-loading">
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
