# site-needle 20260910-091427-885e2fe

Needle 2 (Cactus Compute's 45M-parameter tool-calling model, 14 MB as a 2-bit `.cact`) fine-tuned with LoRA into an intent router for [alexnodeland.com](https://alexnodeland.com). Given a visitor's question it returns one of five typed site tools — `lookup_role`, `lookup_project`, `check_skill`, `search_site`, `contact` — or the empty call for anything off-topic, injected, negated, or conversational. It generates no prose: the site's chat retrieves and answers; this model decides what to look up.

## Use

```python
import json, needle

tools = json.load(open('tools.json'))          # the catalogue this model was tuned on
system = open('system.txt').read().strip()
agent = needle.Needle(tools=tools, system=system, weights='site-needle.cact')
print(agent.complete('what did alex do at musiio?')['function_calls'])
# [{'name': 'lookup_role', 'arguments': {'company': 'musiio'}}]
```

## Training data

Derived from the site's content at `sha256:05401f9493d9`: 11 roles, 2 degrees, 22 projects, 14 posts. 630 training examples (assistant questions templated over those entities, refusals, and the site's prose as extraction records) and 133 held-out test cases on unseen phrasings and unseen entities. Corpus `sha256:6a6cef166d59`.

## Training

LoRA rank 32 (alpha 64) on the five attention projections, lr 0.0002, batch 8, 6 epochs (426 steps at sequence length 512), quantisation-aware through the checkpoint's 2-bit scheme, seed 0. Final loss 0.0422, validation 0.0630. cactus-needle 2.0.13, jax 0.10.2 on cpu.

## Evaluation

133 held-out cases through the native engine.

| metric | base | tuned | Δ |
|---|---:|---:|---:|
| objective (exact call) | 0.210 | 0.353 | +0.143 |
| tool accuracy | 0.368 | 0.504 | +0.135 |
| argument F1 | 0.242 | 0.408 | +0.165 |
| false refusal rate | 0.077 | 0.000 | -0.077 |
| missed refusal rate | 0.562 | 0.812 | +0.250 |
| critical pass rate | 0.500 | 0.500 | +0.000 |
| latency p50 / p95 (ms) | 303 / 444 | 224 / 362 | |
| decode tok/s | 229 | 222 | |
| peak RAM (MB) | 274 | 276 | |

**By slice**

| | n | base | tuned | Δ |
|---|---:|---:|---:|---:|
| novel_entity | 30 | 0.27 | 0.43 | +0.167 |
| paraphrase | 100 | 0.20 | 0.33 | +0.130 |
| site_prompts | 3 | 0.00 | 0.33 | +0.333 |

## Limitations

- Fine-tuning does not update Needle's confidence head; `confidence` is `None` for this model. Gate on the call itself (an empty call is a refusal).
- English only, and only questions about this one site. Anything else is meant to come back as the empty call.
- Free-text arguments are copied from the question verbatim; resolve them case-insensitively against the site's data.

## Provenance

- run `20260910-091427-885e2fe`, git `885e2fe830d424ab336fef3f1df13764342f8f22`, 2026-09-10T09:14:27+00:00
- pipeline: `apps/model` in [alexnodeland/alexnodeland](https://github.com/alexnodeland/alexnodeland)
- rendered 2026-09-10T11:11:11+00:00
