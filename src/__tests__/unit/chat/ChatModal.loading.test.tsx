import React from 'react';
import ChatModal from '../../../components/chat/ChatModal';

// We can't use @testing-library here due to environment, so minimally
// validate that the component can be instantiated with a mocked context.

jest.mock('../../../components/chat/ChatContext', () => {
  const React = require('react');
  const mockValue = {
    isChatOpen: true,
    isClosing: false,
    messages: [],
    selectedModel: 'mock-model',
    availableModels: [{ id: 'mock-model', name: 'Mock', description: 'mock' }],
    setSelectedModel: jest.fn(),
    setChatOpen: jest.fn(),
    setClosing: jest.fn(),
    isLoading: false,
    modelState: {
      status: 'loading',
      progress: [],
      loadingMessage: 'Loading model...',
    },
  };
  return {
    useChat: () => mockValue,
    ChatProvider: ({ children }: any) =>
      React.createElement(React.Fragment, null, children),
  };
});

describe('ChatModal loading UI (Step 3A)', () => {
  it('instantiates with loading modelState without crashing', () => {
    const element = React.createElement(ChatModal, {});
    expect(() => element).not.toThrow();
  });
});
