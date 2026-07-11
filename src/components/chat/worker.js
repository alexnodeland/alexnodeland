import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
  env,
} from '@huggingface/transformers';
import { createThinkTagFilter } from './thinkTagStreamer';

// Configure ONNX Runtime Web (wasm) for broader browser compatibility
// - In non cross-origin-isolated contexts (most local dev servers),
//   SharedArrayBuffer is unavailable. ORT's wasm multi-thread/proxy requires it.
//   We disable threads and proxy to avoid runtime errors (notably in Firefox).
// NOTE: We deliberately leave env.useBrowserCache at its default (enabled) so
// downloaded model weights persist in the browser cache ("download once").
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
 * Text Generation Pipeline with single-model (dispose-eviction) policy.
 * Loading a second model disposes the previous one so we never hold two large
 * models in memory at once. The device the model actually loaded on is stored
 * per-model and returned from getInstance so callers pick the right generation
 * params and fallback path.
 */
class TextGenerationPipeline {
  // modelId -> { tokenizer, model, device }
  static modelCache = new Map();
  static currentModelId = null;
  // Pending per-model config set before loading; used for dtype selection.
  static _pendingModelConfig = null;

  static async getInstance(
    modelId,
    progress_callback = null,
    forceDevice = null
  ) {
    // Return cached model (with its resolved device) if present
    const cached = this.modelCache.get(modelId);
    if (cached) {
      this.currentModelId = modelId;
      return [cached.tokenizer, cached.model, cached.device];
    }

    // Single-model policy: dispose any previously loaded model to free memory
    if (this.modelCache.size > 0) {
      for (const [, entry] of this.modelCache) {
        try {
          if (entry.model && typeof entry.model.dispose === 'function') {
            entry.model.dispose();
          }
        } catch (e) {
          // Disposal may fail, continue
        }
      }
      this.modelCache.clear();
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

    // Model-specific dtype from pending config
    const modelConfig = this._pendingModelConfig || {};
    const gpuDtype = modelConfig.dtype || 'q4';
    const wasmDtype = modelConfig.dtypeWasm || 'auto';

    // Attempt preferred device first, then gracefully fall back to CPU
    try {
      model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: supportsWebGPU ? gpuDtype : wasmDtype,
        device: supportsWebGPU ? 'webgpu' : 'wasm',
        progress_callback,
      });
      device = supportsWebGPU ? 'webgpu' : 'wasm';
    } catch (e) {
      // If WebGPU path fails at load time (common on Firefox with partial
      // support), retry with a safe CPU configuration.
      model = await AutoModelForCausalLM.from_pretrained(modelId, {
        dtype: wasmDtype,
        device: 'wasm',
        progress_callback,
      });
      device = 'wasm';
    }

    // Cache the loaded model together with its resolved device
    const resolvedTokenizer = await tokenizer;
    const resolvedModel = await model;

    this.modelCache.set(modelId, {
      tokenizer: resolvedTokenizer,
      model: resolvedModel,
      device,
    });

    this.currentModelId = modelId;
    this._pendingModelConfig = null;
    return [resolvedTokenizer, resolvedModel, device];
  }

  // Reset the pipeline (useful for switching models or debugging)
  static reset(modelId = null) {
    if (modelId) {
      this.modelCache.delete(modelId);
      if (this.currentModelId === modelId) {
        this.currentModelId = null;
      }
    } else {
      this.modelCache.clear();
      this.currentModelId = null;
    }
  }

  static getCachedModels() {
    return Array.from(this.modelCache.keys());
  }

  static isModelCached(modelId) {
    return this.modelCache.has(modelId);
  }
}

// Global stopping criteria for interrupting generation
const stopping_criteria = new InterruptableStoppingCriteria();

// NOTE: We deliberately do NOT persist/reuse KV values (past_key_values) across
// turns. The full conversation is re-sent and re-tokenized every turn, so a
// cached past_key_values from a prior (different-length) input would be invalid.
// Every generate() call passes past_key_values: null.

/**
 * Generate text using the loaded model.
 * Streams output, filters <think>/</think> tags across chunk boundaries, and
 * decodes only the newly generated tokens for the final message.
 */
