"""The whole thing, in order, as one run.

    content snapshot → corpus → LoRA fine-tune → export → evaluate base and
    tuned → gate → report

Every stage writes into the same run directory, so a run that dies half
way leaves what it finished, and ``site-needle report`` can render it.
"""

from __future__ import annotations

import json
from pathlib import Path

from . import corpus as corpus_mod
from . import evaluate, registry, report
from . import train as train_mod
from .log import Log
from .paths import CONTENT_PATH, CORPUS_DIR, RUNS_DIR, Config
from .runs import Run
from .tracking import Tracker


def run(cfg: Config, content: Path = CONTENT_PATH, corpus_dir: Path = CORPUS_DIR,
        runs_dir: Path = RUNS_DIR, epochs: int | None = None, run_id: str | None = None,
        tracking: bool = True, baseline: str | None = None, skip_base_eval: bool = False,
        limit: int | None = None, promote: bool = False, augment: dict | None = None) -> bool:
    log = Log()
    with log.stage("corpus"):
        built = corpus_mod.build(cfg.corpus, content, corpus_dir, **(augment or {}))
        for line in corpus_mod.summary_lines(built.manifest):
            log.say(line)

    the_run = Run.new(runs_dir, run_id)
    log = Log(the_run.path("events.jsonl"))
    log.say("run", id=the_run.id, dir=str(the_run.dir))
    train_mod.train(cfg, corpus_dir, runs_dir, epochs=epochs, tracking=tracking, run=the_run)
    return finish(cfg, the_run, tracking=tracking, baseline=baseline,
                  skip_base_eval=skip_base_eval, limit=limit, promote=promote)


def finish(cfg: Config, the_run: Run, tracking: bool = True, baseline: str | None = None,
           skip_base_eval: bool = False, limit: int | None = None,
           promote: bool = False) -> bool:
    """Everything after training: export, evaluate base and tuned, gate,
    report, and optionally promote. Separate so a run whose training
    finished can be completed — or re-graded — without training again."""
    log = Log(the_run.path("events.jsonl"))
    if not the_run.path("model.cact").exists():
        train_mod.build(the_run, log)

    tracker = Tracker.resume(the_run, enabled=tracking)

    def progress(done, total, case):
        if done % 20 == 0 or done == total:
            log.say("eval", done=f"{done}/{total}", last=case["id"], exact=case["exact"])

    base_result = None
    if not skip_base_eval:
        with log.stage("eval base"):
            base_result = evaluate.evaluate(cfg, the_run.path("corpus"), None,
                                            the_run.path("eval-base.json"), limit, progress)
            tracker.metrics(_prefixed("base", base_result["summary"]["overall"]))
    elif the_run.path("eval-base.json").exists():
        base_result = the_run.read("eval-base.json")
    with log.stage("eval tuned"):
        tuned_result = evaluate.evaluate(cfg, the_run.path("corpus"), the_run.path("model.cact"),
                                         the_run.path("eval-tuned.json"), limit, progress)
        tracker.metrics(_prefixed("tuned", tuned_result["summary"]["overall"]))

    previous = _baseline(baseline, cfg, log)
    verdict = evaluate.gate(tuned_result, base_result, previous, cfg)
    the_run.update(gate=verdict, eval={
        "base": base_result["summary"]["overall"] if base_result else None,
        "tuned": tuned_result["summary"]["overall"],
        "baseline": previous["summary"]["overall"] if previous else None,
    })
    tracker.tags({"gate": "pass" if verdict["ok"] else "fail"})
    tracker.metric("gate_ok", 1.0 if verdict["ok"] else 0.0)

    with log.stage("report"):
        for path in report.render(the_run, cfg):
            log.say("wrote", path=str(path))
    for name in ("report.md", "model-card.md", "loss.svg", "eval-tuned.json", "eval-base.json",
                 "summary.json", "run.json", "events.jsonl"):
        tracker.artifact(the_run.path(name))
    tracker.artifact(the_run.path("model.cact"), "model")
    tracker.end("FINISHED" if verdict["ok"] else "FAILED")

    print(evaluate.summary_text(tuned_result))
    if base_result:
        b = base_result["summary"]["overall"]["objective"]
        t = tuned_result["summary"]["overall"]["objective"]
        print(f"\nbase {b:.3f} → tuned {t:.3f} ({'+' if t >= b else ''}{t - b:.3f})")
    print("\nGATE:", "PASS" if verdict["ok"] else "FAIL")
    for reason in verdict["reasons"]:
        print(f"  - {reason}")
    if verdict["ok"] and promote:
        for path in registry.write_snapshot(the_run):
            log.say("snapshot", path=str(path))
    print(f"\nrun: {the_run.dir}")
    return verdict["ok"]


def _prefixed(prefix: str, block: dict) -> dict:
    return {f"{prefix}_{k}": v for k, v in block.items() if isinstance(v, (int, float))}


def _baseline(path: str | None, cfg: Config, log: Log) -> dict | None:
    """The evaluation to gate against: a file if given, else the latest
    release's, else nothing (a first run has no history to regress from)."""
    if path:
        return json.loads(Path(path).read_text())
    release = registry.latest_release(cfg.registry)
    if release is None:
        log.say("no published release to gate against")
        return None
    previous = registry.release_eval(release)
    if previous is None:
        log.say("published release carries no eval.json; not gating against it", tag=release["tag"])
    else:
        log.say("gating against the published release", tag=release["tag"])
    return previous
