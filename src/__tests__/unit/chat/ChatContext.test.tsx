import { act, render, screen } from '@testing-library/react';
import { ChatProvider, useChat } from '../../../components/chat/ChatContext';

// Test component to access context
const TestComponent = () => {
  const chat = useChat();
  return (
    <div>
      <div data-testid="is-open">{chat.isChatOpen.toString()}</div>
      <div data-testid="is-closing">{chat.isClosing.toString()}</div>
      <div data-testid="messages-count">{chat.messages.length}</div>
      <div data-testid="selected-model">{chat.selectedModel}</div>
      <div data-testid="is-loading">{chat.isLoading.toString()}</div>
      <button onClick={() => chat.setChatOpen(true)}>Open Chat</button>
      <button
        onClick={() =>
          chat.addMessage({ content: 'Test message', role: 'user' })
        }
      >
        Add Message
      </button>
      <button onClick={() => chat.setSelectedModel('test-model')}>
        Change Model
      </button>
      <button onClick={() => chat.setLoading(true)}>Set Loading</button>
      <button onClick={() => chat.clearMessages()}>Clear Messages</button>
    </div>
  );
};

describe('ChatContext', () => {
  it('provides default values', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
    expect(screen.getByTestId('is-closing')).toHaveTextContent('false');
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
    expect(screen.getByTestId('selected-model')).toHaveTextContent(
      'onnx-community/Qwen3-0.6B-ONNX'
    );
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
  });

  it('toggles chat open state', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');

    act(() => {
      screen.getByText('Open Chat').click();
    });

    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('adds messages correctly', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');

    act(() => {
      screen.getByText('Add Message').click();
    });

    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');
  });

  it('changes selected model', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('selected-model')).toHaveTextContent(
      'onnx-community/Qwen3-0.6B-ONNX'
    );

    act(() => {
      screen.getByText('Change Model').click();
    });

    expect(screen.getByTestId('selected-model')).toHaveTextContent(
      'test-model'
    );
  });

  it('sets loading state', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');

    act(() => {
      screen.getByText('Set Loading').click();
    });

    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
  });

  it('clears messages', () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>
    );

    // Add a message first
    act(() => {
      screen.getByText('Add Message').click();
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');

    // Clear messages
    act(() => {
      screen.getByText('Clear Messages').click();
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useChat must be used within a ChatProvider');

    console.error = originalError;
  });

  it('generates unique message IDs', () => {
    const TestComponentWithMultipleMessages = () => {
      const chat = useChat();
      return (
        <div>
          <button
            onClick={() => {
              chat.addMessage({ content: 'Message 1', role: 'user' });
              chat.addMessage({ content: 'Message 2', role: 'assistant' });
            }}
          >
            Add Multiple Messages
          </button>
          <div data-testid="messages-count">{chat.messages.length}</div>
        </div>
      );
    };

    render(
      <ChatProvider>
        <TestComponentWithMultipleMessages />
      </ChatProvider>
    );

    act(() => {
      screen.getByText('Add Multiple Messages').click();
    });

    expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
  });
});
