"""``site-needle``: the pipeline's command line.

    corpus build|check|diff|status   derive the corpus from the site, and know if it is current
    train                            LoRA fine-tune on the corpus, into a run directory
    build                            merge the adapter into the base and export a .cact
    finish                           export, evaluate, gate, report a trained run
    eval                             grade a model (base or tuned) on the test split
    pipeline                         corpus → train → build → eval → report, one run
    report                           re-render a run's report and model card
    probe                            ask a model one question
    publish / pull                   push a run's artifacts out, or fetch the latest release
    ui                               open MLflow over the local runs

Heavy imports (JAX, MLflow, the engine) happen inside the command that
needs them, so ``corpus build`` stays fast and works without the training
extra.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .paths import CONTENT_PATH, CORPUS_DIR, MODELS_DIR, RUNS_DIR, load_config


def _tracking(args) -> bool:
    """MLflow on unless asked otherwise, by flag or by environment (CI sets
    SITE_NEEDLE_NO_TRACKING: a local store on a throwaway runner is noise)."""
    return not args.no_tracking and not os.environ.get("SITE_NEEDLE_NO_TRACKING")


def _corpus_build(args) -> int:
    from . import corpus
    from .log import Log

    log = Log()
    cfg = load_config().corpus
    old = corpus.read_manifest(Path(args.out) / "manifest.json")
    try:
        with log.stage("corpus build", content=str(args.content), out=str(args.out)):
            built = corpus.build(cfg, Path(args.content), Path(args.out),
                                 use_tokenizer=not args.no_tokenizer)
    except corpus.CorpusError as exc:
        print(exc, file=sys.stderr)
        return 1
    for line in corpus.summary_lines(built.manifest):
        print(line)
    changes = corpus.diff(old, built.manifest)
    if old is not None:
        print("changed since the last build:" if changes["corpus_changed"] else
              "unchanged since the last build")
        _print_diff(changes)
    return 0


def _print_diff(changes: dict) -> None:
    for key, items in changes["added"].items():
        print(f"  + {key}: {', '.join(items)}")
    for key, items in changes["removed"].items():
        print(f"  - {key}: {', '.join(items)}")
    for category, delta in changes["counts"].items():
        print(f"  ~ {category}: {delta['before']} -> {delta['after']}")


def _corpus_check(args) -> int:
    """Non-zero when the corpus on disk is not what the content builds now."""
    from . import corpus
    from .content import load_content

    cfg = load_config().corpus
    existing = corpus.read_manifest(Path(args.out) / "manifest.json")
    if existing is None:
        print(f"no corpus at {args.out}; run `site-needle corpus build`", file=sys.stderr)
        return 1
    content = load_content(Path(args.content))
    built = corpus.build_in_memory(content, Path(args.content), cfg, tokenizer=None)
    if built.problems:
        print(corpus.CorpusError(built.problems), file=sys.stderr)
        return 1
    fresh = built.manifest["corpus"]["hash"]
    if fresh != existing["corpus"]["hash"]:
        print(f"stale: corpus on disk is {existing['corpus']['hash'][:19]}, content builds "
              f"{fresh[:19]}; run `site-needle corpus build`", file=sys.stderr)
        _print_diff(corpus.diff(existing, built.manifest))
        return 1
    print(f"current: {fresh[:19]} ({existing['corpus']['counts']['total']} examples)")
    return 0


def _corpus_diff(args) -> int:
    from . import corpus

    new = corpus.read_manifest(Path(args.out) / "manifest.json")
    if new is None:
        print(f"no corpus at {args.out}; run `site-needle corpus build`", file=sys.stderr)
        return 1
    old = corpus.read_manifest(Path(args.against))
    changes = corpus.diff(old, new)
    print(json.dumps(changes, indent=2) if args.json else "")
    if not args.json:
        if old is None:
            print(f"no baseline manifest at {args.against}")
        else:
            print("content changed" if changes["content_changed"] else "content unchanged",
                  "/", "corpus changed" if changes["corpus_changed"] else "corpus unchanged")
            _print_diff(changes)
    return 0


def _corpus_status(args) -> int:
    """Is the published model current with the content? Exit 0 when it is,
    3 when it is stale (or nothing is published), so a scheduled job can
    branch on it."""
    from . import corpus, registry

    cfg = load_config()
    new = corpus.read_manifest(Path(args.out) / "manifest.json")
    if new is None:
        print(f"no corpus at {args.out}; run `site-needle corpus build`", file=sys.stderr)
        return 1
    latest = registry.latest_release(cfg.registry)
    if latest is None:
        print("no published model yet; everything is new")
        return 3
    old = registry.release_manifest(latest)
    changes = corpus.diff(old, new)
    print(f"published: {latest['tag']} ({latest.get('published_at', '')[:10]})")
    if not changes["corpus_changed"]:
        print("current: the published model was trained on this exact corpus")
        return 0
    print("stale: the site's content has changed since the published model was trained")
    _print_diff(changes)
    return 3


def _train(args) -> int:
    from . import train

    cfg = load_config()
    run = train.train(cfg, corpus_dir=Path(args.corpus), runs_dir=Path(args.runs),
                      epochs=args.epochs, run_id=args.run_id, tracking=_tracking(args))
    print(run.dir)
    return 0


def _build(args) -> int:
    from . import train

    run = train.Run.open(Path(args.run))
    print(train.build(run))
    return 0


def _eval(args) -> int:
    from . import evaluate

    cfg = load_config()
    weights = None if args.weights in (None, "base") else Path(args.weights)
    out = Path(args.out) if args.out else None
    result = evaluate.evaluate(cfg, corpus_dir=Path(args.corpus), weights=weights, out=out,
                               limit=args.limit)
    print(evaluate.summary_text(result))
    return 0


def _pipeline(args) -> int:
    from . import pipeline

    cfg = load_config()
    ok = pipeline.run(cfg, content=Path(args.content), corpus_dir=Path(args.corpus),
                      runs_dir=Path(args.runs), epochs=args.epochs, run_id=args.run_id,
                      tracking=_tracking(args), baseline=args.baseline,
                      skip_base_eval=args.skip_base_eval, limit=args.limit,
                      promote=args.promote)
    return 0 if ok else 2


def _finish(args) -> int:
    from . import pipeline, train

    cfg = load_config()
    run = train.Run.open(Path(args.run))
    ok = pipeline.finish(cfg, run, tracking=_tracking(args), baseline=args.baseline,
                         skip_base_eval=args.skip_base_eval, limit=args.limit,
                         promote=args.promote)
    return 0 if ok else 2


def _report(args) -> int:
    from . import report, train

    run = train.Run.open(Path(args.run))
    paths = report.render(run, load_config())
    for path in paths:
        print(path)
    return 0


def _probe(args) -> int:
    from . import evaluate

    weights = None if args.weights in (None, "base") else Path(args.weights)
    response = evaluate.probe(args.query, weights=weights, corpus_dir=Path(args.corpus))
    print(json.dumps(response, indent=2))
    return 0


def _publish(args) -> int:
    from . import registry, train

    cfg = load_config()
    run = train.Run.open(Path(args.run))
    print(registry.publish(run, cfg.registry, hf_repo=args.hf_repo, github=args.github,
                           snapshot=args.snapshot))
    return 0


def _pull(args) -> int:
    from . import registry

    cfg = load_config()
    path = registry.pull(cfg.registry, Path(args.out), tag=args.tag)
    print(path)
    return 0


def _ui(args) -> int:
    import subprocess

    from .tracking import tracking_uri

    return subprocess.call([sys.executable, "-m", "mlflow", "ui", "--backend-store-uri",
                            tracking_uri(), "--port", str(args.port)])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="site-needle", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    def corpus_args(p):
        p.add_argument("--content", default=str(CONTENT_PATH), help="content snapshot")
        p.add_argument("--out", default=str(CORPUS_DIR), help="corpus directory")

    c = sub.add_parser("corpus", help="derive the corpus from the site").add_subparsers(
        dest="corpus_command", required=True)
    p = c.add_parser("build", help="(re)build train/test JSONL and the manifest")
    corpus_args(p)
    p.add_argument("--no-tokenizer", action="store_true",
                   help="estimate token lengths instead of loading the tokenizer")
    p.set_defaults(func=_corpus_build)
    p = c.add_parser("check", help="exit 1 if the corpus on disk is stale")
    corpus_args(p)
    p.set_defaults(func=_corpus_check)
    p = c.add_parser("diff", help="what changed against another manifest")
    corpus_args(p)
    p.add_argument("--against", required=True, help="baseline manifest.json")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=_corpus_diff)
    p = c.add_parser("status", help="is the published model current? (exit 3 when stale)")
    corpus_args(p)
    p.set_defaults(func=_corpus_status)

    p = sub.add_parser("train", help="LoRA fine-tune into a new run directory")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.add_argument("--runs", default=str(RUNS_DIR))
    p.add_argument("--epochs", type=int, default=None, help="override config.toml")
    p.add_argument("--run-id", default=None)
    p.add_argument("--no-tracking", action="store_true", help="skip MLflow")
    p.set_defaults(func=_train)

    p = sub.add_parser("build", help="export a run's adapter as a .cact")
    p.add_argument("run", help="run directory")
    p.set_defaults(func=_build)

    p = sub.add_parser("eval", help="grade a model on the test split")
    p.add_argument("--weights", default=None, help=".cact path, or 'base'")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.add_argument("--out", default=None, help="write eval.json here")
    p.add_argument("--limit", type=int, default=None, help="first N cases only")
    p.set_defaults(func=_eval)

    p = sub.add_parser("pipeline", help="corpus → train → build → eval → report")
    corpus_args(p)
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.add_argument("--runs", default=str(RUNS_DIR))
    p.add_argument("--epochs", type=int, default=None)
    p.add_argument("--run-id", default=None)
    p.add_argument("--no-tracking", action="store_true")
    p.add_argument("--baseline", default=None,
                   help="eval.json to gate against (default: the latest release, if any)")
    p.add_argument("--skip-base-eval", action="store_true")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--promote", action="store_true",
                   help=f"on a passing gate, copy the model snapshot into {MODELS_DIR.name}/")
    p.set_defaults(func=_pipeline)

    p = sub.add_parser("finish", help="export, evaluate, gate, report a trained run")
    p.add_argument("run", help="run directory with an adapter.pkl")
    p.add_argument("--no-tracking", action="store_true")
    p.add_argument("--baseline", default=None)
    p.add_argument("--skip-base-eval", action="store_true",
                   help="reuse the run's eval-base.json if present")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--promote", action="store_true")
    p.set_defaults(func=_finish)

    p = sub.add_parser("report", help="re-render a run's report and model card")
    p.add_argument("run")
    p.set_defaults(func=_report)

    p = sub.add_parser("probe", help="ask a model one question")
    p.add_argument("query")
    p.add_argument("--weights", default=None, help=".cact path, or 'base'")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.set_defaults(func=_probe)

    p = sub.add_parser("publish", help="publish a run's artifacts")
    p.add_argument("run")
    p.add_argument("--hf-repo", default=None, help="Hugging Face repo to upload the .cact to")
    p.add_argument("--github", action="store_true",
                   help="create a GitHub release (needs GITHUB_TOKEN)")
    p.add_argument("--snapshot", action="store_true",
                   help=f"copy the model snapshot into {MODELS_DIR.name}/")
    p.set_defaults(func=_publish)

    p = sub.add_parser("pull", help="download the latest published model")
    p.add_argument("--out", default=str(MODELS_DIR))
    p.add_argument("--tag", default=None)
    p.set_defaults(func=_pull)

    p = sub.add_parser("ui", help="MLflow UI over the local runs")
    p.add_argument("--port", type=int, default=5000)
    p.set_defaults(func=_ui)
    return parser


def main(argv: list[str] | None = None) -> None:
    args = build_parser().parse_args(argv)
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
