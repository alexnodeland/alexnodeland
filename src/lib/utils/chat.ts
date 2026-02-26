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
 * Always preserves the system message if present and follows chat template standards
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

  // Separate system messages from conversation messages for proper chat templating
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const conversationMessages = messages.filter(msg => msg.role !== 'system');

  // Always preserve system messages - they're critical for proper behavior
  let result: ChatMessage[] = [...systemMessages];
  let tokenCount = systemMessages.reduce(
    (count, msg) => count + estimateTokens(msg.content),
    0
  );

  // If system messages already exceed token limit, just return them
  if (tokenCount >= maxTokens) {
    console.warn('[chat] System messages exceed token limit, may cause issues');
    return result;
  }

  // Add conversation messages in reverse order (newest first)
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const message = conversationMessages[i];
    const messageTokens = estimateTokens(message.content);

    // Check if adding this message would exceed token limit
    if (tokenCount + messageTokens > maxTokens) {
      // Stop adding older messages if we hit the limit
      break;
    }

    result.push(message);
    tokenCount += messageTokens;
  }

  // Sort to maintain proper chat template order: system messages first, then chronological
  return result.sort((a, b) => {
    // System messages always go first
    if (a.role === 'system' && b.role !== 'system') return -1;
    if (a.role !== 'system' && b.role === 'system') return 1;

    // For non-system messages, maintain chronological order
    return a.timestamp.getTime() - b.timestamp.getTime();
  });
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
 *
 * Currently using LiquidAI LFM 1.2B for optimal quality and in-browser reasoning.
 * Architecture is designed to easily support additional models in the future.
 */
export const AVAILABLE_MODELS: ChatModel[] = [
  {
    id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
    name: 'lfm-1.2b',
    description:
      'efficient reasoning model with hybrid state-space architecture',
    size: '~1.2GB',
    contextWindow: 16384,
    device: 'webgpu',
    dtype: 'q4',
    fallbackDevice: 'wasm',
    supportsThinking: true,
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
    (message.role === 'user' ||
      message.role === 'assistant' ||
      message.role === 'system') &&
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
    role: 'system', // System messages should use 'system' role for proper chat templating
  };
}

/**
 * Thinking block parsing utilities
 * Handles detection and extraction of <think> tags from AI responses
 */
export interface ThinkingBlockParseResult {
  thinking: string;
  content: string;
  isThinkingComplete: boolean;
  isInThinkingBlock: boolean;
}

/**
 * Parses text content to extract thinking blocks and regular content
 */
export function parseThinkingBlocks(text: string): ThinkingBlockParseResult {
  const thinkingStart = text.indexOf('<think>');
  const thinkingEnd = text.indexOf('</think>');

  // No thinking tags found
  if (thinkingStart === -1) {
    return {
      thinking: '',
      content: text,
      isThinkingComplete: false,
      isInThinkingBlock: false,
    };
  }

  // Has opening tag but no closing tag (still thinking)
  if (thinkingEnd === -1) {
    const thinking = text.substring(thinkingStart + 7); // Remove '<think>'
    return {
      thinking,
      content: '',
      isThinkingComplete: false,
      isInThinkingBlock: true,
    };
  }

  // Has both opening and closing tags (thinking complete)
  const thinking = text.substring(thinkingStart + 7, thinkingEnd);
  const content = text.substring(thinkingEnd + 8); // Remove '</think>'

  return {
    thinking,
    content,
    isThinkingComplete: true,
    isInThinkingBlock: false,
  };
}

/**
 * Updates an existing message with new thinking or content based on streaming text
 */
export function updateMessageWithThinking(
  existingMessage: ChatMessage,
  newText: string
): ChatMessage {
  // If message already has thinking and no raw content (meaning it was pre-parsed),
  // and we're not adding thinking tags, just append to regular content
  const hasPreParsedThinking =
    existingMessage.thinking && !existingMessage._rawContent;
  const isThinkingComplete =
    existingMessage._thinkingComplete || hasPreParsedThinking;

  if (isThinkingComplete && !newText.includes('<think>')) {
    return {
      ...existingMessage,
      content: (existingMessage.content || '') + newText,
      thinking: existingMessage.thinking, // Preserve existing thinking
      _thinkingComplete: true,
    };
  }

  // For streaming with thinking tags or incomplete thinking, use raw content accumulation
  const rawContent = (existingMessage._rawContent || '') + newText;
  const parsed = parseThinkingBlocks(rawContent);

  return {
    ...existingMessage,
    content: parsed.content,
    thinking: parsed.thinking || undefined,
    _rawContent: rawContent,
    _thinkingComplete: parsed.isThinkingComplete,
  };
}

/**
 * Model caching utilities
 * Helps track which models are loaded and cached
 */
export interface ModelCacheEntry {
  modelId: string;
  loadedAt: Date;
  device: string;
  status: 'loading' | 'ready' | 'error';
}

export class ModelCache {
  private static cache = new Map<string, ModelCacheEntry>();

  static isModelCached(modelId: string): boolean {
    const entry = this.cache.get(modelId);
    return entry?.status === 'ready';
  }

  static getModelEntry(modelId: string): ModelCacheEntry | undefined {
    return this.cache.get(modelId);
  }

  static setModelLoading(modelId: string, device: string = 'auto'): void {
    this.cache.set(modelId, {
      modelId,
      loadedAt: new Date(),
      device,
      status: 'loading',
    });
  }

  static setModelReady(modelId: string, device: string): void {
    const entry = this.cache.get(modelId);
    if (entry) {
      entry.status = 'ready';
      entry.device = device;
      entry.loadedAt = new Date();
    } else {
      this.cache.set(modelId, {
        modelId,
        loadedAt: new Date(),
        device,
        status: 'ready',
      });
    }
  }

  static setModelError(modelId: string): void {
    const entry = this.cache.get(modelId);
    if (entry) {
      entry.status = 'error';
    }
  }

  static getCachedModels(): ModelCacheEntry[] {
    return Array.from(this.cache.values()).filter(
      entry => entry.status === 'ready'
    );
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static removeModel(modelId: string): void {
    this.cache.delete(modelId);
  }
}

/**
 * Gets the recommended context window size for a model based on available memory
 */
export function getRecommendedContextWindow(modelId: string): number {
  const model = getModelById(modelId);
  if (!model || !model.contextWindow) {
    return 2048; // Safe default
  }

  // For larger models, reduce context window if running on CPU
  const isLargeModel = model.size && parseInt(model.size) > 1000; // > 1GB
  const prefersCPU = model.device === 'cpu';

  if (isLargeModel && prefersCPU) {
    return Math.min(model.contextWindow, 1024); // Reduce for performance
  }

  return model.contextWindow;
}
