"""Two channels: a human line on stderr, and a JSON event on disk.

The human line is what you read while a run is going. The event file is
what a run directory keeps — stage timings and their outcomes — so a run
can be reconstructed after the terminal is gone.
"""

from __future__ import annotations

import json
import sys
import time
from contextlib import contextmanager
from pathlib import Path


class Log:
    def __init__(self, events_path: Path | None = None, prefix: str = "site-needle"):
        self.events_path = events_path
        self.prefix = prefix

    def say(self, message: str, **fields) -> None:
        extra = "  ".join(f"{k}={_short(v)}" for k, v in fields.items())
        line = f"[{self.prefix}] {message}" + (f"  {extra}" if extra else "")
        print(line, file=sys.stderr, flush=True)
        self.event("log", message=message, **fields)

    def event(self, kind: str, **fields) -> None:
        if not self.events_path:
            return
        self.events_path.parent.mkdir(parents=True, exist_ok=True)
        with self.events_path.open("a") as handle:
            handle.write(json.dumps({"t": time.time(), "kind": kind, **fields}, default=str) + "\n")

    @contextmanager
    def stage(self, name: str, **fields):
        """Times a stage and records how it ended, exception included."""
        start = time.time()
        self.say(f"{name}: start", **fields)
        self.event("stage_start", stage=name, **fields)
        try:
            yield
        except BaseException as exc:
            self.event("stage_end", stage=name, ok=False, seconds=round(time.time() - start, 2),
                       error=f"{type(exc).__name__}: {exc}")
            raise
        seconds = round(time.time() - start, 2)
        self.say(f"{name}: done", seconds=seconds)
        self.event("stage_end", stage=name, ok=True, seconds=seconds)


def _short(value) -> str:
    text = str(value)
    return text if len(text) <= 80 else text[:77] + "..."
