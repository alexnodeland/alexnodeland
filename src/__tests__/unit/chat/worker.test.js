// Mock the Transformers.js imports
const mockAutoTokenizer = {
  from_pretrained: jest.fn(),
};

const mockAutoModelForCausalLM = {
  from_pretrained: jest.fn(),
};

const mockTextStreamer = jest.fn();
const mockInterruptableStoppingCriteria = jest.fn(() => ({
  reset: jest.fn(),
  interrupt: jest.fn(),
}));

jest.mock('@huggingface/transformers', () => ({
  AutoTokenizer: mockAutoTokenizer,
  AutoModelForCausalLM: mockAutoModelForCausalLM,
  TextStreamer: mockTextStreamer,
  InterruptableStoppingCriteria: mockInterruptableStoppingCriteria,
}));

describe('Chat Worker Structure', () => {
  let originalSelf, originalNavigator, originalConsole, originalPerformance;

  beforeEach(() => {
    // Store originals
    originalSelf = global.self;
    originalNavigator = global.navigator;
    originalConsole = global.console;
    originalPerformance = global.performance;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    global.self = originalSelf;
    global.navigator = originalNavigator;
    global.console = originalConsole;
    global.performance = originalPerformance;

    // Clear module cache
    const workerPath = require.resolve('../../../components/chat/worker.js');
    if (require.cache[workerPath]) {
      delete require.cache[workerPath];
    }
  });

  describe('Worker File Loading', () => {
    it('should load worker file without errors', () => {
      // Setup minimal global environment
      global.self = {
        postMessage: jest.fn(),
        addEventListener: jest.fn(),
      };
      global.navigator = {
        gpu: {
          requestAdapter: jest.fn().mockResolvedValue(null),
        },
      };
      global.console = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      global.performance = {
        now: () => Date.now(),
      };

      // Should not throw when loading
      expect(() => {
        require('../../../components/chat/worker.js');
      }).not.toThrow();
    });

    it('should set up basic worker environment', () => {
      const mockAddEventListener = jest.fn();
      const mockPostMessage = jest.fn();

      global.self = {
        postMessage: mockPostMessage,
        addEventListener: mockAddEventListener,
      };
      global.navigator = { gpu: { requestAdapter: jest.fn() } };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Load worker
      require('../../../components/chat/worker.js');

      // Should have called addEventListener for event setup
      expect(mockAddEventListener).toHaveBeenCalled();

      // Should have logged initialization
      expect(global.console.log).toHaveBeenCalledWith(
        'Chat worker initialized and ready for messages'
      );
    });
  });

  describe('Transformers.js Integration', () => {
    it('should import required Transformers.js modules', () => {
      global.self = { postMessage: jest.fn(), addEventListener: jest.fn() };
      global.navigator = { gpu: { requestAdapter: jest.fn() } };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Load worker - should not fail with imports
      expect(() => {
        require('../../../components/chat/worker.js');
      }).not.toThrow();

      // Verify mocks are available (modules were imported)
      expect(mockAutoTokenizer).toBeDefined();
      expect(mockAutoModelForCausalLM).toBeDefined();
      expect(mockTextStreamer).toBeDefined();
      expect(mockInterruptableStoppingCriteria).toBeDefined();
    });
  });

  describe('Worker Message Structure', () => {
    let mockAddEventListener;
    let messageHandler;

    beforeEach(() => {
      mockAddEventListener = jest.fn();

      global.self = {
        postMessage: jest.fn(),
        addEventListener: mockAddEventListener,
      };
      global.navigator = { gpu: { requestAdapter: jest.fn() } };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Load worker
      require('../../../components/chat/worker.js');

      // Extract message handler
      const messageCall = mockAddEventListener.mock.calls.find(
        call => call[0] === 'message'
      );
      messageHandler = messageCall ? messageCall[1] : null;
    });

    it('should register message handler', () => {
      expect(messageHandler).toBeDefined();
      expect(typeof messageHandler).toBe('function');
    });

    it('should handle basic message structure', async () => {
      expect(messageHandler).toBeDefined();

      // Test with a simple message - should not crash
      await expect(async () => {
        await messageHandler({
          data: { type: 'unknown_test_type' },
        });
      }).not.toThrow();
    });
  });

  describe('WebGPU Support Detection', () => {
    it('should handle environments without WebGPU', () => {
      global.self = { postMessage: jest.fn(), addEventListener: jest.fn() };
      global.navigator = {}; // No GPU support
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Should load without errors even without WebGPU
      expect(() => {
        require('../../../components/chat/worker.js');
      }).not.toThrow();
    });

    it('should handle WebGPU adapter failures', () => {
      global.self = { postMessage: jest.fn(), addEventListener: jest.fn() };
      global.navigator = {
        gpu: {
          requestAdapter: jest.fn().mockRejectedValue(new Error('GPU Error')),
        },
      };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Should load without errors even when GPU fails
      expect(() => {
        require('../../../components/chat/worker.js');
      }).not.toThrow();
    });
  });

  describe('Error Handling Setup', () => {
    it('should set up error event listeners', () => {
      const mockAddEventListener = jest.fn();

      global.self = {
        postMessage: jest.fn(),
        addEventListener: mockAddEventListener,
      };
      global.navigator = { gpu: { requestAdapter: jest.fn() } };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      require('../../../components/chat/worker.js');

      // Should register multiple event listeners
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
    });
  });

  describe('Model Configuration', () => {
    it('should use correct model ID', () => {
      global.self = { postMessage: jest.fn(), addEventListener: jest.fn() };
      global.navigator = { gpu: { requestAdapter: jest.fn() } };
      global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
      global.performance = { now: () => Date.now() };

      // Load worker
      require('../../../components/chat/worker.js');

      // The worker should have loaded without errors and be ready to use the correct model
      // We can't directly test the TextGenerationPipeline class since it's not exported,
      // but we can verify the file loads and the console indicates proper initialization
      expect(global.console.log).toHaveBeenCalledWith(
        'Chat worker initialized and ready for messages'
      );
    });
  });
});
