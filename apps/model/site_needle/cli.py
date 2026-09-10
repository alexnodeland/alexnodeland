"""``site-needle``: the pipeline's command line.

    corpus build|check|diff|status   derive the corpus from the site, and know if it is current
    train                            LoRA fine-tune on the corpus, into a run directory
    build                            merge the adapter into the base and export a .cact
    finish                           export, evaluate, gate, report a trained run
    eval                             grade a model (base or tuned) on the test split
    analyze                          diversity, duplicates, coverage, clusters, misses
    pipeline                         corpus → train → build → eval → report, one run
    report                           re-render a run's report and model card
    probe                            ask a model one question
    publish / promote / pull         the Hugging Face registry and the pointer the site uses
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
                                 use_tokenizer=not args.no_tokenizer,
                                 augment=args.augment, natural=args.natural,
                                 provider=args.provider, augment_model=args.augment_model,
                                 regenerate=args.regenerate)
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
    fresh = built.manifest["corpus"]["template_hash"]
    on_disk = existing["corpus"].get("template_hash") or existing["corpus"]["hash"]
    if fresh != on_disk:
        print(f"stale: corpus on disk is {on_disk[:19]}, content builds "
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
    pointer = registry.read_pointer()
    if pointer is None:
        print(f"no published model yet ({registry.POINTER_PATH.name} is missing); "
              "everything is new")
        return 3
    old = registry.published_manifest(cfg.registry, pointer)
    if old is None:
        print(f"cannot read manifest.json from {pointer['repo']}@{pointer['revision'][:12]}; "
              "is the repo reachable?", file=sys.stderr)
        return 1
    changes = corpus.diff(old, new)
    print(f"published: {pointer['repo']}@{pointer['tag']} "
          f"(run {pointer['run_id']}, {pointer.get('published_at', '')[:10]})")
    if not changes["corpus_changed"]:
        print("current: the published model was trained on this exact corpus")
        return 0
    print("stale: the site's content has changed since the published model was trained")
    _print_diff(changes)
    return 3


def _corpus_publish(args) -> int:
    from . import registry

    cfg = load_config()
    result = registry.publish_dataset(Path(args.out), cfg.registry)
    print(f"dataset: {result['url']}  ({result['revision'][:12]})")
    return 0


def _train(args) -> int:
    from . import train

    cfg = load_config()
    run = train.train(cfg, corpus_dir=Path(args.corpus), runs_dir=Path(args.runs),
                      epochs=args.epochs, run_id=args.run_id, tracking=_tracking(args),
                      grade_epochs=False if args.no_epoch_grading else None)
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
    corpus_dir = Path(args.corpus)
    rows, name = None, "test"
    if args.set:
        rows, name = evaluate.load_set(Path(args.set), corpus_dir), Path(args.set).stem
    result = evaluate.evaluate(cfg, corpus_dir=corpus_dir, weights=weights, out=out,
                               limit=args.limit, rows=rows, name=name)
    print(evaluate.summary_text(result))
    return 0


def _compare(args) -> int:
    from . import compare, evaluate

    cfg = load_config()
    corpus_dir = Path(args.corpus)
    sets = {"test": evaluate.load_test(corpus_dir)}
    if not args.no_handwritten:
        handwritten = evaluate.load_handwritten(corpus_dir)
        if handwritten:
            sets["handwritten"] = handwritten
    for path in args.set or []:
        sets[Path(path).stem] = evaluate.load_set(Path(path), corpus_dir)

    def progress(label, name):
        def report(done, total, case):
            if done % 50 == 0 or done == total:
                print(f"  {label} on {name}: {done}/{total}", flush=True)
        return report

    result = compare.compare(cfg, args.models, sets, corpus_dir, limit=args.limit,
                             progress=progress)
    text = compare.render(result)
    print(text)
    for path in compare.write(result, Path(args.out) if args.out else RUNS_DIR / "compare"):
        print(path)
    return 0


def _pipeline(args) -> int:
    from . import pipeline

    cfg = load_config()
    ok = pipeline.run(cfg, content=Path(args.content), corpus_dir=Path(args.corpus),
                      runs_dir=Path(args.runs), epochs=args.epochs, run_id=args.run_id,
                      tracking=_tracking(args), baseline=args.baseline,
                      skip_base_eval=args.skip_base_eval, limit=args.limit,
                      promote=args.promote,
                      augment=dict(augment=args.augment, natural=args.natural,
                                   provider=args.provider, augment_model=args.augment_model,
                                   regenerate=args.regenerate))
    return 0 if ok else 2


def _finish(args) -> int:
    from . import pipeline, train

    cfg = load_config()
    run = train.Run.open(Path(args.run))
    ok = pipeline.finish(cfg, run, tracking=_tracking(args), baseline=args.baseline,
                         skip_base_eval=args.skip_base_eval, limit=args.limit,
                         promote=args.promote)
    return 0 if ok else 2


def _analyze(args) -> int:
    from . import analysis

    evaluation = json.loads(Path(args.eval).read_text()) if args.eval else None
    corpus_dir = Path(args.corpus)
    result = analysis.analyze(corpus_dir, evaluation, args.clusters)
    out = Path(args.out) if args.out else corpus_dir / "analysis"
    for path in analysis.write(result, out):
        print(path)
    d, lk = result["duplicates"], result["leakage"]
    print(f"{result['n']} questions; near-duplicate pairs {d['near_pairs']}, leakage pairs "
          f"{lk.get('pairs', 0)}; clusters k={result['clusters']['k']} with "
          f"{result['clusters']['mixed']} mixed")
    if result.get("diagnosis"):
        print("misses:", result["diagnosis"]["by_verdict"])
    return 0


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
    from . import registry

    cfg = load_config()
    if args.promote:
        result = registry.promote(Path(args.source), cfg.registry, dataset=not args.no_dataset)
    else:
        model = registry.publish_model(Path(args.source), cfg.registry)
        result = {"model": model, "dataset": None}
        if not args.no_dataset and (Path(args.source) / "corpus" / "manifest.json").exists():
            result["dataset"] = registry.publish_dataset(Path(args.source) / "corpus",
                                                         cfg.registry)
    print(registry.describe(result))
    return 0


def _promote(args) -> int:
    from . import registry

    cfg = load_config()
    result = registry.promote(Path(args.source), cfg.registry, dataset=not args.no_dataset)
    print(registry.describe(result))
    return 0


def _pull(args) -> int:
    from . import registry

    cfg = load_config()
    print(registry.pull(cfg.registry, Path(args.out), revision=args.revision))
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

    def augment_args(p):
        p.add_argument("--augment", type=int, default=0,
                       help="add about N generated training paraphrases")
        p.add_argument("--natural", type=int, default=0,
                       help="add about M generated natural questions to the test split")
        p.add_argument("--provider", default="claude-agent",
                       choices=["claude-agent", "anthropic", "openrouter"],
                       help="who writes them: the Claude Agent SDK (local Claude Code login), "
                            "the Anthropic API (ANTHROPIC_API_KEY), or Needle's OpenRouter "
                            "generator (OPENROUTER_API_KEY)")
        p.add_argument("--augment-model", default=None, help="model id for the provider")
        p.add_argument("--regenerate", action="store_true",
                       help="ignore the generations kept under augment/")

    c = sub.add_parser("corpus", help="derive the corpus from the site").add_subparsers(
        dest="corpus_command", required=True)
    p = c.add_parser("build", help="(re)build train/test JSONL and the manifest")
    corpus_args(p)
    p.add_argument("--no-tokenizer", action="store_true",
                   help="estimate token lengths instead of loading the tokenizer")
    augment_args(p)
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

    p = c.add_parser("publish", help="push the corpus, its analysis, the hand-written set and "
                                     "the kept generations to the dataset repo (needs HF_TOKEN)")
    corpus_args(p)
    p.set_defaults(func=_corpus_publish)

    p = sub.add_parser("train", help="LoRA fine-tune into a new run directory")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.add_argument("--runs", default=str(RUNS_DIR))
    p.add_argument("--epochs", type=int, default=None, help="override config.toml")
    p.add_argument("--run-id", default=None)
    p.add_argument("--no-tracking", action="store_true", help="skip MLflow")
    p.add_argument("--no-epoch-grading", action="store_true",
                   help="save each epoch's adapter but do not export and grade it; "
                        "the epoch is then chosen by validation loss")
    p.set_defaults(func=_train)

    p = sub.add_parser("build", help="export a run's adapter as a .cact")
    p.add_argument("run", help="run directory")
    p.set_defaults(func=_build)

    p = sub.add_parser("eval", help="grade a model on the test split")
    p.add_argument("--weights", default=None, help=".cact path, or 'base'")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.add_argument("--out", default=None, help="write eval.json here")
    p.add_argument("--limit", type=int, default=None, help="first N cases only")
    p.add_argument("--set", default=None,
                   help="grade a hand-written JSONL set instead of the test split")
    p.set_defaults(func=_eval)

    p = sub.add_parser("compare", help="several models on one test split, side by side, "
                                        "with the per-case flips between them")
    p.add_argument("models", nargs="+",
                   help="'base', run directories, the models/ snapshot, or .cact files; "
                        "the first is the reference")
    p.add_argument("--corpus", default=str(CORPUS_DIR), help="whose test split to grade on")
    p.add_argument("--set", action="append", default=None,
                   help="an extra hand-written JSONL set (repeatable)")
    p.add_argument("--no-handwritten", action="store_true",
                   help="skip evals/handwritten.jsonl")
    p.add_argument("--limit", type=int, default=None, help="first N cases only (uncached)")
    p.add_argument("--out", default=None, help="directory for compare.md/.json")
    p.set_defaults(func=_compare)

    p = sub.add_parser("pipeline", help="corpus → train → build → eval → report")
    corpus_args(p)
    augment_args(p)
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

    p = sub.add_parser("analyze", help="diversity, duplicates, coverage, clusters, a map, "
                                        "and a diagnosis of an evaluation's misses")
    p.add_argument("--corpus", default=str(CORPUS_DIR), help="corpus directory (or a run's)")
    p.add_argument("--eval", default=None, help="an eval.json to diagnose misses from")
    p.add_argument("--out", default=None, help="output directory (default: <corpus>/analysis)")
    p.add_argument("--clusters", type=int, default=None, help="number of clusters")
    p.set_defaults(func=_analyze)

    p = sub.add_parser("report", help="re-render a run's report and model card")
    p.add_argument("run")
    p.set_defaults(func=_report)

    p = sub.add_parser("probe", help="ask a model one question")
    p.add_argument("query")
    p.add_argument("--weights", default=None, help=".cact path, or 'base'")
    p.add_argument("--corpus", default=str(CORPUS_DIR))
    p.set_defaults(func=_probe)

    p = sub.add_parser("publish", help="push a run (or a snapshot) to the model repo on the "
                                       "Hub, tagged run-<id>; needs HF_TOKEN")
    p.add_argument("source", help="run directory, or a snapshot directory with site-needle.cact")
    p.add_argument("--no-dataset", action="store_true",
                   help="do not also publish the run's corpus to the dataset repo")
    p.add_argument("--promote", action="store_true",
                   help=f"also move {MODELS_DIR.name}/site-needle.json to the new revision")
    p.set_defaults(func=_publish)

    p = sub.add_parser("promote", help="publish a run and point the site at it "
                                       f"({MODELS_DIR.name}/site-needle.json)")
    p.add_argument("source", help="run directory, or a snapshot directory with site-needle.cact")
    p.add_argument("--no-dataset", action="store_true")
    p.set_defaults(func=_promote)

    p = sub.add_parser("pull", help="materialise the published model (the pointer's revision) "
                                    f"into {MODELS_DIR.name}/")
    p.add_argument("--out", default=str(MODELS_DIR))
    p.add_argument("--revision", default=None, help="a commit, tag or branch instead")
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
