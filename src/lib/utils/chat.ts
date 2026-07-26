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
 * Available AI models for the chat interface.
 * Single source of truth for model selection and per-model configuration.
 *
 * Every entry runs at `q4f16` on WebGPU, which is not just a size choice.
 * Both LFM checkpoints declare `kv_cache_dtype: float16` for that dtype in
 * their `transformers.js_config`, so picking it also gets an fp16 key-value
 * cache held in GPU buffers instead of a float32 one round-tripping through
 * CPU memory. Decoding is bandwidth-bound, so that is worth more than the
 * download saving. Plain `q4` silently forfeits it.
 *
 * All three decode greedily. Grounded extraction from retrieved passages has
 * a right answer sitting in the context; sampling can only wander away from
 * it, and greedy skips the sampler's per-token work.
 */
// NOTE: `LiquidAI/LFM2.5-350M-ONNX` looks like it belongs here — a third the
// download of the 1.2B, and with retrieval doing the grounding, a model that
// size is plausibly enough. It was tried and removed.
//
// It downloads, emits no error to the console or the worker, and then simply
// never reaches a ready state: measured at 10 minutes of polling with the
// worker's 'ready' message never arriving, so the chat sits permanently
// unusable behind a disabled send button. One suspect is that its config
// declares `use_external_data_format` as a bare boolean where the 1.2B uses a
// per-file map, but that was not confirmed. Whatever the cause, an option that
// silently does nothing is worse than one less choice.
//
// Re-test with `EVAL_MODEL=lfm-350m npm run eval:chat` before adding it back;
// that harness now fails loudly on a model that never becomes ready.
//
// NOTE: `LiquidAI/LFM2.5-230M-ONNX` was measured and rejected too, on quality
// rather than mechanics. It is genuinely fast — 8.9s to load against 21s,
// ~0.8s per answer against 1.7s, 200MB against 760MB — and it scored 8/12
// where the 1.2B scores 12/12. The disqualifying answer was the hallucination
// probe: asked whether Alex knows COBOL, with his skills list in context, it
// replied "Yes, Alex knows COBOL." Confidently inventing a skill on someone's
// professional site is a worse outcome for them than a slower answer.
//
// Two fixes were tried. Reformatting the SOURCES block so it no longer looks
// like the citation syntax stopped it reproducing the source list verbatim —
// that change stayed, because it also made the 1.2B pass the multi-turn case —
// but the model then collapsed into "Answer: X" stubs. And q8, the obvious
// response to 4-bit being harsh on a 230M, never reaches a ready state at all;
// this repo is q4-only in practice.
//
// Re-measure with `EVAL_MODEL=lfm-230m npm run eval:chat` before reinstating.
export const AVAILABLE_MODELS: ChatModel[] = [
  {
    id: 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX',
    name: 'lfm-1.2b',
    description: 'default — the best answers that still feel instant',
    size: '~760MB',
    contextWindow: 16384,
    device: 'webgpu',
    dtype: 'q4f16',
    dtypeWasm: 'q4',
    fallbackDevice: 'wasm',
    supportsThinking: false,
    alwaysThinks: false,
    templateOptions: {},
    generationProfile: {
      // A grounded answer is two or three sentences plus citations. The cap is
      // a runaway guard, not a length target — the prompt sets the length.
      maxTokens: 512,
      maxTokensWasm: 384,
      temperature: 0.0,
      temperatureWasm: 0.0,
      topK: 0,
      topKWasm: 0,
      repetitionPenalty: 1.05,
      doSample: false,
    },
  },
  // NOTE: `LiquidAI/LFM2.5-1.2B-Thinking-ONNX` was here and was measured out.
  // On the 43-case battery it scored 35/43 against the instruct model's 42/43 —
  // worse in every single category — while taking 5.3s to a median answer
  // against 1.4s, 12.1s at worst against 2.4s, and 658 median output tokens
  // against 48. Reasoning tokens are spent before the visitor sees anything,
  // so that cost is entirely in perceived latency, and it bought nothing.
  // Re-measure with `EVAL_MODEL=lfm-1.2b-thinking npm run eval:chat` before
  // reinstating. The thinking machinery it needed is still in place:
  // ThinkingToggle hides itself when no model sets supportsThinking, and
  // thinkTagStreamer still strips <think> blocks out of the stream.
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
 * @deprecated Thinking block routing is now handled by the worker state.
 * Kept for backward compatibility with tests. Use worker state-based routing instead.
 */
export function updateMessageWithThinking(
  existingMessage: ChatMessage,
  newText: string
): ChatMessage {
  const hasPreParsedThinking = !!existingMessage.thinking;

  if (hasPreParsedThinking && !newText.includes('<think>')) {
    return {
      ...existingMessage,
      content: (existingMessage.content || '') + newText,
      thinking: existingMessage.thinking,
    };
  }

  // Fallback: accumulate raw text and re-parse
  const rawContent = (existingMessage.content || '') + newText;
  const parsed = parseThinkingBlocks(rawContent);

  return {
    ...existingMessage,
    content: parsed.content,
    thinking: parsed.thinking || undefined,
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
