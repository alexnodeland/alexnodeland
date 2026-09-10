"""Experiment tracking, optional and local by default.

MLflow over a SQLite file under ``mlruns/`` needs no server: ``site-needle
ui`` browses it. Point ``MLFLOW_TRACKING_URI`` at a server to share runs.
When MLflow is not installed (it is the ``tracking`` extra) every call
here is a no-op and the run directory still holds everything.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from .paths import APP_DIR

EXPERIMENT = "site-needle"


MLRUNS = APP_DIR / "mlruns"


def tracking_uri() -> str:
    if uri := os.environ.get("MLFLOW_TRACKING_URI"):
        return uri
    # MLflow 3 retired the plain file store; SQLite is the zero-setup option.
    MLRUNS.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{MLRUNS / 'mlflow.db'}"


def _flatten(prefix: str, value, out: dict) -> dict:
    if isinstance(value, dict):
        for k, v in value.items():
            _flatten(f"{prefix}.{k}" if prefix else k, v, out)
    else:
        out[prefix] = value if isinstance(value, (int, float, bool)) else str(value)
    return out


class Tracker:
    def __init__(self, run_id: str, enabled: bool = True):
        self.enabled = False
        self._mlflow = None
        if not enabled:
            return
        try:
            import mlflow
        except ImportError:
            print("[site-needle] mlflow not installed; tracking only to the run directory",
                  file=sys.stderr)
            return
        os.environ.setdefault("MLFLOW_DISABLE_AGENT_HINT", "1")
        mlflow.set_tracking_uri(tracking_uri())
        if mlflow.get_experiment_by_name(EXPERIMENT) is None:
            mlflow.create_experiment(
                EXPERIMENT, artifact_location=(MLRUNS / "artifacts").resolve().as_uri())
        mlflow.set_experiment(EXPERIMENT)
        mlflow.start_run(run_name=run_id)
        self._mlflow = mlflow
        self.enabled = True

    @property
    def uri(self) -> str | None:
        return tracking_uri() if self.enabled else None

    @classmethod
    def resume(cls, run, enabled: bool = True) -> Tracker:
        """Reopen the MLflow run that ``train`` started for this run directory,
        so evaluation metrics land on the same record."""
        tracker = cls.__new__(cls)
        tracker.enabled, tracker._mlflow = False, None
        mlflow_run_id = (run.record.get("tracking") or {}).get("mlflow_run_id")
        if not enabled or not mlflow_run_id:
            return tracker
        try:
            import mlflow
        except ImportError:
            return tracker
        os.environ.setdefault("MLFLOW_DISABLE_AGENT_HINT", "1")
        mlflow.set_tracking_uri(tracking_uri())
        mlflow.start_run(run_id=mlflow_run_id)
        tracker._mlflow, tracker.enabled = mlflow, True
        return tracker

    @property
    def run_id(self) -> str | None:
        if not self.enabled:
            return None
        active = self._mlflow.active_run()
        return active.info.run_id if active else None

    def params(self, values: dict) -> None:
        if self.enabled:
            flat = _flatten("", values, {})
            # MLflow caps a param value at 6000 characters; nothing here is
            # close, but a list of devices could be, so truncate defensively.
            self._mlflow.log_params({k: str(v)[:500] for k, v in flat.items()})

    def tags(self, values: dict) -> None:
        if self.enabled:
            self._mlflow.set_tags({k: str(v) for k, v in values.items()})

    def metric(self, key: str, value: float, step: int | None = None) -> None:
        if self.enabled:
            self._mlflow.log_metric(key, float(value), step=step)

    def metrics(self, values: dict, step: int | None = None) -> None:
        if self.enabled:
            self._mlflow.log_metrics(
                {k: float(v) for k, v in values.items() if isinstance(v, (int, float))},
                step=step)

    def artifact(self, path: Path, subdir: str | None = None) -> None:
        if self.enabled and path.exists():
            if path.is_dir():
                self._mlflow.log_artifacts(str(path), artifact_path=subdir)
            else:
                self._mlflow.log_artifact(str(path), artifact_path=subdir)

    def end(self, status: str = "FINISHED") -> None:
        if self.enabled:
            self._mlflow.end_run(status=status)
            self.enabled = False
