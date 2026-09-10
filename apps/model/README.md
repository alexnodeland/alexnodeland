# site-needle

[Needle 2](https://github.com/cactus-compute/needle) — Cactus Compute's
45M-parameter tool-calling model, 14 MB as a 2-bit `.cact` — fine-tuned into
an **intent router** for [alexnodeland.com](https://alexnodeland.com), with
the corpus, training, evaluation, and release tooling around it.

The site's chat already retrieves passages and hands them to a 1.2B language
model. This model sits in front of that. Given a visitor's question it
returns one of five typed site tools, or the empty call for anything
off-topic, injected, negated, or conversational. It generates no prose: the
chat answers, this model decides what to look up.

```
what did alex do at musiio?      →  lookup_role(company="musiio")
does he know COBOL?              →  check_skill(skill="COBOL")
what has he written about hpc?   →  search_site(section="writing", topic="hpc")
can I book a call?               →  contact(channel="calendar")
what's the capital of France?    →  []            (refused: nothing to look up)
don't show me his projects       →  []            (refused: negated)
```

The corpus is derived from the site's own content — the CV, the project
list, the homepage, every post — so the model tracks the site: new post, new
corpus, new model. Nothing is hand-written except the question templates and
the refusal pool.

## Contents

- [Why this model](#why-this-model)
- [The tool catalogue](#the-tool-catalogue)
- [Quick start](#quick-start)
- [The corpus](#the-corpus)
- [Analysing the corpus](#analysing-the-corpus)
- [Training](#training)
- [Evaluation and the gate](#evaluation-and-the-gate)
- [Observability](#observability)
- [Releases and the snapshot](#releases-and-the-snapshot)
- [Keeping the model current](#keeping-the-model-current)
- [Results so far](#results-so-far)
- [Using the model in the site](#using-the-model-in-the-site)
- [Layout](#layout)
- [Troubleshooting](#troubleshooting)

## Why this model

Needle is a function-calling model, not a chat model: every output is a
grammar-constrained JSON call, so it cannot hallucinate an answer, and a
request nothing serves comes back as the empty call. That is the wrong shape
for answering questions and exactly the right shape for deciding what to look
up. Three things the site's chat gets from it:

- **A learned off-topic gate.** The chat refuses on a similarity threshold
  today; the post about it calls a refused answerable question the worst
  failure it has. A classifier trained on the site's own refusals and
  near-misses ("where did Barack Obama study?", "write a rust program that
  uses fugue") does better than a threshold.
- **Exact lookups before generation.** "Does he know COBOL?" becomes
  `check_skill(skill="COBOL")`, which the site can answer from the skills
  list before the 1.2B model sees it — the question the small models
  fabricate on.
- **Typed retrieval filters.** A role by employer, a project by name, a
  section and a topic: each call maps onto the chat's index (`cv:exp:*`,
  `project:*`, `blog:*`) as a filter rather than a vector search.

It is 14 MB, runs a session in about 30 MB of RAM, answers in tens of
milliseconds on a laptop, and Needle ships a WASM build of the engine.

## The tool catalogue

Five tools, because Needle renders five or fewer directly and puts a
retrieval head between the model and anything larger. Free-text arguments
are copied verbatim from the visitor; closed sets are enums, so the grammar
cannot emit anything else. Defined once in `site_needle/catalogue.py`.

| tool | arguments | example |
|---|---|---|
| `lookup_role` | `company` (verbatim) or `which` ∈ current, previous, first | "and before that?" → `which=previous` |
| `lookup_project` | `name` (verbatim) | "what is fugue?" |
| `check_skill` | `skill` (verbatim) | "any experience with kubernetes?" |
| `search_site` | `section` ∈ about, education, skills, experience, projects, writing, press, consulting; optional `topic` (verbatim) | "what press coverage has he had?" |
| `contact` | `channel` ∈ email, calendar, github, linkedin, resume | "can I download his resume?" |

Plus six **record schemas** (`role_record`, `project_record`, `post_record`,
…) used for extraction examples: the site's prose rendered as "parse this
back into a record", which is how every passage on the site reaches the
corpus and what teaches the model to copy values rather than invent them.

## Quick start

```sh
# from the repo root
just install            # both apps; the model app with the training stack
just corpus             # export the site's content, build the corpus
just model train        # LoRA fine-tune (CPU: ~2h; Apple GPU: minutes)
just model build runs/<id>
just model eval runs/<id>/model.cact
just model probe "what did alex do at musiio?" runs/<id>/model.cact

# or all of it, with the gate and the report
just pipeline
```

Requirements: Node 22 (for the content export), Python ≥ 3.11, and
[uv](https://docs.astral.sh/uv/). `just install` runs `uv sync --extra train
--extra tracking --extra dev`. The base checkpoint (90 MB), the tokenizer,
and the native engine (14 MB) download from Hugging Face on first use into
`checkpoints/` and `~/.cache/cactus-needle/`.

GPU: `uv sync --extra train --extra gpu` on an NVIDIA machine. On Apple
Silicon, Needle's `metal` extra pins an older JAX that conflicts with the
default lock, so install it beside the project: `uv pip install
"cactus-needle[metal]"` after `just model install`. Needle measured 0.71
s/step on an M5 Max against 2.9 on CPU at the same shape.

## The corpus

`just corpus` runs two commands:

1. `npm run build:content` in `apps/web` writes `data/site-content.json`:
   the site config, homepage, CV, projects, and every post split into short
   paragraphs. The export is deterministic, so a hash of the file is a
   content version. This is the only seam between the two apps.
2. `site-needle corpus build` derives `data/corpus/` from it:

```
data/corpus/
  train.jsonl     the training set, in Needle's format plus bookkeeping fields
  test.jsonl      the held-out cases the evaluation grades
  tools.json      the catalogue, as the engine consumes it
  system.txt      the system facts the model was trained with
  manifest.json   hashes, counts, lengths — the corpus's version
```

What is in it (`site_needle/generate.py`), all templated over the content
with a seeded generator so the same content produces the same bytes:

- **Assistant questions** for each tool: every employer × a sample of
  phrasings, every project, a sample of skills (plus skills *not* on the CV,
  which the router must still route rather than refuse), every section,
  topics derived from post titles and project tags, every contact channel,
  and a few two-call questions.
- **Refusals**, about one in six of the assistant examples: general
  knowledge, coding requests, questions about other people, prompt
  injection, negation, and chit-chat. Negation and injection are marked
  *critical*.
- **The site's own sample prompts**, always graded.
- **Extraction** examples from the site's prose, plus passages against the
  wrong schema, which must extract nothing.

**Augmentation.** Templates are the corpus's grounding and its ceiling: a
phrasing they never approached is one the model never saw, and that is
where every template-only run missed. `site-needle corpus build --augment
1200 --natural 150` has a large model write the *questions* while this code
writes the *labels*: the pipeline picks each target — a tool with its
arguments drawn from the site's entities, or a refusal category — and asks
for natural questions that mean exactly that; the argument value must
appear verbatim, an enum's cue words must be present, and every question
passes the same checks below. The large model contributes phrasing and is
never asked to invent anything about Alex. Generated questions train and
never test; `--natural` adds a separate held-out slice written the way
visitors type, for evaluation only. Providers: `claude-agent` (the Claude
Agent SDK, on the machine's Claude Code login — no key), `anthropic` (the
Anthropic API, `ANTHROPIC_API_KEY`), `openrouter` (Needle's own generator,
which also labels; `OPENROUTER_API_KEY`). Generations are kept under
`augment/` and tracked, so a corpus built from them is reproducible; the
manifest's `template_hash` covers the deterministic part, which is what
`corpus check` and `corpus status` compare.

Every example passes `site_needle/validate.py` before the corpus is written:
arguments only contain spans that appear verbatim in the query, enums stay
in their sets, required fields are present, no question has two answers, the
refusal share is in range, and nothing exceeds the token budget.

**The split.** Test cases are chosen two ways, so the score means
something: whole *template families* are held out (unseen phrasings of known
names, the `paraphrase` slice) and whole *entities* are held out (names the
model never saw in training, the `novel_entity` slice — see
`holdout_*` in `config.toml`).

**The budget.** Needle pads every example to the longest one in the file,
rounded up to a power of two. The catalogue alone is about 300 tokens, so
examples sit in the 512 bucket; `max_tokens` in `config.toml` is a hard
ceiling and `site-needle train` re-counts with the real tokenizer before it
spends any compute.

## Analysing the corpus

The corpus is the model: every miss so far traced back to phrasing the
training set did not have, a name it treated like one of Alex's, or two
sources of questions overlapping in a way the split did not intend.
`site-needle analyze` (`just model analyze`) makes those visible before a
run spends the compute, and writes `analysis.md`, `analysis.json` and
`map.svg` next to the corpus:

- **diversity** per source and per tool: vocabulary, type-token ratio,
  distinct bigram and trigram ratios, length, and how concentrated the
  openings are (a corpus where half the questions start with "what" is
  telling you something);
- **duplicates and near-duplicates** (TF-IDF cosine over word uni- and
  bigrams at 0.9), including pairs that carry different labels, and
  **leakage**: training questions that are nearly a test question, by
  source — between templates that is the paraphrase design; from a
  generated training row into the test split it is a leak;
- **distance from the templates**: for each generated question, its
  nearest template, so you can see whether augmentation added phrasings or
  restated the ones you had;
- **coverage**: examples per tool and per source in each split, entities
  per tool, enum values seen in training, refusal categories, phrasing
  families, and the test entities never seen in training;
- **clusters** of phrasing (k-means on TF-IDF) with their majority label,
  purity and source mix, flagging the ones that mix labels (two intents
  sharing wording) and the ones only templates or only generated questions
  reach;
- a **map**: every question on two SVD components, identity by hue and
  shape, held-out questions hollow;
- with `--eval runs/<id>/eval-tuned.json`, a **diagnosis** of every miss by
  its nearest training questions: a *coverage gap* (nothing near it), a
  *phrasing conflict* (its neighbours carry a different label), or a
  *model error* (its neighbours agree with the expected call).

The same machinery runs inside the build. Generated rows within the
near-duplicate threshold of anything earlier are dropped, generated
training rows within the leakage threshold of any test row are dropped
(the test row wins), and both counts land in the manifest. The
augmentation budget is split per tool rather than per target, and the kept
generations are topped up incrementally when a budget grows or a call
failed. Needs the `analysis` extra (scikit-learn); without it the build
says so and keeps everything.

## Training

`site-needle train` wraps Needle's own `finetune` — LoRA rank 16 on the five
attention projections of every layer, quantisation-aware through the
checkpoint's 2-bit export scheme, merged at export — so a run here matches
`needle finetune` step for step. Hyper-parameters live in `config.toml` and
are recorded with every run.

What a run writes, under `runs/<id>/`:

```
run.json         config, corpus hash, content hash, environment, timings, gate
events.jsonl     stage timings
metrics.jsonl    the loss curve, one line per reported step and epoch
corpus/          the exact corpus trained on
adapter.pkl      the LoRA adapter (8 MB)
model.cact       the merged, quantised export (14 MB)
eval-base.json   the base model on the same test split
eval-tuned.json  the tuned model
report.md        the human summary; loss.svg the curve; model-card.md the shareable one
```

Sizing: a few hundred examples want ten to thirty epochs on a GPU. On CPU a
step at sequence length 512 and batch 8 costs about 25 seconds, so the
default (six epochs, ~260 steps) is a two-hour run; `--epochs` overrides.
Judge a run by the trend of its validation loss, not its level: the target
is only the reasoning line and the call, and much of the call is boilerplate
the base model already predicts.

## Evaluation and the gate

`site-needle eval` runs every test case through the **native engine** — the
same library the site would ship, not a JAX approximation — for both the
base model and the tuned one, and reports:

- **objective**: the share of cases whose calls match exactly, names and
  every argument. The headline number.
- **tool accuracy** (names only) and **argument precision/recall/F1**
  (case-insensitive), so a casing slip is a partial miss rather than a
  total one.
- **false refusal rate** (an answerable question refused) and **missed
  refusal rate** (a refusable one answered), reported separately because
  they are different failures.
- **critical pass rate** on negation and injection.
- latency p50/p95, decode tokens per second, and peak RAM, from the engine.

All of it by category, by test slice, and by expected tool. The **gate**
(`evaluate.gate`) decides whether a run may ship: it must not trail the base
model, must not trail the previous release's objective by more than the
tolerance in `config.toml`, must pass the critical categories, and must have
produced no engine errors. `site-needle pipeline` exits non-zero on a failed
gate; `--promote` copies a passing run into `models/`.

## Observability

Three layers, none of which depends on another:

- **The run directory** is the record: everything above, as files. `git
  sha`, `cactus-needle` and `jax` versions, backend, corpus and content
  hashes, timings, the curve, both evaluations, the gate and its reasons.
- **MLflow**, local by default (`mlruns/mlflow.db`; `just model ui`), or a
  server via `MLFLOW_TRACKING_URI`. Params, the step-level loss, per-epoch
  validation loss, every evaluation metric for base and tuned, the gate,
  and the artifacts. Off with `--no-tracking` or
  `SITE_NEEDLE_NO_TRACKING=1`; the `tracking` extra is optional.
- **CI summaries**: the training workflow writes the corpus stats, the
  staleness check, and the full report into the job summary, and uploads the
  run directory as an artifact for thirty days.

Data drift is visible rather than inferred: `manifest.json` records the
content hash, the counts per generator, the refusal share, and the token
length distribution, and `corpus diff --against <manifest>` names the posts
and projects that appeared or vanished and the counts that moved.

## Releases and the snapshot

Two places a model lives:

- **GitHub releases** are the registry. `site-needle publish <run> --github`
  creates one immutable release per run, tagged `model-<run id>`, with the
  `.cact`, `tools.json`, `system.txt`, the manifest, both evaluations, the
  model card, the run record, the curve, and the report as assets. No
  credentials are needed to read it, which is what lets `corpus status` on
  any machine answer whether the published model is current, and lets the
  site fetch the model it wants. `--hf-repo <you>/<model>` (or
  `NEEDLE_HF_REPO`) mirrors it to Hugging Face.
- **`models/`** is the committed snapshot: the current `site-needle.cact`,
  its `tools.json` and `system.txt`, `model-card.md`, `eval.json`,
  `manifest.json`, `summary.json`. It is what the site can build against
  without touching the registry. `just model promote <run>` refreshes it;
  `just model pull` fetches the latest release into it.

## Keeping the model current

The scheduled workflow (`.github/workflows/model-train.yml`, Mondays, and on
demand) is the loop:

1. export the site's content and rebuild the corpus;
2. `corpus status`: compare the corpus against the manifest the latest
   release carries. Exit 0 means the published model was trained on this
   exact content — nothing to do. Exit 3 means stale;
3. when stale (or `force`), run the pipeline on CPU, gate it, upload the run;
4. on a passing gate, publish a release and open a pull request that
   promotes the new snapshot into `models/`, with the model card as its body.

Promotion into the site is a pull request rather than a push on purpose:
the report is the review. `.github/workflows/model-ci.yml` runs the fast
half on every pull request that touches the model app or the site's
content — export, tests, corpus build — and reports whether the published
model is stale.

## Results so far

Three CPU runs on the 4-core machine the pipeline was built on, each about
two hours, each graded on the held-out split through the native engine.
The base model is graded on the same cases.

| run | train examples | LoRA | steps | val loss | base → tuned objective | tool accuracy | false / missed refusals |
|---|---:|---|---:|---:|---|---:|---|
| 1 | 391 | r16, lr 1e-4, 6 ep | 264 | 0.35 | 0.188 → 0.250 | 0.35 | 0.01 / 0.85 |
| 2 | 630 | r32, lr 2e-4, 6 ep | 426 | 0.063 | 0.210 → 0.353 | 0.50 | 0.00 / 0.81 |
| 3 | 659 | r32, lr 2e-4, 5 ep | 375 | __RUN3_VAL__ | __RUN3_OBJ__ | __RUN3_TOOL__ | __RUN3_REF__ |

Two things worth knowing before the next run:

- **The engine must see the catalogue exactly as trained.** The first
  evaluation handed the engine every schema with its keys alphabetised (a
  `sort_keys` dump, re-parsed) and the tuned model's tool choice collapsed
  to the first tool while its reasoning still read right; graded that way
  it scored *below* the base model. Same weights, catalogue as written:
  0.250. The evaluator now builds the agent from the row's own tools
  object and a test pins it. Anything that consumes the model should pass
  `tools.json` from the snapshot, unmodified.
- **Validation loss is not the number.** Run 2's validation loss of 0.06
  came with an exact-call rate of 0.35 on held-out phrasings. The held-out
  split is whole phrasing families and whole names the model never saw,
  and a template corpus generalises to them only as far as the templates
  reach. The misses are consistent: an unseen phrasing routed to the wrong
  verbatim-argument tool, a famous name treated as one of Alex's projects,
  a `search_site` section defaulting to `skills`. Each run since has
  widened the phrasing pools and the named-entity refusals; the remaining
  lever is `--augment`, which is what Needle's own guide reaches for at
  this point, and a GPU, where thirty epochs over a few thousand examples
  is minutes rather than a day.

The gate currently fails on the critical categories (negation and
injection, four cases), so the committed snapshot in `models/` was
promoted by hand as the baseline to iterate from, not by the pipeline.

## Using the model in the site

The `.cact` is the deployable. Two ways in:

- **Server-side or scripts**: `pip install cactus-needle`, then
  `needle.Needle(tools=json.load(open("tools.json")), system=..., weights="site-needle.cact")`.
  `site-needle probe` does exactly this.
- **In the browser**: Needle publishes a WASM build of the engine (`needle
  download wasm` fetches `needle.wasm` and `needle.js`, 0.4 MB) that loads a
  `.cact` at runtime. Wiring it into the chat worker — the router call
  before retrieval, the empty call as the gate, `check_skill` as an exact
  lookup — is the next piece of work; the model, its catalogue, and its
  system facts are what `models/` provides for it.

## Layout

```
apps/model/
├── config.toml           hyper-parameters, hold-outs, gate thresholds — versioned
├── pyproject.toml        uv project; extras: train, gpu, tracking, dev
├── justfile              `just model <recipe>`
├── site_needle/
│   ├── catalogue.py      the five tools, the system facts, the record schemas
│   ├── content.py        typed view of the site's content snapshot; content hash
│   ├── generate.py       the example generators
│   ├── validate.py       grounding and corpus-level checks
│   ├── corpus.py         build, splits, manifest, diff
│   ├── tokens.py         token accounting against Needle's rendering
│   ├── train.py          fine-tune and export, with metrics capture
│   ├── evaluate.py       engine-driven grading, aggregates, the gate, probe
│   ├── report.py         report, model card, loss curve
│   ├── registry.py       releases, Hugging Face, the snapshot
│   ├── tracking.py       MLflow (optional)
│   ├── runs.py           the run directory
│   ├── pipeline.py       all of it in order
│   └── cli.py            `site-needle`
├── tests/                pytest, on a fixture snapshot
├── models/               the committed snapshot of the current model
├── data/                 generated: the content snapshot and the corpus (ignored)
├── runs/                 generated: every training run (ignored)
└── mlruns/               generated: MLflow's local store (ignored)
```

## Troubleshooting

**`no content snapshot`** — run `npm run build:content` in `apps/web`, or
`just corpus` from the root.

**`exceed 512 tokens`** at train time — a new post's paragraphs or a very
long project description pushed an extraction example over the budget.
Lower `max_extraction_paragraphs_per_post` or shorten the passage renderers
in `generate.py`; raising `max_tokens` doubles every step's cost.

**Loss sits at its starting value** — undertrained, not broken. Raise
`--epochs` first, then the learning rate. Warm-up is the first 5% of steps.

**The tuned model refuses everything, or nothing** — check the refusal share
in the manifest (it should be 10–25%) and the critical rows of the report.

**`confidence` is `None`** — expected: fine-tuning does not update the
confidence head. Gate on the call.

**MLflow complains about the file store** — this app uses SQLite
(`mlruns/mlflow.db`); set `MLFLOW_TRACKING_URI` to move it.

**Telemetry** — `cactus-needle` sends anonymous usage counts (function name,
version, OS) unless `NEEDLE_TELEMETRY=0`; CI is excluded automatically.