async function generate({
  messages,
  reasonEnabled = false,
  systemPrompt = null,
  modelConfig = {},
}) {
  try {
    // Retrieve the loaded pipeline (and the device it actually loaded on)
    const modelId =
      TextGenerationPipeline.currentModelId ||
      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';
    const [tokenizer, model, device] =
      await TextGenerationPipeline.getInstance(modelId);

    // Prepare messages: inject the system prompt as the first message
    let processedMessages = [...messages];
    if (systemPrompt) {
      processedMessages = processedMessages.filter(
        msg => msg.role !== 'system'
      );
      processedMessages.unshift({ role: 'system', content: systemPrompt });
    }

    // Validate message structure for chat templating
    processedMessages = processedMessages.filter(
      msg =>
        msg &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0 &&
        ['system', 'user', 'assistant'].includes(msg.role)
    );

    // Build template options from the model's config
    const templateOptions = {
      add_generation_prompt: true,
      return_dict: true,
    };
    if (
      modelConfig.templateOptions &&
      'add_special_tokens' in modelConfig.templateOptions
    ) {
      templateOptions.add_special_tokens =
        modelConfig.templateOptions.add_special_tokens;
    }
    // Only pass enable_thinking to models whose thinking is toggleable.
    // Always-thinking models emit <think> unconditionally, so we don't set it.
    if (modelConfig.alwaysThinks === false && modelConfig.supportsThinking) {
      templateOptions.enable_thinking = reasonEnabled;
    }

    // Apply the chat template
    let inputs;
    try {
      inputs = tokenizer.apply_chat_template(
        processedMessages,
        templateOptions
      );
    } catch (templateError) {
      // Retry with minimal options if the model-specific ones are unsupported
      inputs = tokenizer.apply_chat_template(processedMessages, {
        add_generation_prompt: true,
        return_dict: true,
      });
    }

    let startTime;
    let numTokens = 0;
    let tps = 0;
    let state = 'answering';

    const token_callback_function = () => {
      startTime ??= performance.now();
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    };

    // Streaming think-tag filter — handles tags split across chunk boundaries.
    const thinkFilter = reasonEnabled ? createThinkTagFilter() : null;

    const emitSegment = (text, segState) => {
      if (!text) return;
      state = segState;
      self.postMessage({
        status: 'update',
        output: text,
        tps,
        numTokens,
        state: reasonEnabled ? segState : 'answering',
      });
    };

    const callback_function = output => {
      if (!thinkFilter) {
        emitSegment(output, 'answering');
        return;
      }
      for (const seg of thinkFilter.push(output)) {
        emitSegment(seg.text, seg.state);
      }
    };

    const streamer = new TextStreamer(tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
      token_callback_function,
    });

    // Tell main thread we're starting generation
    self.postMessage({ status: 'start' });

    // Build generation params from the model's profile, tuned per-device
    const profile = modelConfig.generationProfile || {};
    const isWasm = device === 'wasm';

    const genParams = {
      // Deterministic on CPU (wasm) for speed/stability; sampled on GPU
      do_sample: !isWasm,
      top_k: isWasm ? (profile.topKWasm ?? 20) : (profile.topK ?? 40),
      temperature: isWasm
        ? (profile.temperatureWasm ?? 0.0)
        : (profile.temperature ?? 0.05),
      repetition_penalty: profile.repetitionPenalty ?? 1.05,
      max_new_tokens: isWasm
        ? (profile.maxTokensWasm ?? 2048)
        : (profile.maxTokens ?? 4096),
    };
    // Only include top_p when the model uses it (LFM yes, Qwen no)
    if (!isWasm && profile.topP !== undefined) {
      genParams.top_p = profile.topP;
    }

    let sequences;
    try {
      ({ sequences } = await model.generate({
        ...inputs,
        // Do not reuse KV cache across turns (see note above)
        past_key_values: null,
        ...genParams,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
      }));
    } catch (genErr) {
      // If generation fails on WebGPU, fall back to CPU (wasm) and retry once
      if (device === 'webgpu') {
        self.postMessage({
          status: 'loading',
          data: 'WebGPU failed during generation. Falling back to WASM...',
        });
        // Force this model to reload on wasm (real modelId, forced device)
        TextGenerationPipeline.reset(modelId);
        const [, modelCPU] = await TextGenerationPipeline.getInstance(
          modelId,
          null,
          'wasm'
        );
        ({ sequences } = await modelCPU.generate({
          ...inputs,
          past_key_values: null,
          do_sample: false,
          top_k: profile.topKWasm ?? 20,
          temperature: profile.temperatureWasm ?? 0.0,
          repetition_penalty: profile.repetitionPenalty ?? 1.05,
          max_new_tokens: profile.maxTokensWasm ?? 2048,
          streamer,
          stopping_criteria,
          return_dict_in_generate: true,
        }));
      } else {
        throw genErr;
      }
    }

    // Flush any text held back by the think-tag filter at the tail
    if (thinkFilter) {
      for (const seg of thinkFilter.flush()) {
        emitSegment(seg.text, seg.state);
      }
    }

    // Decode ONLY the newly generated tokens (never the input prompt / CV),
    // so the 'complete' fallback can't echo the system prompt to the user.
    let decoded;
    try {
      const promptLen = inputs.input_ids.dims[inputs.input_ids.dims.length - 1];
      const newTokens = sequences.slice(null, [promptLen, null]);
      decoded = tokenizer.batch_decode(newTokens, {
        skip_special_tokens: true,
      });
    } catch (sliceErr) {
      // Fallback if tensor slicing is unavailable in this runtime
      decoded = tokenizer.batch_decode(sequences, {
        skip_special_tokens: true,
      });
    }

    self.postMessage({
      status: 'complete',
      output: decoded,
      state: reasonEnabled ? state : 'answering',
    });
  } catch (error) {
    self.postMessage({
      status: 'error',
      data: error.message || 'Generation failed',
    });
  }
}

