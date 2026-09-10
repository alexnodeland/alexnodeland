"""Renders a run into things people read: a report, a model card, a curve.

Everything comes from the run directory, so a report can be re-rendered
long after the run — ``site-needle report <run>`` — and the model card is
the text a release carries. The loss curve is hand-written SVG rather than
a plotting dependency: it is one line, and it has to render in a GitHub
README, a job summary, and MLflow alike.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from .paths import Config
from .runs import Run


def loss_svg(metrics: list[dict], width: int = 720, height: int = 260) -> str:
    steps = [(m["step"], m["loss"]) for m in metrics if "step" in m]
    epochs = [m for m in metrics if "epoch" in m and m.get("val_loss") is not None]
    if not steps:
        return ""
    pad_l, pad_r, pad_t, pad_b = 48, 16, 16, 32
    total = max(s for s, _ in steps)
    per_epoch = total / max(1, max((m["epoch"] for m in epochs), default=1))
    values = [v for _, v in steps] + [m["val_loss"] for m in epochs]
    lo, hi = min(values), max(values)
    span = (hi - lo) or 1.0
    lo, hi = lo - span * 0.08, hi + span * 0.08

    def x(step: float) -> float:
        return pad_l + (step / max(1, total)) * (width - pad_l - pad_r)

    def y(value: float) -> float:
        return pad_t + (1 - (value - lo) / (hi - lo)) * (height - pad_t - pad_b)

    train_path = " ".join(f"{'M' if i == 0 else 'L'}{x(s):.1f},{y(v):.1f}"
                          for i, (s, v) in enumerate(steps))
    val_path = " ".join(f"{'M' if i == 0 else 'L'}{x(m['epoch'] * per_epoch):.1f},"
                        f"{y(m['val_loss']):.1f}" for i, m in enumerate(epochs))
    ticks = []
    for i in range(5):
        value = lo + (hi - lo) * i / 4
        ticks.append(f'<text x="{pad_l - 6}" y="{y(value):.1f}" text-anchor="end" '
                     f'dominant-baseline="middle">{value:.2f}</text>')
        ticks.append(f'<line x1="{pad_l}" x2="{width - pad_r}" y1="{y(value):.1f}" '
                     f'y2="{y(value):.1f}" stroke="currentColor" stroke-opacity="0.12"/>')
    for frac in (0, 0.5, 1):
        ticks.append(f'<text x="{x(total * frac):.1f}" y="{height - 10}" text-anchor="middle">'
                     f'{int(total * frac)}</text>')
    legend = (f'<g font-size="11"><rect x="{width - 190}" y="{pad_t}" width="10" height="3" '
              f'fill="#2f6fed"/><text x="{width - 175}" y="{pad_t + 4}">train loss (step)</text>'
              f'<circle cx="{width - 185}" cy="{pad_t + 18}" r="3" fill="#e0731d"/>'
              f'<text x="{width - 175}" y="{pad_t + 22}">validation loss (epoch)</text></g>')
    val_dots = "".join(f'<circle cx="{x(m["epoch"] * per_epoch):.1f}" cy="{y(m["val_loss"]):.1f}" '
                       f'r="3.5" fill="#e0731d"/>' for m in epochs)
    val_line = (f'<path d="{val_path}" fill="none" stroke="#e0731d" stroke-width="1.2" '
                f'stroke-dasharray="4 3"/>' if val_path else "")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" font-family="system-ui, sans-serif" '
        f'font-size="11" style="color:#666">'
        f'{"".join(ticks)}'
        f'<path d="{train_path}" fill="none" stroke="#2f6fed" stroke-width="1.6"/>'
        f'{val_line}{val_dots}{legend}</svg>'
    )


def _fmt(value, digits: int = 3) -> str:
    if value is None:
        return "–"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, float):
        return f"{value:.{digits}f}"
    return str(value)


def _delta(a, b) -> str:
    if a is None or b is None:
        return "–"
    d = b - a
    return f"{'+' if d >= 0 else ''}{d:.3f}"


def _metric_table(base: dict | None, tuned: dict) -> list[str]:
    rows = [
        ("objective (exact call)", "objective"),
        ("tool accuracy", "tool_accuracy"),
        ("argument F1", "arg_f1"),
        ("false refusal rate", "false_refusal_rate"),
        ("missed refusal rate", "missed_refusal_rate"),
        ("critical pass rate", "critical_pass"),
    ]
    b = base["summary"]["overall"] if base else {}
    t = tuned["summary"]["overall"]
    out = ["| metric | base | tuned | Δ |", "|---|---:|---:|---:|"]
    for label, key in rows:
        out.append(f"| {label} | {_fmt(b.get(key))} | {_fmt(t.get(key))} | "
                   f"{_delta(b.get(key), t.get(key))} |")
    out.append(f"| latency p50 / p95 (ms) | {_fmt(b.get('latency_ms', {}).get('p50'), 0)} / "
               f"{_fmt(b.get('latency_ms', {}).get('p95'), 0)} | "
               f"{_fmt(t['latency_ms']['p50'], 0)} / {_fmt(t['latency_ms']['p95'], 0)} | |")
    out.append(f"| decode tok/s | {_fmt(b.get('decode_tps'), 0)} | "
               f"{_fmt(t['decode_tps'], 0)} | |")
    out.append(f"| peak RAM (MB) | {_fmt(b.get('peak_ram_mb'), 0)} | "
               f"{_fmt(t['peak_ram_mb'], 0)} | |")
    return out


def _breakdown(base: dict | None, tuned: dict, key: str, title: str) -> list[str]:
    b = base["summary"][key] if base else {}
    t = tuned["summary"][key]
    out = [f"**{title}**", "", "| | n | base | tuned | Δ |", "|---|---:|---:|---:|---:|"]
    for name, block in t.items():
        bo = b.get(name, {}).get("objective")
        out.append(f"| {name} | {block['n']} | {_fmt(bo, 2)} | {_fmt(block['objective'], 2)} | "
                   f"{_delta(bo, block['objective'])} |")
    return out


def _failures(tuned: dict, limit: int = 12) -> list[str]:
    misses = [c for c in tuned["cases"] if not c["exact"]]
    if not misses:
        return ["No misses on the test split."]
    out = [f"{len(misses)} of {tuned['n']} cases missed. First {min(limit, len(misses))}:", ""]
    for c in misses[:limit]:
        out.append(f"- `{c['id']}` — *{c['query'].replace(chr(10), ' ')[:100]}*  ")
        out.append(f"  want `{json.dumps(c['want'], ensure_ascii=False)}`  ")
        out.append(f"  got `{json.dumps(c['got'], ensure_ascii=False)}`"
                   + (f" — engine error: {c['error']}" if c.get("error") else ""))
    return out


def _epoch_table(training: dict) -> list[str]:
    """One row per epoch: the losses, and the engine's grade on the dev
    rows (what selects the epoch), the test split and the hand-written set
    (what people read). The selected epoch is marked."""
    epochs = training["epochs"]
    graded = any(e.get("dev_objective") is not None or e.get("test_objective") is not None
                 for e in epochs)
    chosen = training.get("selected_epoch")
    if not graded:
        lines = ["| epoch | loss | val loss |", "|---:|---:|---:|"]
        for e in epochs:
            mark = " ◀" if e["epoch"] == chosen else ""
            lines.append(f"| {e['epoch']}{mark} | {_fmt(e['loss'], 4)} | "
                         f"{_fmt(e.get('val_loss'), 4)} |")
        return lines
    lines = ["| epoch | loss | val loss | dev objective | test objective | "
             "test critical | hand-written |",
             "|---:|---:|---:|---:|---:|---:|---:|"]
    for e in epochs:
        mark = " ◀" if e["epoch"] == chosen else ""
        lines.append(
            f"| {e['epoch']}{mark} | {_fmt(e['loss'], 4)} | {_fmt(e.get('val_loss'), 4)} | "
            f"{_fmt(e.get('dev_objective'))} | {_fmt(e.get('test_objective'))} | "
            f"{_fmt(e.get('test_critical_pass'), 2)} | {_fmt(e.get('handwritten_objective'))} |"
            + (f" {e['grade_error']}" if e.get("grade_error") else ""))
    if chosen:
        lines += ["", f"Epoch {chosen} ships: {training.get('selection', '')}. The dev rows are "
                  "the by-target validation split, held out of fitting; the test split and "
                  "the hand-written set never inform the choice."]
    return lines


def render(run: Run, cfg: Config) -> list[Path]:
    record = run.record
    base = run.read("eval-base.json")
    tuned = run.read("eval-tuned.json")
    manifest = run.read("corpus/manifest.json") or {}
    training = record.get("stages", {}).get("train", {})
    build = record.get("stages", {}).get("build", {})
    gate = record.get("gate")
    env = record.get("environment", {})
    written: list[Path] = []

    svg = loss_svg(run.metrics())
    if svg:
        run.path("loss.svg").write_text(svg)
        written.append(run.path("loss.svg"))

    lines = [f"# Run {run.id}", ""]
    lines += [
        f"- created: {record.get('created_at')}",
        f"- git: `{env.get('git_sha', '?')[:12]}`{' (dirty)' if env.get('git_dirty') else ''}",
        f"- cactus-needle {env.get('cactus_needle', '?')}, jax {env.get('jax', '?')} on "
        f"{env.get('backend', '?')}, python {env.get('python', '?')}",
        "",
        "## Corpus", "",
        f"- content `{manifest.get('content', {}).get('hash', '?')[:19]}` → corpus "
        f"`{manifest.get('corpus', {}).get('hash', '?')[:19]}`",
        f"- {manifest.get('corpus', {}).get('counts', {}).get('train', '?')} train / "
        f"{manifest.get('corpus', {}).get('counts', {}).get('test', '?')} test examples, "
        f"{manifest.get('corpus', {}).get('refusal_share_assistant', 0):.0%} refusals, "
        f"bucket {manifest.get('corpus', {}).get('length', {}).get('bucket', '?')} tokens",
        "",
        "## Training", "",
    ]
    tc = record.get("train", {})
    checkpoint = record.get("checkpoint") or {}
    if checkpoint:
        lines.append(f"- base checkpoint `{checkpoint.get('file')}` from "
                     f"`{checkpoint.get('repo')}`, sha256 `{checkpoint.get('sha256', '')[:16]}…`")
    lines += [
        f"- LoRA rank {tc.get('lora_rank')} alpha {tc.get('lora_alpha')}, lr {tc.get('lr')}, "
        f"batch {tc.get('batch_size')}, {tc.get('epochs')} epochs, seed {tc.get('seed')}, "
        f"QAT {tc.get('qat_bits')}",
        f"- {training.get('total_steps', '?')} steps at seq_len {training.get('seq_len', '?')}, "
        f"{_fmt(training.get('seconds_per_step'), 1)} s/step, "
        f"{_fmt((training.get('seconds') or 0) / 60, 1)} min total",
        f"- final loss {_fmt(training.get('final_loss'), 4)}, best validation loss "
        f"{_fmt(training.get('best_val_loss'), 4)}",
    ]
    if training.get("epochs"):
        lines += ["", *_epoch_table(training)]
    if svg:
        lines += ["", "![loss curve](loss.svg)"]
    if build:
        lines += ["", "## Export", "",
                  f"- `model.cact` {build.get('bytes', 0) / 1e6:.2f} MB, sha256 "
                  f"`{build.get('sha256', '')[:16]}…`, built in {build.get('seconds')}s"]
    if tuned:
        lines += ["", "## Evaluation", "",
                  f"{tuned['n']} held-out cases through the native engine"
                  + (" (base model graded on the same cases)" if base else "") + ".", ""]
        lines += _metric_table(base, tuned)
        lines += ["", *_breakdown(base, tuned, "by_slice", "By slice")]
        lines += ["", *_breakdown(base, tuned, "by_category", "By category")]
        lines += ["", *_breakdown(base, tuned, "by_tool", "By expected tool")]
        lines += ["", "### Misses", "", *_failures(tuned)]
    hw_base, hw_tuned = run.read("eval-base-handwritten.json"), \
        run.read("eval-tuned-handwritten.json")
    if hw_tuned:
        lines += ["", "## Hand-written set", "",
                  f"{hw_tuned['n']} questions written by a person, never generated, "
                  "never used for selection.", "",
                  *_metric_table(hw_base, hw_tuned), "",
                  *_breakdown(hw_base, hw_tuned, "by_category", "By category"),
                  "", "### Misses", "", *_failures(hw_tuned)]
    if gate:
        lines += ["", "## Gate", "",
                  "**PASS** — the model may ship." if gate["ok"] else "**FAIL**",
                  *[f"- {r}" for r in gate.get("reasons", [])]]
    run.path("report.md").write_text("\n".join(lines) + "\n")
    written.append(run.path("report.md"))

    run.path("model-card.md").write_text(model_card(run, cfg))
    written.append(run.path("model-card.md"))

    summary = {
        "run_id": run.id,
        "created_at": record.get("created_at"),
        "git_sha": env.get("git_sha"),
        "corpus_hash": manifest.get("corpus", {}).get("hash"),
        "content_hash": manifest.get("content", {}).get("hash"),
        "train": {k: training.get(k) for k in
                  ("total_steps", "seq_len", "final_loss", "best_val_loss", "seconds",
                   "selected_epoch", "selection")},
        "epochs": [{k: e.get(k) for k in ("epoch", "loss", "val_loss", "dev_objective",
                                          "test_objective", "handwritten_objective")}
                   for e in training.get("epochs", [])],
        "model": record.get("model"),
        "eval": {
            "base": base["summary"]["overall"] if base else None,
            "tuned": tuned["summary"]["overall"] if tuned else None,
            "handwritten": {
                "base": hw_base["summary"]["overall"] if hw_base else None,
                "tuned": hw_tuned["summary"]["overall"] if hw_tuned else None,
            } if hw_tuned else None,
        },
        "gate": gate,
    }
    run.write("summary.json", summary)
    written.append(run.path("summary.json"))
    return written


def model_card(run: Run, cfg: Config) -> str:
    record = run.record
    base = run.read("eval-base.json")
    tuned = run.read("eval-tuned.json")
    manifest = run.read("corpus/manifest.json") or {}
    env = record.get("environment", {})
    tc = record.get("train", {})
    training = record.get("stages", {}).get("train", {})
    counts = manifest.get("corpus", {}).get("counts", {})
    content = manifest.get("content", {}).get("counts", {})
    tools = ", ".join(f"`{t}`" for t in manifest.get("corpus", {}).get("tools", []))
    lines = [
        f"# site-needle {run.id}",
        "",
        "Needle 2 (Cactus Compute's 45M-parameter tool-calling model, 14 MB as a 2-bit "
        "`.cact`) fine-tuned with LoRA into an intent router for "
        "[alexnodeland.com](https://alexnodeland.com). Given a visitor's question it returns "
        f"one of five typed site tools — {tools} — or the empty call for anything off-topic, "
        "injected, negated, or conversational. It generates no prose: the site's chat "
        "retrieves and answers; this model decides what to look up.",
        "",
        "## Use",
        "",
        "```python",
        "import json, needle",
        "",
        "tools = json.load(open('tools.json'))          # the catalogue this model was tuned on",
        "system = open('system.txt').read().strip()",
        f"agent = needle.Needle(tools=tools, system=system, weights='{_cact_name(run)}')",
        "print(agent.complete('what did alex do at musiio?')['function_calls'])",
        "# [{'name': 'lookup_role', 'arguments': {'company': 'musiio'}}]",
        "```",
        "",
        "## Training data",
        "",
        f"Derived from the site's content at `{manifest.get('content', {}).get('hash', '')[:19]}`: "
        f"{content.get('roles', '?')} roles, {content.get('degrees', '?')} degrees, "
        f"{content.get('projects', '?')} projects, {content.get('posts', '?')} posts. "
        f"{counts.get('train', '?')} training examples (assistant questions templated over "
        "those entities, refusals, and the site's prose as extraction records) and "
        f"{counts.get('test', '?')} held-out test cases on unseen phrasings and unseen entities. "
        f"Corpus `{manifest.get('corpus', {}).get('hash', '')[:19]}`.",
        "",
        "## Training",
        "",
        f"LoRA rank {tc.get('lora_rank')} (alpha {tc.get('lora_alpha')}) on the five attention "
        f"projections, lr {tc.get('lr')}, batch {tc.get('batch_size')}, {tc.get('epochs')} epochs "
        f"({training.get('total_steps', '?')} steps at sequence length "
        f"{training.get('seq_len', '?')}), quantisation-aware through the checkpoint's 2-bit "
        f"scheme, seed {tc.get('seed')}. Final loss {_fmt(training.get('final_loss'), 4)}, "
        f"validation {_fmt(training.get('best_val_loss'), 4)}"
        + (f"; epoch {training['selected_epoch']} of {tc.get('epochs')} selected by "
           f"{training.get('selection', 'dev objective')}"
           if training.get("selected_epoch") else "")
        + f". cactus-needle {env.get('cactus_needle', '?')}, jax {env.get('jax', '?')} on "
        f"{env.get('backend', '?')}.",
    ]
    if tuned:
        lines += ["", "## Evaluation", "",
                  f"{tuned['n']} held-out cases through the native engine.", "",
                  *_metric_table(base, tuned), "",
                  *_breakdown(base, tuned, "by_slice", "By slice")]
    hw_base, hw_tuned = run.read("eval-base-handwritten.json"), \
        run.read("eval-tuned-handwritten.json")
    if hw_tuned:
        lines += ["", f"On {hw_tuned['n']} hand-written questions, never generated and never "
                  "used for selection:", "", *_metric_table(hw_base, hw_tuned)]
    lines += [
        "",
        "## Limitations",
        "",
        "- Fine-tuning does not update Needle's confidence head; `confidence` is `None` "
        "for this model. Gate on the call itself (an empty call is a refusal).",
        "- English only, and only questions about this one site. Anything else is meant "
        "to come back as the empty call.",
        "- Free-text arguments are copied from the question verbatim; resolve them "
        "case-insensitively against the site's data.",
        "",
        "## Provenance",
        "",
        f"- run `{run.id}`, git `{env.get('git_sha', '?')}`, "
        f"{record.get('created_at', '')}",
        "- pipeline: `apps/model` in "
        "[alexnodeland/alexnodeland](https://github.com/alexnodeland/alexnodeland)",
        f"- rendered {datetime.now(UTC).isoformat(timespec='seconds')}",
        "",
    ]
    return "\n".join(lines)


def _cact_name(run: Run) -> str:
    return "site-needle.cact"
