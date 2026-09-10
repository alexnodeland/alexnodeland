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

    corpus = the_run.path("corpus")
    weights = the_run.path("model.cact")
    sets = {"test": evaluate.load_test(corpus, limit)}
    handwritten = evaluate.load_handwritten(corpus)
    if handwritten:
        sets["handwritten"] = handwritten[:limit] if limit else handwritten

    def grade(name: str, rows: list[dict], model: Path | None) -> dict:
        who = "tuned" if model else "base"
        suffix = "" if name == "test" else f"-{name}"
        out = the_run.path(f"eval-{who}{suffix}.json")
        if model is None and skip_base_eval and out.exists():
            return the_run.read(out.name)
        with log.stage(f"eval {who} {name}"):
            result = evaluate.cached(cfg, rows, model, name, limit=limit, progress=progress,
                                     corpus_dir=corpus)
            log.say("graded", set=name, model=who, cached=bool(result.get("cached")),
                    objective=result["summary"]["overall"]["objective"])
        out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
        if name == "test":
            tracker.metrics(_prefixed(who, result["summary"]["overall"]))
        else:
            tracker.metrics(_prefixed(f"{who}_{name}", result["summary"]["overall"]))
        return result

    base_result = grade("test", sets["test"], None)
    tuned_result = grade("test", sets["test"], weights)
    extra = {name: {"base": grade(name, rows, None)["summary"]["overall"],
                    "tuned": grade(name, rows, weights)["summary"]["overall"]}
             for name, rows in sets.items() if name != "test"}

    previous = _baseline(baseline, cfg, log)
    verdict = evaluate.gate(tuned_result, base_result, previous, cfg)
    the_run.update(gate=verdict, eval={
        "base": base_result["summary"]["overall"] if base_result else None,
        "tuned": tuned_result["summary"]["overall"],
        "baseline": previous["summary"]["overall"] if previous else None,
        **extra,
    })
    tracker.tags({"gate": "pass" if verdict["ok"] else "fail"})
    tracker.metric("gate_ok", 1.0 if verdict["ok"] else 0.0)

    with log.stage("report"):
        for path in report.render(the_run, cfg):
            log.say("wrote", path=str(path))
    for name in ("report.md", "model-card.md", "loss.svg", "eval-tuned.json", "eval-base.json",
                 "eval-tuned-handwritten.json", "eval-base-handwritten.json",
                 "summary.json", "run.json", "events.jsonl"):
        if the_run.path(name).exists():
            tracker.artifact(the_run.path(name))
    tracker.artifact(the_run.path("model.cact"), "model")
    tracker.end("FINISHED" if verdict["ok"] else "FAILED")

    print(evaluate.summary_text(tuned_result))
    if base_result:
        b = base_result["summary"]["overall"]["objective"]
        t = tuned_result["summary"]["overall"]["objective"]
        print(f"\nbase {b:.3f} → tuned {t:.3f} ({'+' if t >= b else ''}{t - b:.3f})")
    for name, block in extra.items():
        print(f"{name}: base {block['base']['objective']:.3f} → tuned "
              f"{block['tuned']['objective']:.3f} ({block['tuned']['n']} cases)")
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
