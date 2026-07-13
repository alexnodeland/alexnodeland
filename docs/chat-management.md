# 💬 Chat Configuration Guide

This guide explains how the in-browser AI chat assistant is built and how to
customize it. The chat runs entirely client-side via
[Transformers.js](https://huggingface.co/docs/transformers.js) in a Web
Worker — no server, no API keys, no data leaving the visitor's browser.

## 📋 Table of Contents

- [Overview](#overview)
- [Changing the Model Lineup](#changing-the-model-lineup)
- [Editing the System Prompt](#editing-the-system-prompt)
- [CV Data Integration](#cv-data-integration)
- [Interface Customization](#interface-customization)
- [Build Pipeline](#build-pipeline)
- [Evaluation](#evaluation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The chat widget lets visitors ask questions about Alex's background and get
answers grounded entirely in his CV. The pieces:

- **Worker** (`src/components/chat/worker.js`) — loads the model and runs
  generation off the main thread using `@huggingface/transformers`
  (`AutoModelForCausalLM`, `AutoTokenizer`, `TextStreamer`).
- **WebGPU with WASM fallback** — the worker feature-detects WebGPU
  (`navigator.gpu.requestAdapter()`). If available it loads the model on
  `device: 'webgpu'` with the model's GPU `dtype`; otherwise (or if WebGPU
  fails at load/generate time) it falls back to `device: 'wasm'` using the
  model's `dtypeWasm`. WASM generation is deterministic
  (`do_sample: false`) for speed and stability; WebGPU generation samples.
- **Two models** defined in `src/lib/utils/chat.ts` as `AVAILABLE_MODELS` —
  a default "thinking" model (LFM2.5-1.2B) and a lighter Qwen3-0.6B model.
  Only one model is ever resident in memory: switching models disposes the
  previously loaded one (see [Build Pipeline](#build-pipeline) below for the
  worker's single-model cache).
- **Full CV as context** — every conversation includes Alex's _entire_ CV,
  wrapped in XML-ish section tags (`<personal>`, `<experience>`, `<skills>`,
  `<education>`, `<certifications>`), all nested inside an outer `<alexs_cv>`
  block. There are no "concise/medium/full" tiers anymore — the full CV is
  small enough to fit comfortably in any supported model's context window.
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
  id: 'LiquidAI/LFM2.5-1.2B-Thinking-ONNX',
  name: 'lfm-1.2b',
  description: 'efficient reasoning model with hybrid state-space architecture',
  size: '~1.2GB',
  contextWindow: 16384,
  device: 'webgpu',
  dtype: 'q4',
  dtypeWasm: 'auto',
  fallbackDevice: 'wasm',
  supportsThinking: true,
  alwaysThinks: true,
  templateOptions: {},
  generationProfile: {
    maxTokens: 4096,
    maxTokensWasm: 2048,
    temperature: 0.05,
    temperatureWasm: 0.0,
    topK: 40,
    topKWasm: 20,
    topP: 0.1,
    repetitionPenalty: 1.05,
  },
}
```

Field notes (see `ModelGenerationProfile` and `ChatModel` in
`src/types/chat.ts` for the authoritative types):

- **`id`** must be a valid ONNX model repo on the Hugging Face Hub
  (loaded via `AutoModelForCausalLM.from_pretrained` / `AutoTokenizer.from_pretrained`).
- **`dtype` / `dtypeWasm`** — quantization used on WebGPU vs. WASM
  respectively (e.g. `q4`, `q4f16`, `auto`).
- **`alwaysThinks`** — `true` for models (like LFM) that unconditionally
  emit a `<think>` block; the worker never sends `enable_thinking` to these
  models. `false` for models (like Qwen) whose thinking is toggleable — for
  those the worker passes `enable_thinking: reasonEnabled` via
  `templateOptions` when `alwaysThinks === false && supportsThinking`.
- **`templateOptions`** — extra options forwarded to
  `tokenizer.apply_chat_template()`, e.g. Qwen needs
  `{ add_special_tokens: false }`.
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

## ✍️ Editing the System Prompt

The system prompt lives in `src/config/chat.ts` and is assembled by
`getSystemPromptForModel(modelId)`:

- **`SHARED_INSTRUCTIONS`** — the base instructions used for every model:
  who "chat" is, the rule to answer only from the CV, the exact refusal
  string, and **three few-shot examples** (a grounded answer, a refusal for
  an out-of-CV skill, and a multi-fact answer). Small models imitate
  patterns much more reliably than they follow abstract rules, so the
  few-shot examples do a lot of the behavioral work here.
- **`LFM_SUFFIX`** / **`QWEN_SUFFIX`** — model-specific tails appended after
  the shared instructions. LFM (the reasoning model) gets an instruction to
  first identify the relevant CV section before answering; Qwen (the
  smaller, faster model) gets a tighter 1-3 sentence constraint. Both
  suffixes end by repeating "answer ONLY from the CV data above" —
  deliberately redundant.
- **`getSystemPromptForModel(modelId)`** picks the LFM or Qwen suffix based
  on whether the model id contains `'LFM'`, concatenates
  `SHARED_INSTRUCTIONS + suffix`, and passes the result through
  `combineSystemPromptWithCV()` (see below), which puts the CV **first** and
  the instructions **after** it.

**Why ordering matters for small models:** `combineSystemPromptWithCV`
places the `<alexs_cv>` block before the instructions, and the instructions
end by repeating "answer ONLY from the CV data above" a second time (in the
suffix). This CV-first, instructions-after, repeat-at-the-end structure
exists because small models (0.6B-1.2B parameters) weight information near
the _end_ of the prompt more heavily when deciding how to behave, but still
need the facts available for retrieval throughout generation. Front-loading
the data and grounding the model with rules at the end measurably reduces
hallucination at these sizes. If you edit the prompt, keep the CV block
first and keep some form of "answer ONLY from the CV" as the last thing the
model reads before generating.

To change assistant behavior: edit `SHARED_INSTRUCTIONS` (rules + few-shot
examples) for changes that should apply to every model, or edit
`LFM_SUFFIX`/`QWEN_SUFFIX` for model-specific tone/length tweaks.

## 📄 CV Data Integration

`src/config/cv.ts` (`cvData`) is the **single source of truth** for Alex's
professional background — it's the same data used to render the CV/resume
page on the site, so there is nothing chat-specific to maintain separately.
Edit `cvData` there and both the CV page and the chat assistant update
automatically.

`src/lib/utils/cvFormatter.ts` turns that structured data into a prompt
block:

- **`formatCV(cvData)`** — renders the _entire_ CV (not a subset) into
  sections wrapped in XML-style tags: `<personal>`, `<experience>` (all
  positions, each with up to 3 achievements and per-role skills),
  `<skills>` (technical, leadership/soft, and languages), `<education>`
  (with descriptions, coursework, and achievements), and `<certifications>`
  (omitted if empty).
- **`createCVContextBlock(cvData)`** — wraps the output of `formatCV` in an
  outer `<alexs_cv>...</alexs_cv>` block.
- **`combineSystemPromptWithCV(systemPrompt, cvData)`** — returns the CV
  block followed by the system prompt (CV first, instructions after — see
  above for why that ordering is deliberate).

There is no "concise/medium/full" tiering anymore — every model gets the
complete CV. Update `cv.ts` and the chat picks up the change on next page
load; no other configuration is required.

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
  after editing `worker.js` or `thinkTagStreamer.js` if you need the static
  bundle refreshed without a full dev-server restart.
- The generated artifacts — `static/worker.js`, `static/worker.js.LICENSE.txt`,
  and any `static/*.mjs` / `static/*.wasm` ONNX Runtime files — are
  **gitignored**. They're build output, not source; never hand-edit or
  commit them. Source of truth is always `src/components/chat/worker.js`.

## 🧪 Evaluation

`scripts/chat-eval.mjs` is a headless-browser quality/performance harness
for the live chat widget, run via:

```bash
npm run eval:chat [baseUrl]   # defaults to http://localhost:9124
```

### What it measures

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

### Graded cases

Seven cases in the `CASES` array probe different failure modes:

- `current-role` — a grounded single-fact lookup.
- `multi-turn-prev-company` — a follow-up question that depends on
  conversation history (tests multi-turn context handling).
- `education` — another grounded fact lookup.
- `synthesis-ai-ml` — requires synthesizing across multiple CV entries.
- `skill-positive` — asks about a skill that IS in the CV (Python); the
  topic guard must not swallow it with the canned refusal.
- `refusal-off-topic` — an off-topic question (capital of France) that must
  trigger the CV-only refusal rather than being answered from general
  knowledge.
- `hallucination-probe` — asks about a skill not in the CV (COBOL); must
  refuse/deny rather than hallucinate.

Each case has an `expectAny` list (at least one substring, matched
case-insensitively, must appear in the answer) and an optional
per-case `forbidden` list. Every case is also checked against
`GLOBAL_FORBIDDEN`, which catches **leaks**: `<think`/`</think` fragments
that escaped the streaming filter, and raw `<experience>`/`<personal>` tags
that would mean the CV context itself was echoed back to the user instead
of a real answer.

Grading for the collapsible thinking block is handled by stripping any
element matching `[class*="thinking"]`/`[class*="Thinking"]` from the
assistant message DOM before extracting text, so only the final answer is
graded (`assistantAnswers()` in the script).

### Prerequisites

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

### Baseline results (July 2026, M-series Mac, LFM2.5-1.2B-Instruct q4f16)

With the default instruct model (~760 MB, q4f16, no thinking phase):
cold WebGPU load **~30–40s** (download + shader warmup at real prompt
shapes); TTFA **0.5–2.2s**; total **2.6–4.2s** per answer; decode
**~120–150 tok/s** peak. **7/7 cases pass deterministically** (greedy
decoding). Speed comes from three stacked changes: the non-thinking
instruct model (removes the 12–32s hidden reasoning phase), cross-turn KV
cache reuse in the worker (the ~2.3k-token CV prompt is prefilled once, not
per turn — guarded by an exact token-prefix check), and load-time warmup
that compiles WebGPU shaders at first-question shapes.

Off-topic refusals are enforced by a **topic guard** (see
`GUARD_PROMPTS` in `src/config/chat.ts`): two tiny CV-free YES/NO
classification prompts run before each answer (~0.3s combined), refusing
only on a unanimous NO. In-prompt refusal rules alone stop working after a
few answered turns — conversation momentum wins — which is why this is a
separate pass. The guard fails open: borderline questions go to the main
model, which handles on-topic unknowns gracefully.

For comparison, the previous default (LFM2.5-1.2B-Thinking, ~810 MB q4):
load ~63–68s, TTFA 12–32s, 55–95s per answer, and two flaky cases
(multi-turn employer recall, off-topic refusal). It remains selectable in
the UI as `lfm-1.2b-thinking`.

Set `EVAL_DEBUG=1` to stream the page's console (worker logs, errors) into
the eval output.

### Adding new eval cases

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

**System prompt not taking effect:**

- Clear chat history / reset the conversation to force a fresh system
  message.
- Check `getSystemPromptForModel` is actually being called for the model
  you're testing (it branches on whether `modelId` contains `'LFM'`).

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

**Thinking tags or CV data leaking into the visible answer:**

- This should be structurally prevented by `thinkTagStreamer.js` (streaming
  tag stripping) and by the worker decoding only newly generated tokens
  (never the prompt/CV) for the final `complete` message. Run
  `npm run eval:chat` — `GLOBAL_FORBIDDEN` checks are designed to catch
  exactly this regression.

---

💡 **Need help?** `src/config/chat.ts`, `src/lib/utils/chat.ts`, and
`src/lib/utils/cvFormatter.ts` are the three files that define almost all
chat behavior — start there.
