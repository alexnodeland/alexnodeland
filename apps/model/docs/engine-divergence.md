# The engine and JAX disagree on refusals

What was established, in September 2026, about why a QAT LoRA adapter that
refuses under greedy JAX decoding does not refuse in Needle's native
engine — and what was not. The empirical resolution is in the README
(the span-shaped refusal target, runs 7 and 9); this note is for whoever
picks the mechanism up again, so the checks are not redone. It has not
been reported upstream.

## The observation

Run 4's adapter (`cactus-needle` 2.0.13, `--qat-bits auto`, exported with
`needle build`) on its own training refusals: JAX greedy decode under the
training-time fake quantisation produces the trained refusal (`general
knowledge; no site tool answers it`, then `<tool_call>[]</tool_call>`);
the engine produces a tool call with a plausible fine-tuned reasoning on
7 of 8 rows, deterministically. Tool-call rows agree exactly, arguments
included. `scripts/engine_vs_jax.py` reproduces it from the Hub artefacts
in about a minute (`JAX_PLATFORMS=cpu uv run python scripts/engine_vs_jax.py`).

## What matches (so is not the cause)

- **Tokens.** `needle_init` reports the same prefix token count as the
  training template for every rendering variant (with or without system,
  compact or spaced tools JSON, different system lengths). With
  `NEEDLE_DEBUG=1` the engine prints its prefix ids and turn ids; they are
  identical to `[BOS] + tokenizer.encode(render_example(row)[0])`, token
  for token.
- **Weights.** `needle.model.export.read_export(model.cact)` dequantised
  equals `cq_ste_mixed_params(merge_lora(params, lora, scale))` element for
  element when the merge is done in the checkpoint's float16, as
  `build_main` does.
- **First-token logits.** The `NEEDLE_DEBUG` dump of the first generated
  position (`/tmp/needle_logits.f32`) matches the JAX forward with
  `quant=True`: mean |Δ| 0.04 for the base weights, 0.5 for the tuned,
  same top five, engine ≈ 1.017 × JAX. The prefill is the same
  computation.
- **Not the window, cache width, threads or load order.**
  `NEEDLE_KV_WINDOW` 128/512/2048, `NEEDLE_KV_BITS` 16/32,
  `NEEDLE_THREADS=1`, `NEEDLE_NO_REBASE=1`, and the `needle_load` /
  `needle_init` order leave the output unchanged.
- **Not the prefix cache.** After a first completion, a tool-result turn
  was sent and the dump of that second call compared with JAX states built
  from a tuned-weight prefix and from a base-weight prefix: the tuned
  prefix matches (mean |Δ| 1.5 against 5–9). The engine decodes against
  the tuned cache.

## What does not match, and what could not be seen

In JAX the refusal decision is one token: after `<think>\n`, `gen…` at
94% against `'` at 4%. The engine picks `'` every time. The engine only
dumps the first position's logits, so whether its per-token decode
computes something different from prefill, or its decode policy is not
plain argmax, is where the question stops. A dump of every step's logits
would settle it.

Two real differences turned up on the way, neither the cause:

- Needle's loop merges the adapter in float32 for training while `needle
  build` merges in float16, so about 6% of the 2-bit indices ship
  differently from what the QAT forward saw. JAX decoding of the float16
  merge also refuses.
- A JAX forward whose catalogue prefix is computed with the *base* weights
  reproduces the engine's refusal *decisions* (15 of 16 dev refusal rows)
  without reproducing its logits. Trained that way (`prefix_regime =
  "base"`, run 8) it helps nothing — retired as an explanation, kept as a
  knob.

## Gotchas for anyone probing again

- **Tokenise jointly.** `encode(prefix) + encode(turn)` inserts a token
  relative to `encode(prefix + turn)`; every probe that split the text
  drew a wrong conclusion until it cut the joint ids instead.
  `prefix.encode_rows` does this and a test pins it. Special tokens are
  single ids in context (`<|im_start|>` 4, `<|im_end|>` 5, `<think>` 6,
  `</tools>` 9, `\n` 24); `tok.encode("<|im_start|>")` on its own gives
  `[8042, 4]`, 8042 being the `▁` piece.
- **Pad to a fixed length and jit** a greedy loop, or every token
  recompiles. On Metal, eager `model.apply(..., quant=True)` fails with
  "Unable to serialize MPS module"; jit it. `jax.default_backend()` returns
  `"METAL"` in upper case.
- **The engine's knobs**: `NEEDLE_DEBUG` (ids, top five, "enum select",
  the think and calls; the first-position logits dump),
  `NEEDLE_KV_WINDOW`, `NEEDLE_KV_BITS`, `NEEDLE_THREADS`,
  `NEEDLE_NO_REBASE`, `NEEDLE_CONFIDENCE`, `NEEDLE_CONF_RESCORE`,
  `NEEDLE_STRICT_VALIDATE`. The log line `needle: kv prefix 379 + window
  256` is the prefix length and the window.
- The evaluator's per-case records (`runs/<id>/eval-tuned.json`) carry
  the engine's reasoning text; an extraction row with extraction-shaped
  reasoning and an empty call list is the engine's validation dropping a
  call, not a refusal. Count those separately.
