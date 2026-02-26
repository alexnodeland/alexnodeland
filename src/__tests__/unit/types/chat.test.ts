import {
  ChatMessage,
  ChatModel,
  ExtendedChatContextType,
  GenerationConfig,
  ModelGenerationProfile,
  ModelLoadingState,
  ProgressItem,
  WorkerRequest,
  WorkerResponse,
} from '../../../types/chat';

describe('Chat Types', () => {
  describe('ChatMessage', () => {
    it('should validate ChatMessage interface', () => {
      const message: ChatMessage = {
        id: 'test-id',
        content: 'Test message',
        role: 'user',
        timestamp: new Date(),
      };

      expect(message.id).toBe('test-id');
      expect(message.content).toBe('Test message');
      expect(message.role).toBe('user');
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should allow assistant role', () => {
      const message: ChatMessage = {
        id: 'test-id',
        content: 'Assistant response',
        role: 'assistant',
        timestamp: new Date(),
      };

      expect(message.role).toBe('assistant');
    });
  });

  describe('ModelGenerationProfile', () => {
    it('should validate ModelGenerationProfile interface', () => {
      const profile: ModelGenerationProfile = {
        maxTokens: 4096,
        maxTokensWasm: 2048,
        temperature: 0.05,
        temperatureWasm: 0.0,
        topK: 40,
        topKWasm: 20,
        topP: 0.1,
        repetitionPenalty: 1.05,
      };

      expect(profile.maxTokens).toBe(4096);
      expect(profile.topP).toBe(0.1);
    });

    it('should allow topP to be undefined', () => {
      const profile: ModelGenerationProfile = {
        maxTokens: 4096,
        maxTokensWasm: 2048,
        temperature: 0.3,
        temperatureWasm: 0.0,
        topK: 40,
        topKWasm: 20,
        repetitionPenalty: 1.05,
      };

      expect(profile.topP).toBeUndefined();
    });
  });

  describe('ChatModel', () => {
    it('should validate basic ChatModel interface', () => {
      const model: ChatModel = {
        id: 'test-model',
        name: 'Test Model',
        description: 'A test model',
      };

      expect(model.id).toBe('test-model');
      expect(model.name).toBe('Test Model');
      expect(model.description).toBe('A test model');
    });

    it('should allow extended properties', () => {
      const model: ChatModel = {
        id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
        name: 'lfm-1.2b',
        description: 'efficient reasoning model',
        size: '~1.2GB',
        contextWindow: 16384,
        device: 'webgpu',
        dtype: 'q4',
        dtypeWasm: 'auto',
        alwaysThinks: true,
        templateOptions: {},
        generationProfile: {
          maxTokens: 4096,
          maxTokensWasm: 2048,
          temperature: 0.05,
          temperatureWasm: 0.0,
          topK: 40,
          topKWasm: 20,
          topP: 0.1,
          repetitionPenalty: 1.05,
        },
      };

      expect(model.size).toBe('~1.2GB');
      expect(model.contextWindow).toBe(16384);
      expect(model.device).toBe('webgpu');
      expect(model.dtype).toBe('q4');
      expect(model.dtypeWasm).toBe('auto');
      expect(model.alwaysThinks).toBe(true);
      expect(model.generationProfile?.repetitionPenalty).toBe(1.05);
    });

    it('should allow cpu device option', () => {
      const model: ChatModel = {
        id: 'test-model',
        name: 'Test Model',
        description: 'A test model',
        device: 'cpu',
      };

      expect(model.device).toBe('cpu');
    });
  });

  describe('ProgressItem', () => {
    it('should validate ProgressItem interface', () => {
      const progress: ProgressItem = {
        file: 'model.onnx',
        progress: 50,
      };

      expect(progress.file).toBe('model.onnx');
      expect(progress.progress).toBe(50);
    });

    it('should allow optional total and loaded properties', () => {
      const progress: ProgressItem = {
        file: 'model.onnx',
        progress: 75.5,
        total: 1000000,
        loaded: 755000,
      };

      expect(progress.total).toBe(1000000);
      expect(progress.loaded).toBe(755000);
      expect(progress.progress).toBe(75.5);
    });
  });

  describe('ModelLoadingState', () => {
    it('should validate idle state', () => {
      const state: ModelLoadingState = {
        status: 'idle',
        progress: [],
      };

      expect(state.status).toBe('idle');
      expect(state.progress).toEqual([]);
    });

    it('should validate loading state with progress', () => {
      const state: ModelLoadingState = {
        status: 'loading',
        progress: [
          { file: 'model.onnx', progress: 25 },
          { file: 'tokenizer.json', progress: 80 },
        ],
        loadingMessage: 'Loading model files...',
      };

      expect(state.status).toBe('loading');
      expect(state.progress).toHaveLength(2);
      expect(state.loadingMessage).toBe('Loading model files...');
    });

    it('should validate error state', () => {
      const state: ModelLoadingState = {
        status: 'error',
        progress: [],
        error: 'WebGPU not supported',
      };

      expect(state.status).toBe('error');
      expect(state.error).toBe('WebGPU not supported');
    });

    it('should validate ready state', () => {
      const state: ModelLoadingState = {
        status: 'ready',
        progress: [],
      };

      expect(state.status).toBe('ready');
    });
  });

  describe('WorkerRequest', () => {
    it('should validate check request', () => {
      const request: WorkerRequest = {
        type: 'check',
      };

      expect(request.type).toBe('check');
    });

    it('should validate load request with data', () => {
      const request: WorkerRequest = {
        type: 'load',
        data: { modelId: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX' },
      };

      expect(request.type).toBe('load');
      expect(request.data.modelId).toBe('LiquidAI/LFM2.5-1.2B-Thinking-ONNX');
    });

    it('should validate generate request', () => {
      const request: WorkerRequest = {
        type: 'generate',
        data: {
          messages: [
            { id: '1', content: 'Hello', role: 'user', timestamp: new Date() },
          ],
        },
      };

      expect(request.type).toBe('generate');
      expect(request.data.messages).toHaveLength(1);
    });
  });

  describe('WorkerResponse', () => {
    it('should validate progress response', () => {
      const response: WorkerResponse = {
        status: 'progress',
        file: 'model.onnx',
        progress: 45,
        total: 1000000,
      };

      expect(response.status).toBe('progress');
      expect(response.file).toBe('model.onnx');
      expect(response.progress).toBe(45);
      expect(response.total).toBe(1000000);
    });

    it('should validate update response', () => {
      const response: WorkerResponse = {
        status: 'update',
        output: 'Hello! How can I help you?',
        tps: 12.5,
        numTokens: 8,
      };

      expect(response.status).toBe('update');
      expect(response.output).toBe('Hello! How can I help you?');
      expect(response.tps).toBe(12.5);
      expect(response.numTokens).toBe(8);
    });

    it('should validate error response', () => {
      const response: WorkerResponse = {
        status: 'error',
        data: 'Model loading failed',
      };

      expect(response.status).toBe('error');
      expect(response.data).toBe('Model loading failed');
    });
  });

  describe('GenerationConfig', () => {
    it('should validate default generation config', () => {
      const config: GenerationConfig = {};

      expect(config).toBeDefined();
    });

    it('should validate full generation config', () => {
      const config: GenerationConfig = {
        maxTokens: 2048,
        temperature: 0.7,
        topK: 40,
        doSample: true,
      };

      expect(config.maxTokens).toBe(2048);
      expect(config.temperature).toBe(0.7);
      expect(config.topK).toBe(40);
      expect(config.doSample).toBe(true);
    });
  });

  describe('ExtendedChatContextType', () => {
    it('should include all required properties', () => {
      const mockContext: Partial<ExtendedChatContextType> = {
        isChatOpen: false,
        isClosing: false,
        messages: [],
        selectedModel: 'test-model',
        availableModels: [],
        isLoading: false,
        modelState: { status: 'idle', progress: [] },
        webGPUSupported: null,
        isGenerating: false,
        generationConfig: {},
      };

      expect(mockContext.isChatOpen).toBe(false);
      expect(mockContext.modelState?.status).toBe('idle');
      expect(mockContext.webGPUSupported).toBeNull();
      expect(mockContext.isGenerating).toBe(false);
    });
  });
});
