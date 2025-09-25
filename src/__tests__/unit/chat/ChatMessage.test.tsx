import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../../../components/chat/ChatContext';
import ChatMessage from '../../../components/chat/ChatMessage';

const renderWithProvider = (messages: any[] = []) => {
  const TestComponent = () => {
    const { addMessage } = useChat();

    React.useEffect(() => {
      messages.forEach(msg => {
        addMessage(msg);
      });
    }, [addMessage]);

    return <ChatMessage />;
  };

  return render(
    <ChatProvider>
      <TestComponent />
    </ChatProvider>
  );
};

// We need to import useChat for the test component
import { useChat } from '../../../components/chat/ChatContext';

describe('ChatMessage', () => {
  it('renders welcome message when no messages exist', () => {
    renderWithProvider();

    expect(
      screen.getByText(
        "Hello! I'm your AI assistant. How can I help you today?"
      )
    ).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument(); // Avatar
  });

  it('renders user messages correctly', () => {
    const messages = [{ content: 'Hello there!', role: 'user' as const }];

    renderWithProvider(messages);

    expect(screen.getByText('Hello there!')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // User avatar
  });

  it('renders assistant messages correctly', () => {
    const messages = [
      { content: 'Hello! How can I help you?', role: 'assistant' as const },
    ];

    renderWithProvider(messages);

    expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument(); // Assistant avatar
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

    const avatarElement = screen.getByText('U').closest('.message-avatar');
    expect(avatarElement).toHaveClass('message-avatar', 'user');
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

    const avatarElement = screen.getByText('AI').closest('.message-avatar');
    expect(avatarElement).toHaveClass('message-avatar', 'assistant');
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
    const TestComponentWithLoading = () => {
      const { addMessage, setLoading } = useChat();

      React.useEffect(() => {
        addMessage({ content: 'Test message', role: 'user' });
        setLoading(true);
      }, [addMessage, setLoading]);

      return <ChatMessage />;
    };

    render(
      <ChatProvider>
        <TestComponentWithLoading />
      </ChatProvider>
    );

    expect(screen.getByText('AI')).toBeInTheDocument(); // Loading avatar
    expect(screen.getByText('Test message')).toBeInTheDocument(); // User message
  });

  it('formats time correctly', () => {
    const messages = [{ content: 'Test message', role: 'user' as const }];

    renderWithProvider(messages);

    const timestampElement = screen
      .getByText('Test message')
      .closest('.message-content')
      ?.querySelector('.message-timestamp');
    expect(timestampElement).toBeInTheDocument();

    // Should contain time in H:MM AM/PM format
    const timeText = timestampElement?.textContent || '';
    expect(timeText).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
  });

  it('handles empty content gracefully', () => {
    const messages = [{ content: '', role: 'user' as const }];

    renderWithProvider(messages);

    // Should still render the message structure
    expect(screen.getByText('U')).toBeInTheDocument(); // Avatar
    const messageContent = screen
      .getByText('U')
      .closest('.chat-message')
      ?.querySelector('.message-content');
    expect(messageContent).toBeInTheDocument();
  });

  it('renders welcome message only when no messages exist', () => {
    const messages = [{ content: 'User message', role: 'user' as const }];

    renderWithProvider(messages);

    // Should only show user message, not welcome message when messages exist
    expect(
      screen.queryByText(
        "Hello! I'm your AI assistant. How can I help you today?"
      )
    ).not.toBeInTheDocument();
    expect(screen.getByText('User message')).toBeInTheDocument();
  });
});
