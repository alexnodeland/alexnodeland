import {
  ChatIcon,
  ChatInput,
  ChatMessage,
  ChatMessageType,
  ChatModal,
  ChatModel,
  ChatProvider,
  useChat,
} from '../../../components/chat';

describe('Chat Components Index', () => {
  it('exports ChatProvider', () => {
    expect(ChatProvider).toBeDefined();
    expect(typeof ChatProvider).toBe('function');
  });

  it('exports useChat hook', () => {
    expect(useChat).toBeDefined();
    expect(typeof useChat).toBe('function');
  });

  it('exports ChatIcon component', () => {
    expect(ChatIcon).toBeDefined();
    expect(typeof ChatIcon).toBe('function');
  });

  it('exports ChatModal component', () => {
    expect(ChatModal).toBeDefined();
    expect(typeof ChatModal).toBe('function');
  });

  it('exports ChatMessage component', () => {
    expect(ChatMessage).toBeDefined();
    expect(typeof ChatMessage).toBe('function');
  });

  it('exports ChatInput component', () => {
    expect(ChatInput).toBeDefined();
    expect(typeof ChatInput).toBe('function');
  });

  it('exports ChatMessageType interface', () => {
    // TypeScript interfaces are not available at runtime, so we test the type exists
    // by checking if we can use it in a type annotation
    const testMessage: ChatMessageType = {
      id: 'test',
      content: 'test',
      role: 'user',
      timestamp: new Date(),
    };
    expect(testMessage).toBeDefined();
  });

  it('exports ChatModel interface', () => {
    // TypeScript interfaces are not available at runtime, so we test the type exists
    // by checking if we can use it in a type annotation
    const testModel: ChatModel = {
      id: 'test',
      name: 'test',
      description: 'test',
    };
    expect(testModel).toBeDefined();
  });
});
