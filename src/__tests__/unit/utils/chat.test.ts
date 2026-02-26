import {
  AVAILABLE_MODELS,
  createRollingContext,
  createSystemMessage,
  detectWebGPUSupport,
  estimateTokens,
  formatBytes,
  getModelById,
  isValidChatMessage,
  validateChatMessages,
} from '../../../lib/utils/chat';
import { ChatMessage } from '../../../types/chat';

describe('Chat Utilities', () => {
  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should return 0 for null or undefined', () => {
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);
    });

    it('should return 0 for non-string input', () => {
      expect(estimateTokens(123 as any)).toBe(0);
      expect(estimateTokens({} as any)).toBe(0);
    });

    it('should estimate tokens correctly for short text', () => {
      expect(estimateTokens('test')).toBe(1); // 4 chars = 1 token
      expect(estimateTokens('hello')).toBe(2); // 5 chars = 2 tokens
    });

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer text string for testing token estimation.';
      const expected = Math.ceil(text.length / 4);
      expect(estimateTokens(text)).toBe(expected);
    });

    it('should handle text with special characters', () => {
      const text = 'Hello! This has emojis and special characters.';
      const expected = Math.ceil(text.length / 4);
      expect(estimateTokens(text)).toBe(expected);
    });
  });

  describe('createRollingContext', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        content: 'First message',
        role: 'user',
        timestamp: new Date('2023-01-01T00:00:00Z'),
      },
      {
        id: '2',
        content: 'Second message',
        role: 'assistant',
        timestamp: new Date('2023-01-01T00:01:00Z'),
      },
      {
        id: '3',
        content: 'Third message',
        role: 'user',
        timestamp: new Date('2023-01-01T00:02:00Z'),
      },
    ];

    it('should return empty array for empty input', () => {
      expect(createRollingContext([])).toEqual([]);
      expect(createRollingContext(null as any)).toEqual([]);
      expect(createRollingContext(undefined as any)).toEqual([]);
    });

    it('should return empty array for non-positive token limits', () => {
      expect(createRollingContext(mockMessages, 0)).toEqual([]);
      expect(createRollingContext(mockMessages, -1)).toEqual([]);
    });

    it('should return all messages when under token limit', () => {
      const result = createRollingContext(mockMessages, 1000);
      expect(result).toHaveLength(3);
      expect(result).toEqual(mockMessages);
    });

    it('should keep most recent messages when over token limit', () => {
      // Each message is roughly 3-4 tokens, so limit of 8 should keep last 2 messages
      const result = createRollingContext(mockMessages, 8);
      expect(result.length).toBeGreaterThan(0);
      expect(result[result.length - 1].id).toBe('3'); // Most recent message
    });

    it('should return empty when token limit is too small', () => {
      const result = createRollingContext(mockMessages, 1); // Very small limit
      expect(result).toHaveLength(0); // Can't fit any message in 1 token
    });

    it('should preserve message order', () => {
      const result = createRollingContext(mockMessages, 1000);
      expect(result[0].timestamp.getTime()).toBeLessThan(
        result[1].timestamp.getTime()
      );
      expect(result[1].timestamp.getTime()).toBeLessThan(
        result[2].timestamp.getTime()
      );
    });

    it('should use default token limit when not specified', () => {
      const result = createRollingContext(mockMessages);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('detectWebGPUSupport', () => {
    const originalNavigator = (global as any).navigator;

    afterEach(() => {
      // Restore original navigator
      if (originalNavigator) {
        Object.defineProperty(global, 'navigator', {
          value: originalNavigator,
          writable: true,
        });
      }
    });

    it('should return false when navigator.gpu is not available', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
      });
      const result = await detectWebGPUSupport();
      expect(result).toBe(false);
    });

    it('should return false when requestAdapter returns null', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          gpu: {
            requestAdapter: jest.fn().mockResolvedValue(null),
          },
        },
        writable: true,
      });
      const result = await detectWebGPUSupport();
      expect(result).toBe(false);
    });

    it('should return true when adapter is available', async () => {
      const mockAdapter = { mockAdapter: true };
      Object.defineProperty(global, 'navigator', {
        value: {
          gpu: {
            requestAdapter: jest.fn().mockResolvedValue(mockAdapter),
          },
        },
        writable: true,
      });

      const result = await detectWebGPUSupport();
      expect(result).toBe(true);
    });

    it('should return false when requestAdapter throws error', async () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          gpu: {
            requestAdapter: jest
              .fn()
              .mockRejectedValue(new Error('WebGPU error')),
          },
        },
        writable: true,
      });
      const result = await detectWebGPUSupport();
      expect(result).toBe(false);
    });

    it('should handle navigator.gpu being undefined gracefully', async () => {
      Object.defineProperty(global, 'navigator', {
        value: { gpu: undefined },
        writable: true,
      });
      const result = await detectWebGPUSupport();
      expect(result).toBe(false);
    });
  });

  describe('AVAILABLE_MODELS', () => {
    it('should contain the LFM model', () => {
      const lfmModel = AVAILABLE_MODELS.find(
        m => m.id === 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      expect(lfmModel).toBeDefined();
      expect(lfmModel?.name).toBe('lfm-1.2b');
      expect(lfmModel?.alwaysThinks).toBe(true);
      expect(lfmModel?.generationProfile?.topP).toBe(0.1);
    });

    it('should contain the Qwen model', () => {
      const qwenModel = AVAILABLE_MODELS.find(
        m => m.id === 'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(qwenModel).toBeDefined();
      expect(qwenModel?.name).toBe('qwen-0.6b');
      expect(qwenModel?.dtype).toBe('q4f16');
      expect(qwenModel?.alwaysThinks).toBe(false);
      expect(qwenModel?.generationProfile?.topP).toBeUndefined();
    });

    it('should have generationProfile for each model', () => {
      AVAILABLE_MODELS.forEach(model => {
        expect(model.generationProfile).toBeDefined();
        expect(model.generationProfile?.maxTokens).toBeGreaterThan(0);
        expect(model.generationProfile?.cvTokenBudget).toBeGreaterThan(0);
      });
    });

    it('should have all required properties for each model', () => {
      AVAILABLE_MODELS.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.description).toBeDefined();
        expect(typeof model.id).toBe('string');
        expect(typeof model.name).toBe('string');
        expect(typeof model.description).toBe('string');
      });
    });

    it('should have unique model IDs', () => {
      const ids = AVAILABLE_MODELS.map(m => m.id);
      const uniqueIds = Array.from(new Set(ids));
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('getModelById', () => {
    it('should return model when ID exists', () => {
      const model = getModelById('LiquidAI/LFM2.5-1.2B-Thinking-ONNX');
      expect(model).toBeDefined();
      expect(model?.id).toBe('LiquidAI/LFM2.5-1.2B-Thinking-ONNX');
      expect(model?.name).toBe('lfm-1.2b');
    });

    it('should return Qwen model when ID exists', () => {
      const model = getModelById('onnx-community/Qwen3-0.6B-ONNX');
      expect(model).toBeDefined();
      expect(model?.name).toBe('qwen-0.6b');
    });

    it('should return undefined when ID does not exist', () => {
      const model = getModelById('non-existent-model');
      expect(model).toBeUndefined();
    });

    it('should handle empty string', () => {
      const model = getModelById('');
      expect(model).toBeUndefined();
    });

    it('should handle null/undefined', () => {
      const model1 = getModelById(null as any);
      const model2 = getModelById(undefined as any);
      expect(model1).toBeUndefined();
      expect(model2).toBeUndefined();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(2097152)).toBe('2 MB');
      expect(formatBytes(1610612736)).toBe('1.5 GB');
    });

    it('should handle very small values', () => {
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(512)).toBe('512 B');
    });

    it('should handle negative values gracefully', () => {
      // This is edge case handling - function should not crash
      const result = formatBytes(-1024);
      expect(typeof result).toBe('string');
    });
  });

  describe('isValidChatMessage', () => {
    const validMessage: ChatMessage = {
      id: 'test-id',
      content: 'Test content',
      role: 'user',
      timestamp: new Date(),
    };

    it('should return true for valid message', () => {
      expect(isValidChatMessage(validMessage)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isValidChatMessage(null)).toBe(false);
      expect(isValidChatMessage(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidChatMessage('string')).toBe(false);
      expect(isValidChatMessage(123)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isValidChatMessage({})).toBe(false);
      expect(isValidChatMessage({ id: 'test' })).toBe(false);
      expect(isValidChatMessage({ id: 'test', content: 'content' })).toBe(
        false
      );
    });

    it('should return false for invalid role', () => {
      const invalidRole = { ...validMessage, role: 'invalid' };
      expect(isValidChatMessage(invalidRole)).toBe(false);
    });

    it('should return false for invalid timestamp', () => {
      const invalidTimestamp = { ...validMessage, timestamp: 'not-a-date' };
      expect(isValidChatMessage(invalidTimestamp)).toBe(false);
    });

    it('should return true for assistant role', () => {
      const assistantMessage = { ...validMessage, role: 'assistant' as const };
      expect(isValidChatMessage(assistantMessage)).toBe(true);
    });
  });

  describe('validateChatMessages', () => {
    const validMessage: ChatMessage = {
      id: 'test-id',
      content: 'Test content',
      role: 'user',
      timestamp: new Date(),
    };

    it('should return empty array for non-array input', () => {
      expect(validateChatMessages(null as any)).toEqual([]);
      expect(validateChatMessages(undefined as any)).toEqual([]);
      expect(validateChatMessages('not-an-array' as any)).toEqual([]);
    });

    it('should filter out invalid messages', () => {
      const mixed = [validMessage, { invalid: 'message' }, null, validMessage];
      const result = validateChatMessages(mixed);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validMessage);
    });

    it('should return all valid messages', () => {
      const allValid = [validMessage, { ...validMessage, id: 'test-2' }];
      const result = validateChatMessages(allValid);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when all invalid', () => {
      const allInvalid = [null, undefined, { invalid: true }];
      const result = validateChatMessages(allInvalid);
      expect(result).toEqual([]);
    });
  });

  describe('createSystemMessage', () => {
    it('should create system message with system role', () => {
      const content = 'You are a helpful AI assistant.';
      const result = createSystemMessage(content);

      expect(result.content).toBe(content);
      expect(result.role).toBe('system');
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('should handle empty content', () => {
      const result = createSystemMessage('');
      expect(result.content).toBe('');
      expect(result.role).toBe('system');
    });

    it('should handle special characters in content', () => {
      const content = 'System message with emojis and special chars!';
      const result = createSystemMessage(content);
      expect(result.content).toBe(content);
    });
  });
});
