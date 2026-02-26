/**
 * Phase 4 Tests: Model Switching & Context Window Management
 * Tests for the advanced features implemented in Phase 4
 */

import {
  AVAILABLE_MODELS,
  ModelCache,
  createRollingContext,
  estimateTokens,
  formatBytes,
  getModelById,
  getRecommendedContextWindow,
  isValidChatMessage,
  validateChatMessages,
} from '../../../lib/utils/chat';
import { ChatMessage } from '../../../types/chat';

describe('Phase 4A: Model Switching with Cache', () => {
  beforeEach(() => {
    // Clear model cache before each test
    ModelCache.clearCache();
  });

  describe('AVAILABLE_MODELS', () => {
    it('should include both LFM and Qwen models', () => {
      expect(AVAILABLE_MODELS).toHaveLength(2);

      const modelIds = AVAILABLE_MODELS.map(m => m.id);
      expect(modelIds).toContain('LiquidAI/LFM2.5-1.2B-Thinking-ONNX');
      expect(modelIds).toContain('onnx-community/Qwen3-0.6B-ONNX');
    });

    it('should have correct LFM model properties', () => {
      const lfmModel = AVAILABLE_MODELS.find(
        m => m.id === 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      expect(lfmModel).toBeDefined();
      expect(lfmModel?.name).toBe('lfm-1.2b');
      expect(lfmModel?.contextWindow).toBe(16384);
      expect(lfmModel?.device).toBe('webgpu');
      expect(lfmModel?.alwaysThinks).toBe(true);
      expect(lfmModel?.generationProfile?.cvTokenBudget).toBe(1200);
    });

    it('should have correct Qwen model properties', () => {
      const qwenModel = AVAILABLE_MODELS.find(
        m => m.id === 'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(qwenModel).toBeDefined();
      expect(qwenModel?.name).toBe('qwen-0.6b');
      expect(qwenModel?.dtype).toBe('q4f16');
      expect(qwenModel?.alwaysThinks).toBe(false);
      expect(qwenModel?.generationProfile?.cvTokenBudget).toBe(600);
    });

    it('should have valid model properties', () => {
      AVAILABLE_MODELS.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.description).toBeDefined();
        expect(typeof model.contextWindow).toBe('number');
        expect(model.device).toMatch(/^(webgpu|cpu)$/);
      });
    });
  });

  describe('ModelCache', () => {
    it('should start with empty cache', () => {
      expect(ModelCache.isModelCached('test-model')).toBe(false);
      expect(ModelCache.getCachedModels()).toHaveLength(0);
    });

    it('should track model loading state', () => {
      ModelCache.setModelLoading('test-model', 'webgpu');

      const entry = ModelCache.getModelEntry('test-model');
      expect(entry).toBeDefined();
      expect(entry?.status).toBe('loading');
      expect(entry?.device).toBe('webgpu');
      expect(entry?.modelId).toBe('test-model');
    });

    it('should update model to ready state', () => {
      ModelCache.setModelLoading('test-model');
      ModelCache.setModelReady('test-model', 'cpu');

      expect(ModelCache.isModelCached('test-model')).toBe(true);
      const entry = ModelCache.getModelEntry('test-model');
      expect(entry?.status).toBe('ready');
      expect(entry?.device).toBe('cpu');
    });

    it('should handle model errors', () => {
      ModelCache.setModelLoading('test-model');
      ModelCache.setModelError('test-model');

      const entry = ModelCache.getModelEntry('test-model');
      expect(entry?.status).toBe('error');
    });

    it('should remove specific models', () => {
      ModelCache.setModelReady('model1', 'cpu');
      ModelCache.setModelReady('model2', 'webgpu');

      expect(ModelCache.getCachedModels()).toHaveLength(2);

      ModelCache.removeModel('model1');
      expect(ModelCache.getCachedModels()).toHaveLength(1);
      expect(ModelCache.isModelCached('model1')).toBe(false);
      expect(ModelCache.isModelCached('model2')).toBe(true);
    });

    it('should clear entire cache', () => {
      ModelCache.setModelReady('model1', 'cpu');
      ModelCache.setModelReady('model2', 'webgpu');

      expect(ModelCache.getCachedModels()).toHaveLength(2);

      ModelCache.clearCache();
      expect(ModelCache.getCachedModels()).toHaveLength(0);
    });
  });

  describe('getModelById', () => {
    it('should return correct model for valid ID', () => {
      const model = getModelById('LiquidAI/LFM2.5-1.2B-Thinking-ONNX');
      expect(model).toBeDefined();
      expect(model?.name).toBe('lfm-1.2b');
    });

    it('should return correct Qwen model', () => {
      const model = getModelById('onnx-community/Qwen3-0.6B-ONNX');
      expect(model).toBeDefined();
      expect(model?.name).toBe('qwen-0.6b');
    });

    it('should return undefined for invalid ID', () => {
      const model = getModelById('nonexistent-model');
      expect(model).toBeUndefined();
    });
  });

  describe('getRecommendedContextWindow', () => {
    it('should return model context window for LFM', () => {
      const contextWindow = getRecommendedContextWindow(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      expect(contextWindow).toBe(16384);
    });

    it('should return model context window for Qwen', () => {
      const contextWindow = getRecommendedContextWindow(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(contextWindow).toBe(16384);
    });

    it('should return safe default for unknown models', () => {
      const contextWindow = getRecommendedContextWindow('unknown-model');
      expect(contextWindow).toBe(2048);
    });
  });
});

describe('Phase 4B: Context Window Management', () => {
  const createTestMessage = (
    content: string,
    role: 'user' | 'assistant' = 'user'
  ): ChatMessage => ({
    id: Math.random().toString(36),
    content,
    role,
    timestamp: new Date(),
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('test')).toBe(1); // 4 chars = 1 token
      expect(estimateTokens('hello world')).toBe(3); // 11 chars = 3 tokens
      expect(estimateTokens('a'.repeat(100))).toBe(25); // 100 chars = 25 tokens
    });

    it('should handle non-string inputs', () => {
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);
    });
  });

  describe('createRollingContext', () => {
    const messages = [
      createTestMessage('First message'),
      createTestMessage('Second message'),
      createTestMessage('Third message'),
      createTestMessage('Fourth message'),
    ];

    it('should return empty array for empty input', () => {
      expect(createRollingContext([])).toEqual([]);
      expect(createRollingContext(null as any)).toEqual([]);
    });

    it('should return empty array for zero token limit', () => {
      expect(createRollingContext(messages, 0)).toEqual([]);
    });

    it('should return empty when token limit is too small for any message', () => {
      const result = createRollingContext(messages, 1);
      expect(result).toHaveLength(0);
    });

    it('should include messages within token limit', () => {
      const result = createRollingContext(messages, 20);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(4);

      // Should maintain chronological order
      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].timestamp.getTime()
        );
      }
    });

    it('should respect token limits', () => {
      const longMessage = createTestMessage('a'.repeat(100)); // ~25 tokens
      const messagesWithLong = [...messages, longMessage];

      const result = createRollingContext(messagesWithLong, 30);
      expect(result.length).toBeLessThanOrEqual(2);
      expect(result[result.length - 1].content).toBe('a'.repeat(100));
    });

    it('should maintain message order', () => {
      const result = createRollingContext(messages, 50);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result[i - 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Message validation', () => {
    it('should validate correct chat messages', () => {
      const validMessage: ChatMessage = {
        id: 'test-id',
        content: 'Hello world',
        role: 'user',
        timestamp: new Date(),
      };

      expect(isValidChatMessage(validMessage)).toBe(true);
    });

    it('should reject invalid messages', () => {
      expect(isValidChatMessage(null)).toBe(false);
      expect(isValidChatMessage({})).toBe(false);
      expect(isValidChatMessage({ id: 'test' })).toBe(false);
      expect(
        isValidChatMessage({
          id: 'test',
          content: 'hello',
          role: 'invalid-role',
          timestamp: new Date(),
        })
      ).toBe(false);
    });

    it('should validate message arrays', () => {
      const validMessages = [
        createTestMessage('Message 1'),
        createTestMessage('Message 2'),
      ];

      const result = validateChatMessages(validMessages);
      expect(result).toHaveLength(2);
    });

    it('should filter out invalid messages from arrays', () => {
      const mixedMessages = [
        createTestMessage('Valid message'),
        { invalid: 'message' },
        createTestMessage('Another valid message'),
        null,
      ];

      const result = validateChatMessages(mixedMessages as any);
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Valid message');
      expect(result[1].content).toBe('Another valid message');
    });
  });

  describe('Utility functions', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });
});

