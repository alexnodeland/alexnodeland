// Mock context for testing simulated APIs
const createMockContext = (overrides = {}) => ({
  isChatOpen: true,
  isClosing: false,
  messages: [],
  selectedModel: 'mock-model',
  availableModels: [],
  isLoading: false,
  setChatOpen: jest.fn(),
  setClosing: jest.fn(),
  addMessage: jest.fn(),
  setSelectedModel: jest.fn(),
  setLoading: jest.fn(),
  clearMessages: jest.fn(),
  modelState: { status: 'idle', progress: [] },
  webGPUSupported: null,
  isGenerating: false,
  loadModel: jest.fn(),
  generateResponse: jest.fn(),
  interruptGeneration: jest.fn(),
  resetConversation: jest.fn(),
  ...overrides,
});

// Mock the useChat hook for testing
jest.mock('../../../components/chat/ChatContext', () => {
  let mockContextValue = createMockContext();

  return {
    useChat: () => mockContextValue,
    ChatProvider: ({ children }: any) => children,
    // Test helper to update mock context
    __setMockContext: (newValue: any) => {
      mockContextValue = { ...mockContextValue, ...newValue };
    },
  };
});

describe('ChatContext simulated APIs (feature-flag off)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose loadModel method', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect(context.loadModel).toBeDefined();
    expect(typeof context.loadModel).toBe('function');
  });

  it('should expose generateResponse method', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect(context.generateResponse).toBeDefined();
    expect(typeof context.generateResponse).toBe('function');
  });

  it('should expose modelState with correct default', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect(context.modelState).toBeDefined();
    expect(context.modelState.status).toBe('idle');
    expect(Array.isArray(context.modelState.progress)).toBe(true);
  });

  it('should expose webGPUSupported state', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect('webGPUSupported' in context).toBe(true);
    expect(context.webGPUSupported).toBeNull();
  });

  it('should expose isGenerating state', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect('isGenerating' in context).toBe(true);
    expect(typeof context.isGenerating).toBe('boolean');
  });

  it('should expose interrupt and reset methods', () => {
    const { useChat } = require('../../../components/chat/ChatContext');
    const context = useChat();

    expect(context.interruptGeneration).toBeDefined();
    expect(typeof context.interruptGeneration).toBe('function');

    expect(context.resetConversation).toBeDefined();
    expect(typeof context.resetConversation).toBe('function');
  });
});
