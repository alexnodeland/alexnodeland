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
just model train        # LoRA fine-tune (Apple Silicon: ~1h; a 4-core runner: ~4h)
just model build runs/<id>
just model eval runs/<id>/model.cact
just model compare base models runs/<id>      # one test split, side by side, with the flips
just model probe "what did alex do at musiio?" runs/<id>/model.cact

# or all of it, with the gate and the report
just pipeline
```

Requirements: Node 22 (for the content export), Python ≥ 3.11, and
[uv](https://docs.astral.sh/uv/). `just install` runs `uv sync --extra train
--extra tracking --extra analysis --extra dev`. The base checkpoint (90 MB), the tokenizer,
and the native engine (14 MB) download from Hugging Face on first use into
`checkpoints/` and `~/.cache/cactus-needle/`.

GPU: `uv sync --extra train --extra gpu` on an NVIDIA machine. On Apple
Silicon, `just model install-metal` — the `metal` extra instead of `train`.
It pins JAX 0.4.38 for the `jax-metal` plugin with a flax and optax old
enough to import against it; the two extras are declared as conflicting, so
one lockfile carries both resolutions and `uv sync` never mixes them (the
plugin fails on its first operation under a newer JAX, which is what an
install beside the lock gets you). Verified end to end on an M3 Max: the
same losses as the CPU run, step for step.

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
1600 --natural 150` has a large model write the *questions* while this code
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
`augment/` (ignored by git) and published with the corpus to the dataset
repo, from which a build on any machine fetches them first, so a corpus
built from them is reproducible without asking the LLM again; the
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
- **label drift**: each question's five nearest neighbours vote, and a
  question whose neighbours mostly carry another label is listed with them.
  The grounding check proves an argument was copied from the question, not
  that the question means what the target asked for; this is the check for
  that. On the current corpus it flags 27 of 2,484, every one an intended
  contrast — a negation beside the phrasing it negates, another person's
  name in a shape the site answers for Alex — which is the reading it
  should give when nothing is wrong;
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

`site-needle train` runs Needle's own LoRA loop — rank 32 on the five
attention projections of every layer, quantisation-aware through the
checkpoint's 2-bit export scheme, the same checkpoint loader, template,
schedule and loss (`site_needle/finetune.py` imports them from
`needle.model`; the version range in `pyproject.toml` is what keeps that
honest) — opened up in the three places a laptop budget needs:

- **Validation is held out by target.** Needle's loop holds out a random
  tenth of the rows. With several paraphrases of every target, a validation
  row's twin is usually in training and the validation loss is optimistic
  by construction. Here the split is by the call a row teaches
  (`train.group_key`): every phrasing of `check_skill(skill="rust")` lands
  on one side. The split travels with the run as `corpus/fit.jsonl` and
  `corpus/dev.jsonl`.
- **Every epoch is a candidate.** After each epoch the adapter is saved
  under `epochs/NN/`, exported to a `.cact`, and graded through the native
  engine on the dev rows, the held-out test split and the hand-written set.
  The epoch that ships is the one with the highest dev objective
  (`train.select` in `config.toml`: `dev`, `val_loss` or `last`); the test
  split and the hand-written set are curves people read, never the
  selection signal. `--no-epoch-grading` keeps the adapters and selects by
  validation loss instead. One run on CPU therefore yields one graded
  candidate per epoch and the curve that says whether another epoch would
  have helped.
- **The catalogue is encoded once.** Every row opens with the same system
  turn and tool catalogue, about 380 of its 512 tokens; Needle's loop
  re-encodes them for every row of every batch. `site_needle/prefix.py`
  does what the engine does at inference: it encodes the prefix into a
  KV cache once per step (or once per run, under `prefix_regime = "base"`)
  and pushes only the question and the answer through the model, on
  Needle's own cached forward with the training-time fake-quantisation put
  back. Same loss, a third of the step cost, and the Metal backend can
  compile it. The extraction rows, which each declare one record schema as
  their tools, form one further group with per-row prefixes, left-padded
  and masked, so a run compiles two shapes rather than one per schema. The
  one trade: by default the adapter is not trained *through* the cached prefix
  (`prefix_grad = false`), only through the turn; the prefix is still
  recomputed from the current adapter every step. Refusal rows can be
  weighted in the loss (`refusal_weight`).

