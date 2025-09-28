/**
 * Thinking Blocks Tests
 * Tests for the thinking block functionality with <think> tag parsing
 */

import { fireEvent, render, screen } from '@testing-library/react';
import ThinkingBlock from '../../../components/chat/ThinkingBlock';
import {
  parseThinkingBlocks,
  updateMessageWithThinking,
} from '../../../lib/utils/chat';
import { ChatMessage } from '../../../types/chat';

describe('Thinking Block Functionality', () => {
  describe('parseThinkingBlocks', () => {
    it('should parse text with no thinking tags', () => {
      const text = 'This is a regular message without thinking.';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe('');
      expect(result.content).toBe(text);
      expect(result.isThinkingComplete).toBe(false);
      expect(result.isInThinkingBlock).toBe(false);
    });

    it('should parse text with incomplete thinking block', () => {
      const text = '<think>I need to consider this carefully...';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe('I need to consider this carefully...');
      expect(result.content).toBe('');
      expect(result.isThinkingComplete).toBe(false);
      expect(result.isInThinkingBlock).toBe(true);
    });

    it('should parse text with complete thinking block', () => {
      const text =
        '<think>Let me think about this...</think>Here is my response.';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe('Let me think about this...');
      expect(result.content).toBe('Here is my response.');
      expect(result.isThinkingComplete).toBe(true);
      expect(result.isInThinkingBlock).toBe(false);
    });

    it('should parse text with thinking block and newlines', () => {
      const text =
        '<think>First line of thinking\nSecond line of thinking</think>\n\nActual response here.';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe(
        'First line of thinking\nSecond line of thinking'
      );
      expect(result.content).toBe('\n\nActual response here.');
      expect(result.isThinkingComplete).toBe(true);
      expect(result.isInThinkingBlock).toBe(false);
    });

    it('should handle empty thinking block', () => {
      const text = '<think></think>Response content here.';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe('');
      expect(result.content).toBe('Response content here.');
      expect(result.isThinkingComplete).toBe(true);
      expect(result.isInThinkingBlock).toBe(false);
    });

    it('should handle multiple thinking blocks (takes first)', () => {
      const text =
        '<think>First thinking</think>Content<think>Second thinking</think>More content';
      const result = parseThinkingBlocks(text);

      expect(result.thinking).toBe('First thinking');
      expect(result.content).toBe(
        'Content<think>Second thinking</think>More content'
      );
      expect(result.isThinkingComplete).toBe(true);
    });
  });

  describe('updateMessageWithThinking', () => {
    const baseMessage: ChatMessage = {
      id: 'test-1',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    it('should update message with streaming thinking content', () => {
      const message1 = updateMessageWithThinking(
        baseMessage,
        '<think>Starting to think'
      );
      expect(message1.thinking).toBe('Starting to think');
      expect(message1.content).toBe('');

      const message2 = updateMessageWithThinking(
        message1,
        ' about this problem...'
      );
      expect(message2.thinking).toBe('Starting to think about this problem...');
      expect(message2.content).toBe('');
    });

    it('should transition from thinking to content', () => {
      let message = updateMessageWithThinking(
        baseMessage,
        '<think>Analyzing the question'
      );
      expect(message.thinking).toBe('Analyzing the question');
      expect(message.content).toBe('');

      message = updateMessageWithThinking(
        message,
        '...</think>Based on my analysis, here is the answer.'
      );
      expect(message.thinking).toBe('Analyzing the question...');
      expect(message.content).toBe('Based on my analysis, here is the answer.');
    });

    it('should handle regular content without thinking', () => {
      const message = updateMessageWithThinking(
        baseMessage,
        'Regular response without thinking'
      );
      expect(message.thinking).toBeUndefined();
      expect(message.content).toBe('Regular response without thinking');
    });

    it('should preserve existing thinking when adding content', () => {
      const messageWithThinking: ChatMessage = {
        ...baseMessage,
        thinking: 'Previous thinking',
        content: 'Previous content',
      };

      const updated = updateMessageWithThinking(
        messageWithThinking,
        ' Additional content'
      );
      expect(updated.thinking).toBe('Previous thinking');
      expect(updated.content).toBe('Previous content Additional content');
    });
  });

  describe('ThinkingBlock Component', () => {
    const defaultProps = {
      content: 'This is thinking content',
      isExpanded: false,
      isTyping: false,
      onToggle: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render collapsed by default', () => {
      render(<ThinkingBlock {...defaultProps} />);

      expect(screen.getByText('thinking...')).toBeInTheDocument();
      expect(
        screen.queryByText('This is thinking content')
      ).not.toBeInTheDocument();
    });

    it('should render expanded when isExpanded is true', () => {
      render(<ThinkingBlock {...defaultProps} isExpanded={true} />);

      expect(screen.getByText('thinking...')).toBeInTheDocument();
      expect(screen.getByText('This is thinking content')).toBeInTheDocument();
    });

    it('should show typing indicator when isTyping is true', () => {
      render(<ThinkingBlock {...defaultProps} isTyping={true} />);

      const typingIndicator = document.querySelector(
        '.thinking-typing-indicator'
      );
      expect(typingIndicator).toBeInTheDocument();

      const dots = document.querySelectorAll('.typing-dot');
      expect(dots).toHaveLength(3);
    });

    it('should not show typing indicator when isTyping is false', () => {
      render(<ThinkingBlock {...defaultProps} isTyping={false} />);

      const typingIndicator = document.querySelector(
        '.thinking-typing-indicator'
      );
      expect(typingIndicator).not.toBeInTheDocument();
    });

    it('should call onToggle when clicked', () => {
      const onToggle = jest.fn();
      render(<ThinkingBlock {...defaultProps} onToggle={onToggle} />);

      fireEvent.click(screen.getByRole('button', { name: /thinking/i }));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility attributes', () => {
      render(<ThinkingBlock {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-label', 'expand thinking process');
    });

    it('should update accessibility attributes when expanded', () => {
      render(<ThinkingBlock {...defaultProps} isExpanded={true} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-label', 'collapse thinking process');
    });

    it('should handle local state when no onToggle provided', () => {
      render(<ThinkingBlock content="Test content" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should show cursor when typing in expanded mode', () => {
      render(
        <ThinkingBlock
          content="Thinking content"
          isExpanded={true}
          isTyping={true}
        />
      );

      const cursor = document.querySelector('.thinking-cursor');
      expect(cursor).toBeInTheDocument();
      expect(cursor).toHaveTextContent('|');
    });

    it('should not show cursor when not typing', () => {
      render(
        <ThinkingBlock
          content="Thinking content"
          isExpanded={true}
          isTyping={false}
        />
      );

      const cursor = document.querySelector('.thinking-cursor');
      expect(cursor).not.toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      render(<ThinkingBlock content="" isExpanded={true} />);

      expect(
        screen.getByText('no thinking content yet...')
      ).toBeInTheDocument();
    });

    it('should show placeholder when typing with no content', () => {
      render(<ThinkingBlock content="" isExpanded={true} isTyping={true} />);

      expect(
        screen.queryByText('no thinking content yet...')
      ).not.toBeInTheDocument();
      const cursor = document.querySelector('.thinking-cursor');
      expect(cursor).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete thinking block workflow', () => {
      // Test the full flow of a thinking block message
      let currentContent = '';

      // Start with opening thinking tag
      currentContent += '<think>I need to analyze this question';
      let parsed = parseThinkingBlocks(currentContent);
      expect(parsed.isInThinkingBlock).toBe(true);
      expect(parsed.thinking).toBe('I need to analyze this question');
      expect(parsed.content).toBe('');

      // Continue thinking
      currentContent += ' and consider multiple perspectives...';
      parsed = parseThinkingBlocks(currentContent);
      expect(parsed.isInThinkingBlock).toBe(true);
      expect(parsed.thinking).toBe(
        'I need to analyze this question and consider multiple perspectives...'
      );

      // Close thinking and start response
      currentContent += '</think>Based on my analysis, I believe';
      parsed = parseThinkingBlocks(currentContent);
      expect(parsed.isThinkingComplete).toBe(true);
      expect(parsed.isInThinkingBlock).toBe(false);
      expect(parsed.thinking).toBe(
        'I need to analyze this question and consider multiple perspectives...'
      );
      expect(parsed.content).toBe('Based on my analysis, I believe');

      // Continue with regular content
      currentContent += ' the answer is 42.';
      parsed = parseThinkingBlocks(currentContent);
      expect(parsed.content).toBe(
        'Based on my analysis, I believe the answer is 42.'
      );
    });

    it('should handle edge cases in parsing', () => {
      // Test malformed or edge case inputs
      expect(parseThinkingBlocks('')).toEqual({
        thinking: '',
        content: '',
        isThinkingComplete: false,
        isInThinkingBlock: false,
      });

      expect(parseThinkingBlocks('<think>')).toEqual({
        thinking: '',
        content: '',
        isThinkingComplete: false,
        isInThinkingBlock: true,
      });

      expect(parseThinkingBlocks('</think>')).toEqual({
        thinking: '',
        content: '</think>',
        isThinkingComplete: false,
        isInThinkingBlock: false,
      });
    });

    it('should preserve message properties when updating', () => {
      const originalMessage: ChatMessage = {
        id: 'test-123',
        content: '',
        role: 'assistant',
        timestamp: new Date('2023-01-01'),
        isThinkingExpanded: true,
      };

      const updated = updateMessageWithThinking(
        originalMessage,
        '<think>New thinking</think>New content'
      );

      expect(updated.id).toBe('test-123');
      expect(updated.role).toBe('assistant');
      expect(updated.timestamp).toEqual(new Date('2023-01-01'));
      expect(updated.isThinkingExpanded).toBe(true);
      expect(updated.thinking).toBe('New thinking');
      expect(updated.content).toBe('New content');
    });
  });
});
