import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
  env,
} from '@huggingface/transformers';
// Disable browser cache to avoid stale model files
env.useBrowserCache = false;

// Configure ONNX Runtime Web (wasm) for broader browser compatibility
// - In non cross-origin-isolated contexts (most local dev servers),
//   SharedArrayBuffer is unavailable. ORT's wasm multi-thread/proxy requires it.
//   We disable threads and proxy to avoid runtime errors (notably in Firefox).
try {
  const isCOI =
    typeof self !== 'undefined' && !!(self && self.crossOriginIsolated);
  // Ensure nested objects exist before assignment
  env.backends = env.backends || {};
  env.backends.onnx = env.backends.onnx || {};
  env.backends.onnx.wasm = env.backends.onnx.wasm || {};
  // Hint where to fetch ORT wasm binaries when bundler paths are not resolved in workers
  if (!env.backends.onnx.wasm.wasmPaths) {
    env.backends.onnx.wasm.wasmPaths =
      'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
  }
  // Prefer SIMD when available; ORT will feature-detect
  env.backends.onnx.wasm.simd = true;
  if (!isCOI) {
    // Disable multi-threading and the worker proxy in non-COI environments
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  }
} catch (error) {
  // ONNX configuration may fail in some environments, continue with defaults
}

/**
 * Helper function to perform feature detection for WebGPU
 * Falls back gracefully to CPU if WebGPU is not available
 */
async function checkWebGPUSupport() {
  try {
    if (!navigator.gpu) {
      return false;
    }
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch (error) {
    // WebGPU detection failed, continue with fallback
    return false;
  }
}

/**
 * Text Generation Pipeline with multi-model support
 * Enables lazy-loading and caching of multiple models for better performance
 * Based on Transformers.js examples but adapted for our chat system
 */
class TextGenerationPipeline {
  // Model cache - stores multiple loaded models
  static modelCache = new Map(); // modelId -> { tokenizer, model, device }
  static currentModelId = null;

  static async getInstance(
    modelId,
    progress_callback = null,
    forceDevice = null
  ) {
    // Check if model is already cached
    const cached = this.modelCache.get(modelId);
    if (cached) {
      this.currentModelId = modelId;
      return [cached.tokenizer, cached.model];
    }

    // Load new model
    const tokenizer = AutoTokenizer.from_pretrained(modelId, {
      progress_callback,
    });

    // Check WebGPU support and prefer it when possible
    const supportsWebGPU = forceDevice
      ? forceDevice === 'webgpu'
      : await checkWebGPUSupport();

    let model, device;

    // Attempt preferred device first, then gracefully fall back to CPU
    try {
      model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: supportsWebGPU ? 'q4' : 'auto',
        device: supportsWebGPU ? 'webgpu' : 'wasm',
        progress_callback,
      });
      device = supportsWebGPU ? 'webgpu' : 'wasm';
    } catch (e) {
      // If WebGPU path fails at runtime (common on Firefox with partial support),
      // retry with a safe CPU configuration.
      model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: 'auto',
        device: 'wasm',
        progress_callback,
      });
      device = 'wasm';
    }

    // Cache the loaded model
    const resolvedTokenizer = await tokenizer;
    const resolvedModel = await model;

    this.modelCache.set(modelId, {
      tokenizer: resolvedTokenizer,
      model: resolvedModel,
      device,
    });

    this.currentModelId = modelId;
    return [resolvedTokenizer, resolvedModel];
  }

  // Reset the pipeline (useful for switching models or debugging)
  static reset(modelId = null) {
    if (modelId) {
      // Clear specific model from cache
      this.modelCache.delete(modelId);
      if (this.currentModelId === modelId) {
        this.currentModelId = null;
      }
    } else {
      // Clear all models
      this.modelCache.clear();
      this.currentModelId = null;
    }
  }

  // Get currently cached models
  static getCachedModels() {
    return Array.from(this.modelCache.keys());
  }

  // Check if a model is cached
  static isModelCached(modelId) {
    return this.modelCache.has(modelId);
  }
}

