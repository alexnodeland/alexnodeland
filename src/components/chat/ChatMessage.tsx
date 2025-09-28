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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

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

  const copyToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
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
                <span className="timestamp-text">
                  {message.role.toUpperCase()} • {formatTime(message.timestamp)}
                </span>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(displayContent, message.id)}
                  title={
                    copiedMessageId === message.id ? 'Copied!' : 'Copy message'
                  }
                  disabled={!displayContent}
                >
                  {copiedMessageId === message.id ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
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