describe('Integration Tests', () => {
  it('should handle full model switching workflow', () => {
    // Start with no cached models
    expect(ModelCache.getCachedModels()).toHaveLength(0);

    // Set a model as loading
    ModelCache.setModelLoading('LiquidAI/LFM2.5-1.2B-Thinking-ONNX', 'webgpu');
    expect(ModelCache.isModelCached('LiquidAI/LFM2.5-1.2B-Thinking-ONNX')).toBe(
      false
    );

    // Mark as ready
    ModelCache.setModelReady('LiquidAI/LFM2.5-1.2B-Thinking-ONNX', 'webgpu');
    expect(ModelCache.isModelCached('LiquidAI/LFM2.5-1.2B-Thinking-ONNX')).toBe(
      true
    );

    // Get recommended context for this model
    const contextWindow = getRecommendedContextWindow(
      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
    );
    expect(contextWindow).toBe(16384);

    // Create some test messages and apply rolling context
    const messages = Array.from(
      { length: 10 },
      (_, i) =>
        ({
          id: `msg-${i}`,
          content: `Message ${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          timestamp: new Date(Date.now() + i * 1000),
        }) as ChatMessage
    );

    const contextMessages = createRollingContext(messages, contextWindow);
    expect(contextMessages.length).toBeLessThanOrEqual(messages.length);
    expect(contextMessages.length).toBeGreaterThan(0);
  });
});