// Global stopping criteria for interrupting generation
const stopping_criteria = new InterruptableStoppingCriteria();

// Cache for past key values to enable conversation context
let past_key_values_cache = null;

/**
 * Generate text using the loaded model
 * Handles streaming output and context management
 */
async function generate({
  messages,
  reasonEnabled = false,
  systemPrompt = null,
  generationConfig = {},
}) {
  try {
    // Debug logging for thinking integration
    if (typeof self !== 'undefined' && self.CHAT_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[worker] Generate with thinking enabled:', reasonEnabled);
    }

    // Retrieve the text-generation pipeline
    const modelId =
      TextGenerationPipeline.currentModelId ||
      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';
    const [tokenizer, model] =
      await TextGenerationPipeline.getInstance(modelId);

    // Prepare messages with system prompt following Hugging Face chat template standards
    let processedMessages = [...messages];

    // Always ensure system prompt is properly injected as first message if provided
    if (systemPrompt) {
      // Remove any existing system messages to avoid duplication
      processedMessages = processedMessages.filter(
        msg => msg.role !== 'system'
      );

      // Add system prompt as first message
      processedMessages.unshift({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Validate message structure for chat templating
    processedMessages = processedMessages.filter(
      msg =>
        msg &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0 &&
        ['system', 'user', 'assistant'].includes(msg.role)
    );

    // Debug logging for chat templating
    if (typeof self !== 'undefined' && self.CHAT_DEBUG) {
      // eslint-disable-next-line no-console
      console.log(
        '[worker] Processed messages for chat template:',
        processedMessages
      );
      // eslint-disable-next-line no-console
      console.log('[worker] System prompt present:', !!systemPrompt);
      // eslint-disable-next-line no-console
      console.log('[worker] Thinking enabled:', reasonEnabled);
    }

    // Apply Hugging Face chat template to format messages correctly
    let inputs;
    try {
      inputs = tokenizer.apply_chat_template(processedMessages, {
        add_generation_prompt: true,
        return_dict: true,
      });

      if (typeof self !== 'undefined' && self.CHAT_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[worker] Chat template applied successfully');
      }
    } catch (templateError) {
      // Chat template error, attempting fallback

      // Fallback: try without thinking enabled
      try {
        inputs = tokenizer.apply_chat_template(processedMessages, {
          add_generation_prompt: true,
          return_dict: true,
        });
        // Chat template applied without thinking mode
      } catch (fallbackError) {
        // Chat template fallback failed
        throw new Error(
          'Failed to apply chat template: ' + fallbackError.message
        );
      }
    }

    // Get thinking tokens for state tracking (only if reasoning is enabled)
    let START_THINKING_TOKEN_ID = null;
    let END_THINKING_TOKEN_ID = null;
    if (reasonEnabled) {
      try {
        const tokens = tokenizer.encode('<think></think>', {
          add_special_tokens: false,
        });
        START_THINKING_TOKEN_ID = tokens[0];
        END_THINKING_TOKEN_ID = tokens[1];
      } catch (e) {
        // Could not encode thinking tokens
      }
    }

    let startTime;
    let numTokens = 0;
    let tps = 0;
    let state = 'answering'; // Track whether we're 'thinking' or 'answering'

    // Token callback for performance tracking and thinking state management
    const token_callback_function = tokens => {
      startTime ??= performance.now();

      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }

      // Track thinking state if reasoning is enabled
      if (reasonEnabled && tokens && tokens.length > 0) {
        const tokenId = Number(tokens[0]);
        if (tokenId === START_THINKING_TOKEN_ID) {
          state = 'thinking';
          if (typeof self !== 'undefined' && self.CHAT_DEBUG) {
            // eslint-disable-next-line no-console
            console.log('[worker] Switched to thinking state');
          }
        } else if (tokenId === END_THINKING_TOKEN_ID) {
          state = 'answering';
          if (typeof self !== 'undefined' && self.CHAT_DEBUG) {
            // eslint-disable-next-line no-console
            console.log('[worker] Switched to answering state');
          }
        }
      }
    };

    // Stream callback to send partial results to main thread
    const callback_function = output => {
      self.postMessage({
        status: 'update',
        output,
        tps,
        numTokens,
        state: reasonEnabled ? state : 'answering',
      });
    };

    // Create text streamer for real-time output
    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    // Tell main thread we're starting generation
    self.postMessage({ status: 'start' });

    // Generate response with the model
    let past_key_values, sequences;
    try {
      ({ past_key_values, sequences } = await model.generate({
        ...inputs,
        past_key_values: past_key_values_cache,

        // Generation parameters from config with fallbacks for device optimization
        do_sample: true,
        top_k:
          TextGenerationPipeline.device === 'wasm'
            ? generationConfig.topK?.wasm || 20
            : generationConfig.topK?.default || 40,
        top_p: generationConfig.topP || 0.1,
        temperature:
          TextGenerationPipeline.device === 'wasm'
            ? generationConfig.temperature?.wasm || 0.0
            : generationConfig.temperature?.default || 0.05,
        repetition_penalty: generationConfig.repetitionPenalty || 1.05,

        // Use config-based token limits with device optimization
        max_new_tokens:
          TextGenerationPipeline.device === 'wasm'
            ? generationConfig.maxTokens?.wasmThinking || 2048
            : generationConfig.maxTokens?.default || 4096,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
      }));
    } catch (genErr) {
      // If generation fails and we were on WebGPU, fall back to CPU and retry once
      if (TextGenerationPipeline.device === 'webgpu') {
        self.postMessage({
          status: 'loading',
          data: 'WebGPU failed during generation. Falling back to WASM...',
        });
        TextGenerationPipeline.reset();
        const [, modelCPU] = await TextGenerationPipeline.getInstance(
          null,
          'wasm'
        );
        ({ past_key_values, sequences } = await modelCPU.generate({
          ...inputs,
          past_key_values: null, // reset context on fallback
          do_sample: false,
          top_k: generationConfig.topK?.wasm || 20,
          temperature: generationConfig.temperature?.wasm || 0.0,
          repetition_penalty: generationConfig.repetitionPenalty || 1.05,
          max_new_tokens: generationConfig.maxTokens?.wasm || 2048,
          streamer,
          stopping_criteria,
          return_dict_in_generate: true,
        }));
      } else {
        throw genErr;
      }
    }

    // Cache the key values for context continuity
    past_key_values_cache = past_key_values;

    // Decode the final sequences
    const decoded = tokenizer.batch_decode(sequences, {
      skip_special_tokens: true,
    });

    // Send completion message to main thread
    self.postMessage({
      status: 'complete',
      output: decoded,
    });
  } catch (error) {
    // console.error('Generation error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Generation failed',
    });
  }
}

