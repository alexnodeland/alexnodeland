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
    console.warn('WebGPU detection failed:', error);
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
        dtype: supportsWebGPU ? 'q4f16' : 'auto',
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
async function generate({ messages }) {
  try {
    // Retrieve the text-generation pipeline
    const modelId =
      TextGenerationPipeline.currentModelId || 'onnx-community/Qwen3-0.6B-ONNX';
    const [tokenizer, model] =
      await TextGenerationPipeline.getInstance(modelId);

    // Apply chat template to format messages correctly
    const inputs = tokenizer.apply_chat_template(messages, {
      add_generation_prompt: true,
      return_dict: true,
    });

    let startTime;
    let numTokens = 0;
    let tps = 0;

    // Token callback for performance tracking
    const token_callback_function = () => {
      startTime ??= performance.now();

      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };

    // Stream callback to send partial results to main thread
    const callback_function = output => {
      self.postMessage({
        status: 'update',
        output,
        tps,
        numTokens,
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

        // Generation parameters optimized for chat
        do_sample: TextGenerationPipeline.device !== 'wasm',
        top_k: TextGenerationPipeline.device === 'wasm' ? 20 : 40,
        temperature: TextGenerationPipeline.device === 'wasm' ? 0.0 : 0.7,
        repetition_penalty: 1.05,

        // Keep CPU generations short for responsiveness
        max_new_tokens: TextGenerationPipeline.device === 'wasm' ? 96 : 512,
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
          top_k: 20,
          temperature: 0.0,
          repetition_penalty: 1.05,
          max_new_tokens: 96,
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
    const modelId = 'onnx-community/Qwen3-0.6B-ONNX'; // Default model
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
        const modelId = data?.modelId || 'onnx-community/Qwen3-0.6B-ONNX';
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
