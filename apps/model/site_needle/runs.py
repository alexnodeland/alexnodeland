"""A run directory: everything one training run produced, in one place.

    runs/<id>/
      run.json          who, what, with which config and content, and how it went
      events.jsonl      stage timings
      metrics.jsonl     the loss curve, one line per reported step and epoch
      corpus/           the exact corpus trained on (manifest, train, test)
      adapter.pkl       the LoRA adapter
      model.cact        the merged, quantised export
      eval-base.json    the base model on the same test split
      eval-tuned.json   the tuned model
      report.md         the human summary; model-card.md the shareable one

Nothing in it depends on MLflow: the tracker mirrors this directory, it
does not replace it.
"""

from __future__ import annotations

import json
import platform
import subprocess
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from . import __version__
from .paths import APP_DIR, RUNS_DIR


def new_run_id(now: float | None = None) -> str:
    stamp = datetime.fromtimestamp(now or time.time(), tz=UTC).strftime("%Y%m%d-%H%M%S")
    return f"{stamp}-{git_sha()[:7]}"


def git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=APP_DIR, text=True,
            stderr=subprocess.DEVNULL).strip()
    except Exception:
        return "unknown"


def git_dirty() -> bool:
    try:
        out = subprocess.check_output(
            ["git", "status", "--porcelain", "--", str(APP_DIR)], cwd=APP_DIR, text=True,
            stderr=subprocess.DEVNULL)
        return bool(out.strip())
    except Exception:
        return False


def environment() -> dict:
    info = {
        "site_needle": __version__,
        "python": platform.python_version(),
        "platform": platform.platform(),
        "git_sha": git_sha(),
        "git_dirty": git_dirty(),
    }
    try:
        import needle
        info["cactus_needle"] = needle.__version__
    except Exception:
        pass
    try:
        import jax
        info["jax"] = jax.__version__
        info["backend"] = jax.default_backend()
        info["devices"] = [str(d) for d in jax.devices()]
    except Exception:
        pass
    return info


@dataclass
class Run:
    id: str
    dir: Path

    @classmethod
    def new(cls, runs_dir: Path = RUNS_DIR, run_id: str | None = None) -> Run:
        run_id = run_id or new_run_id()
        run = cls(run_id, (runs_dir / run_id).resolve())
        run.dir.mkdir(parents=True, exist_ok=False)
        run.write("run.json", {
            "id": run.id,
            "created_at": datetime.now(UTC).isoformat(timespec="seconds"),
            "environment": environment(),
            "stages": {},
        })
        return run

    @classmethod
    def open(cls, path: Path) -> Run:
        path = path.resolve()
        if not (path / "run.json").exists():
            raise FileNotFoundError(f"{path} is not a run directory (no run.json)")
        return cls(json.loads((path / "run.json").read_text())["id"], path)

    def path(self, name: str) -> Path:
        return self.dir / name

    def write(self, name: str, payload: dict) -> None:
        self.path(name).write_text(json.dumps(payload, indent=2, default=str) + "\n")

    def read(self, name: str) -> dict | None:
        p = self.path(name)
        return json.loads(p.read_text()) if p.exists() else None

    @property
    def record(self) -> dict:
        return self.read("run.json") or {}

    def update(self, **fields) -> dict:
        """Merge into run.json. ``stages`` merges one level deeper so each
        stage can record itself without clobbering the others."""
        record = self.record
        for key, value in fields.items():
            if key == "stages":
                record.setdefault("stages", {}).update(value)
            else:
                record[key] = value
        self.write("run.json", record)
        return record

    def metrics(self) -> list[dict]:
        p = self.path("metrics.jsonl")
        if not p.exists():
            return []
        return [json.loads(line) for line in p.read_text().splitlines() if line.strip()]

    def append_metric(self, **fields) -> None:
        with self.path("metrics.jsonl").open("a") as handle:
            handle.write(json.dumps({"t": time.time(), **fields}) + "\n")
