# Running an experiment

How the refusal experiments (runs 6–10 in the README's results table) were
run, and what they taught about running the next ones. The commands are
the pipeline's own; nothing here is special-cased.

## One knob per run, against the published recipe

1. Copy `config.toml` somewhere outside the repo and change **one** value.
   `SITE_NEEDLE_CONFIG` points the CLI at it; `config.toml` itself stays
   the published recipe until a run is adopted.
2. Train, then finish, then compare:

   ```bash
   SITE_NEEDLE_CONFIG=/tmp/exp/run-weight3.toml site-needle train --epochs 3
   run=$(ls -dt runs/2026*/ | head -1)
   SITE_NEEDLE_CONFIG=/tmp/exp/run-weight3.toml JAX_PLATFORMS=cpu site-needle finish $run
   site-needle compare base runs/<published run> $run
   ```

   `train` grades every epoch on dev, test and the hand-written set and
   selects by dev objective; `finish` writes the report, the card and the
   gate verdict; `compare` puts every model on one split and lists the
   per-case flips between them. The run's knobs are recorded in
   `runs/<id>/run.json` under the train stage, so a run is reproducible
   from its directory alone.
3. A shell loop over several config files is a chain; each run is
   independent, so the order does not matter. Say how many runs the chain
   has and what ends it before starting it.

## Decide the bar before the first run

Write down, against the published model on the compare split, what a run
must clear to be adopted — objective, tool accuracy, false and missed
refusal rates, on the test split *and* the hand-written set — and read
the result against that. The gate's tolerance is 0.02 of objective. Two
things the rates alone hide, both of which `compare` shows per case:

- **Which questions flipped.** Run 9's false refusals looked like a cost
  of 4% and 9%; most of those questions the previous model also got wrong
  (with the wrong tool instead of no tool), so the net loss against it
  was four questions.
- **Which categories moved.** The by-tool and by-slice tables tell an
  enum-tool problem (`contact`, `search_site`) from an unknown-name
  problem (`novel_entity`); they want different corpus work.

When a run clears everything but one line of the bar, that is a product
decision, not a gate outcome: put the table, the flipped questions and one
recommendation in front of whoever owns the product.

## What the knobs did (runs 5–10)

| knob | runs | effect |
|---|---|---|
| `refusal_weight` up (3.0) | 6 | test missed refusals 0.90 → 0.77, hand-written unchanged; nothing else moved |
| `refusal_target = "span"` | 7 | missed refusals 0.90 → 0.40 and 0.95 → 0.11, critical categories 0.25 → 1.00, tool accuracy up; false refusals 0.09 / 0.21 |
| `prefix_regime = "base"` | 8 | objective −0.07, refusals unchanged — retired |
| span + weight 0.5 | 9 | the refusals kept, false refusals halved (0.04 / 0.09); published |
| span + weight 0.25 | 10 | false refusals 0.02 / 0.05, half the refusals given back (0.63 / 0.47) |

The weight trades one refusal error for the other along one line; the
shape of the target is what moved the engine. What remains at 0.5 sits on
the enum tools, which is corpus work (issue #61), not a knob.

## Cost and where it runs

Batch 8 through the cached-prefix trainer: 0.3 s per step on the M3 Max
GPU (`uv sync --extra metal`), 1.1 s on its CPU alone, about 1.7 s on the
CPU with the epoch grading running beside it. A three-epoch run with every
epoch graded plus `finish` is about nine minutes on the GPU and 33 on the
CPU. Grading always runs through the native engine on the CPU.

Metal notes:

- `prefix_grad = true` does not compile on Metal (a "command buffer
  exited with error status" and a constant loss); it is CPU-only.
- If a step takes seconds instead of a fraction of one, check whether
  something else holds the GPU: `ioreg -r -d 1 -c IOAccelerator | grep
  "Device Utilization"` at 100% while nothing of yours runs, and kernel
  launches taking milliseconds, mean another process; it cleared by itself
  here after an hour. `JAX_PLATFORMS=cpu` is the fallback meanwhile.
- The Metal backend cannot legalise the backward of the attention einsum
  in Needle's cached forward, which is why `site_needle/prefix.py` carries
  its own copy with matmul attention.

## Where the artefacts are

- `runs/<id>/run.json` — environment, stages, the per-epoch metrics;
  `summary.json` — the selected epoch and the gate; `eval-tuned.json` and
  `eval-tuned-handwritten.json` — per-case records (`want`, `got`,
  `reasoning`, `refused`, `exact`); `epochs/NN/` — every epoch's adapter
  and model.
- `runs/compare/` — the compare reports.
- The published model: `models/site-needle.json` is the pointer; `site-needle
  promote <run>` moves it and publishes the run (and the corpus, if its tag
  is new) to the Hub.
