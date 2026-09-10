"""LoRA fine-tuning and export, wrapped so every run is a record.

The training loop is Needle's own (``needle.model.finetune.finetune_local``),
unchanged, so a run here matches ``needle finetune`` step for step. What
this module adds is everything around it: the base checkpoint fetched to a
known place, a pre-flight token check with the real tokenizer, the loss
curve captured to ``metrics.jsonl`` and MLflow as it happens, and a
``run.json`` that records the config, the corpus hash, the environment and
the timings, so any model can be traced to exactly what produced it.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import time
import types
from pathlib import Path

from .log import Log
from .paths import BASE_CHECKPOINT, BASE_REPO, CHECKPOINT_DIR, CORPUS_DIR, RUNS_DIR, Config
from .runs import Run
from .tokens import bucket, count
from .tracking import Tracker

_STEP = re.compile(r"step\s+(\d+)/(\d+)\s+loss\s+([\d.]+)")
_EPOCH = re.compile(r"epoch\s+(\d+)/(\d+)\s+loss\s+([\d.]+)(?:\s+val\s+([\d.]+))?")
_DATA = re.compile(r"data\s+(\d+) examples\s+seq_len (\d+)")
_SCHEDULE = re.compile(r"schedule\s+(\d+) steps")


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


class _Progress:
    """Turns needle's progress lines into metrics, as they arrive."""

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


def train(cfg: Config, corpus_dir: Path = CORPUS_DIR, runs_dir: Path = RUNS_DIR,
          epochs: int | None = None, run_id: str | None = None, tracking: bool = True,
          run: Run | None = None) -> Run:
    """One LoRA run on ``corpus_dir/train.jsonl`` into a new run directory."""
    from needle.model.finetune import finetune_local

    tc = cfg.train
    epochs = epochs or tc.epochs
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
    train_cfg = {**vars(tc), "epochs": epochs}
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
        with log.stage("preflight"):
            flight = preflight(run.path("corpus/train.jsonl"), cfg.corpus.max_tokens, log)
            run.update(stages={"preflight": flight})

        progress = _Progress(run, tracker, log)
        args = types.SimpleNamespace(
            jsonl_path=str(run.path("corpus/train.jsonl")),
            checkpoint=str(checkpoint),
            epochs=epochs,
            batch_size=tc.batch_size,
            lr=tc.lr,
            lora_rank=tc.lora_rank,
            lora_alpha=tc.lora_alpha,
            max_len=cfg.corpus.max_tokens,
            val_split=tc.val_split,
            seed=tc.seed,
            generate=0,
            model=None,
            workers=1,
            checkpoint_dir=str(run.dir),
            out=str(run.path("adapter.pkl")),
            qat_bits=tc.qat_bits,
        )
        with log.stage("train", epochs=epochs, batch_size=tc.batch_size, lr=tc.lr):
            finetune_local(args, progress=progress)
        summary = progress.summary()
        summary["adapter_bytes"] = run.path("adapter.pkl").stat().st_size
        run.update(stages={"train": summary})
        tracker.metrics({"final_loss": summary["final_loss"] or 0,
                         "best_val_loss": summary["best_val_loss"] or 0,
                         "train_seconds": summary["seconds"]})
        tracker.artifact(run.path("metrics.jsonl"))
        tracker.artifact(run.path("corpus/manifest.json"), "corpus")
        tracker.end("FINISHED")
    except BaseException:
        tracker.end("FAILED")
        raise
    return run


def build(run: Run, log: Log | None = None) -> Path:
    """Merge the run's adapter into the base and export ``model.cact``."""
    from needle.model.finetune import build_main

    log = log or Log(run.path("events.jsonl"))
    adapter = run.path("adapter.pkl")
    if not adapter.exists():
        raise FileNotFoundError(f"{run.dir} has no adapter.pkl; train first")
    out = run.path("model.cact")
    with log.stage("build"):
        checkpoint = ensure_checkpoint(log)
        started = time.time()
        build_main(types.SimpleNamespace(checkpoint=str(checkpoint), lora=str(adapter),
                                         out=str(out), upload=False, bits=None))
        digest = hashlib.sha256(out.read_bytes()).hexdigest()
        run.update(stages={"build": {
            "bytes": out.stat().st_size,
            "sha256": digest,
            "seconds": round(time.time() - started, 1),
        }}, model={"file": out.name, "sha256": digest, "bytes": out.stat().st_size})
    return out