/**
 * Load the model and notify the main thread of progress.
 */
async function load(modelId, modelConfig = {}) {
  try {
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

    // Set per-model config before loading so getInstance can select dtype
    TextGenerationPipeline._pendingModelConfig = modelConfig;

    const [tokenizer, model, device] = await TextGenerationPipeline.getInstance(
      modelId,
      progress => {
        if (
          progress &&
          typeof progress.loaded === 'number' &&
          typeof progress.total === 'number'
        ) {
          const file = progress.file || 'model';
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
        device === 'webgpu'
          ? 'Compiling shaders and warming up model...'
          : 'Warming up WASM backend for generation...',
    });

    // Warmup generation to compile shaders / prime the backend
    const inputs = tokenizer('Hello');
    try {
      await model.generate({ ...inputs, max_new_tokens: 1, do_sample: false });
    } catch (warmupErr) {
      if (device === 'webgpu') {
        self.postMessage({
          status: 'loading',
          data: 'WebGPU warmup failed. Falling back to WASM...',
        });
        TextGenerationPipeline.reset(modelId);
        const [, modelCPU] = await TextGenerationPipeline.getInstance(
          modelId,
          null,
          'wasm'
        );
        await modelCPU.generate({
          ...inputs,
          max_new_tokens: 1,
          do_sample: false,
        });
        // Report the device we actually ended up on
        self.postMessage({ status: 'ready', data: 'wasm', modelId });
        return;
      }
      throw warmupErr;
    }

    // Model is ready — report the device AND which model loaded (see B7)
    self.postMessage({ status: 'ready', data: device, modelId });
  } catch (error) {
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
  stopping_criteria.reset();
  self.postMessage({ status: 'reset_complete' });
}

/**
 * Main worker event listener
 */
self.addEventListener('message', async event => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'check': {
        const supportsWebGPU = await checkWebGPUSupport();
        self.postMessage({
          status: 'check_complete',
          webGPUSupported: supportsWebGPU,
        });
        break;
      }

      case 'load': {
        const modelId = data?.modelId || 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';
        const modelConfig = data?.modelConfig || {};
        await load(modelId, modelConfig);
        break;
      }

      case 'generate': {
        stopping_criteria.reset();
        await generate(data);
        break;
      }

      case 'interrupt': {
        stopping_criteria.interrupt();
        self.postMessage({ status: 'interrupted' });
        break;
      }

      case 'reset': {
        reset();
        break;
      }

      default: {
        self.postMessage({
          status: 'error',
          data: `Unknown message type: ${type}`,
        });
      }
    }
  } catch (error) {
    self.postMessage({
      status: 'error',
      data: error.message || 'Worker operation failed',
    });
  }
});

// Handle uncaught errors in the worker
self.addEventListener('error', event => {
  self.postMessage({
    status: 'error',
    data: event.error?.message || 'Worker encountered an error',
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
  self.postMessage({
    status: 'error',
    data: event.reason?.message || 'Worker promise rejection',
  });
  event.preventDefault();
});
