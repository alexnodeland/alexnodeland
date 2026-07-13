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
      clearKvCache(); // KV tensors belong to the model being disposed
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
    clearKvCache();
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

// Cross-turn KV cache (the transformers.js llama-3.2-webgpu pattern).
// The conversation prompt grows append-only, so the previous turn's
// past_key_values can be reused IF the new templated input starts with
// exactly the tokens the cache covers. We verify that prefix explicitly —
// history rewrites (think-tag stripping, rolling-window eviction, message
// edits) make the check fail and we simply re-prefill from scratch.
const kvState = {
  cache: null, // past_key_values from the last generate/warmup
  tokens: null, // array of BigInt token ids the cache covers
  modelId: null,
};

function clearKvCache() {
  kvState.cache = null;
  kvState.tokens = null;
  kvState.modelId = null;
}

/** Returns the cached past_key_values iff it covers an exact prefix of ids. */
function reusableKvCache(modelId, ids) {
  const { cache, tokens } = kvState;
  if (!cache || !tokens || kvState.modelId !== modelId) return null;
  // Strictly shorter: generation must have at least the new tokens to encode
  if (tokens.length >= ids.length) return null;
  for (let i = 0; i < tokens.length; i++) {
    if (ids[i] !== tokens[i]) return null;
  }
  return cache;
}

function storeKvCache(modelId, cache, sequences) {
  try {
    kvState.cache = cache || null;
    // sequences is a [1, seqLen] tensor of the full input+generated ids
    kvState.tokens = cache ? Array.from(sequences.data) : null;
    kvState.modelId = cache ? modelId : null;
  } catch (e) {
    clearKvCache();
  }
}

/**
 * Generate text using the loaded model.
 * Streams output, filters <think>/</think> tags across chunk boundaries, and
 * decodes only the newly generated tokens for the final message.
 */
/**
 * Cheap pre-generation topic guard: classifies the latest question with a
 * tiny CV-free prompt (fast prefill, ~6 output tokens, greedy). Returns true
 * when the question is off-topic and the canned refusal should be used.
 * Never touches the cross-turn KV cache. Fails open (on-topic) on any error.
 */
async function isOffTopic(tokenizer, model, guard, messages) {
  try {
    const userMsgs = messages.filter(m => m.role === 'user');
    const current = userMsgs[userMsgs.length - 1];
    if (!current) return false;
    for (const promptTemplate of guard.prompts || []) {
      const inputs = tokenizer.apply_chat_template(
        [
          {
            role: 'user',
            content: promptTemplate.replace('{question}', current.content),
          },
        ],
        { add_generation_prompt: true, return_dict: true }
      );
      const out = await model.generate({
        ...inputs,
        past_key_values: null,
        max_new_tokens: 8,
        do_sample: false,
      });
      const promptLen = inputs.input_ids.dims[inputs.input_ids.dims.length - 1];
      const verdict =
        tokenizer.batch_decode(out.slice(null, [promptLen, null]), {
          skip_special_tokens: true,
        })[0] || '';
      // Any single YES means on-topic; only a unanimous NO refuses.
      if (!/^\s*NO\b/i.test(verdict)) return false;
    }
    return (guard.prompts || []).length > 0;
  } catch (e) {
    return false; // fail open - the main model handles it
  }
}

async function generate({
  messages,
  reasonEnabled = false,
  systemPrompt = null,
  modelConfig = {},
  guard = null,
}) {
  try {
    // Retrieve the loaded pipeline (and the device it actually loaded on)
    const modelId =
      TextGenerationPipeline.currentModelId ||
      'LiquidAI/LFM2.5-1.2B-Thinking-ONNX';
    const [tokenizer, model, device] =
      await TextGenerationPipeline.getInstance(modelId);

    // Topic guard: short-circuit off-topic questions with the canned refusal
    // before the (expensive) full-CV generation ever runs.
    if (guard && guard.prompts && guard.refusal) {
      if (await isOffTopic(tokenizer, model, guard, messages)) {
        self.postMessage({ status: 'start' });
        self.postMessage({
          status: 'update',
          output: guard.refusal,
          tps: 0,
          numTokens: 0,
          state: 'answering',
        });
        self.postMessage({
          status: 'complete',
          output: [guard.refusal],
          state: 'answering',
        });
        return;
      }
    }

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
      // Greedy when the profile demands it; otherwise deterministic on CPU
      // (wasm) for speed/stability and sampled on GPU
      do_sample: profile.doSample ?? !isWasm,
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

    // Reuse the previous turn's KV cache when the new prompt extends it —
    // skips re-prefilling the (large) CV system prompt and prior turns.
    const pastKV = reusableKvCache(modelId, inputs.input_ids.data);

    let sequences;
    let pastKeyValuesOut = null;
    try {
      ({ sequences, past_key_values: pastKeyValuesOut } = await model.generate({
        ...inputs,
        past_key_values: pastKV,
        ...genParams,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
      }));
      storeKvCache(modelId, pastKeyValuesOut, sequences);
    } catch (genErr) {
      clearKvCache();
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
 * warmupPrompt (the real system prompt) lets WebGPU compile shaders at the
 * shapes the first real question will use, moving that cost into the load
 * screen instead of the first response.
 */
async function load(modelId, modelConfig = {}, warmupPrompt = null) {
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

    // Warmup generation to compile shaders / prime the backend.
    const inputs = tokenizer('Hello');
    try {
      await model.generate({ ...inputs, max_new_tokens: 1, do_sample: false });

      // On WebGPU, additionally prefill the real system prompt via a plain
      // forward pass and keep its KV cache: shaders get compiled at
      // first-question shapes AND the first question skips the (large) CV
      // prompt prefill entirely. Skipped on WASM where big prefills are slow.
      if (device === 'webgpu' && warmupPrompt) {
        try {
          const sysTemplateOptions = {
            add_generation_prompt: false,
            return_dict: true,
          };
          if (
            modelConfig.templateOptions &&
            'add_special_tokens' in modelConfig.templateOptions
          ) {
            sysTemplateOptions.add_special_tokens =
              modelConfig.templateOptions.add_special_tokens;
          }
          const sysInputs = tokenizer.apply_chat_template(
            [{ role: 'system', content: warmupPrompt }],
            sysTemplateOptions
          );
          const out = await model({ ...sysInputs });
          if (out && out.past_key_values) {
            storeKvCache(modelId, out.past_key_values, sysInputs.input_ids);
          }
        } catch (seedErr) {
          // KV seeding is a pure optimization — never fail the load over it
          clearKvCache();
        }
      }
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
        // Minimal warmup on WASM — never prefill the full prompt on CPU
        await modelCPU.generate({
          ...tokenizer('Hello'),
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
  clearKvCache();
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
        await load(modelId, modelConfig, data?.warmupPrompt || null);
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
