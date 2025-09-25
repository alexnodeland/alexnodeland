import React from 'react';
import { useChat } from './ChatContext';

const ChatMessage: React.FC = () => {
  const { messages, isLoading } = useChat();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getInitials = (role: 'user' | 'assistant') => {
    return role === 'user' ? 'U' : 'AI';
  };

  return (
    <>
      {/* Always show the welcome message first */}
      <div className="chat-message assistant">
        <div className="message-avatar assistant">AI</div>
        <div className="message-content">
          <p>Hello! I&apos;m your AI assistant. How can I help you today?</p>
          <div className="message-timestamp">{formatTime(new Date())}</div>
        </div>
      </div>

      {messages.map(message => (
        <div key={message.id} className={`chat-message ${message.role}`}>
          <div className={`message-avatar ${message.role}`}>
            {getInitials(message.role)}
          </div>
          <div className="message-content">
            <p>{message.content}</p>
            <div className="message-timestamp">
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="chat-loading">
          <div className="message-avatar assistant">AI</div>
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
