/**
 * Tests for proper Hugging Face chat templating implementation
 */

import {
  createRollingContext,
  createSystemMessage,
  isValidChatMessage,
} from '../../../lib/utils/chat';
import { ChatMessage } from '../../../types/chat';

describe('Chat Templating', () => {
  describe('createSystemMessage', () => {
    it('should create a system message with correct role', () => {
      const systemMessage = createSystemMessage('You are a helpful assistant.');

      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toBe('You are a helpful assistant.');
    });
  });

  describe('isValidChatMessage', () => {
    it('should validate system messages', () => {
      const systemMessage: ChatMessage = {
        id: 'test-id',
        content: 'System prompt',
        role: 'system',
        timestamp: new Date(),
      };

      expect(isValidChatMessage(systemMessage)).toBe(true);
    });

    it('should validate user messages', () => {
      const userMessage: ChatMessage = {
        id: 'test-id',
        content: 'Hello!',
        role: 'user',
        timestamp: new Date(),
      };

      expect(isValidChatMessage(userMessage)).toBe(true);
    });

    it('should validate assistant messages', () => {
      const assistantMessage: ChatMessage = {
        id: 'test-id',
        content: 'Hi there!',
        role: 'assistant',
        timestamp: new Date(),
      };

      expect(isValidChatMessage(assistantMessage)).toBe(true);
    });

    it('should reject invalid roles', () => {
      const invalidMessage = {
        id: 'test-id',
        content: 'Hello!',
        role: 'invalid',
        timestamp: new Date(),
      };

      expect(isValidChatMessage(invalidMessage)).toBe(false);
    });
  });

  describe('createRollingContext', () => {
    it('should preserve system messages at the beginning', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          content: 'You are a helpful assistant.',
          role: 'system',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'Hello!',
          role: 'user',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content: 'Hi there!',
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
        {
          id: '4',
          content: 'How are you?',
          role: 'user',
          timestamp: new Date('2024-01-01T10:03:00Z'),
        },
      ];

      const context = createRollingContext(messages, 1000);

      // System message should be first
      expect(context[0].role).toBe('system');
      expect(context[0].content).toBe('You are a helpful assistant.');

      // Rest should maintain chronological order
      expect(context[1].role).toBe('user');
      expect(context[2].role).toBe('assistant');
      expect(context[3].role).toBe('user');
    });

    it('should handle multiple system messages by keeping all', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          content: 'First system message.',
          role: 'system',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content: 'Second system message.',
          role: 'system',
          timestamp: new Date('2024-01-01T10:00:01Z'),
        },
        {
          id: '3',
          content: 'Hello!',
          role: 'user',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
      ];

      const context = createRollingContext(messages, 1000);

      // Both system messages should be preserved and come first
      expect(context.length).toBe(3);
      expect(context[0].role).toBe('system');
      expect(context[1].role).toBe('system');
      expect(context[2].role).toBe('user');
    });

    it('should handle token limit correctly while preserving system messages', () => {
      const messages: ChatMessage[] = [
        {
          id: '1',
          content: 'You are a helpful assistant.', // ~7 tokens
          role: 'system',
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: '2',
          content:
            'This is a very long message that should exceed our token limit when combined with other messages.', // ~20 tokens
          role: 'user',
          timestamp: new Date('2024-01-01T10:01:00Z'),
        },
        {
          id: '3',
          content:
            'This is another very long message that should also exceed our token limit.', // ~16 tokens
          role: 'assistant',
          timestamp: new Date('2024-01-01T10:02:00Z'),
        },
      ];

      // Set a low token limit (30 tokens) - should keep system + one more message
      const context = createRollingContext(messages, 30);

      // System message should always be preserved
      expect(context[0].role).toBe('system');
      expect(context.length).toBeGreaterThan(1); // Should include at least the system message and one other
      expect(context.length).toBeLessThanOrEqual(3); // But not necessarily all messages
    });
  });
});
