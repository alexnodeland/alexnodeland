import {
  AutoModelForCausalLM,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  TextStreamer,
  env,
  pipeline,
} from '@huggingface/transformers';
import { createThinkTagFilter } from './thinkTagStreamer';
import {
  hydrateIndex,
  resolveQuery,
  retrieve,
} from '../../lib/chat/retrieval.mjs';
import {
  REFUSAL_MESSAGE,
  SYSTEM_PROMPT,
  buildGroundedTurn,
  buildSystemPrompt,
  citedSources,
  dedupeByUrl,
  pruneHistory,
  stripSources,
} from '../../lib/chat/prompt.mjs';
import {
  EMBEDDING_MODEL,
  INDEX_PATH,
  QUERY_PREFIX,
  RETRIEVAL_OPTIONS,
} from '../../config/retrieval.mjs';

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
  // Never proxy. We are already inside a worker, so ORT's proxy would spawn a
  // second one for nothing — and more importantly transformers.js refuses to
  // keep the WebGPU key-value cache in GPU buffers when the proxy is on
  // (see getSession: `!isONNXProxy()`), which is the single biggest decode
  // win available. Off unconditionally, not just outside COI.
  env.backends.onnx.wasm.proxy = false;
  if (!isCOI) {
    // SharedArrayBuffer is unavailable, so multi-threading cannot work
    env.backends.onnx.wasm.numThreads = 1;
  }
} catch (error) {
  // ONNX configuration may fail in some environments, continue with defaults
}

/** Fallback when a generate arrives before any explicit load. */
const DEFAULT_MODEL_ID = 'LiquidAI/LFM2.5-1.2B-Instruct-ONNX';

/** Generous — a cold embedder download on a slow connection is legitimate.
 *  This is a stuck-forever guard, not a performance budget. */
const RETRIEVER_LOAD_TIMEOUT_MS = 90000;

/** Rejects if `promise` has not settled in time. The underlying work is left
 *  running: if it does finish later, the retriever is simply ready then. */
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

/**
 * Removes `{% generation %}` / `{% endgeneration %}` from a chat template.
 *
 * Those tags are a Hugging Face Jinja extension that marks which span of the
 * rendered text is assistant-generated, so training can build a token mask
 * from it. They emit nothing. The Jinja engine bundled with transformers.js
 * does not implement them and throws `Unknown statement type: generation`,
 * which surfaces as every single answer failing while the model itself loads
 * and runs perfectly well — LFM2.5-230M ships such a template.
 *
 * Stripping them is exact rather than approximate: verified against the 230M
 * template, the rendered ChatML is byte-identical with and without.
 */
