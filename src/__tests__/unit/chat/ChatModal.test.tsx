import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ChatProvider, useChat } from '../../../components/chat/ChatContext';
import ChatModal from '../../../components/chat/ChatModal';

// Mock the child components
jest.mock('../../../components/chat/ChatMessage', () => {
  return function MockChatMessage() {
    return <div data-testid="chat-messages">Chat Messages</div>;
  };
});

jest.mock('../../../components/chat/ChatInput', () => {
  return function MockChatInput() {
    return <div data-testid="chat-input">Chat Input</div>;
  };
});

const renderWithProvider = (isOpen = false) => {
  const TestComponent = () => {
    const { setChatOpen } = useChat();

    React.useEffect(() => {
      setChatOpen(isOpen);
    }, [setChatOpen]);

    return (
      <div>
        <button onClick={() => setChatOpen(true)}>Open Modal</button>
        <button onClick={() => setChatOpen(false)}>Close Modal</button>
        <ChatModal />
      </div>
    );
  };

  return render(
    <ChatProvider>
      <TestComponent />
    </ChatProvider>
  );
};

describe('ChatModal', () => {
  it('renders when chat is open', () => {
    renderWithProvider(true);

    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('does not render when chat is closed', () => {
    renderWithProvider(false);

    expect(screen.queryByTestId('chat-messages')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument();
  });

  it('has correct modal structure', () => {
    renderWithProvider(true);

    const modal = screen.getByTestId('chat-messages').closest('.chat-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveClass('chat-modal');
  });

  it('displays chat header with title', () => {
    renderWithProvider(true);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toHaveClass('chat-title');
  });

  it('displays model selector', () => {
    renderWithProvider(true);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-label', 'Select AI model');
  });

  it('shows correct default model', () => {
    renderWithProvider(true);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('distilbert-base-uncased');
  });

  it('has proper CSS classes for animation states', async () => {
    renderWithProvider(false);

    // Initially closed
    expect(screen.queryByTestId('chat-messages')).not.toBeInTheDocument();

    // Open the modal
    fireEvent.click(screen.getByText('Open Modal'));

    await waitFor(() => {
      const modal = screen.getByTestId('chat-messages').closest('.chat-modal');
      expect(modal).toHaveClass('chat-modal', 'opening');
    });
  });

  it('renders all required sections', () => {
    renderWithProvider(true);

    // Header
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    // Messages area
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();

    // Input area
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('has proper container structure', () => {
    renderWithProvider(true);

    const modal = screen.getByTestId('chat-messages').closest('.chat-modal');
    expect(modal).toBeInTheDocument();

    // Check for header
    const header = modal?.querySelector('.chat-header');
    expect(header).toBeInTheDocument();

    // Check for messages container
    const messages = modal?.querySelector('.chat-messages');
    expect(messages).toBeInTheDocument();

    // Check for input container
    const inputContainer = modal?.querySelector('.chat-input-container');
    expect(inputContainer).toBeInTheDocument();
  });

  it('scrolls to bottom when opened', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    renderWithProvider(true);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });
});