/**
 * Load the model and notify main thread of progress
 */
async function load() {
  try {
    // Announce device and fallback strategy upfront
    const supportsWebGPU = await checkWebGPUSupport();
    self.postMessage({
      status: 'loading',
      data: supportsWebGPU
        ? 'Loading model on WebGPU...'
        : 'WebGPU not available. Loading WASM backend...',
    });

    // Emit initial progress items so UI shows bars immediately
    self.postMessage({
      status: 'initiate',
      file: 'tokenizer.json',
      loaded: 0,
      total: 1,
    });
    self.postMessage({
      status: 'initiate',
      file: 'model.onnx',
      loaded: 0,
      total: 1,
    });

    // Load the pipeline with progress tracking
    const modelId = 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'; // Default model
    const [tokenizer, model] = await TextGenerationPipeline.getInstance(
      modelId,
      progress => {
        // Handle initiation, progress, and completion for each file
        if (
          progress &&
          typeof progress.loaded === 'number' &&
          typeof progress.total === 'number'
        ) {
          const file = progress.file || 'model';
          // Determine status
          let status = 'progress';
          if (progress.status === 'initiate') {
            status = 'initiate';
          } else if (progress.loaded === progress.total) {
            status = 'done';
          }
          self.postMessage({
            status,
            file,
            loaded: progress.loaded,
            total: progress.total,
            // Include raw ratio if available
            progress:
              typeof progress.progress === 'number'
                ? progress.progress
                : undefined,
          });
        }
      }
    );

    self.postMessage({
      status: 'loading',
      data:
        TextGenerationPipeline.device === 'webgpu'
          ? 'Compiling shaders and warming up model...'
          : 'Warming up WASM backend for generation...',
    });

    // Run dummy generation to compile shaders
    const inputs = tokenizer('Hello');
    try {
      await model.generate({
        ...inputs,
        max_new_tokens: 1,
        do_sample: false, // Deterministic for warmup
      });
    } catch (warmupErr) {
      // If warmup fails (likely due to WebGPU issues), try CPU fallback
      self.postMessage({
        status: 'loading',
        data: 'WebGPU warmup failed. Falling back to WASM...',
      });
      TextGenerationPipeline.reset();
      const [, modelCPU] = await TextGenerationPipeline.getInstance(
        null,
        'wasm'
      );
      await modelCPU.generate({
        ...inputs,
        max_new_tokens: 1,
        do_sample: false,
      });
    }

    // Model is ready for use
    self.postMessage({ status: 'ready' });
  } catch (error) {
    // console.error('Model loading error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Failed to load model',
    });
  }
}

