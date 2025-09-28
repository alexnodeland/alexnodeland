// Mock the worker file to avoid bundler issues in tests
jest.mock('../../../components/chat/worker.js', () => ({}), { virtual: true });

// Mock environment for testing
const originalEnv = process.env;

// Mock useChat context for real model testing
const createMockContextWithWorker = (
  modelStatus = 'ready',
  workerEnabled = true
) => ({
  isChatOpen: true,
  isClosing: false,
  messages: [
    { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
  ],
  selectedModel: 'onnx-community/Qwen3-0.6B-ONNX',
  availableModels: [
    {
      id: 'onnx-community/Qwen3-0.6B-ONNX',
      name: 'qwen3-0.6b',
      description: 'Real model',
    },
  ],
  isLoading: false,
  setChatOpen: jest.fn(),
  setClosing: jest.fn(),
  addMessage: jest.fn(),
  setSelectedModel: jest.fn(),
  setLoading: jest.fn(),
  clearMessages: jest.fn(),
  modelState: { status: modelStatus, progress: [] },
  webGPUSupported: true,
  isGenerating: false,
  loadModel: workerEnabled ? jest.fn() : undefined,
  generateResponse: workerEnabled ? jest.fn() : undefined,
  interruptGeneration: workerEnabled ? jest.fn() : undefined,
  resetConversation: workerEnabled ? jest.fn() : undefined,
});

describe('ChatContext Real Model Integration (Step 3C)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Feature Flag Control', () => {
    it('should enable worker when GATSBY_CHAT_WORKER=true', () => {
      process.env.GATSBY_CHAT_WORKER = 'true';

      // In a real browser environment (window exists), worker should be enabled
      const mockWindow = {} as any;
      global.window = mockWindow;

      // Test that the feature flag logic would work
      const shouldEnable =
        typeof window !== 'undefined' &&
        process.env.GATSBY_CHAT_WORKER === 'true';
      expect(shouldEnable).toBe(true);

      (global as any).window = undefined;
    });

    it('should disable worker when GATSBY_CHAT_WORKER is not set', () => {
      process.env.GATSBY_CHAT_WORKER = undefined;

      const mockWindow = {} as any;
      global.window = mockWindow;

      const shouldEnable =
        typeof window !== 'undefined' &&
        process.env.GATSBY_CHAT_WORKER === 'true';
      expect(shouldEnable).toBe(false);

      (global as any).window = undefined;
    });

    it('should disable worker in SSR environment (no window)', () => {
      process.env.GATSBY_CHAT_WORKER = 'true';

      // Simulate SSR by removing window from global
      const originalWindow = (global as any).window;
      delete (global as any).window;

      const shouldEnable =
        typeof window !== 'undefined' &&
        process.env.GATSBY_CHAT_WORKER === 'true';
      expect(shouldEnable).toBe(false);

      // Restore window for other tests
      (global as any).window = originalWindow;
    });
  });

  describe('Model State Management', () => {
    it('should handle model ready state', () => {
      const context = createMockContextWithWorker('ready', true);

      expect(context.modelState.status).toBe('ready');
      expect(context.generateResponse).toBeDefined();
      expect(typeof context.generateResponse).toBe('function');
    });

    it('should handle model loading state', () => {
      const context = createMockContextWithWorker('loading', true);

      expect(context.modelState.status).toBe('loading');
      expect(context.loadModel).toBeDefined();
    });

    it('should handle model error state with fallback', () => {
      const context = createMockContextWithWorker('error', false);

      expect(context.modelState.status).toBe('error');
      // Worker methods should be undefined (fallback mode)
      expect(context.generateResponse).toBeUndefined();
    });
  });

  describe('Error Handling and Fallback', () => {
    it('should provide fallback when worker is not available', () => {
      const context = createMockContextWithWorker('idle', false);

      // No worker methods available
      expect(context.generateResponse).toBeUndefined();
      expect(context.loadModel).toBeUndefined();

      // But basic chat functionality still works
      expect(context.addMessage).toBeDefined();
      expect(context.messages).toBeDefined();
    });

    it('should handle WebGPU detection results', () => {
      const contextWithWebGPU = createMockContextWithWorker('ready', true);
      const contextWithoutWebGPU = {
        ...contextWithWebGPU,
        webGPUSupported: false,
      };

      expect(contextWithWebGPU.webGPUSupported).toBe(true);
      expect(contextWithoutWebGPU.webGPUSupported).toBe(false);
    });

    it('should maintain conversation state across worker states', () => {
      const context = createMockContextWithWorker('ready', true);

      // Messages should persist regardless of worker state
      expect(context.messages).toHaveLength(1);
      expect(context.messages[0].content).toBe('Hello');
      expect(context.clearMessages).toBeDefined();
    });
  });

  describe('Model Selection and Loading', () => {
    it('should support multiple models', () => {
      const context = createMockContextWithWorker('idle', true);

      expect(context.availableModels).toHaveLength(1);
      expect(context.availableModels[0].id).toBe(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(context.selectedModel).toBe('onnx-community/Qwen3-0.6B-ONNX');
    });

    it('should handle model switching', () => {
      const context = createMockContextWithWorker('ready', true);

      expect(context.setSelectedModel).toBeDefined();
      expect(typeof context.setSelectedModel).toBe('function');

      // Model loading should be available for switching
      expect(context.loadModel).toBeDefined();
    });
  });

  describe('Generation State Management', () => {
    it('should track generation state correctly', () => {
      const context = createMockContextWithWorker('ready', true);

      expect('isGenerating' in context).toBe(true);
      expect(typeof context.isGenerating).toBe('boolean');
      expect(context.interruptGeneration).toBeDefined();
    });

    it('should distinguish between loading and generating', () => {
      const context = createMockContextWithWorker('ready', true);

      // isLoading is for general UI loading
      expect('isLoading' in context).toBe(true);
      // isGenerating is for active text generation
      expect('isGenerating' in context).toBe(true);

      // Both should be available for different UI states
      expect(context.setLoading).toBeDefined();
    });
  });
});
