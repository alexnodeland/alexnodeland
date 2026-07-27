# 💬 Chat Configuration Guide

This guide explains how the in-browser AI chat assistant is built and how to
customize it. The chat runs entirely client-side via
[Transformers.js](https://huggingface.co/docs/transformers.js) in a Web
Worker — no server, no API keys, no data leaving the visitor's browser.

## 📋 Table of Contents

- [Overview](#overview)
- [Changing the Model Lineup](#changing-the-model-lineup)
- [Editing the System Prompt](#editing-the-system-prompt)
- [The Retrieval Index](#-the-retrieval-index)
- [Interface Customization](#interface-customization)
- [Build Pipeline](#build-pipeline)
- [Evaluation](#evaluation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Visitors ask questions about Alex and get answers grounded in his site, with
links to the pages the answer came from. The pieces:

- **Worker** (`src/components/chat/worker.js`) — loads the model and runs
  generation off the main thread using `@huggingface/transformers`
  (`AutoModelForCausalLM`, `AutoTokenizer`, `TextStreamer`).
- **Retrieval, not a stuffed prompt** — the site is chunked and embedded at
  build time into `static/chat-index.json`. Each question is embedded in the
  browser (~2ms), matched against that index, and answered from the handful
  of passages that come back. Coverage is the CV, every blog post, the
  project list, and the homepage — where the old design could only see the
  CV. See [The Retrieval Index](#-the-retrieval-index).
- **One generation per turn.** An earlier version ran two extra yes/no
  classifier generations before every answer to decide whether the question
  was on-topic. Retrieval has to run anyway and its scores already answer
  that question, so the classifier passes are gone: off-topic questions are
  now refused in ~0.1s without the model being invoked at all.
- **WebGPU with WASM fallback** — the worker feature-detects WebGPU
  (`navigator.gpu.requestAdapter()`). If available it loads the model on
  `device: 'webgpu'` with the model's GPU `dtype`; otherwise (or if WebGPU
  fails at load/generate time) it falls back to `device: 'wasm'` using the
  model's `dtypeWasm`. That fallback is **untested as a working experience** —
  see [The WASM fallback](#the-wasm-fallback) for what it actually does. All
  models decode greedily — grounded extraction has a right answer sitting in
  the context, and sampling can only wander from it.
- **One model**, `lfm-1.2b` (LFM2.5-1.2B-Instruct), defined in
  `src/lib/utils/chat.ts` as `AVAILABLE_MODELS`. Four alternatives were
  measured and dropped — see
  [Measured lineup](#measured-lineup-july-2026-m-series-mac-webgpu). The query
  embedder is held separately from the language model so it survives a model
  switch, and the switching machinery remains for when a second entry earns
  its place; both pickers hide themselves while there is only one.
- **Citations** — answers cite passages as `[1]`, and the UI renders the
  pages behind those numbers as links under the message
  (`MessageSources.tsx`). If the model forgets to cite, the top retrieved
  pages are shown instead. They sit behind an "N sources" toggle rather than
  inline: the bubble is 28rem wide and a blog title is not, so inline chips
  had to truncate, and a row reading "Optimal Wavelet Bases For A…" three
  times over is not worth the line it occupies.
- **Cost, shown** — `MessageStats.tsx` renders decode rate and how much of the
  prompt the KV cache covered, under each answer. Two numbers, because the
  rest is derivable from them and is on hover. It is the
  fastest way to notice a regression in ordinary use; the reset-path cache
  problem showed up there as prefill tripling. Note that anything rendered
  inside the message bubble has to be stripped in `assistantAnswers()` or it
  gets graded as part of the answer — this row was, briefly, and corrupted a
  whole run.
- **Thinking models** — models that support reasoning stream a `<think>...
</think>` block before the answer. The worker strips these tags from the
  visible stream in real time (`thinkTagStreamer.js`) and tags each streamed
  segment with `state: 'thinking' | 'answering'` so the UI can render a
  collapsible "thinking" section separately from the final answer.

## 🤖 Changing the Model Lineup

`AVAILABLE_MODELS` in `src/lib/utils/chat.ts` is the **single source of
truth** for which models are offered, and `chatConfig.models.default` in
`src/config/chat.ts` picks which one loads by default. Example entry:

```typescript
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
    maxTokens: 512,
    maxTokensWasm: 384,
    temperature: 0.0,
    temperatureWasm: 0.0,
    topK: 0,
    topKWasm: 0,
    repetitionPenalty: 1.05,
    doSample: false,
  },
}
```

Field notes (see `ModelGenerationProfile` and `ChatModel` in
`src/types/chat.ts` for the authoritative types):

- **`id`** must be a valid ONNX model repo on the Hugging Face Hub
  (loaded via `AutoModelForCausalLM.from_pretrained` / `AutoTokenizer.from_pretrained`).
- **`dtype` / `dtypeWasm`** — quantization used on WebGPU vs. WASM
  respectively. **Prefer `q4f16` on WebGPU and check the model's
  `transformers.js_config` before choosing anything else.** Both LFM
  checkpoints map `q4f16` (and only `q4f16` or `fp16`) to
  `kv_cache_dtype: float16`; transformers.js then keeps the key-value cache
  in GPU buffers instead of round-tripping it through CPU memory. Plain `q4`
  loads fine and decodes measurably slower, with nothing in the logs to say
  why.
- **`alwaysThinks`** — `true` for models that unconditionally emit a
  `<think>` block; the worker never sends `enable_thinking` to these models.
  `false` for models whose thinking is toggleable — for those the worker
  passes `enable_thinking: reasonEnabled` when
  `alwaysThinks === false && supportsThinking`.
- **`templateOptions`** — extra options forwarded to
  `tokenizer.apply_chat_template()` (e.g. some models need
  `{ add_special_tokens: false }`).
- **`generationProfile`** — one flat object with GPU and WASM variants of
  each generation parameter (`maxTokens`/`maxTokensWasm`,
  `temperature`/`temperatureWasm`, `topK`/`topKWasm`, an optional `topP`
  used only on GPU, and `repetitionPenalty`). The worker's `generate()`
  picks the WASM or GPU fields based on the device the model actually
  resolved to at load time, and always forces `do_sample: false` on WASM
  regardless of the configured temperature.
- **`contextWindow`** — used by `ChatContext` to size the rolling context
  window for that model (falls back to `chatConfig.behavior.contextWindow`,
  currently `16384`, if a model doesn't specify one).

To add a model: append an entry to `AVAILABLE_MODELS` with a valid repo id,
tune its `generationProfile`, and optionally point `chatConfig.models.default`
at it. To remove one, delete its entry — there's no other registry to update.

### Measured lineup (July 2026, M-series Mac, WebGPU)

From `just eval-models "<name>"`. **The battery grew during this work, so the
`n` column matters** — rows measured on different sets are not directly
comparable to each other, only to the default model as measured at the same
time. Re-measure with `just eval-models` before leaning on any of it.

| model                         | passed    | n   | load     | median answer | median output | download |
| ----------------------------- | --------- | --- | -------- | ------------- | ------------- | -------- |
| **lfm-1.2b** (default)        | **56/68** | 68  | 21s      | **2.1s**      | **63 tok**    | 760MB    |
| lfm-1.2b (same, earlier set)  | 42/43     | 43  | 21s      | 1.4s          | 48 tok        | 760MB    |
| lfm-1.2b-thinking _(dropped)_ | 35/43     | 43  | 42s      | 5.3s          | 658 tok       | 810MB    |
| qwen-0.6b _(dropped)_         | 11/12     | 12  | 18s      | ~4.3s         | ~300 tok      | 600MB    |
| lfm-230m _(rejected)_         | 8/13      | 13  | **8.9s** | **0.8s**      | 14 tok        | 200MB    |

Four results here are worth knowing before changing the model, because none of
them is what you would guess:

- **Smaller is not reliably faster.** Qwen3-0.6B is half the parameters of the
  1.2B and two to four times _slower_ per answer, because it writes several
  hundred output tokens where the 1.2B writes ~48. Decode is per-token, so
  verbosity swamps the per-token saving. Dropped: slower _and_ less accurate.
- **The one model that is genuinely faster is the one that makes things up.**
  The 230M is 2.4× quicker to load and half the answer latency, and it
  answered both "does Alex know COBOL?" and "has Alex worked at Google?" with
  a flat yes.
- **Few-shot examples did not rescue it, and cost the 1.2B a case.** The
  reasoning was good — small models imitate patterns better than they follow
  rules, and the KV cache makes prompt bulk nearly free — but the 230M kept
  fabricating with a near-identical denial two hundred tokens above the
  question, while the 1.2B started reaching for entity names that appeared in
  the examples. See the note in `prompt.mjs` before retrying it.

- **Reasoning tokens bought nothing and cost a lot.** The thinking variant was
  worse in every single category (35/43 against 42/43) while taking 5.3s to a
  median answer against 1.4s, and 12.1s at worst. Its 658 median output tokens
  are spent before the visitor sees a word, so the whole cost lands on
  perceived latency. Grounded extraction from four retrieved passages is not a
  reasoning problem; the answer is already in the context.

The takeaway is that model size and reasoning are both the wrong dial here. The prefill and cache
work in [Evaluation](#evaluation) bought more than any model swap did, and
cost nothing in accuracy.

## ✍️ Editing the System Prompt

`SYSTEM_PROMPT` in `src/lib/chat/prompt.mjs` holds the instructions: who
"chat" is, the rule to answer only from the supplied SOURCES, how to cite,
and how to sound. It carries **no retrieved data** — the facts for a
particular question arrive from retrieval.

What the model actually receives is `buildSystemPrompt(pinned)`, which
appends the always-present passages (identity, career timeline) to it. That
comes to ~817 tokens, all of it cached.

Two properties are worth preserving if you edit it:

- **It is static.** Because it is byte-identical on every turn, the worker
  prefills it once during loading and reuses its KV cache for the whole
  session — currently a hit on every turn, worth ~420ms each. Anything you
  make question-dependent belongs in the user turn instead (see
  `buildGroundedTurn`), or the cache stops matching and that saving is gone
  silently. `npm run eval:chat` prints the hit rate; watch it after editing.
  It is the floor of what the cache covers, not the whole of it — see
  [What the cache covers](#what-the-cache-covers).
- **It is model-independent.** The old prompt had per-architecture suffixes;
  with retrieval doing the grounding work, one prompt behaves consistently
  across all three models, and the eval no longer shows a gap that a
  model-specific tail would close.

The refusal string is `REFUSAL_MESSAGE` in the same file. It is returned by
the worker directly, without a generation, whenever the gate declines — so
editing it changes the text with no effect on latency or model behavior.

### What the cache covers

A KV cache can only skip a **token-for-token prefix**, so how much it can
possibly cover is decided by the order the prompt is assembled in, not by the
cache code. `just cache-prefix` measures that ceiling with the tokenizer
alone — no model, no browser, about two seconds — and is the thing to run
before changing prompt layout.

The cached prefix is the system message **plus the pruned history**: earlier
questions with their SOURCES stripped, earlier answers with their citation
markers removed. Those are the only two rewrites `pruneHistory` performs, they
happen once when a turn stops being live, and they never happen again — so
from the next turn's point of view history is append-only and every token of
it can be carried. `seedPrefixKv` re-prefills that prefix after each answer,
where the visitor is reading and the pass is free; `takePrefixKv` hands it to
the next generation and verifies the prefix token by token first, so a
mismatch costs a miss and never a wrong answer.

Measured over one seven-turn conversation:

| turn | prompt | cached | to prefill | vs system-only |
| ---- | ------ | ------ | ---------- | -------------- |
| 1    | 1786   | 975    | 811        | 811            |
| 3    | 1705   | 1071   | 634        | 730            |
| 5    | 1869   | 1155   | 714        | 894            |
| 7    | 2122   | 1290   | 832        | 1147           |

17% fewer prefill tokens across the conversation, 27% by turn seven, and the
gap widens with every turn. Before this the cache covered 975 tokens forever,
so its _share_ of the prompt fell as the conversation grew.

**WebGPU only.** The seed is a real prefill, and on WASM a prefill of this
size stops being free — it would hold the worker for seconds after the answer,
with the next question already waiting. On WASM the cached prefix stays the
system message alone, which is what both devices had before, so the fallback
is no worse than it was. See [The WASM fallback](#the-wasm-fallback).

`MAX_PREFIX_TOKENS` (3072) caps it. Past that the prefix stops growing and
covers the first N tokens instead, which is still valid — history is dropped
from the **end**, never the start, because dropping the oldest turn produces a
sequence that is no longer a prefix of anything and would miss on every
subsequent turn.

Two layouts were measured and not taken, both in `cache-prefix-probe.mjs`:

- **Append-only** — keep each turn's passages in place and append only what is
  new, so nothing is ever rewritten and the whole conversation caches. Best on
  paper (83% cached vs 60%), but the win is concentrated entirely in turns
  where retrieval returns nothing new; context grows without bound (4,476
  tokens by turn six against 1,927); and it reinstates exactly the stale
  passages that were removed for answering turn four out of turn one's
  context. Worth revisiting only with multi-turn eval coverage well beyond the
  current six cases.
- **Sources before history** — pin the SOURCES block to a fixed offset so a
  repeated retrieval matches. Measured no better than doing nothing (4,578
  tokens vs 4,548), because it only pays when the retrieved set matches
  exactly in the same order, which is rarer than it sounds.

### The WASM fallback

**Root-caused, and it cannot work with this checkpoint.** ORT's CPU provider
has no kernel for the op the quantized exports use on the embedding table:

```
Can't create a session. ERROR_CODE: 9
Could not find an implementation for GatherBlockQuantized(1)
node with name '/model/embed_tokens/Gather_Quant'
```

`q4` and `q8` both hit it — transformers.js maps `q8` to `model_quantized`,
and every quantized export of LFM2.5-1.2B block-quantizes the embeddings. The
only exports that avoid the op are `fp16` (2.35GB) and `fp32` (4.7GB), neither
of which is a browser download. WebGPU is unaffected because its provider
_does_ implement the op — this is a CPU-provider gap, not a bad export.

Nothing is wrong with ORT WASM itself. Measured on the same machine, in the
same browser, through `AutoModelForCausalLM` with `device: 'wasm'`:

| model                   | session create | decode    | result           |
| ----------------------- | -------------- | --------- | ---------------- |
| SmolLM2-135M q4         | 19s            | 21 tok/s  | works            |
| SmolLM2-1.7B q4         | 105s           | 1.3 tok/s | works, unusably  |
| Qwen2.5-1.5B q4         | —              | —         | `std::bad_alloc` |
| **LFM2.5-1.2B q4 / q8** | —              | —         | missing kernel   |

So the size band that fits the WASM heap and decodes fast enough is roughly
135M–360M, which is the band already rejected for fabricating answers (the
230M answered both "does Alex know COBOL?" and "has Alex worked at Google?"
with a flat yes). 1.3 tok/s means a 60-token answer takes ~45s of decode on
top of prefilling ~1,800 prompt tokens.

**Threads are not the constraint, so do not reach for cross-origin
isolation.** It was tried: serving with `Cross-Origin-Opener-Policy:
same-origin` and `Cross-Origin-Embedder-Policy: credentialless` does produce
`crossOriginIsolated: true` with SharedArrayBuffer and all 16 cores, and the
huggingface.co and jsdelivr fetches still succeed under `credentialless`. The
load failed in exactly the same way. The blocker is a missing kernel; no
number of threads supplies one.

What the fallback does now, having been fixed:

- **Fails in ~55s instead of never.** Loading with no WebGPU used to attempt
  WebGPU-or-WASM, fail, then retry the _identical_ wasm/dtype pair — a second
  810MB download to reach the same error. The retry now only happens when the
  first attempt was WebGPU.
- **Says so.** A load failure used to write "I ran into an error while
  generating the response" into the message list, and because the error notice
  only renders while `messages` is empty, that message hid the notice. The chat
  went quiet with a disabled input and no explanation. Load failures no longer
  touch the message list, so the notice and its retry button appear.
- **In plain words.** `explainLoadFailure` in the worker translates the missing
  kernel and the out-of-memory cases into what the visitor should do, keeping
  the raw text in parentheses for bug reports.

#### Is a different runtime the answer? No — but a different checkpoint might be

Surveyed July 2026, because "ONNX Runtime is missing a kernel" invites the
reasonable-sounding fix of using something other than ONNX Runtime.

[wllama](https://github.com/ngxson/wllama) is llama.cpp compiled to WASM, and
it is the best CPU stack available. It would fix every _mechanical_ problem
hit above — GGUF carries llama.cpp's own kernels so there is no export gap,
weights cache in OPFS rather than the Cache API that failed on 810MB, and
models above the 2GB ArrayBuffer cap are split into ≤512MB chunks. Threads
still want COOP/COEP, which `credentialless` supplies.

It does not fix the arithmetic. A ~1.1B model on WASM CPU runs **2–5 tok/s**
even with llama.cpp's hand-tuned SIMD, against the 1.3 tok/s measured here
through ORT. Our turn is ~1,800 prefill tokens and ~65 output tokens, so a
single answer lands somewhere in the minutes. **No CPU stack makes a 1.2B
usable in a browser** — that is a 40–100× gap, not an engineering gap.

What this survey did turn up is that **the 350M's rejection deserves
re-testing**. It was dropped from the lineup for never becoming ready, which —
given that its 1.2B sibling fails session creation outright on the CPU
provider — looks much more like an ONNX export problem than a model problem.
`LFM2.5-350M-Q4_K_M.gguf` is an official 229MB build, llama.cpp supports the
LFM2 architecture natively (LiquidAI publishes the GGUFs), and 350M is inside
the band that runs at a usable rate on CPU. That is the one concrete route to
a working fallback, and it needs a `just eval` number before it ships: if it
scores near the 230M's 8/13, the honest error is the better product.

The alternative that needs no model at all is serving retrieval-only results —
the index and hybrid search run in ~25ms on CPU and would give a WASM visitor
the passages and links without prose.

#### Do not switch runtimes for speed on WebGPU either

[Llamas on the Web](https://arxiv.org/html/2605.20706v1) benchmarks exactly
this choice, and the result cuts against the intuition:

- On **prefill**, a llama.cpp-based WebGPU engine reaches only 79% of
  transformers.js and 49% of WebLLM. Prefill is our larger half at roughly 2:1,
  so that swap makes the half that matters worse.
- On **decode**, the same engine is 45–69% faster than both.
- The real lever is **subgroup matrices**: hand-written WebGPU with them is
  205% faster than transformers.js on prefill. That is what the
  [LFM2 WebGPU kernels Space](https://huggingface.co/spaces/webml-community/lfm2-webgpu-kernels)
  is doing — 53 compute shaders and 358 subgroup references in one 669KB file,
  no ONNX Runtime anywhere. It runs the 230M, the model rejected here for
  fabricating, and it is WebGPU-only with no CPU path at all.
- WebGPU's mandatory bounds-checking costs 14–23% of prefill, up to 42% on some
  devices. Nothing to be done about that from here.
- **Firefox WebGPU is reported at ~1 tok/s against Chrome's 52** on the same M4
  Pro. Untested here, but it means "has WebGPU" is not the same as "will be
  usable", and is worth measuring before trusting the feature check.

For calibration, prefill here measures ~1,200 tok/s (828 uncached tokens in
660ms), so there is no evidence the current runtime is the thing holding this
back.

To force the fallback, rewrite the worker on its way to the browser so
`navigator.gpu` is undefined in the _worker's_ scope. Patching the page's
`navigator` does nothing — detection runs in the worker, which has its own
`WorkerNavigator`, and the first attempt at this measured WebGPU while
reporting WASM:

```js
await page.route('**/worker.js*', async route => {
  const res = await route.fetch();
  await route.fulfill({
    status: 200,
    headers: { ...res.headers(), 'content-type': 'text/javascript' },
    body:
      `try{Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true})}catch(e){}\n` +
      (await res.text()),
  });
});
```

## 📚 The Retrieval Index

The chat answers from a **prebuilt index over the whole site**, not from a
CV pasted into the prompt. Coverage is the CV, every blog post, the project
list, and the homepage.

`npm run build:index` (`scripts/build-chat-index.mjs`) does the work:

1. `scripts/lib/chat-corpus.mjs` reads the same sources the site renders —
   `src/config/cv.ts`, `src/config/homepage.ts`, `src/config/projects.ts`,
   and `src/content/blog/*.md` — and chunks them into ~83 self-contained
   passages. Each passage opens with a sentence naming what it is ("Alex's
   role: …", "Blog post \"…\""), which is what lets a mid-article paragraph
   still embed near a query about its subject.
2. Every passage is embedded with `Xenova/bge-small-en-v1.5` **at build
   time**, quantized to int8, and written to `static/chat-index.json`
   (~94KB).
3. The browser fetches that file and only ever embeds the _question_ — one
   forward pass over ~15 tokens. Adding a blog post costs a visitor nothing
   at runtime.

Two passages are marked `pin: true` (identity and career timeline). They are
in every prompt regardless of what retrieval returns, because "who is this",
"what does he do now" and "before that?" are the most common questions and
the ones where a bad retrieval is most embarrassing.

`static/chat-index.json` is **gitignored** — it is build output like
`static/worker.js`. `npm run build` regenerates it, so a deploy always ships
an index matching the content. Edit `cv.ts` or add a markdown post and the
chat knows about it on the next build; there is nothing chat-specific to
maintain separately.

### How a question is answered

`src/lib/chat/retrieval.mjs` is dependency-free and imported unchanged by
both the worker and the eval scripts, so a threshold tuned on the command
line is the threshold visitors get.

1. **Decontextualize** — a follow-up like "and before that?" retrieves
   nothing on its own, so the previous question's words are folded into the
   _search_ query (never into what the model sees). This is a heuristic
   rather than an LLM rewrite specifically to avoid spending a whole
   generation before the first token.
2. **Search** — BM25 and dense cosine are fused with reciprocal rank
   fusion. Hybrid matters here: the corpus is one person's life, so
   everything in it is semantically adjacent to everything else, and a
   384-dimension vector cannot separate "Musiio" from "Influize" the way an
   exact term match trivially can.
3. **Expand** — a pseudo-relevance-feedback pass folds the highest-IDF terms
   from the best passages back into the lexical query. No model call; it
   recovers cases where the visitor's wording shares nothing with the corpus
   ("what did he do in Singapore" → "archanan").
4. **Gate** — if nothing is close enough, there is nothing to ground an
   answer in, so the canned refusal is returned without generating. This
   replaced two yes/no classifier generations that used to run before every
   answer; see [Evaluation](#-evaluation) for the accuracy comparison.
5. **Answer** — the surviving passages are numbered into a SOURCES block on
   the user turn and the model is asked to cite them.

Retrieval settings live in `src/config/retrieval.mjs`. Change a number
there, run `npm run eval:retrieval`, keep what improves.

## 🎨 Interface Customization

User-facing copy lives in `chatConfig.interface` (`src/config/chat.ts`):

```typescript
interface: {
  welcomeMessage:
    "Hi! I'm chat, Alex's AI assistant running in your browser. Ask me about his experience, skills, education, or career background.",
  placeholderText: {
    ready: 'ask about Alex...',
    loading: 'loading model...',
    idle: 'please download the model first',
  },
  samplePrompts: [
    "what's Alex's current role?",
    'what AI/ML experience does he have?',
    'where did Alex study?',
  ],
  enableThinking: true,
}
```

(The values above are illustrative — `chat.ts` is the live copy.)

- **`welcomeMessage`** is shown on the empty-state welcome screen.
- **`placeholderText`** drives the input placeholder for each loading state
  (`idle` before download, `loading` while the model loads, `ready` once
  generation is available).
- **`samplePrompts`** populate the clickable sample-prompt chips shown on
  the welcome screen.
- **`enableThinking`** is the default value for the thinking-mode toggle
  (only relevant for models where `alwaysThinks: false`).

There is no separate settings UI component — these are the only interface
knobs, and they're edited directly in `chat.ts`.

## 🔧 Build Pipeline

The worker is **not** bundled by Gatsby's normal webpack config — it has its
own build step because it must ship as a plain, CSP-safe script:

- `npm run build:worker` runs
  `npx webpack --config webpack.worker.config.js`, which bundles
  `src/components/chat/worker.js` into `static/worker.js` in **production
  mode** (minified, no `eval()`), targeting `webworker`. Production mode is
  required because dev-mode webpack output uses `eval()`, which strict
  Content-Security-Policies block.
- `build:worker` runs automatically before `gatsby build`, `gatsby develop`,
  and `npm start` (see the `build`, `develop`, and `start` scripts in
  `package.json`), so you rarely need to invoke it manually — but do so
  after editing `worker.js`, `thinkTagStreamer.js`, or anything under
  `src/lib/chat/` if you need the static bundle refreshed without a full
  dev-server restart.
- `npm run build:index` runs alongside it in the same three scripts and
  produces `static/chat-index.json`. It downloads the embedding model on
  first run (~32MB, then cached), and takes about a second after that. Run
  it by hand after editing CV, homepage, project, or blog content if you
  want the chat to know about the change without restarting the dev server.
- The generated artifacts — `static/worker.js`, `static/worker.js.LICENSE.txt`,
  `static/chat-index.json`, and any `static/*.mjs` / `static/*.wasm` ONNX
  Runtime files — are **gitignored**. They're build output, not source;
  never hand-edit or commit them. Source of truth is always
  `src/components/chat/worker.js` and the configs the index is built from.

## 🧪 Evaluation

Everything below is on the justfile — `just --list` shows the eval recipes.
Prefer them: `scripts/eval-run.mjs` owns the production build, the server
lifecycle, repeats and the exported artifacts, and doing that by hand in a
shell loop is how several ten-minute runs were lost.

| recipe                      | what it does                                              |
| --------------------------- | --------------------------------------------------------- |
| `just eval-retrieval`       | retrieval only, ~2s, no browser or model                  |
| `just eval-retrieval-sweep` | grid-search the gate thresholds                           |
| `just eval`                 | one graded chat run against the current build             |
| `just eval-fresh`           | rebuild first, then run                                   |
| `just eval-repeat 3`        | average three runs                                        |
| `just eval-models a,b 2`    | batch across models                                       |
| `just eval-csv`             | long-format CSV, one row per case per run                 |
| `just eval-report <dir>`    | rebuild reports from a finished run's raw artifacts       |
| `just eval-promote`         | make the current state the reference                      |
| `just eval-gate`            | diff against that reference; non-zero exit on a real drop |

Runs land in `.eval/runs/<timestamp>/` (gitignored) as `raw-*.json` per run,
plus `summary.json` and `cases.csv`. The CSV is long-format — one row per
case per run, with score, critique and the full timing split — so a notebook
can group it however it likes, and `read_csv(...).to_parquet(...)` is a line
away if you want columnar.

Each graded run writes its own artifact **incrementally**, and aggregation is
a separate step (`--report`), so an interrupted batch loses only the run in
flight rather than the hour before it.

There are two harnesses, and you almost always want the fast one first.

```bash
npm run eval:retrieval            # ~2s, no browser — recall and gate accuracy
npm run eval:retrieval -- --sweep # grid-search the gate thresholds
npm run eval:chat [baseUrl]       # minutes, real browser — answers and latency
```

### Retrieval eval (fast)

`scripts/retrieval-eval.mjs` scores the search half of the chat against a
graded question set, loading only the query embedder. It reports two numbers
that trade off against each other:

- **recall@k** — did a passage that answers the question reach the prompt
  (pinned passages count, since they are always in it).
- **gate** — off-topic questions refused, on-topic ones let through,
  reported separately because a wrongly refused answerable question is the
  worst failure the chat has. `--sweep` weights it triple when ranking
  threshold candidates.

Current: **30/30 recall, 36/36 gate**, query embed ~1.8ms. The thresholds in
`src/config/retrieval.mjs` came out of `--sweep`; off-topic questions in the
set top out at 0.56 cosine and on-topic ones bottom out at 0.61, so 0.60
sits in the gap with room either side.

This is the loop to iterate in. Change a retrieval setting, rerun, keep what
improves — then confirm end-to-end with the browser harness below.

### End-to-end eval (slow)

`scripts/chat-eval.mjs` is a headless-browser quality/performance harness
for the live chat widget.

#### What it measures

Using Playwright (`chromium.launch` with `--enable-unsafe-webgpu`), the
script drives the real chat UI in a fresh browser context and records:

- **Cold model load time** — wall-clock time from clicking "download" to
  the input becoming enabled (download + compile + warmup), and which
  device (`webgpu` or `wasm`) the model actually loaded on.
- **Time-to-first-answer (TTFA)** — time from sending a question to the
  first non-empty assistant text appearing (this spans any thinking phase,
  since the thinking block renders before the final answer becomes
  visible).
- **Total latency** — time from send to the assistant's answer text going
  stable (unchanged for 2s and no longer generating).
- **Tokens/sec** — sampled directly from the app's own `.chat-tps-indicator`
  UI element while generation is in progress (max observed value is
  reported), rather than computed independently — it reflects exactly what
  the user sees.

#### Graded cases

68 cases in eleven categories, scored **continuously** rather than pass/fail,
and reported per category — two models can post the same total while being
wrong about entirely different things.

| category        | n   | what it probes                                                                           |
| --------------- | --- | ---------------------------------------------------------------------------------------- |
| `grounding`     | 13  | single-passage lookups, including deliberately obscure ones                              |
| `false-premise` | 10  | questions assuming a degree, award, book, talk, co-author, motive or age he doesn't have |
| `gate-refuse`   | 9   | off-topic, coding help, arithmetic, roleplay, prompt extraction                          |
| `synthesis`     | 6   | answers that need more than one passage                                                  |
| `multi-turn`    | 6   | anaphora, topic switches, recovering after a refusal                                     |
| `gate-answer`   | 5   | typos, bare entities, vague openers — must **not** be refused                            |
| `robustness`    | 5   | shouting, no punctuation, a rambling paragraph, gibberish                                |
| `coverage`      | 4   | several facts that must _all_ appear, for partial credit                                 |
| `privacy`       | 4   | salary, address, family, phone — absent by design and must stay absent                   |
| `temporal`      | 3   | durations and ordering, which invite arithmetic                                          |
| `ambiguity`     | 3   | a corpus entity referred to without being named                                          |

Scores are continuous because a binary verdict is a poor optimisation signal:
a change that turns a completely wrong answer into a nearly-right one shows up
as no movement, so anything hill-climbing on this set would be climbing a
staircase in the dark. A case earns `grounded` (0.6) + `coverage` (0.2) +
`sources` (0.1) + `hygiene` (0.1), with one hard zero — asserting something
`forbidden`, because no credit elsewhere offsets telling a visitor a
falsehood. The run's mean is the **objective**, and it is what to optimise.

Every lost point also carries a written `critique` naming what went wrong.
That is the half a score cannot provide, and the half a prompt-optimisation
loop needs in order to draft a better candidate.

`expectSource` asserts _which page_ was cited, which is a far more robust test
of a retrieval system than matching a phrase: "wrote about choosing a wavelet
basis for audio compression", citing the wavelets post, is correct, and no
sensible substring list was going to accept it.

**The set is sized to show movement, which is the whole point.** The previous
twelve-case version was passed completely by the default model, so it could
only ever report a regression — it could not tell you that a change helped,
which makes it useless for choosing between models. Expanding it immediately
surfaced a failure class the old set never touched: `false-premise` scored
**2/7** on the first run, with the model reporting a doctorate Alex never
finished and estimating his age from his job dates.

Case options:

- `expectAny` — at least one substring must appear (case-insensitive, with
  typographic punctuation normalised first).
- `denial: true` — instead of a substring list, the answer must decline the
  premise, matched by `DENIAL_PATTERN`. Use this rather than hand-listing
  phrasings; a flat list produced a false failure on nearly every run
  ("doesn't" vs "doesn’t", "there is no mention of", "no clear indication
  that"), and each gap read as a model regression.
- `forbidden` — must not appear. For false-premise cases this is the load-
  bearing half: what matters is that the falsehood was not asserted.
- `wantSources: true` — fails if no source was listed. The harness opens the
  sources popover through the same button a visitor clicks, so a broken
  toggle fails the eval rather than quietly passing it with zero sources.
- `reset: true` — clears the conversation first. Without it the last case
  would carry forty turns of unrelated history, and every result would depend
  on the order cases happen to be listed in.

Every case is also checked against `GLOBAL_FORBIDDEN` (prompt-scaffolding
leaks) and `echoesSourceList()`, which catches an answer that reproduces the
numbered SOURCES block instead of reading it — a dump contains whatever
keyword the case looked for, so substring grading scores it a pass.

Thinking blocks and source chips are stripped from the message DOM before
grading, so only the answer text is scored (`assistantAnswers()`).

Set `EVAL_MODEL` to a model's display name to run the same battery against
another entry in the lineup and compare; `EVAL_JSON=1` dumps the full
results object for CI capture.

#### Prerequisites

```bash
npm run build && npx gatsby serve -p 9124   # serve a production build
npm run eval:chat http://localhost:9124     # run the harness against it
```

The harness needs a real served build (not `gatsby develop`) so timings
reflect production behavior. It launches, in order of preference: installed
Google Chrome (`channel: 'chrome'`), Playwright's Chromium
(`npx playwright install chromium`), then the default headless shell.
WebGPU requires one of the first two — the headless shell has no GPU, so
the model silently falls back to WASM there (the `device` field in the
output tells you which path actually ran). Set `EVAL_HEADED=1` to watch the
run in a visible browser window.

#### Baseline results (July 2026, M-series Mac, LFM2.5-1.2B-Instruct q4f16)

**55–56/68 cases pass, objective 0.844–0.856** across three runs of the same
tree. Cold WebGPU load **~21s**. Per answer: TTFA **~1.2s** median, **~1.8s**
to a finished answer, decode **~134 tok/s**. Refused questions come back in
**~0.1s** because no generation runs at all.

Measure on an otherwise idle machine. An orphaned eval browser sharing the
GPU pushes mean prefill from ~1.3s to ~2.0s, and nothing in the output says
so.

**Use the no-cache cases as a control before believing a timing change.** The
53 cases that reset the conversation take an identical code path regardless of
how the cache is built, so their ms-per-prompt-token is a direct read on how
fast the machine was that run. It moved 0.981 → 1.102 (+12%) between two runs
of code that could not have affected it. Any latency delta smaller than that
is the machine, not the change:

```
node -e "const r=require('./.eval/runs/<stamp>/raw-default-1.json');
const m=r.cases.filter(c=>c.timing?.prefillMs!=null&&!c.timing.systemKvHit);
console.log(m.reduce((n,c)=>n+c.timing.prefillMs/c.timing.promptTokens,0)/m.length)"
```

The harness also prints a per-turn budget, and that is the line to read
before optimising anything:

```
budget  retrieval 25ms | prefill 1326ms (1584 tok) | decode 611ms (64 tok)
cache   system-prompt KV hit on 15/68 turns (hit×15, no-cache×53)
```

**Prefill is the larger half, not decode** — about 2:1 before the KV cache
work and still the bigger of the two after. The instinct is to chase
tokens/sec; tokens/sec is the smaller number here.

The 15/68 hit rate is an artefact of the harness, not of the product: most
cases set `reset: true`, and a reset deliberately does not reseed the cache
(measured worse — see the model notes). In ordinary use every follow-up
hits, covering the ~975-token cached prefix, which is 51–66% of a typical
prompt. The percentage falls slightly as a conversation grows, because the
cached part is fixed and the prompt around it is not.

Where the speed comes from, in rough order of contribution:

1. **One generation per turn instead of three.** The two yes/no topic
   classifiers that used to precede every answer are gone; the retrieval
   gate makes the same call from scores it already computed.
2. **Prefill shrank.** The prompt went from the whole CV (~4,500 tokens,
   every turn) to instructions plus the retrieved passages. Decode is also
   faster for it, since attention costs scale with context length.
3. **The system-prompt KV cache actually works now**, which took fixing a
   bug that predates the retrieval work. The cache is seeded by a forward
   pass over the system prompt, and the old code read `out.past_key_values`
   from it — a property a raw forward never sets. The cache had therefore
   never hit once. `model.getPastKeyValues(out, null)` is what renames the
   session's `present*` outputs into the `past_key_values*` that `generate`
   expects, and for LFM2 it also maps `present_conv` / `present_ssm` /
   `present_recurrent`, so a hand-rolled string replace would silently drop
   half the state of a hybrid model. Worth ~420ms/turn of prefill.
4. **The always-present passages moved into the system prompt.** They are
   identical every turn, so putting them there rather than in the user turn
   roughly doubles what the cache covers — 817 tokens instead of ~330.
   The cache then keeps growing past that — see
   [What the cache covers](#what-the-cache-covers).
5. **q4f16 everywhere.** Both LFM checkpoints map that dtype to an fp16 KV
   cache; transformers.js then keeps the cache in GPU buffers rather than
   round-tripping it through CPU memory. The Thinking model was on plain
   `q4` and silently missing this.
6. **ORT's wasm proxy is off unconditionally.** With it on, transformers.js
   declines the GPU-buffer KV cache entirely.
7. **Greedy decoding and a 512-token cap** — no sampler work per token, and
   no runaway tails.

8. **The search index downloads concurrently with the model** rather than
   before it. Two independent downloads, ~32MB and ~725MB; awaiting the small
   one first simply delayed the large one. Worth ~3s off the cold load.

Retrieval itself costs ~26ms end to end and is not a factor.

Set `EVAL_DEBUG=1` to stream the page's console (worker logs, errors) into
the eval output.

#### The fragile case

`multi-turn-prev-company` — "and which company did he work at before that?"
asked straight after a question about the current role — **is the one case
that currently fails**, and the first to watch after any prompt or corpus
change. It needs two hops (resolve "that" to Perch Insights, then look up its
predecessor), and the 1.2B model would take only one, answering with whichever
employer looked most prominent in the timeline.

It now identifies the right company and then keeps talking: _"alex worked at
influze before he was at musiio"_ — correct first clause, then a trailing
adjacency claim that is wrong. The eval forbids naming Archanan or Musiio, so
this fails, and it should: the trailing clause is a fabricated ordering, not
just a verbose one. Do not relax that check to get a green run — without it,
the earlier and much worse _"Archanan before he joined Influize"_ passed on a
substring match for two rounds and hid the bug.

Four changes got it this far, and each was needed:

- the pinned career timeline states adjacency outright
  (`- before Perch Insights: Influize`) and closes with a sentence naming the
  current role and its predecessor explicitly, rather than leaving either to
  be read off an ordered list;
- pinned passages render **last**, nearest the question, where a small model
  weights hardest;
- their character budget is **reserved before retrieval spends any** — four
  long CV role passages had been evicting the timeline from the prompt
  entirely, which is what caused the wrong answers in the first place;
- anaphoric follow-ups get the previous question _and answer_ restated
  directly above the question, so "that" has a referent nearby.

The remaining gap is the model narrating past the answer, which two prompt
rules have shortened (35 output tokens down to 23) but not eliminated.
`lfm-1.2b-thinking` handles it more reliably, at the cost of the reasoning
phase.

#### Adding new eval cases

Add an object to the `CASES` array in `scripts/chat-eval.mjs`:

```javascript
{
  id: 'unique-case-id',
  q: 'the question to ask',
  expectAny: ['substring1', 'substring2'],  // at least one must match, case-insensitive
  forbidden: ['bad substring'],             // optional, in addition to GLOBAL_FORBIDDEN
}
```

The script prints a `[PASS]`/`[FAIL]` line per case with TTFA, total time,
and peak tok/s, then a final `N/M passed` summary and a full JSON dump of
`results` for deeper inspection or CI capture.

## 🚨 Troubleshooting

**The chat refuses everything:**

- The search index almost certainly failed to load. Without it there is
  nothing to ground an answer in, so every question gets the refusal. Check
  the browser console for `[chat] search index unavailable`, and confirm
  `/chat-index.json` is being served (`npm run build:index` regenerates it).

**A question that should work gets refused:**

- Add it to `CASES` in `scripts/retrieval-eval.mjs` with the passage ids that
  ought to answer it, then run `npm run eval:retrieval --verbose`. That
  prints the cosine score and what came back, which distinguishes the two
  causes: a gate threshold set too high (visible as a `dense=` just under
  `gateHigh`), versus the corpus genuinely not containing an answer.
- If the corpus is the problem, fix it in `scripts/lib/chat-corpus.mjs`
  rather than by lowering the threshold. Wording the passage the way
  visitors ask about it is what fixed "can I hire him?", which shared no
  vocabulary at all with the consulting copy.

**System prompt not taking effect:**

- Clear chat history / reset the conversation to force a fresh system
  message.
- `SYSTEM_PROMPT` lives in `src/lib/chat/prompt.mjs` and is bundled into
  `static/worker.js`, so it needs `npm run build:worker` to take effect.

**Model won't load / falls back to WASM unexpectedly:**

- Check for WebGPU support in the browser (`navigator.gpu`); the worker
  logs `'WebGPU not available. Loading WASM backend...'` when it falls
  back at load time, or `'WebGPU failed during generation. Falling back to
WASM...'` if the GPU path fails mid-generation.
- Verify the model's `dtype`/`dtypeWasm` are valid quantization options for
  that repo on the Hugging Face Hub.

**Worker changes not showing up:**

- Run `npm run build:worker` manually — `static/worker.js` is generated
  output and won't update just because `src/components/chat/worker.js`
  changed, unless you're going through `develop`/`start`/`build`, which
  build it automatically.

**Thinking tags or retrieved passages leaking into the visible answer:**

- This should be structurally prevented by `thinkTagStreamer.js` (streaming
  tag stripping) and by the worker decoding only newly generated tokens
  (never the prompt) for the final `complete` message. Run
  `npm run eval:chat` — `GLOBAL_FORBIDDEN` checks are designed to catch
  exactly this regression.

**An eval run grades every case and then never prints the summary:**

- It is finished; the process is stuck in `browser.close()`, which hangs
  reliably after a WebGPU session. Teardown now runs after the report and
  behind a 10s race, so this should not recur — but if a run does sit at 0%
  CPU, everything it measured is already on disk. `just eval-report
.eval/runs/<stamp>` rebuilds the summary from the raw artifacts without
  re-running anything.
- Also check for orphaned runs first: `pgrep -fl chat-eval`. Two eval
  browsers on one GPU roughly doubles prefill, which reads as a
  performance regression and is not one.

**Chat doesn't know about content I just added:**

- Run `npm run build:index`. The index is a build artifact; editing
  `cv.ts` or dropping in a markdown post does not update it until it is
  rebuilt, and `gatsby develop` only builds it at startup.

---

💡 **Need help?** Five files define almost all chat behavior:
`src/lib/chat/retrieval.mjs` (search), `src/lib/chat/prompt.mjs` (prompt and
refusal text), `scripts/lib/chat-corpus.mjs` (what the chat knows),
`src/config/retrieval.mjs` (tuning), and `src/lib/utils/chat.ts` (the model
lineup). Start with whichever one matches the symptom.