function sanitizeChatTemplate(tokenizer) {
  const template = tokenizer && tokenizer.chat_template;
  if (typeof template !== 'string') return false;
  const cleaned = template.replace(/\{%-?\s*(?:end)?generation\s*-?%\}/g, '');
  if (cleaned === template) return false;
  tokenizer.chat_template = cleaned;
  return true;
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

    sanitizeChatTemplate(resolvedTokenizer);

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

/**
 * Query embedder and prebuilt passage index.
 *
 * Held separately from TextGenerationPipeline, which disposes whatever it is
 * holding whenever a different language model is loaded. The embedder must
 * survive that: it is 32MB, it is shared by every language model, and
 * reloading it on each model switch would stall the first question after one.
 *
 * The corpus itself was embedded at build time (scripts/build-chat-index.mjs),
 * so nothing here ever embeds more than a single short query.
 */
class Retriever {
  static extractor = null;
  static index = null;
  static loading = null;

  static async load(progress_callback = null, device = null) {
    if (this.extractor && this.index) return;
    // Concurrent callers (a page-load restore racing a user click) share one
    // in-flight load rather than fetching the model twice.
    if (this.loading) return this.loading;

    this.loading = (async () => {
      const [extractor, index] = await Promise.all([
        // Runs on whatever the language model is about to use. On WebGPU that
        // avoids pulling ONNX Runtime's wasm binaries at all, which is a
        // multi-megabyte CDN fetch this small model does not otherwise need.
        pipeline('feature-extraction', EMBEDDING_MODEL, {
          dtype: device === 'webgpu' ? 'fp32' : 'q8',
          device: device || 'wasm',
          progress_callback,
        }),
        fetch(new URL(INDEX_PATH, self.location.href))
          .then(r => {
            if (!r.ok) throw new Error(`index fetch failed: ${r.status}`);
            return r.json();
          })
          .then(hydrateIndex),
      ]);
      this.extractor = extractor;
      this.index = index;
    })();

    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  static get ready() {
    return !!(this.extractor && this.index);
  }

  /**
   * The system prompt with the always-present passages folded in, built once
   * per session. Byte-identical on every turn, which is the whole reason the
   * pinned passages live in there rather than in the user turn.
   */
  static get systemPrompt() {
    if (!this.index) return SYSTEM_PROMPT;
    this._systemPrompt ??= buildSystemPrompt(
      this.index.chunks.filter(c => c.pin === 1)
    );
    return this._systemPrompt;
  }

  /** Embeds one query and searches. Single-digit milliseconds in practice. */
  static async search(queryText) {
    const out = await this.extractor(QUERY_PREFIX + queryText, {
      pooling: 'cls',
      normalize: true,
    });
    return retrieve(
      this.index,
      queryText,
      Float32Array.from(out.data),
      RETRIEVAL_OPTIONS
    );
  }
}

// Global stopping criteria for interrupting generation
const stopping_criteria = new InterruptableStoppingCriteria();

// Cached KV for the *system prompt*, which is the only stable prefix a turn
// has.
//
// This used to be a rolling cache of the whole previous turn, on the
// transformers.js llama-3.2-webgpu pattern, which works when the prompt grows
// append-only. It no longer does: pruneHistory strips the SOURCES block out of
// each turn once the next one arrives, so the stored sequence stops being a
// prefix of the new one and the check failed every single time — the cache was
// dead weight holding GPU tensors.
//
// What survives every turn is the system prompt, unchanged since it stopped
// carrying the CV. Prefilling it is ~330 tokens, about a fifth of a turn's
// prefill and the largest piece still recoverable without rewriting how
// history is handled.
const systemKv = {
  cache: null, // past_key_values covering the system prompt alone
  tokens: null, // array of BigInt token ids the cache covers
  modelId: null,
  lastSeed: 'never-run', // diagnostic, surfaced in the generation timing
};

function clearKvCache() {
  systemKv.cache = null;
  systemKv.tokens = null;
  systemKv.modelId = null;
}

/**
 * Hands out the system cache iff it is an exact prefix of `ids`, and clears
 * the slot.
 *
 * Single use is the important part: generate() consumes and extends whatever
 * past_key_values it is given, so handing the same object to a second
 * generation would feed it a cache that already has another conversation's
 * tokens appended. The slot is refilled by seedSystemKv after the answer has
 * streamed, where the cost is off the visitor's critical path.
 */
function takeSystemKv(modelId, ids) {
  const { cache, tokens } = systemKv;
  if (!cache) return { cache: null, reason: 'no-cache' };
  if (!tokens) return { cache: null, reason: 'no-tokens' };
  if (systemKv.modelId !== modelId) return { cache: null, reason: 'model' };
  // Strictly shorter: generation must have at least the new tokens to encode
  if (tokens.length >= ids.length) return { cache: null, reason: 'too-long' };
  for (let i = 0; i < tokens.length; i++) {
    if (ids[i] !== tokens[i]) {
      return { cache: null, reason: `prefix@${i}/${tokens.length}` };
    }
  }
  clearKvCache();
  return { cache, reason: 'hit', covered: tokens.length };
}

/**
 * Runs a forward pass over the system prompt alone and keeps its KV.
 *
 * Templated with add_generation_prompt: false so the token sequence is a
 * genuine prefix of any full conversation. If a model's template does not
 * make it one, takeSystemKv's prefix check simply never matches and the only
 * cost is this forward pass.
 */
async function seedSystemKv(modelId, tokenizer, model, modelConfig = {}) {
  try {
    const opts = { add_generation_prompt: false, return_dict: true };
    if (
      modelConfig.templateOptions &&
      'add_special_tokens' in modelConfig.templateOptions
    ) {
      opts.add_special_tokens = modelConfig.templateOptions.add_special_tokens;
    }
    const inputs = tokenizer.apply_chat_template(
      [{ role: 'system', content: Retriever.systemPrompt }],
      opts
    );
    const out = await model({ ...inputs });

    // A raw forward pass returns the cache under `present*` names; it is
    // `getPastKeyValues` that renames them to the `past_key_values*` that
    // generate() expects. The previous code read `out.past_key_values`
    // directly, which is always undefined — which is why this cache had never
    // once hit. LFM2 is a hybrid architecture, so the state also includes
    // `present_conv` / `present_ssm` / `present_recurrent`, and this method
    // is what knows to rename those too; a plain string replace would drop
    // half the state.
    const past =
      typeof model.getPastKeyValues === 'function'
        ? model.getPastKeyValues(out, null)
        : null;
    const covered = past ? Object.keys(past).length : 0;
    systemKv.lastSeed = covered ? `ok:${covered}` : 'no-present-outputs';

    if (covered) {
      systemKv.cache = past;
      systemKv.tokens = Array.from(inputs.input_ids.data);
      systemKv.modelId = modelId;
    }
  } catch (e) {
    // A pure optimisation — never let it break generation.
    const why = e && e.message ? e.message : String(e);
    clearKvCache();
    systemKv.lastSeed = `threw: ${why.slice(0, 90)}`;
  }
}

/**
 * Generate text using the loaded model.
 * Streams output, filters <think>/</think> tags across chunk boundaries, and
 * decodes only the newly generated tokens for the final message.
 */
/**
 * Retrieves for the latest question and turns the conversation into the exact
 * message list the model will see.
 *
 * This replaced a pair of yes/no classifier generations that used to run
 * before every answer to decide whether the question was on-topic. Retrieval
 * has to happen anyway, and the scores it produces already say whether the
 * corpus contains anything relevant — so the decision comes free, and two
 * full generations came off the critical path. That is most of the latency
 * win, and the gate is measurably more accurate than the classifier was
 * (`npm run eval:retrieval`).
 */
async function prepareTurn(messages) {
  const question = stripSources(
    messages.filter(m => m.role === 'user').pop()?.content || ''
  );

  if (!Retriever.ready) {
    // Retrieval is normally warmed during `load`; reaching here means that
    // attempt failed or timed out. Try once more now rather than refusing for
    // the rest of the session over one bad fetch.
    try {
      await Retriever.load();
    } catch (e) {
      // Fall through to the refusal below.
    }
  }

  if (!Retriever.ready) {
    // Without the index there is nothing to ground an answer in, and an
    // ungrounded small model will invent a career. Saying so is the honest
    // failure mode.
    return { refusal: REFUSAL_MESSAGE, sources: [] };
  }

  const plain = messages.map(m =>
    m.role === 'user' ? { ...m, content: stripSources(m.content) } : m
  );
  const { query, previousQuestion } = resolveQuery(plain);
  const result = await Retriever.search(query);

  if (!result.onTopic) {
    return { refusal: REFUSAL_MESSAGE, sources: [], result };
  }

  const lastAnswer = [...plain]
    .reverse()
    .find(m => m.role === 'assistant' && m.content?.trim());

  // Tier-1 pinned passages are already in the (cached) system prompt; only
  // the tier-2 anchors are rendered here, next to the question.
  const nearQuestion = result.pinned.filter(p => p.pin === 2);
  const { prompt, sources } = buildGroundedTurn(
    question,
    result.hits,
    nearQuestion,
    previousQuestion
      ? { question: previousQuestion, answer: lastAnswer?.content || '' }
      : null
  );

  // History is the plain questions and answers; only the live turn carries a
  // SOURCES block. `plain` already has earlier turns stripped, and
  // pruneHistory drops the stale citation markers from earlier answers.
  const history = pruneHistory(plain.slice(0, -1));

  return {
    messages: [...history, { role: 'user', content: prompt }],
    sources,
    result,
  };
}

async function generate({ messages, reasonEnabled = false, modelConfig = {} }) {
  try {
    // Retrieve the loaded pipeline (and the device it actually loaded on)
    const modelId = TextGenerationPipeline.currentModelId || DEFAULT_MODEL_ID;
    const [tokenizer, model, device] =
      await TextGenerationPipeline.getInstance(modelId);

    // Announce the turn before retrieving. 'start' is what creates the
    // assistant message on the main thread, so every later message — sources
    // included — needs it to have happened already, and showing the bubble
    // immediately is better anyway.
    self.postMessage({ status: 'start' });

    // --- retrieve, then decide whether there is anything to answer from ---
    const retrievalStart = performance.now();
    const turn = await prepareTurn(messages);
    const retrievalMs = performance.now() - retrievalStart;

    if (turn.refusal) {
      self.postMessage({ status: 'sources', sources: [], retrievalMs });
      self.postMessage({
        status: 'update',
        output: turn.refusal,
        tps: 0,
        numTokens: 0,
        state: 'answering',
      });
      self.postMessage({
        status: 'complete',
        output: [turn.refusal],
        state: 'answering',
        sources: [],
      });
      return;
    }

    // Sources go up before a single token is generated. Retrieval finishes in
    // milliseconds while the first token is hundreds of them away, so the UI
    // can show what the answer is being drawn from while it is still being
    // written. The list is narrowed to actual citations once the answer lands.
    self.postMessage({
      status: 'sources',
      sources: dedupeByUrl(turn.sources),
      retrievalMs,
    });

    // The system prompt is owned here, not passed in per request: it must be
    // byte-identical every turn for the warmup KV cache to keep matching.
    let processedMessages = turn.messages.filter(msg => msg.role !== 'system');
    processedMessages.unshift({
      role: 'system',
      content: Retriever.systemPrompt,
    });

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

    // Prefill and decode are the two halves of the latency and they respond to
    // completely different fixes — prefill to a shorter prompt, decode to a
    // smaller model or fewer output tokens. Timing them separately is what
    // keeps optimisation work aimed at whichever one is actually large.
    const generateStart = performance.now();
    let prefillMs = null;
    const promptTokens =
      inputs.input_ids.dims[inputs.input_ids.dims.length - 1];

    const token_callback_function = () => {
      startTime ??= performance.now();
      prefillMs ??= startTime - generateStart;
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

    // Skip re-prefilling the system prompt, which is byte-identical on every
    // turn. Consumed here and refilled after the answer has streamed.
    const kv = takeSystemKv(modelId, inputs.input_ids.data);
    const pastKV = kv.cache;
    const usedSystemKv = kv.reason === 'hit';

    let sequences;
    try {
      ({ sequences } = await model.generate({
        ...inputs,
        past_key_values: pastKV,
        ...genParams,
        streamer,
        stopping_criteria,
        return_dict_in_generate: true,
      }));
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

    // Narrow the source list to what the answer actually cited. A list that
    // includes passages the answer never used teaches visitors to ignore it.
    // When the model cites nothing at all — small models do forget — fall back
    // to the passages retrieval ranked highest. Every entry in turn.sources is
    // a retrieved hit now; the always-present passages are in the system
    // prompt and are not citable.
    const answerText = Array.isArray(decoded) ? decoded.join('') : '';
    const cited = citedSources(answerText, turn.sources);
    const shown = cited.length ? cited : dedupeByUrl(turn.sources).slice(0, 3);

    self.postMessage({
      status: 'complete',
      output: decoded,
      state: reasonEnabled ? state : 'answering',
      sources: shown,
      timing: {
        retrievalMs: Math.round(retrievalMs),
        prefillMs: prefillMs === null ? null : Math.round(prefillMs),
        decodeMs: startTime ? Math.round(performance.now() - startTime) : 0,
        promptTokens,
        outputTokens: numTokens,
        systemKvHit: usedSystemKv,
        systemKvReason: kv.reason,
        systemKvCovered: kv.covered ?? 0,
        systemKvSeed: systemKv.lastSeed,
        device,
      },
    });

    // Refill the system-prompt cache for the next turn. Deliberately after the
    // 'complete' message: the visitor has their answer, so this forward pass
    // costs them nothing, and the next question starts a few hundred tokens
    // further along.
    await seedSystemKv(modelId, tokenizer, model, modelConfig);
  } catch (error) {
    self.postMessage({
      status: 'error',
      data: error.message || 'Generation failed',
    });
  }
}

/**
 * Load the model and notify the main thread of progress.
 *
 * Ends by prefilling the system prompt so WebGPU compiles its shaders at the
 * shapes the first real question will use, and so the first question skips
 * that prefill entirely. Both costs land on the loading screen, where the
 * visitor is already waiting, instead of on the first answer.
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

    // Start the retriever but do NOT wait for it before starting the language
    // model. These are two independent downloads — ~32MB against ~725MB — and
    // awaiting the small one first simply delayed the start of the large one
    // by however long it took. They now overlap, and the retriever is
    // invariably finished long before the model is.
    //
    // Bounded, so a hung CDN fetch cannot strand a visitor whose model would
    // otherwise have loaded fine.
    const retrieverStart = performance.now();
    let retrieverMs = null;
    const retrieverReady = withTimeout(
      Retriever.load(null, supportsWebGPU ? 'webgpu' : 'wasm'),
      RETRIEVER_LOAD_TIMEOUT_MS,
      'search index'
    )
      .then(() => {
        retrieverMs = performance.now() - retrieverStart;
      })
      .catch(retrieverErr => {
        // A failed index leaves the chat able to load but not to answer, which
        // prepareTurn reports honestly. Never fail the whole load over it.
        self.postMessage({
          status: 'retriever_error',
          data: retrieverErr.message || 'Failed to load search index',
        });
      });

    // Set per-model config before loading so getInstance can select dtype
    TextGenerationPipeline._pendingModelConfig = modelConfig;
    const modelStart = performance.now();

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

    const modelMs = performance.now() - modelStart;

    // Settle the retriever before warming up. The downloads ran concurrently,
    // and by now the 32MB index is long finished — but the system prompt is
    // composed from the pinned passages it carries, so seeding the KV cache
    // before it lands would cache a *different* system prompt than the one
    // generation uses, and every subsequent cache lookup would miss.
    await retrieverReady;

    self.postMessage({
      status: 'loading',
      data:
        device === 'webgpu'
          ? 'Compiling shaders and warming up model...'
          : 'Warming up WASM backend for generation...',
    });

    // Warmup generation to compile shaders / prime the backend.
    const warmupStart = performance.now();
    const inputs = tokenizer('Hello');
    try {
      await model.generate({ ...inputs, max_new_tokens: 1, do_sample: false });

      // On WebGPU, prefill the system prompt and keep its KV so the first
      // question skips those tokens. Every later turn gets the same treatment
      // from seedSystemKv, which refills this after each answer.
      if (device === 'webgpu') {
        await seedSystemKv(modelId, tokenizer, model, modelConfig);
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

    const warmupMs = performance.now() - warmupStart;

    // Model is ready — report the device AND which model loaded (see B7).
    // The phase split says whether a slow load was download, shader
    // compilation, or the search index, which need different fixes.
    self.postMessage({
      status: 'ready',
      data: device,
      modelId,
      timing: {
        modelMs: Math.round(modelMs),
        warmupMs: Math.round(warmupMs),
        retrieverMs: retrieverMs === null ? null : Math.round(retrieverMs),
      },
    });
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
        const modelId = data?.modelId || DEFAULT_MODEL_ID;
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
