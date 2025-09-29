import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../../../components/chat/ChatContext';
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

// We need to import useChat for the test component
import { useChat } from '../../../components/chat/ChatContext';

const renderWithProvider = (initialMessages: any[] = [], loading = false) => {
  const TestComponent = () => {
    const { addMessage, setLoading } = useChat();

    React.useEffect(() => {
      initialMessages.forEach(msg => {
        addMessage({
          ...msg,
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          timestamp: msg.timestamp || new Date(),
        });
      });
      if (loading) {
        setLoading(true);
      }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return <ChatMessage />;
  };

  return render(
    <ChatProvider>
      <TestComponent />
    </ChatProvider>
  );
};

describe('ChatMessage', () => {
  it('renders empty when no messages exist', () => {
    renderWithProvider();

    // Component should render empty - no messages to display
    expect(screen.queryByText('Hello there!')).not.toBeInTheDocument();
  });

  it('renders user messages correctly', () => {
    const messages = [{ content: 'Hello there!', role: 'user' as const }];

    renderWithProvider(messages);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    // Check that the message has correct structure
    const messageElement = screen
      .getByText('Hello there!')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'user');
  });

  it('renders assistant messages correctly', () => {
    const messages = [
      { content: 'Hello! How can I help you?', role: 'assistant' as const },
    ];

    renderWithProvider(messages);

    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    // Check that the message has correct structure
    const messageElement = screen
      .getByText('Hello! How can I help you?')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'assistant');
  });

  it('renders multiple messages in correct order', () => {
    const messages = [
      { content: 'First message', role: 'user' as const },
      { content: 'Second message', role: 'assistant' as const },
      { content: 'Third message', role: 'user' as const },
    ];

    renderWithProvider(messages);

    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
  });

  it('applies correct CSS classes for user messages', () => {
    const messages = [{ content: 'User message', role: 'user' as const }];

    renderWithProvider(messages);

    const messageElement = screen
      .getByText('User message')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'user');

    // Check that message content is present
    const messageContent = messageElement?.querySelector('.message-content');
    expect(messageContent).toBeInTheDocument();
  });

  it('applies correct CSS classes for assistant messages', () => {
    const messages = [
      { content: 'Assistant message', role: 'assistant' as const },
    ];

    renderWithProvider(messages);

    const messageElement = screen
      .getByText('Assistant message')
      .closest('.chat-message');
    expect(messageElement).toHaveClass('chat-message', 'assistant');

    // Check that message content is present
    const messageContent = messageElement?.querySelector('.message-content');
    expect(messageContent).toBeInTheDocument();
  });

  it('displays timestamps for messages', () => {
    const messages = [{ content: 'Test message', role: 'user' as const }];

    renderWithProvider(messages);

    // Check that timestamp is displayed (format may vary)
    const timestampElement = screen
      .getByText('Test message')
      .closest('.message-content')
      ?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    renderWithProvider([], true);

    // Check for loading dots
    expect(document.querySelector('.chat-loading')).toBeInTheDocument();
    expect(document.querySelector('.loading-dots')).toBeInTheDocument();
    // Check for individual loading dots
    expect(document.querySelectorAll('.loading-dots .dot')).toHaveLength(3);
  });

  it('formats time correctly', () => {
    const messages = [{ content: 'Test message', role: 'user' as const }];

    renderWithProvider(messages);

    const timestampElement = screen
      .getByText('Test message')
      .closest('.message-content')
      ?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();

    // Should contain role prefix and time in "ROLE • H:MM AM/PM" format
    const timeText = timestampElement?.textContent || '';
    expect(timeText).toMatch(/^(USER|ASSISTANT)\s•\s\d{1,2}:\d{2}\s?(AM|PM)$/i);
  });

  it('handles empty content gracefully', () => {
    const messages = [{ content: '', role: 'user' as const }];

    renderWithProvider(messages);

    // Should still render the message structure
    const chatMessage = document.querySelector('.chat-message.user');
    expect(chatMessage).toBeInTheDocument();

    const messageContent = document.querySelector(
      '.chat-message.user .message-content'
    );
    expect(messageContent).toBeInTheDocument();

    // Should still have timestamp even with empty content
    const timestampElement =
      messageContent?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();
  });

  it('uses MarkdownRenderer for assistant messages', () => {
    const messages = [
      { content: 'Assistant **bold** message', role: 'assistant' as const },
    ];

    renderWithProvider(messages);

    // Should use MarkdownRenderer for assistant messages
    expect(document.querySelector('.markdown-content')).toBeInTheDocument();
    expect(screen.getByText('Assistant **bold** message')).toBeInTheDocument();
  });

  it('uses plain paragraph for user messages', () => {
    const messages = [{ content: 'User message', role: 'user' as const }];

    renderWithProvider(messages);

    // Should use plain <p> tag for user messages
    const userMessage = screen.getByText('User message');
    expect(userMessage.tagName).toBe('P');
  });
});