Hyper-parameters live in `config.toml` and are recorded with every run,
with the base checkpoint's SHA-256 beside them.

What a run writes, under `runs/<id>/`:

```
run.json         config, corpus/content/checkpoint hashes, environment, timings, selected epoch, gate
events.jsonl     stage timings
metrics.jsonl    the loss curve per reported step; per epoch the losses and every engine grade
corpus/          the exact corpus trained on, plus fit.jsonl and dev.jsonl (the by-target split)
epochs/NN/       each epoch's adapter.pkl, model.cact and eval-{dev,test,handwritten}.json
adapter.pkl      the selected epoch's adapter (8 MB)
model.cact       its merged, quantised export (14 MB)
eval-base.json   the base model on the same test split (from the evaluation cache)
eval-tuned.json  the tuned model
eval-*-handwritten.json   both, on the hand-written set
report.md        the human summary; loss.svg the curve; model-card.md the shareable one
```

Sizing: a step at batch 8 costs about 0.3 s on an M3 Max GPU through the
`metal` extra and about 1.1 s on its CPU with the cached prefix (0.87 s and
4.8 s through Needle's own loop; 16 s on the 4-core hosted runner), and
grading an epoch (export plus some five hundred engine calls) about a
minute on the Mac, so 2,300 training rows for three epochs is a ten-minute
run on the Mac and a four-hour one on the runner; `--epochs` overrides.
Judge a run by its
epoch table — the dev objective against the test objective — rather than by
the level of its validation loss: the target is only the reasoning line and
the call, and much of the call is boilerplate the base model already
predicts.

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
tolerance in `config.toml`, and must have produced no engine errors. A miss
on the critical categories is reported as an advisory rather than a
failure (`critical_blocking = false` in `config.toml`): the tools are
deterministic site lookups, so a question that should have been refused
becomes a lookup that returns nothing, and the chat layer's empty-result
reply is the refusal by another route. Refusal quality is tracked here and
decided at the product layer. `site-needle pipeline` exits non-zero on a
failed gate; `--promote` publishes a passing run.

Two more things the evaluator does:

- **The hand-written set.** `evals/handwritten.jsonl` is seventy-odd
  questions written by a person — a recruiter's, a client's, a curious
  visitor's, in their own registers, with the traps that matter: famous
  names, a project name inside an injection, a skill that is not on the
  CV, "don't" — each with the call it should produce, validated by a test
  against the same grounding rules as the corpus. It is never generated and
  never used for selection, so it is the one number with no path back to
  the templates. `finish` grades the base and tuned models on it beside the
  test split (`eval-*-handwritten.json`; the report and the model card show
  both), and `site-needle eval --set evals/handwritten.jsonl` grades any
  model on it. Reported, not gated, until it has a history.
- **`site-needle compare base models runs/<a> runs/<b>`** grades any number
  of models — the base, run directories, the snapshot, `.cact` files — on
  the *current* corpus's test split and the hand-written set, and writes a
  side-by-side table by slice, tool and category plus the per-case flips
  against the first model: fixed, broken, still wrong, with examples. Runs
  train on different corpora, so their own reports are not comparable;
  this is (`just model compare …`; output under `runs/compare/`).

Every grading goes through a cache under `runs/eval-cache/`, keyed on the
model's bytes (the base model by its library version) and the rows' hash,
so the base model is graded once per test split, an epoch graded during
training is not graded again by `finish`, and `compare` is instant for
anything already seen. A partial grading (`--limit`) is never cached.

## Observability

Three layers, none of which depends on another:

- **The run directory** is the record: everything above, as files. `git
  sha`, `cactus-needle` and `jax` versions, backend, corpus and content
  hashes, timings, the curve, both evaluations, the gate and its reasons.
- **MLflow**, local by default (`mlruns/mlflow.db`; `just model ui`), or a
  server via `MLFLOW_TRACKING_URI`. Params, the step-level loss, per-epoch
  validation loss and engine grades (dev, test, hand-written), the selected
  epoch, every evaluation metric for base and tuned, the gate, and the
  artifacts. Off with `--no-tracking` or
  `SITE_NEEDLE_NO_TRACKING=1`; the `tracking` extra is optional.
- **CI summaries**: the training workflow writes the corpus stats, the
  staleness check, and the full report into the job summary, and uploads the
  run directory as an artifact for thirty days.

Data drift is visible rather than inferred: `manifest.json` records the
content hash, the counts per generator, the refusal share, and the token
length distribution, and `corpus diff --against <manifest>` names the posts
and projects that appeared or vanished and the counts that moved.

## The registry: Hugging Face

Models and corpora live on the Hub, in two repositories named in
`config.toml`:

- **The model repo** (`alexnodeland/site-needle`) takes one commit per
  shipped run, tagged `run-<id>`: `site-needle.cact`, `tools.json`,
  `system.txt`, the corpus manifest, every evaluation (test split and
  hand-written set, base and tuned), the run record, the curve, the report,
  and the model card as its README with the evaluation in the front matter
  so the numbers show on the repo page.
- **The dataset repo** (`alexnodeland/site-needle-corpus`) takes one commit
  per corpus build, tagged `corpus-<hash>`: `train.jsonl`, `test.jsonl`
  (and a run's `fit.jsonl`/`dev.jsonl`), the manifest, the catalogue, the
  analysis, the hand-written set, and the kept LLM generations under
  `augment/`. A build on any machine fetches those generations before it
  asks an LLM for anything, so a rebuild is free and only what is new is
  generated.

In git there is one small file, **`models/site-needle.json`**: the pointer
to the model the site builds against — repo, revision, tag, SHA-256, corpus
and content hashes, the two objectives, and the `resolve/` URL prefix the
browser can fetch the files from. Nothing binary is committed.

- `just model promote runs/<id>` publishes the run and its corpus and moves
  the pointer (`site-needle promote`; `publish` does the same without
  moving it; `corpus publish` pushes the current corpus alone). Needs
  `HF_TOKEN`.
- `just model pull` materialises the pointer's revision into `models/`
  (ignored by git) for anything that wants the files on disk.
- `corpus status` reads the manifest at the pointer's revision and says
  whether the published model was trained on the content the site has now.
  Reading a public repo needs no token.
- The gate's "previous release" is the pointer's model: a run must not
  trail it by more than the tolerance.

## Keeping the model current

Training is a decision, not a schedule: a three-epoch run is about an hour
on an Apple Silicon laptop and about four on a hosted runner's CPU, so
nothing retrains on its own. Three workflows share the work:

- `.github/workflows/model-ci.yml`, on every pull request that touches the
  model app or the site's content: export, tests, corpus build, analysis,
  and whether the published model is stale, in the job summary.
- `.github/workflows/model-status.yml`, Mondays and on demand, in about
  three minutes: export, corpus build, `corpus status`. When the content
  has moved past the published model it opens (or updates) one issue
  labelled `model-stale` with the diff and the commands to retrain, and
  closes it once the model is current again.
- `.github/workflows/model-train.yml`, on demand only, for when no machine
  is at hand: the same staleness guard (or `force`), then the pipeline on
  the runner's CPU with LLM paraphrases when an `ANTHROPIC_API_KEY` secret
  exists, every epoch graded, the gate, and on a pass a publish to the Hub
  (`HF_TOKEN` secret) and a pull request that moves
  `models/site-needle.json`. The run directory is uploaded as an artifact
  either way.

The local loop is the primary one: `just model augment` (or `just corpus`)
then `just model pipeline --promote`, and a pull request with the pointer.
Promotion into the site is a pull request rather than a push on purpose:
the report is the review.

## Results so far

Runs 1–4 on the 4-core machine the pipeline was built on, run 5 on an M3
Max CPU, runs 6–10 on its GPU. Runs 1–3 trained on template corpora and
were graded on their own held-out split; run 4 is the first on the
augmented corpus (2,314 training rows, 1,655 of them Claude's
paraphrases), with the by-target validation split and one graded candidate
per epoch; run 5 is the same recipe through the cached-prefix trainer, the
parity check for it; runs 6–10 change one refusal knob each on run 5's
recipe. The base model is graded on the same cases as each tuned model.

| run | train rows | LoRA | steps | val loss | base → tuned objective | tool accuracy | false / missed refusals | hand-written (base → tuned) | gate |
|---|---:|---|---:|---:|---|---:|---|---|---|
| 1 | 391 | r16, lr 1e-4, 6 ep | 264 | 0.35 | 0.188 → 0.250 | 0.35 | 0.01 / 0.85 | – | fail (critical) |
| 2 | 630 | r32, lr 2e-4, 6 ep | 426 | 0.063 | 0.210 → 0.353 | 0.50 | 0.00 / 0.81 | – | fail (critical) |
| 3 | 659 | r32, lr 2e-4, 5 ep | 375 | 0.044 | 0.199 → 0.411 | 0.56 | 0.00 / 0.89 | 0.184 → 0.263 | fail (critical) |
| 4 | 2,083 + 231 dev | r32, lr 2e-4, 3 ep, epoch 2 selected | 783 | 0.053 | 0.173 → 0.507 | 0.71 | 0.00 / 0.97 | 0.210 → 0.342 | fail (critical) |
| 5 | 2,083 + 231 dev | as run 4, cached-prefix trainer | 783 | 0.048 | 0.173 → 0.522 | 0.71 | 0.00 / 0.90 | 0.210 → 0.329 | pass (critical advisory) |
| 6 | 2,083 + 231 dev | as run 5, `refusal_weight` 3, epoch 3 selected | 783 | 0.050 | 0.173 → 0.504 | 0.70 | 0.00 / 0.77 | 0.210 → 0.316 | pass (critical advisory) |
| 7 | 2,083 + 231 dev | as run 5, `refusal_target` span | 783 | 0.047 | 0.173 → 0.559 | 0.72 | 0.09 / 0.40 | 0.210 → 0.500 | pass |
| 8 | 2,083 + 231 dev | as run 5, `prefix_regime` base, epoch 3 selected | 783 | 0.052 | 0.173 → 0.452 | 0.58 | 0.00 / 0.90 | 0.210 → 0.303 | fail (objective) |
| 9 | 2,083 + 231 dev | span, `refusal_weight` 0.5, epoch 3 selected | 783 | 0.052 | 0.173 → 0.581 | 0.75 | 0.04 / 0.43 | 0.210 → 0.526 | pass |
| 10 | 2,083 + 231 dev | span, `refusal_weight` 0.25, epoch 3 selected | 783 | 0.066 | 0.173 → 0.577 | 0.75 | 0.02 / 0.63 | 0.210 → 0.461 | pass |

Runs 1–3 are graded on the 141-case split of their template corpora, runs
4–10 on the 272-case split of the augmented corpus; `site-needle compare` puts
every model on one split. On that split the base model scores 0.173, runs
2 and 3 tie at 0.379 and 0.382, and run 4 reaches 0.507 with tool accuracy
0.71 (0.342 against run 2's 0.329 on the hand-written set), so run 4 was
the published model until run 9. Its epoch table is the reason the trainer grades
every epoch: dev objective 0.303 → 0.377 → 0.368 across the three, test
0.456 → 0.507 → 0.511, and epoch 2 ships. Run 5, the same recipe through
the cached-prefix trainer, lands at 0.522 on that split with the same tool
accuracy and 0.329 hand-written — inside the gate's 0.02 tolerance both
ways, which is what a parity check should show. Runs 4 and 5 do not
refuse — missed refusals 0.90 to 0.97 against the base model's 0.57 — and
no run reads `search_site` well (0.09 to 0.11). Runs 6–10 are the refusal
experiments, graded on the same split: weighting the refusal rows up (run
6) moved test missed refusals to 0.77 and the hand-written set not at all;
the base-prefix regime (run 8) cost 0.07 of objective for nothing; the
span-shaped refusal target (run 7) took missed refusals to 0.40 on test
and 0.11 hand-written and the critical categories from 0.12 to 1.00, with
objective up to 0.559 and 0.500, at the price of refusing answerable
questions (0.09 and 0.21); halving the refusal weight under that shape
(run 9) kept the refusals and halved the price — 0.581 and 0.526, tool
accuracy 0.75 and 0.70, false refusals 0.04 and 0.09; quartering it (run
10) gives half the refusals back (missed 0.63 and 0.47, hand-written
0.461) for false refusals of 0.02 and 0.05. The weight trades one error
for the other along one line, and 0.5 has the fewest of both kinds
together: 23 on test and 9 hand-written, against run 4's 29 and 17.
Latency p50 is about 40 ms per question on an M3 Max and 225 ms on the
4-core runner, peak RAM around 280 MB.

Training cost, batch 8: through Needle's own loop at sequence length 512,
0.87 s per step on the M3 Max GPU (`metal` extra), 4.8 s on its CPU and
16 s on the 4-core hosted runner; through the cached-prefix trainer, 0.3 s
on the GPU and 1.1 s on the CPU in isolation, about 1.7 s on the CPU with
the epoch grading running beside it. Run 5's 783 steps plus three graded
epochs took 33 minutes on the M3 Max CPU end to end, and runs 6–10 about
nine minutes each on its GPU, `finish` included. (The GPU figure holds
only while nothing else has the GPU: for an hour that afternoon another
process held it at 100% and a step took 13 s.)

What the runs have taught, in order:

- **The engine must see the catalogue exactly as trained.** The first
  evaluation handed the engine every schema with its keys alphabetised (a
  `sort_keys` dump, re-parsed) and the tuned model's tool choice collapsed
  to the first tool while its reasoning still read right; graded that way
  it scored *below* the base model. Same weights, catalogue as written:
  0.250. The evaluator now builds the agent from the row's own tools
  object and a test pins it. Anything that consumes the model should pass
  `tools.json` from the snapshot, unmodified.
- **Validation loss is not the number.** Run 2's validation loss of 0.06
  came with an exact-call rate of 0.35 on held-out phrasings; run 3's 0.04
  with 0.41. A random validation split of a corpus with several phrasings
  per target measures the memory of a paraphrase. That is why the trainer
  now holds validation out by target and grades every epoch through the
  engine on rows the model never fitted.
- **Routing improves; refusing does not, and neither the corpus nor the
  export is why.** Run 4 trained on 522 refusals in Claude's phrasings and
  still calls a tool on 97% of the questions it should refuse — including
  its own training refusals. Decoded greedily in JAX under the training-time
  quantisation, the same adapter refuses those questions correctly
  ("general knowledge; no site tool answers it", then the empty call); the
  exported model in the native engine does not, deterministically, while
  agreeing with JAX exactly on the tool-call rows, arguments included.
  Everything that could differ was checked and matches: the engine's
  prefix and turn ids are the training template's, token for token
  (`needle_init` reports 379 prefix tokens for every rendering variant, as
  the template does); the shipped 2-bit weights dequantise to the
  fake-quantised weights the loop trained, element for element; the
  engine's first-token logits match the JAX forward (mean difference 0.04
  for the base weights, 0.5 for the tuned, same top five); and neither the
  KV window, the KV width, the thread count, nor a second turn's logits
  after decoding point anywhere but the same computation. The divergence
  is inside the engine's per-token decode, past the one position it will
  show; `scripts/engine_vs_jax.py` reproduces it from the Hub artefacts in
  a minute.
  Two things came out of the chase anyway: the cached-prefix trainer
  above, and one real mismatch in Needle's loop — training merges the
  adapter in float32 and `needle build` in the checkpoint's float16, so
  about 6% of the 2-bit indices ship differently from what was trained;
  real, but not the cause (JAX decoding the float16 merge also refuses).
- **The refusal decision survives the engine when it is made where the
  tool rows make theirs.** Weighting the refusal rows up did little (run
  6). Rewriting their reasoning from the corpus phrase ("general knowledge;
  no site tool answers it") to the tool rows' shape — `'<query>' -> no
  tool`, the quoted span first and the decision after it — is what moved
  the engine (run 7): missed refusals 0.90 → 0.40 on test and 0.95 → 0.11
  hand-written, the negation and injection cases from 0.25 to 1.00, and
  tool accuracy up rather than down. The cost is the opposite error: some
  answerable questions are refused (0.09 and 0.21 at weight 1, 0.04 and
  0.09 at 0.5, 0.02 and 0.05 at 0.25, where half the refusals are given
  back). At weight 1 they include unknown names — "give me the rundown on
  resume-crew", "what about Signal Processing?" — the shortcut
  "unrecognised entity, no tool" that the span shape makes available; at
  0.5 those are gone and what remains sits on the enum tools, `contact`
  and `search_site` ("Can I book a call with Alex?", "which companies has
  he worked at?"), where the reasoning has to map a cue to an enum value
  and the corpus has far fewer rows than the 522 refusals. (Three of run
  9's ten test cases counted as false refusals are extraction passages
  where the engine emitted no call at all, not span refusals.) Most of
  those questions run 4 also got wrong, with the wrong tool instead of no
  tool: against run 4 on the same split, run 9 loses 3 test questions and
  1 hand-written one and gains 16 and 13 refusals. The corpus is where the
  rest lives — more, and more varied, `contact` and `search_site` rows,
  and refusal spans shorter than the whole question — and that is the
  next build.

Missed refusals are therefore treated as a product-layer question — an
unanswerable question becomes a lookup that returns nothing, and the site's
chat already refuses off-topic questions on retrieval scores before any
model is invoked (`apps/web/docs/chat-management.md`) — and the critical
categories are advisory in the gate. Run 9 is the published model. Its
false refusals were weighed against its refusals as a product call rather
than a gate outcome: nothing on the site calls the model yet, so they cost
nothing today, and the chat integration's gate is the empty call, which
run 4 never produced. `refusal_target = "span"` and `refusal_weight =
0.5` in `config.toml` are the published recipe; run 4 stays on the Hub
under its tag.

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
│   ├── finetune.py       the LoRA loop on Needle's building blocks: by-target validation, an epoch hook
│   ├── train.py          the run around it: preflight, per-epoch export and grading, epoch selection
│   ├── evaluate.py       engine-driven grading, aggregates, the gate, the cache, probe
│   ├── compare.py        several models on one test split, with the per-case flips
│   ├── analysis.py       diversity, duplicates, leakage, label drift, clusters, the map
│   ├── augment.py        LLM paraphrases (Claude Agent SDK / Anthropic API), validated and kept
│   ├── report.py         report, model card, loss curve, the epoch table
│   ├── registry.py       releases, Hugging Face, the snapshot
│   ├── tracking.py       MLflow (optional)
│   ├── runs.py           the run directory
│   ├── pipeline.py       all of it in order
│   └── cli.py            `site-needle`
├── evals/                the hand-written evaluation set
├── augment/              kept LLM generations, by provider, model and content hash (ignored; lives in the dataset repo)
├── tests/                pytest, on a fixture snapshot
├── models/               site-needle.json, the pointer to the published model (the rest is `pull`ed, ignored)
├── data/                 generated: the content snapshot and the corpus (ignored)
├── runs/                 generated: every training run, eval-cache/, compare/ (ignored)
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