/**
 * Reset conversation context and stopping criteria
 */
function reset() {
  past_key_values_cache = null;
  stopping_criteria.reset();
  self.postMessage({ status: 'reset_complete' });
}

/**
 * Main worker event listener
 * Handles all communication between main thread and worker
 */
self.addEventListener('message', async event => {
  const { type, data } = event.data;
  try {
    if (
      self &&
      (self.CHAT_DEBUG || (typeof window !== 'undefined' && window.CHAT_DEBUG))
    )
      // eslint-disable-next-line no-console
      console.log('[chat-worker] message', type);
  } catch (error) {
    // Debug logging may fail, continue silently
  }

  try {
    switch (type) {
      case 'check': {
        // Perform WebGPU capability check
        const supportsWebGPU = await checkWebGPUSupport();
        self.postMessage({
          status: 'check_complete',
          webGPUSupported: supportsWebGPU,
        });
        break;
      }

      case 'load': {
        // Load the model with specified ID
        const modelId = data?.modelId || 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';
        await load(modelId);
        break;
      }

      case 'generate': {
        // Generate text from messages
        stopping_criteria.reset();
        await generate(data);
        break;
      }

      case 'interrupt': {
        // Stop current generation
        stopping_criteria.interrupt();
        self.postMessage({ status: 'interrupted' });
        break;
      }

      case 'reset': {
        // Reset conversation context
        reset();
        break;
      }

      default: {
        // console.warn('Unknown message type:', type);
        self.postMessage({
          status: 'error',
          data: `Unknown message type: ${type}`,
        });
      }
    }
  } catch (error) {
    // console.error('Worker error:', error);
    self.postMessage({
      status: 'error',
      data: error.message || 'Worker operation failed',
    });
  }
});

// Handle uncaught errors in the worker
self.addEventListener('error', event => {
  // console.error('Worker uncaught error:', event.error);
  self.postMessage({
    status: 'error',
    data: event.error?.message || 'Worker encountered an error',
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  // console.error('Worker unhandled rejection:', event.reason);
  self.postMessage({
    status: 'error',
    data: event.reason?.message || 'Worker promise rejection',
  });

  // Prevent the default browser behavior
  event.preventDefault();
});

// Log that worker is ready (debug only)
// console.debug('Chat worker initialized and ready for messages');
