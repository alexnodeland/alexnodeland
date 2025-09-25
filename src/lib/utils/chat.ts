// Chat utility functions for Transformers.js integration
import { ChatMessage, ChatModel } from '../../types/chat';

/**
 * Estimates the number of tokens in a text string
 * Uses a simple approximation: ~4 characters per token
 * This is rough but adequate for context window management
 */
export function estimateTokens(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Simple token estimation: ~4 characters per token
  // This is based on common tokenizer patterns for English text
  return Math.ceil(text.length / 4);
}

/**
 * Creates a rolling context window from messages
 * Keeps recent messages within token limits for better performance
 * Always preserves the system message if present
 */
export function createRollingContext(
  messages: ChatMessage[],
  maxTokens: number = 2048
): ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  if (maxTokens <= 0) {
    return [];
  }

  // Always keep the most recent message
  const result: ChatMessage[] = [];
  let tokenCount = 0;

  // Process messages in reverse order (newest first)
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.content);

    // Always include the most recent message
    if (result.length === 0) {
      result.unshift(message);
      tokenCount += messageTokens;
      continue;
    }

    // Check if adding this message would exceed token limit
    if (tokenCount + messageTokens > maxTokens) {
      // Stop adding older messages if we hit the limit
      break;
    }

    result.unshift(message);
    tokenCount += messageTokens;
  }

  return result;
}

/**
 * Detects WebGPU support in the current browser environment
 * Falls back gracefully for environments without WebGPU
 */
export async function detectWebGPUSupport(): Promise<boolean> {
  try {
    // Check if running in browser environment
    if (typeof navigator === 'undefined') {
      return false;
    }

    // Check if navigator.gpu exists (cast to any to handle WebGPU typing)
    const nav = navigator as any;
    if (!nav.gpu) {
      return false;
    }

    // Try to request an adapter
    const adapter = await nav.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    // Any error means WebGPU is not properly supported
    console.warn('WebGPU detection failed:', error);
    return false;
  }
}

/**
 * Available AI models for the chat interface
 * This will be the source of truth for model selection
 */
export const AVAILABLE_MODELS: ChatModel[] = [
  {
    id: 'mock-model',
    name: 'Mock Model',
    description: 'Development testing model with simulated responses',
    size: '~0MB',
    contextWindow: 2048,
    device: 'cpu',
    dtype: 'mock',
  },
  {
    id: 'onnx-community/Qwen3-0.6B-ONNX',
    name: 'Qwen3-0.6B',
    description: 'Fast reasoning model optimized for in-browser inference',
    size: '~600MB',
    contextWindow: 4096,
    device: 'webgpu',
    dtype: 'q4f16',
  },
];

/**
 * Gets a model by ID from the available models
 */
export function getModelById(modelId: string): ChatModel | undefined {
  return AVAILABLE_MODELS.find(model => model.id === modelId);
}

/**
 * Formats file sizes in human-readable format
 * Useful for displaying download progress
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates a chat message structure
 */
export function isValidChatMessage(message: any): message is ChatMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  return (
    typeof message.id === 'string' &&
    typeof message.content === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    message.timestamp instanceof Date
  );
}

/**
 * Validates an array of chat messages
 */
export function validateChatMessages(messages: any[]): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.filter(isValidChatMessage);
}

/**
 * Creates a system message for the chat
 * Useful for model prompting
 */
export function createSystemMessage(
  content: string
): Omit<ChatMessage, 'id' | 'timestamp'> {
  return {
    content,
    role: 'assistant', // System messages are typically treated as assistant messages
  };
}
