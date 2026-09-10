import { render, screen } from '@testing-library/react';
import React from 'react';
import ChatMessage from '../../../components/chat/ChatMessage';

// Mock the child components to avoid dependency issues in tests
jest.mock('../../../components/chat/MarkdownRenderer', () => {
  return function MarkdownRenderer({ content }: { content: string }) {
    return <div className="markdown-content">{content}</div>;
  };
});

jest.mock('../../../components/chat/ThinkingBlock', () => {
  return function ThinkingBlock({ content, onToggle }: any) {
    return (
      <div className="thinking-block" onClick={onToggle}>
        {content}
      </div>
    );
  };
});

// Mock useChat directly for fine-grained control
const mockUseChat = {
  messages: [] as any[],
  isLoading: false,
  isGenerating: false,
};

jest.mock('../../../components/chat/ChatContext', () => ({
  useChat: () => mockUseChat,
}));

const renderChatMessage = (messages: any[] = [], isLoading = false) => {
  mockUseChat.messages = messages.map((msg, i) => ({
    id: msg.id || `msg-${i}`,
    content: msg.content,
    role: msg.role,
    thinking: msg.thinking,
    timestamp: msg.timestamp || new Date(),
  }));
  mockUseChat.isLoading = isLoading;
  mockUseChat.isGenerating = false;
  return render(<ChatMessage />);
};

describe('ChatMessage', () => {
  beforeEach(() => {
    mockUseChat.messages = [];
    mockUseChat.isLoading = false;
    mockUseChat.isGenerating = false;
  });

  it('renders empty when no messages exist', () => {
    renderChatMessage();
    expect(screen.queryByText('Hello there!')).not.toBeInTheDocument();
  });

  it('renders user messages correctly', () => {
    renderChatMessage([{ content: 'Hello there!', role: 'user' }]);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    const userAvatar = document.querySelector('.message-avatar.user svg');
    expect(userAvatar).toBeInTheDocument();
  });

  it('renders assistant messages correctly', () => {
    renderChatMessage([
      { content: 'Hello! How can I help you?', role: 'assistant' },
    ]);

    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    const assistantAvatar = document.querySelector(
      '.message-avatar.assistant svg'
    );
    expect(assistantAvatar).toBeInTheDocument();
  });

  it('renders multiple messages in correct order', () => {
    renderChatMessage([
      { content: 'First message', role: 'user' },
      { content: 'Second message', role: 'assistant' },
      { content: 'Third message', role: 'user' },
    ]);

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
  });

  it('applies correct CSS classes for user messages', () => {
    renderChatMessage([{ content: 'User message', role: 'user' }]);

    const messageElement = screen
      .getByText('User message')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'user');

    const avatarElement = document.querySelector('.message-avatar.user');
    expect(avatarElement).toHaveClass('message-avatar', 'user');
  });

  it('applies correct CSS classes for assistant messages', () => {
    renderChatMessage([{ content: 'Assistant message', role: 'assistant' }]);

    const messageElement = screen
      .getByText('Assistant message')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'assistant');

    const avatarElement = document.querySelector('.message-avatar.assistant');
    expect(avatarElement).toHaveClass('message-avatar', 'assistant');
  });

  it('displays timestamps for messages', () => {
    renderChatMessage([{ content: 'Test message', role: 'user' }]);

    const timestampElement = screen
      .getByText('Test message')
      .closest('.message-content')
      ?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    renderChatMessage([], true);

    expect(document.querySelector('.chat-loading')).toBeInTheDocument();
    expect(document.querySelector('.loading-dots')).toBeInTheDocument();
    expect(
      document.querySelector('.chat-loading .message-avatar.assistant svg')
    ).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    renderChatMessage([{ content: 'Test message', role: 'user' }]);

    const timestampElement = screen
      .getByText('Test message')
      .closest('.message-content')
      ?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();

    const timeText = timestampElement?.textContent || '';
    expect(timeText).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
  });

  it('handles empty content gracefully', () => {
    renderChatMessage([{ content: '', role: 'user' }]);

    const userAvatar = document.querySelector('.message-avatar.user svg');
    expect(userAvatar).toBeInTheDocument();

    const messageContent = document.querySelector(
      '.chat-message.user .message-content'
    );
    expect(messageContent).toBeInTheDocument();
  });

  it('uses MarkdownRenderer for assistant messages', () => {
    renderChatMessage([
      { content: 'Assistant **bold** message', role: 'assistant' },
    ]);

    expect(document.querySelector('.markdown-content')).toBeInTheDocument();
    expect(screen.getByText('Assistant **bold** message')).toBeInTheDocument();
  });

  it('uses plain paragraph for user messages', () => {
    renderChatMessage([{ content: 'User message', role: 'user' }]);

    const userMessage = screen.getByText('User message');
    expect(userMessage.tagName).toBe('P');
  });
});
