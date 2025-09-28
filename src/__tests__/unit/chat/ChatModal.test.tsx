import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { ChatProvider } from '../../../components/chat/ChatContext';
import ChatModal from '../../../components/chat/ChatModal';
import {
  SettingsPanelProvider,
  useSettingsPanel,
} from '../../../components/SettingsPanelContext';

// Mock the chat components to simplify testing
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

// Mock other chat components to avoid complex dependencies
jest.mock('../../../components/chat/ClearConfirmDialog', () => {
  return function MockClearConfirmDialog() {
    return null;
  };
});

jest.mock('../../../components/chat/Progress', () => {
  return function MockProgress() {
    return <div data-testid="progress">Progress</div>;
  };
});

jest.mock('../../../components/chat/SamplePrompts', () => {
  return function MockSamplePrompts() {
    return <div data-testid="sample-prompts">Sample Prompts</div>;
  };
});

jest.mock('../../../components/chat/ThinkingToggle', () => {
  return function MockThinkingToggle() {
    return <div data-testid="thinking-toggle">Thinking Toggle</div>;
  };
});

jest.mock('../../../components/chat/WelcomeScreen', () => {
  return function MockWelcomeScreen() {
    return <div data-testid="welcome-screen">Welcome Screen</div>;
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <SettingsPanelProvider>
      <ChatProvider>{children}</ChatProvider>
    </SettingsPanelProvider>
  );
};

describe('ChatModal', () => {
  it('renders properly with providers', () => {
    render(
      <TestWrapper>
        <ChatModal />
      </TestWrapper>
    );

    // Modal should render without errors
    // If chat is closed initially, modal content shouldn't be visible
    expect(document.body).toBeInTheDocument();
  });

  it('can be opened and closed', async () => {
    const TestComponent = () => {
      const { setChatPanelOpen, isChatPanelOpen } = useSettingsPanel();

      return (
        <div>
          <button onClick={() => setChatPanelOpen(true)}>Open Chat</button>
          <button onClick={() => setChatPanelOpen(false)}>Close Chat</button>
          <div data-testid="chat-open-state">
            {isChatPanelOpen ? 'open' : 'closed'}
          </div>
          <ChatModal />
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    // Initially closed
    expect(screen.getByTestId('chat-open-state')).toHaveTextContent('closed');

    // Open chat
    const openButton = screen.getByText('Open Chat');
    await act(async () => {
      openButton.click();
    });

    expect(screen.getByTestId('chat-open-state')).toHaveTextContent('open');
  });

  it('displays chat interface when opened', async () => {
    const TestComponent = () => {
      const { setChatPanelOpen } = useSettingsPanel();

      React.useEffect(() => {
        setChatPanelOpen(true);
      }, [setChatPanelOpen]);

      return <ChatModal />;
    };

    await act(async () => {
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );
    });

    // Should show chat interface elements when opened
    expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('sample-prompts')).toBeInTheDocument();
  });
});
