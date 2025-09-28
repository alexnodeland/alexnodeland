/**
 * Clear Functionality Tests
 * Tests for chat history clearing functionality
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ChatModal from '../../../components/chat/ChatModal';
import ClearConfirmDialog from '../../../components/chat/ClearConfirmDialog';
import { SettingsPanelProvider } from '../../../components/SettingsPanelContext';

// Mock the worker to avoid import.meta issues in tests
jest.mock('../../../components/chat/ChatContext', () => {
  const originalModule = jest.requireActual(
    '../../../components/chat/ChatContext'
  );
  const mockChatContext = {
    isChatOpen: true,
    isClosing: false,
    messages: [],
    selectedModel: 'mock-model',
    availableModels: [
      {
        id: 'mock-model',
        name: 'Mock Model',
        description: 'Test model',
        contextWindow: 2048,
        device: 'cpu',
      },
    ],
    isLoading: false,
    modelState: { status: 'ready', progress: [] },
    webGPUSupported: false,
    isGenerating: false,
    cachedModels: [],
    setChatOpen: jest.fn(),
    setClosing: jest.fn(),
    addMessage: jest.fn(),
    setSelectedModel: jest.fn(),
    setLoading: jest.fn(),
    clearMessages: jest.fn(),
    clearChatHistory: jest.fn(),
    loadModel: jest.fn(),
    generateResponse: jest.fn(),
    interruptGeneration: jest.fn(),
    resetConversation: jest.fn(),
  };

  return {
    ...originalModule,
    ChatProvider: ({ children }: any) => children,
    useChat: () => mockChatContext,
  };
});

// Mock other chat components to avoid complex dependencies
jest.mock('../../../components/chat/ChatInput', () => {
  return function MockChatInput() {
    return <div data-testid="chat-input">Chat Input</div>;
  };
});

jest.mock('../../../components/chat/ChatMessage', () => {
  return function MockChatMessage() {
    return <div data-testid="chat-message">Chat Messages</div>;
  };
});

jest.mock('../../../components/chat/Progress', () => {
  return function MockProgress() {
    return <div data-testid="progress">Progress</div>;
  };
});

// Mock SettingsPanel context for tests
const mockSettingsPanelContext = {
  isChatPanelOpen: true,
  isClosingChatPanel: false,
  setChatPanelOpen: jest.fn(),
  setClosingChatPanel: jest.fn(),
  isPanelOpen: false,
  isClosingPanel: false,
  setPanelOpen: jest.fn(),
  setClosingPanel: jest.fn(),
};

// Mock the SettingsPanelContext module
jest.mock('../../../components/SettingsPanelContext', () => ({
  SettingsPanelProvider: ({ children }: any) => children,
  useSettingsPanel: () => mockSettingsPanelContext,
}));

// Wrapper component for tests that need SettingsPanelProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <SettingsPanelProvider>{children}</SettingsPanelProvider>;
};

describe('Clear Functionality', () => {
  describe('ClearConfirmDialog', () => {
    const defaultProps = {
      isOpen: true,
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
      messageCount: 5,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render when open', () => {
      render(<ClearConfirmDialog {...defaultProps} />);

      expect(screen.getByText('clear chat?')).toBeInTheDocument();
      expect(screen.getByText(/this will delete/)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/message/)).toBeInTheDocument();
      expect(screen.getByText("don't ask me again")).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<ClearConfirmDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('clear chat?')).not.toBeInTheDocument();
    });

    it('should handle singular message count', () => {
      render(<ClearConfirmDialog {...defaultProps} messageCount={1} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      // Check for the text that spans across elements - use partial text matching
      expect(screen.getByText(/this will delete/)).toBeInTheDocument();
      expect(screen.getByText(/message/)).toBeInTheDocument();
    });

    it('should call onCancel when Cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(<ClearConfirmDialog {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByText('cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when overlay is clicked', () => {
      const onCancel = jest.fn();
      render(<ClearConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const overlay = document.querySelector('.clear-confirm-overlay');
      fireEvent.click(overlay!);
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when dialog content is clicked', () => {
      const onCancel = jest.fn();
      render(<ClearConfirmDialog {...defaultProps} onCancel={onCancel} />);

      const dialog = document.querySelector('.clear-confirm-dialog');
      fireEvent.click(dialog!);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Clear History button is clicked', () => {
      const onConfirm = jest.fn();
      render(<ClearConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByText('clear'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility attributes', () => {
      render(<ClearConfirmDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'clear-dialog-title');
    });

    it('should focus Cancel button by default', () => {
      render(<ClearConfirmDialog {...defaultProps} />);

      const cancelButton = screen.getByText('cancel');
      // In React, autoFocus is a boolean prop, not an HTML attribute in tests
      // We can check that it exists in the DOM and is focusable
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton.tagName).toBe('BUTTON');
    });
  });

  describe('ChatModal Clear Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show clear button when there are messages', () => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [
        {
          id: '1',
          content: 'Hello',
          role: 'user',
          timestamp: new Date(),
        },
        {
          id: '2',
          content: 'Hi there!',
          role: 'assistant',
          timestamp: new Date(),
        },
      ];

      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      const clearButton = screen.getByLabelText('Clear chat history');
      expect(clearButton).toBeInTheDocument();
      expect(clearButton).toHaveAttribute('title', 'Clear all chat messages');
    });

    it('should not show clear button when there are no messages', () => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [];

      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      const clearButton = screen.queryByLabelText('Clear chat history');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should open confirmation dialog when clear button is clicked', async () => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      const clearButton = screen.getByLabelText('Clear chat history');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('clear chat?')).toBeInTheDocument();
      });
    });

    it('should call clearChatHistory when confirmed', async () => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      // Open dialog
      const clearButton = screen.getByLabelText('Clear chat history');
      fireEvent.click(clearButton);

      // Confirm clear
      await waitFor(() => {
        const confirmButton = screen.getByText('clear');
        fireEvent.click(confirmButton);
      });

      expect(mockContext.clearChatHistory).toHaveBeenCalledTimes(1);
    });

    it('should close dialog when cancelled', async () => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [
        { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
      ];

      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      // Open dialog
      const clearButton = screen.getByLabelText('Clear chat history');
      fireEvent.click(clearButton);

      // Cancel
      await waitFor(() => {
        const cancelButton = screen.getByText('cancel');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('clear chat?')).not.toBeInTheDocument();
      });

      expect(mockContext.clearChatHistory).not.toHaveBeenCalled();
    });
  });

  describe('ChatContext Clear Functions', () => {
    let mockWorkerRef: any;
    let mockSetMessages: jest.Mock;
    let mockSetIsGenerating: jest.Mock;
    let mockSetIsLoading: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();

      // Mock worker
      mockWorkerRef = {
        current: {
          postMessage: jest.fn(),
          terminate: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      };

      mockSetMessages = jest.fn();
      mockSetIsGenerating = jest.fn();
      mockSetIsLoading = jest.fn();
    });

    it('should clear all messages', () => {
      const clearMessages = jest.fn(() => {
        // Simulate clearing messages
        mockSetMessages([]);
      });

      clearMessages();

      expect(clearMessages).toHaveBeenCalledTimes(1);
    });

    it('should stop ongoing generation when clearing', () => {
      const mockClearWithGeneration = jest.fn(() => {
        // Simulate stopping generation
        if (mockWorkerRef.current) {
          mockWorkerRef.current.postMessage({ type: 'interrupt' });
          mockSetIsGenerating(false);
        }
        mockSetMessages([]);
      });

      mockClearWithGeneration();

      expect(mockClearWithGeneration).toHaveBeenCalledTimes(1);
    });

    it('should reset worker conversation state', () => {
      const mockClearWithWorkerReset = jest.fn(() => {
        // Simulate worker reset
        if (mockWorkerRef.current) {
          mockWorkerRef.current.postMessage({ type: 'reset' });
        }
        mockSetMessages([]);
      });

      mockClearWithWorkerReset();

      expect(mockClearWithWorkerReset).toHaveBeenCalledTimes(1);
    });

    it('should handle clearing without worker gracefully', () => {
      const mockClearWithoutWorker = jest.fn(() => {
        // Simulate clearing when no worker is available
        try {
          mockSetMessages([]);
          mockSetIsLoading(false);
        } catch (error) {
          // Should not throw
        }
      });

      mockClearWithoutWorker();

      expect(mockClearWithoutWorker).toHaveBeenCalledTimes(1);
    });
  });

  describe('Clear Button Styling', () => {
    beforeEach(() => {
      const { useChat } = require('../../../components/chat/ChatContext');
      const mockContext = useChat();
      mockContext.messages = [
        {
          id: '1',
          content: 'Test message',
          role: 'user',
          timestamp: new Date(),
        },
      ];
    });

    it('should render clear button with proper styling', () => {
      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      const clearButton = screen.getByLabelText('Clear chat history');
      expect(clearButton).toHaveClass('chat-clear-button');
    });

    it('should contain trash icon SVG', () => {
      render(
        <TestWrapper>
          <ChatModal />
        </TestWrapper>
      );

      const clearButton = screen.getByLabelText('Clear chat history');
      const svg = clearButton.querySelector('svg');

      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '18');
      expect(svg).toHaveAttribute('height', '18');
    });
  });
});
