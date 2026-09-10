"""Several models, one test split, side by side.

Runs train on different corpora, so their own reports are not comparable:
each was graded on its own held-out rows. ``compare`` grades every model
on the same rows — the current corpus's test split and the hand-written
set — through the evaluation cache, then prints the table that decides
between them and the per-case flips that say *where* one model beats
another: which questions it fixed, which it broke, which nobody gets yet.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

from . import evaluate
from .paths import EVAL_CACHE_DIR, RUNS_DIR, Config

EXAMPLES = 8


def resolve(spec: str) -> tuple[str, Path | None]:
    """``base``; a run directory (``model.cact``); the snapshot directory
    (``site-needle.cact``); or a ``.cact`` file. Returns a label and the
    weights path (``None`` for the base model)."""
    if spec == "base":
        return "base", None
    path = Path(spec)
    if path.is_dir():
        for name in ("model.cact", "site-needle.cact"):
            if (path / name).exists():
                return path.resolve().name, path / name
        raise FileNotFoundError(f"{path} has no model.cact or site-needle.cact")
    if path.suffix == ".cact" and path.exists():
        return f"{path.resolve().parent.name}/{path.name}", path
    raise FileNotFoundError(f"not a model: {spec}")


def calls_text(calls: list[dict]) -> str:
    if not calls:
        return "∅"
    return "; ".join(
        f"{c.get('name')}({', '.join(f'{k}={v!r}' for k, v in (c.get('arguments') or {}).items())})"
        for c in calls)


def flips(reference: dict, other: dict) -> dict:
    """Per-case changes from ``reference`` to ``other``: fixed (wrong →
    right), broken (right → wrong), and still wrong in both."""
    before = {c["id"]: c for c in reference["cases"]}
    fixed, broken, still = [], [], []
    for case in other["cases"]:
        prior = before.get(case["id"])
        if prior is None:
            continue
        entry = {"id": case["id"], "query": case["query"], "want": calls_text(case["want"]),
                 "before": calls_text(prior["got"]), "after": calls_text(case["got"])}
        if not prior["exact"] and case["exact"]:
            fixed.append(entry)
        elif prior["exact"] and not case["exact"]:
            broken.append(entry)
        elif not case["exact"]:
            still.append(entry)
    return {"fixed": len(fixed), "broken": len(broken), "still_wrong": len(still),
            "examples": {"fixed": fixed[:EXAMPLES], "broken": broken[:EXAMPLES],
                         "still_wrong": still[:EXAMPLES]}}


def compare(cfg: Config, specs: list[str], sets: dict[str, list[dict]], corpus_dir: Path,
            cache_dir: Path = EVAL_CACHE_DIR, limit: int | None = None, progress=None) -> dict:
    models = [resolve(s) for s in specs]
    if len({label for label, _ in models}) != len(models):
        raise ValueError("two models resolve to the same label; pass distinct paths")
    out = {"models": [label for label, _ in models], "created_at":
           datetime.now(UTC).isoformat(timespec="seconds"), "sets": {}}
    for name, rows in sets.items():
        graded = {}
        for label, weights in models:
            graded[label] = evaluate.cached(cfg, rows, weights, name, cache_dir, limit,
                                            progress(label, name) if progress else None,
                                            corpus_dir)
        reference = models[0][0]
        entry = {
            "n": graded[reference]["n"],
            "rows_hash": graded[reference]["rows_hash"],
            "overall": {label: r["summary"]["overall"] for label, r in graded.items()},
            "by_slice": _breakdown(graded, "by_slice"),
            "by_tool": _breakdown(graded, "by_tool"),
            "by_category": _breakdown(graded, "by_category"),
            "flips": {label: flips(graded[reference], r)
                      for label, r in graded.items() if label != reference},
        }
        out["sets"][name] = entry
    return out


def _breakdown(graded: dict[str, dict], key: str) -> dict:
    names: list[str] = []
    for r in graded.values():
        for n in r["summary"][key]:
            if n not in names:
                names.append(n)
    return {n: {label: r["summary"][key].get(n) for label, r in graded.items()} for n in names}


def _f(value, digits: int = 3) -> str:
    return f"{value:.{digits}f}" if isinstance(value, (int, float)) else "-"


def render(result: dict) -> str:
    models = result["models"]
    lines = [f"# Compare — {', '.join(f'`{m}`' for m in models)}", "",
             f"rendered {result['created_at']}; the first model is the reference for the flips.",
             ""]
    for name, entry in result["sets"].items():
        lines += [f"## {name} ({entry['n']} cases, rows `{entry['rows_hash'][:12]}`)", "",
                  "| model | objective | tool accuracy | arg F1 | false refusals | "
                  "missed refusals | critical | p50 ms |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|"]
        for label in models:
            o = entry["overall"][label]
            lines.append(
                f"| `{label}` | {_f(o['objective'])} | {_f(o['tool_accuracy'])} | "
                f"{_f(o['arg_f1'])} | {_f(o['false_refusal_rate'])} | "
                f"{_f(o['missed_refusal_rate'])} | {_f(o['critical_pass'], 2)} of "
                f"{o['critical_n']} | {_f(o['latency_ms']['p50'], 0)} |")
        for key, title in (("by_slice", "By slice"), ("by_tool", "By expected tool"),
                           ("by_category", "By category")):
            lines += ["", f"### {title}", "",
                      "| " + " | ".join(["", *models]) + " |",
                      "|---|" + "---:|" * len(models)]
            for row_name, per_model in entry[key].items():
                cells = []
                for label in models:
                    block = per_model.get(label)
                    cells.append(f"{_f(block['objective'], 2)} (n={block['n']})" if block else "-")
                lines.append(f"| {row_name} | " + " | ".join(cells) + " |")
        for label, fl in entry["flips"].items():
            lines += ["", f"### `{label}` against `{models[0]}`", "",
                      f"fixed {fl['fixed']}, broke {fl['broken']}, "
                      f"still wrong {fl['still_wrong']}"]
            for kind, title in (("fixed", "Fixed"), ("broken", "Broken"),
                                ("still_wrong", "Still wrong")):
                examples = fl["examples"][kind]
                if not examples:
                    continue
                lines += ["", f"{title}:", ""]
                for e in examples:
                    lines.append(f"- *{e['query']}* — want `{e['want']}`; "
                                 f"before `{e['before']}`, after `{e['after']}`")
        lines.append("")
    return "\n".join(lines)


def write(result: dict, out_dir: Path = RUNS_DIR / "compare") -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    md, js = out_dir / f"{stamp}.md", out_dir / f"{stamp}.json"
    md.write_text(render(result))
    js.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return [md, js]
