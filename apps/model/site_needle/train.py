"""LoRA fine-tuning and export, wrapped so every run is a record.

The loop itself is in ``finetune.py``: Needle's own maths, opened up so the
validation rows are held out by target and the adapter is visible after
every epoch. What this module adds is everything around it: the base
checkpoint fetched to a known place and hashed, a pre-flight token check
with the real tokenizer, the loss curve captured to ``metrics.jsonl`` and
MLflow as it happens, every epoch's adapter exported and graded through
the engine on the held-out rows, the epoch that ships chosen by that grade
rather than by a guess made in advance, and a ``run.json`` that records the
config, the corpus hash, the environment and the timings, so any model can
be traced to exactly what produced it.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
import shutil
import time
import types
from collections import defaultdict
from pathlib import Path

from . import evaluate
from .log import Log
from .paths import (
    BASE_CHECKPOINT,
    BASE_REPO,
    CHECKPOINT_DIR,
    CORPUS_DIR,
    EVAL_CACHE_DIR,
    RUNS_DIR,
    Config,
)
from .runs import Run
from .tokens import bucket, count
from .tracking import Tracker

_STEP = re.compile(r"step\s+(\d+)/(\d+)\s+loss\s+([\d.]+)")
_EPOCH = re.compile(r"epoch\s+(\d+)/(\d+)\s+loss\s+([\d.]+)(?:\s+val\s+([\d.]+))?")
_DATA = re.compile(r"data\s+(\d+) examples\s+seq_len (\d+)")
_SCHEDULE = re.compile(r"schedule\s+(\d+) steps")

EPOCH_METRICS = ("loss", "val_loss", "dev_objective", "dev_tool_accuracy",
                 "dev_missed_refusal_rate", "test_objective", "test_tool_accuracy",
                 "test_critical_pass", "test_missed_refusal_rate", "handwritten_objective")


def ensure_checkpoint(log: Log | None = None) -> Path:
    """The base checkpoint, downloaded once into ``checkpoints/``."""
    target = CHECKPOINT_DIR / BASE_CHECKPOINT
    if target.exists():
        return target
    from huggingface_hub import hf_hub_download

    if log:
        log.say("downloading base checkpoint", repo=BASE_REPO, file=BASE_CHECKPOINT)
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    hf_hub_download(BASE_REPO, BASE_CHECKPOINT, repo_type="model", local_dir=CHECKPOINT_DIR)
    return target


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def preflight(train_path: Path, max_tokens: int, log: Log) -> dict:
    """Counts every training example with the real tokenizer. Needle silently
    truncates anything over the cap — which cuts the target, the only part
    the loss is computed on — so this is a hard stop, not a warning."""
    from needle.model.tokenizer import get_tokenizer

    tokenizer = get_tokenizer()
    lengths = []
    over = []
    with train_path.open() as handle:
        for line in handle:
            if not line.strip():
                continue
            row = json.loads(line)
            n = count(row, tokenizer)
            lengths.append(n)
            if n > max_tokens:
                over.append((row.get("id"), n))
    if over:
        shown = ", ".join(f"{i} ({n})" for i, n in over[:10])
        raise ValueError(f"{len(over)} example(s) exceed {max_tokens} tokens: {shown}")
    longest = max(lengths)
    seq_len = bucket(longest, max_tokens)
    log.say("preflight", examples=len(lengths), longest=longest, seq_len=seq_len)
    return {"examples": len(lengths), "longest_tokens": longest, "seq_len": seq_len}


def group_key(row: dict) -> str:
    """What a training row teaches: the call it expects, arguments folded to
    lower case. Every phrasing of one target shares a key, so a split on
    keys never puts a paraphrase of a fitted row into the validation set.
    Refusals and extraction passages have no shared target; each is its own
    group."""
    calls = row.get("answers") or []
    if not calls or row.get("kind") == "extraction":
        return f"row:{row.get('id')}"
    return json.dumps(
        [{"name": c.get("name"),
          "arguments": {k: str(v).strip().lower() for k, v in (c.get("arguments") or {}).items()}}
         for c in calls], sort_keys=True, ensure_ascii=False)


def split_by_target(rows: list[dict], fraction: float, seed: int) -> tuple[list, list, dict]:
    """Hold out about ``fraction`` of the rows for validation, whole target
    groups at a time, so the validation loss and the dev grade measure
    unseen arguments and phrasings rather than the memory of a paraphrase.
    Groups larger than a quarter of the budget (four rows, at the least)
    stay in training so one popular target cannot be the whole validation
    set."""
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        groups[group_key(row)].append(row)
    want = int(len(rows) * fraction)
    stats = {"groups": len(groups), "wanted": want}
    if want <= 0 or len(rows) < 2:
        return list(rows), [], {**stats, "dev": 0, "fit": len(rows), "dev_groups": 0}
    keys = sorted(groups)
    random.Random(seed).shuffle(keys)
    cap = max(4, want // 4)
    chosen: set[str] = set()
    taken = 0
    for key in keys:
        if taken >= want:
            break
        if len(groups[key]) > cap:
            continue
        chosen.add(key)
        taken += len(groups[key])
    fit = [r for r in rows if group_key(r) not in chosen]
    dev = [r for r in rows if group_key(r) in chosen]
    return fit, dev, {**stats, "dev": len(dev), "fit": len(fit), "dev_groups": len(chosen)}


def select_epoch(records: list[dict], rule: str = "dev") -> tuple[int, str]:
    """Which epoch ships. ``dev``: the highest engine-graded objective on
    the validation rows, ties to the lower validation loss, then the later
    epoch. ``val_loss``: the lowest validation loss. ``last``: the final
    epoch. Each rule falls back to the next when its signal is missing."""
    if not records:
        raise ValueError("no epochs to select from")
    graded = [r for r in records if r.get("dev_objective") is not None]
    if rule == "dev" and graded:
        best = max(graded, key=lambda r: (r["dev_objective"], -(r.get("val_loss") or 0.0),
                                          r["epoch"]))
        return best["epoch"], "highest dev objective"
    with_val = [r for r in records if r.get("val_loss") is not None]
    if rule in ("dev", "val_loss") and with_val:
        best = min(with_val, key=lambda r: (r["val_loss"], -r["epoch"]))
        return best["epoch"], "lowest validation loss"
    return records[-1]["epoch"], "last epoch"


class _Progress:
    """Turns the loop's progress lines into metrics, as they arrive. Epoch
    records normally come from the epoch hook, which knows more; the epoch
    line only fills in when no hook ran."""

    def __init__(self, run: Run, tracker: Tracker, log: Log):
        self.run, self.tracker, self.log = run, tracker, log
        self.started = time.time()
        self.last_step_at = self.started
        self.total_steps = None
        self.seq_len = None
        self.examples = None
        self.step_seconds: list[float] = []
        self.epochs: list[dict] = []
        self.last_loss = None

    def __call__(self, message: str) -> None:
        now = time.time()
        if m := _STEP.search(message):
            step, total, loss = int(m.group(1)), int(m.group(2)), float(m.group(3))
            self.total_steps = total
            self.last_loss = loss
            self.step_seconds.append(now - self.last_step_at)
            self.last_step_at = now
            self.run.append_metric(step=step, loss=loss)
            self.tracker.metric("train_loss", loss, step=step)
            eta = (total - step) * self._seconds_per_step(step)
            self.log.say("step", step=f"{step}/{total}", loss=f"{loss:.4f}",
                         eta_min=f"{eta / 60:.0f}")
        elif m := _EPOCH.search(message):
            epoch, total, loss = int(m.group(1)), int(m.group(2)), float(m.group(3))
            if any(e.get("epoch") == epoch for e in self.epochs):
                return
            val = float(m.group(4)) if m.group(4) else None
            record = {"epoch": epoch, "loss": loss, "val_loss": val,
                      "elapsed_s": round(now - self.started, 1)}
            self.epochs.append(record)
            self.run.append_metric(**record)
            self.tracker.metric("epoch_loss", loss, step=epoch)
            if val is not None:
                self.tracker.metric("val_loss", val, step=epoch)
            self.log.say("epoch", epoch=f"{epoch}/{total}", loss=f"{loss:.4f}",
                         val=f"{val:.4f}" if val is not None else "-")
        elif m := _DATA.search(message):
            self.examples, self.seq_len = int(m.group(1)), int(m.group(2))
        elif m := _SCHEDULE.search(message):
            self.total_steps = int(m.group(1))
            self.last_step_at = now  # the first step includes compilation

    def _seconds_per_step(self, step: int) -> float:
        # Skip the first interval: it includes XLA compilation.
        samples = self.step_seconds[1:] if len(self.step_seconds) > 1 else self.step_seconds
        if not samples:
            return 0.0
        # Progress arrives every total//50 steps; normalise to one step.
        every = max(1, (self.total_steps or 50) // 50)
        return sum(samples) / len(samples) / every

    def summary(self) -> dict:
        val = [e["val_loss"] for e in self.epochs if e.get("val_loss") is not None]
        return {
            "total_steps": self.total_steps,
            "seq_len": self.seq_len,
            "examples": self.examples,
            "final_loss": self.last_loss,
            "epochs": self.epochs,
            "best_val_loss": min(val) if val else None,
            "final_val_loss": val[-1] if val else None,
            "seconds": round(time.time() - self.started, 1),
            "seconds_per_step": round(self._seconds_per_step(self.total_steps or 1), 2),
        }


class _EpochGrader:
    """After every epoch: save the adapter, export it, grade it through the
    engine on the dev rows (the by-target validation split — the selection
    signal) and on the held-out test split and the hand-written set (the
    curves people read, never the selection signal). A grading failure is
    recorded on the epoch and training goes on."""

    def __init__(self, cfg: Config, run: Run, tracker: Tracker, log: Log, progress: _Progress,
                 checkpoint: Path, sets: dict[str, list[dict]], grade: bool):
        self.cfg, self.run, self.tracker, self.log = cfg, run, tracker, log
        self.progress, self.checkpoint, self.sets, self.grade = progress, checkpoint, sets, grade

    def __call__(self, epoch: int, record: dict, save) -> None:
        folder = self.run.path(f"epochs/{epoch:02d}")
        folder.mkdir(parents=True, exist_ok=True)
        save(folder / "adapter.pkl")
        record["adapter"] = str((folder / "adapter.pkl").relative_to(self.run.dir))
        if self.grade and self.sets:
            started = time.time()
            try:
                export(self.checkpoint, folder / "adapter.pkl", folder / "model.cact")
                for name, rows in self.sets.items():
                    result = evaluate.cached(self.cfg, rows, folder / "model.cact", name,
                                             progress=self._eval_progress(epoch, name),
                                             corpus_dir=self.run.path("corpus"))
                    (folder / f"eval-{name}.json").write_text(
                        json.dumps(result, indent=2, ensure_ascii=False) + "\n")
                    overall = result["summary"]["overall"]
                    record[f"{name}_objective"] = overall["objective"]
                    record[f"{name}_tool_accuracy"] = overall["tool_accuracy"]
                    record[f"{name}_missed_refusal_rate"] = overall["missed_refusal_rate"]
                    record[f"{name}_false_refusal_rate"] = overall["false_refusal_rate"]
                    record[f"{name}_critical_pass"] = overall["critical_pass"]
                    record[f"{name}_errors"] = overall["errors"]
            except Exception as exc:  # grading must never take the run down
                record["grade_error"] = f"{type(exc).__name__}: {exc}"
                self.log.say("epoch grading failed", epoch=epoch, error=record["grade_error"])
            record["grade_seconds"] = round(time.time() - started, 1)
        self.progress.epochs.append(record)
        self.run.append_metric(**record)
        for key in EPOCH_METRICS:
            if isinstance(record.get(key), (int, float)):
                self.tracker.metric(key if key != "loss" else "epoch_loss", record[key],
                                    step=epoch)
        self.log.say("epoch", epoch=epoch, loss=f"{record['loss']:.4f}",
                     val=_f(record.get("val_loss")), dev=_f(record.get("dev_objective")),
                     test=_f(record.get("test_objective")),
                     handwritten=_f(record.get("handwritten_objective")))

    def _eval_progress(self, epoch: int, name: str):
        def progress(done, total, case):
            if done % 50 == 0 or done == total:
                self.log.say("grade", epoch=epoch, set=name, done=f"{done}/{total}")
        return progress


def _f(value, digits: int = 3) -> str:
    return f"{value:.{digits}f}" if isinstance(value, (int, float)) else "-"


def train(cfg: Config, corpus_dir: Path = CORPUS_DIR, runs_dir: Path = RUNS_DIR,
          epochs: int | None = None, run_id: str | None = None, tracking: bool = True,
          run: Run | None = None, grade_epochs: bool | None = None) -> Run:
    """One LoRA run on ``corpus_dir/train.jsonl`` into a new run directory.
    Every epoch's adapter is kept under ``epochs/``; the selected one is
    copied to ``adapter.pkl`` and, when graded, ``model.cact``."""
    from .finetune import finetune

    tc = cfg.train
    epochs = epochs or tc.epochs
    grade = tc.grade_epochs if grade_epochs is None else grade_epochs
    run = run or Run.new(runs_dir, run_id)
    log = Log(run.path("events.jsonl"))
    manifest_path = corpus_dir / "manifest.json"
    if not (corpus_dir / "train.jsonl").exists() or not manifest_path.exists():
        raise FileNotFoundError(f"no corpus in {corpus_dir}; run `site-needle corpus build`")

    # The corpus travels with the run, so an evaluation months later grades
    # the same test split the model was held out from.
    shutil.copytree(corpus_dir, run.path("corpus"), dirs_exist_ok=True)
    manifest = json.loads(manifest_path.read_text())

    tracker = Tracker(run.id, enabled=tracking)
    train_cfg = {**vars(tc), "epochs": epochs, "grade_epochs": grade}
    run.update(config=cfg.as_dict(), train=train_cfg, corpus={
        "hash": manifest["corpus"]["hash"],
        "content_hash": manifest["content"]["hash"],
        "counts": manifest["corpus"]["counts"],
    })
    tracker.params({"train": train_cfg, "corpus": manifest["corpus"]["counts"],
                    "corpus_hash": manifest["corpus"]["hash"],
                    "content_hash": manifest["content"]["hash"],
                    "env": run.record.get("environment", {})})
    tracker.tags({"run_id": run.id, "git_sha": run.record.get("environment", {}).get("git_sha")})
    run.update(tracking={"mlflow_run_id": tracker.run_id, "uri": tracker.uri})

    try:
        with log.stage("checkpoint"):
            checkpoint = ensure_checkpoint(log)
            run.update(checkpoint={"file": str(checkpoint.relative_to(CHECKPOINT_DIR)),
                                   "repo": BASE_REPO, "sha256": file_sha256(checkpoint),
                                   "bytes": checkpoint.stat().st_size})
        with log.stage("preflight"):
            flight = preflight(run.path("corpus/train.jsonl"), cfg.corpus.max_tokens, log)
            run.update(stages={"preflight": flight})
        with log.stage("split"):
            rows = evaluate.load_rows(run.path("corpus/train.jsonl"))
            fit, dev, split = split_by_target(rows, tc.val_split, tc.seed)
            _write_rows(run.path("corpus/fit.jsonl"), fit)
            _write_rows(run.path("corpus/dev.jsonl"), dev)
            run.update(stages={"split": split})
            log.say("split", **split)

        sets = {}
        if grade:
            if dev:
                sets["dev"] = dev
            sets["test"] = evaluate.load_test(run.path("corpus"))
            handwritten = evaluate.load_handwritten(run.path("corpus"))
            if handwritten:
                sets["handwritten"] = handwritten
        progress = _Progress(run, tracker, log)
        grader = _EpochGrader(cfg, run, tracker, log, progress, checkpoint, sets, grade)
        args = types.SimpleNamespace(
            checkpoint=str(checkpoint),
            fit_path=str(run.path("corpus/fit.jsonl")),
            dev_path=str(run.path("corpus/dev.jsonl")) if dev else None,
            length_path=str(run.path("corpus/train.jsonl")),
            epochs=epochs,
            batch_size=tc.batch_size,
            lr=tc.lr,
            lora_rank=tc.lora_rank,
            lora_alpha=tc.lora_alpha,
            max_len=cfg.corpus.max_tokens,
            seed=tc.seed,
            qat_bits=tc.qat_bits,
            out=None,
        )
        with log.stage("train", epochs=epochs, batch_size=tc.batch_size, lr=tc.lr,
                       grade_epochs=grade):
            shape = finetune(args, progress=progress, on_epoch=grader)
        summary = progress.summary()
        summary.update({k: v for k, v in shape.items() if k != "epochs"})

        chosen, why = select_epoch(progress.epochs, tc.select)
        source = run.path(f"epochs/{chosen:02d}")
        shutil.copy(source / "adapter.pkl", run.path("adapter.pkl"))
        summary.update({"selected_epoch": chosen, "selection": why,
                        "adapter_bytes": run.path("adapter.pkl").stat().st_size})
        if (source / "model.cact").exists():
            shutil.copy(source / "model.cact", run.path("model.cact"))
            _record_model(run, run.path("model.cact"), seconds=0.0)
        run.update(stages={"train": summary})
        log.say("selected", epoch=f"{chosen}/{epochs}", rule=why)
        tracker.metrics({"final_loss": summary["final_loss"] or 0,
                         "best_val_loss": summary["best_val_loss"] or 0,
                         "selected_epoch": chosen,
                         "train_seconds": summary["seconds"]})
        tracker.artifact(run.path("metrics.jsonl"))
        tracker.artifact(run.path("corpus/manifest.json"), "corpus")
        tracker.end("FINISHED")
    except BaseException:
        tracker.end("FAILED")
        raise
    return run


def _write_rows(path: Path, rows: list[dict]) -> None:
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))


def export(checkpoint: Path, adapter: Path, out: Path) -> dict:
    """Merge an adapter into the base and write a ``.cact``."""
    from needle.model.finetune import build_main

    started = time.time()
    build_main(types.SimpleNamespace(checkpoint=str(checkpoint), lora=str(adapter),
                                     out=str(out), upload=False, bits=None))
    return {"bytes": out.stat().st_size, "sha256": file_sha256(out),
            "seconds": round(time.time() - started, 1)}


def _record_model(run: Run, out: Path, seconds: float) -> None:
    digest = file_sha256(out)
    run.update(stages={"build": {"bytes": out.stat().st_size, "sha256": digest,
                                 "seconds": seconds}},
               model={"file": out.name, "sha256": digest, "bytes": out.stat().st_size})


def build(run: Run, log: Log | None = None) -> Path:
    """Export the run's selected adapter as ``model.cact``."""
    log = log or Log(run.path("events.jsonl"))
    adapter = run.path("adapter.pkl")
    if not adapter.exists():
        raise FileNotFoundError(f"{run.dir} has no adapter.pkl; train first")
    out = run.path("model.cact")
    with log.stage("build"):
        checkpoint = ensure_checkpoint(log)
        info = export(checkpoint, adapter, out)
        _record_model(run, out, info["seconds"])
    return out


__all__ = ["EVAL_CACHE_DIR", "Run", "build", "ensure_checkpoint", "export", "group_key",
           "preflight", "select_epoch", "split_by_target", "train"]
