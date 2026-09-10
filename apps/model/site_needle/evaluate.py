"""Grades a model — base or tuned — on the held-out test split.

The engine is the judge: every case runs through the same native library
the site would ship, so what is measured is what would be served, not a
JAX approximation of it. Each case records the call the model made, the
one it should have made, and the engine's own timing and memory figures.

The headline number, ``objective``, is the share of cases whose calls
match exactly (names and every argument). Underneath it: tool selection
alone, argument-level precision and recall, and the two refusal errors
that matter separately — refusing an answerable question, and answering
one that should have been refused.
"""

from __future__ import annotations

import hashlib
import json
import statistics
import time
import warnings
from collections import defaultdict
from pathlib import Path

from .catalogue import SYSTEM, TOOLS
from .paths import CORPUS_DIR, EVAL_CACHE_DIR, HANDWRITTEN_PATH, Config


def _canon(call: dict) -> str:
    return json.dumps({"name": call.get("name"), "arguments": call.get("arguments") or {}},
                      sort_keys=True, ensure_ascii=False)


def _triples(calls: list[dict]) -> set[tuple]:
    out = set()
    for call in calls:
        for key, value in (call.get("arguments") or {}).items():
            norm = value.strip().lower() if isinstance(value, str) else json.dumps(value)
            out.add((call.get("name"), key, norm))
    return out


def score(want: list[dict], got: list[dict]) -> dict:
    """Per-case scores. ``exact`` is order-insensitive and strict on values;
    the argument triples are case-insensitive so a casing slip is a partial
    miss rather than a total one."""
    exact = sorted(_canon(c) for c in want) == sorted(_canon(c) for c in got)
    tool_match = sorted(c.get("name") for c in want) == sorted(c.get("name") for c in got)
    w, g = _triples(want), _triples(got)
    return {
        "exact": exact,
        "tool_match": tool_match,
        "refusal_expected": not want,
        "refused": not got,
        "arg_tp": len(w & g),
        "arg_fp": len(g - w),
        "arg_fn": len(w - g),
    }


def _agent(tools, system, weights):
    import needle

    with warnings.catch_warnings():
        # "confidence reports None with tuned weights" — known, and reported.
        warnings.simplefilter("ignore")
        return needle.Needle(tools=tools, system=system,
                             weights=str(weights) if weights else None)


def run_cases(rows: list[dict], weights: Path | None, max_new_tokens: int,
              progress=None) -> list[dict]:
    """One engine call per case, grouped by tool surface so an agent is built
    once per distinct catalogue. Tuned weights run in Needle's worker
    process; the base model runs in this one."""
    # Grouped on the exact serialisation, and the agent is built from the
    # row's own tools object — never from a re-parsed key. The model was
    # trained on the catalogue in one key order; hand the engine another
    # (a sorted-keys dump, say) and tool selection quietly degrades while
    # the reasoning still reads right. That cost one full evaluation.
    groups: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        key = json.dumps({"tools": row["tools"], "system": row.get("system")})
        groups[key].append(row)
    results: list[dict] = []
    done = 0
    for group in groups.values():
        agent = _agent(group[0]["tools"], group[0].get("system"), weights)
        try:
            for row in group:
                agent.reset()
                started = time.perf_counter()
                error = None
                try:
                    response = agent.complete(row["query"], max_new_tokens=max_new_tokens)
                except Exception as exc:  # the engine failing is itself a result
                    response, error = {}, f"{type(exc).__name__}: {exc}"
                ms = (time.perf_counter() - started) * 1000
                got = response.get("function_calls") or []
                results.append({
                    "id": row["id"],
                    "category": row["category"],
                    "slice": row.get("slice") or "",
                    "critical": bool(row.get("critical")),
                    "query": row["query"],
                    "want": row["answers"],
                    "got": got,
                    "reasoning": response.get("reasoning"),
                    "confidence": response.get("confidence"),
                    "ungrounded": (response.get("validation") or {}).get("ungrounded") or [],
                    "ms": round(ms, 1),
                    "prefill_tps": response.get("prefill_tps"),
                    "decode_tps": response.get("decode_tps"),
                    "peak_ram_mb": response.get("peak_ram_mb"),
                    "error": error,
                    **score(row["answers"], got),
                })
                done += 1
                if progress:
                    progress(done, len(rows), results[-1])
        finally:
            close = getattr(agent, "close", None)
            if close:
                close()
    return results


def _rate(items: list[dict], key: str) -> float | None:
    return round(sum(1 for c in items if c[key]) / len(items), 4) if items else None


def _pct(values: list[float], q: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    return round(ordered[min(len(ordered) - 1, int(q * len(ordered)))], 1)


def summarise(cases: list[dict], cfg: Config) -> dict:
    def block(items: list[dict]) -> dict:
        tp = sum(c["arg_tp"] for c in items)
        fp = sum(c["arg_fp"] for c in items)
        fn = sum(c["arg_fn"] for c in items)
        precision = tp / (tp + fp) if tp + fp else None
        recall = tp / (tp + fn) if tp + fn else None
        f1 = (2 * precision * recall / (precision + recall)
              if precision and recall else (0.0 if items else None))
        answerable = [c for c in items if not c["refusal_expected"]]
        refusable = [c for c in items if c["refusal_expected"]]
        return {
            "n": len(items),
            "objective": _rate(items, "exact"),
            "tool_accuracy": _rate(items, "tool_match"),
            "arg_precision": round(precision, 4) if precision is not None else None,
            "arg_recall": round(recall, 4) if recall is not None else None,
            "arg_f1": round(f1, 4) if f1 is not None else None,
            "false_refusal_rate": _rate(answerable, "refused"),
            "missed_refusal_rate": (
                round(sum(1 for c in refusable if not c["refused"]) / len(refusable), 4)
                if refusable else None),
        }

    by_category = {k: block(v) for k, v in sorted(_group(cases, "category").items())}
    by_slice = {k: block(v) for k, v in sorted(_group(cases, "slice").items())}
    by_tool = {k: block(v) for k, v in sorted(_group_by_tool(cases).items())}
    critical = [c for c in cases
                if c["critical"] or c["category"].split(":")[-1] in cfg.eval.critical_categories]
    ms = [c["ms"] for c in cases if c.get("ms") is not None]
    overall = block(cases)
    overall.update({
        "critical_n": len(critical),
        "critical_pass": _rate(critical, "exact"),
        "errors": sum(1 for c in cases if c.get("error")),
        "latency_ms": {"p50": _pct(ms, 0.5), "p95": _pct(ms, 0.95),
                       "mean": round(statistics.fmean(ms), 1) if ms else None},
        "prefill_tps": _mean(cases, "prefill_tps"),
        "decode_tps": _mean(cases, "decode_tps"),
        "peak_ram_mb": max((c["peak_ram_mb"] for c in cases if c.get("peak_ram_mb")),
                           default=None),
    })
    return {"overall": overall, "by_category": by_category, "by_slice": by_slice,
            "by_tool": by_tool}


def _mean(cases: list[dict], key: str) -> float | None:
    values = [c[key] for c in cases if isinstance(c.get(key), (int, float))]
    return round(statistics.fmean(values), 1) if values else None


def _group(cases: list[dict], key: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for case in cases:
        out[case.get(key) or "-"].append(case)
    return out


def _group_by_tool(cases: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for case in cases:
        names = sorted({c["name"] for c in case["want"]}) or ["(refusal)"]
        for name in names:
            out[name].append(case)
    return out


def load_rows(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def load_test(corpus_dir: Path, limit: int | None = None) -> list[dict]:
    path = corpus_dir / "test.jsonl"
    if not path.exists():
        raise FileNotFoundError(f"no test split at {path}; run `site-needle corpus build`")
    rows = load_rows(path)
    return rows[:limit] if limit else rows


def load_set(path: Path, corpus_dir: Path, slice_name: str | None = None) -> list[dict]:
    """An evaluation set written by hand: ``{id, query, answers, category?,
    critical?, note?}`` per line. The catalogue and system text come from
    the corpus directory so the rows are graded against exactly what the
    model was trained on."""
    tools_path, system_path = corpus_dir / "tools.json", corpus_dir / "system.txt"
    tools = json.loads(tools_path.read_text()) if tools_path.exists() else TOOLS
    system = system_path.read_text().strip() if system_path.exists() else SYSTEM
    slice_name = slice_name or path.stem
    rows = []
    for i, row in enumerate(load_rows(path)):
        calls = row.get("answers") or []
        category = row.get("category") or (
            "refusal" if not calls else "+".join(sorted({c["name"] for c in calls})))
        rows.append({
            "id": row.get("id") or f"{slice_name}:{i}",
            "kind": "assistant",
            "category": category,
            "slice": row.get("slice") or slice_name,
            "critical": bool(row.get("critical")),
            "query": row["query"],
            "answers": calls,
            "tools": tools,
            "system": system,
            "note": row.get("note"),
        })
    return rows


def load_handwritten(corpus_dir: Path, path: Path = HANDWRITTEN_PATH) -> list[dict]:
    return load_set(path, corpus_dir, "handwritten") if path.exists() else []


def rows_hash(rows: list[dict]) -> str:
    """Identity of an evaluation set: the questions, the expected calls and
    the catalogue they are graded under."""
    digest = hashlib.sha256()
    for row in rows:
        digest.update(json.dumps(
            {"id": row.get("id"), "query": row["query"], "answers": row.get("answers"),
             "tools": row.get("tools"), "system": row.get("system")},
            sort_keys=True, ensure_ascii=False).encode())
    return digest.hexdigest()


def model_key(weights: Path | None) -> str:
    """Identity of a model for caching: the base model by its library
    version, tuned weights by their bytes."""
    if weights is None:
        try:
            from importlib.metadata import version
            return f"base-needle{version('cactus-needle')}"
        except Exception:  # pragma: no cover - metadata missing
            return "base"
    return hashlib.sha256(weights.read_bytes()).hexdigest()[:16]


def evaluate(cfg: Config, corpus_dir: Path = CORPUS_DIR, weights: Path | None = None,
             out: Path | None = None, limit: int | None = None, progress=None,
             rows: list[dict] | None = None, name: str = "test") -> dict:
    """Grade ``weights`` (``None`` for the base model) on ``rows`` — by
    default the corpus's test split."""
    rows = load_test(corpus_dir, limit) if rows is None else (rows[:limit] if limit else rows)
    manifest_path = corpus_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    started = time.time()
    cases = run_cases(rows, weights, cfg.eval.max_new_tokens, progress)
    result = {
        "model": str(weights) if weights else "base",
        "model_sha256": (hashlib.sha256(weights.read_bytes()).hexdigest() if weights else None),
        "set": name,
        "rows_hash": rows_hash(rows),
        "corpus_hash": manifest.get("corpus", {}).get("hash"),
        "content_hash": manifest.get("content", {}).get("hash"),
        "n": len(cases),
        "seconds": round(time.time() - started, 1),
        "summary": summarise(cases, cfg),
        "cases": cases,
    }
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return result


def cached(cfg: Config, rows: list[dict], weights: Path | None, name: str,
           cache_dir: Path = EVAL_CACHE_DIR, limit: int | None = None, progress=None,
           corpus_dir: Path | None = None) -> dict:
    """``evaluate`` behind a cache keyed on the model and the rows, so the
    base model is graded once per test split and a run graded during
    training is not graded again by ``finish`` or ``compare``. A partial
    evaluation (``limit``) is never cached."""
    key = f"{model_key(weights)}-{name}-{rows_hash(rows)[:12]}.json"
    path = cache_dir / key
    if limit is None and path.exists():
        result = json.loads(path.read_text())
        result["cached"] = True
        return result
    result = evaluate(cfg, corpus_dir or CORPUS_DIR, weights, None, limit, progress, rows, name)
    if limit is None:
        cache_dir.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return result


def gate(tuned: dict, base: dict | None, baseline: dict | None, cfg: Config) -> dict:
    """Should this model ship? It must not trail the base model it was tuned
    from, must not trail the previous release by more than the tolerance,
    and must pass the critical categories."""
    reasons: list[str] = []
    t = tuned["summary"]["overall"]
    if t["errors"]:
        reasons.append(f"{t['errors']} engine error(s) during evaluation")
    if base is not None:
        b = base["summary"]["overall"]["objective"]
        if t["objective"] is not None and b is not None and t["objective"] < b:
            reasons.append(f"objective {t['objective']:.3f} is below the base model's {b:.3f}")
    if baseline is not None:
        prev = baseline["summary"]["overall"]["objective"]
        if prev is not None and t["objective"] < prev - cfg.eval.tolerance:
            reasons.append(
                f"objective {t['objective']:.3f} trails the previous release's {prev:.3f} "
                f"by more than {cfg.eval.tolerance}")
    warnings: list[str] = []
    if t["critical_n"] and (t["critical_pass"] or 0) < cfg.eval.critical_min_pass:
        note = f"critical categories pass {t['critical_pass']:.2f} < {cfg.eval.critical_min_pass}"
        (reasons if cfg.eval.critical_blocking else warnings).append(note)
    return {"ok": not reasons, "reasons": reasons, "warnings": warnings,
            "objective": t["objective"],
            "base_objective": base["summary"]["overall"]["objective"] if base else None,
            "baseline_objective": (baseline["summary"]["overall"]["objective"]
                                   if baseline else None)}


def summary_text(result: dict) -> str:
    o = result["summary"]["overall"]
    lines = [
        f"model: {result['model']}   cases: {result['n']}   {result['seconds']}s",
        f"objective (exact call) {o['objective']:.3f}   tool accuracy {o['tool_accuracy']:.3f}"
        f"   arg F1 {o['arg_f1'] if o['arg_f1'] is not None else '-'}",
        f"false refusals {o['false_refusal_rate']}   missed refusals {o['missed_refusal_rate']}"
        f"   critical {o['critical_pass']} of {o['critical_n']}",
        f"latency p50 {o['latency_ms']['p50']}ms p95 {o['latency_ms']['p95']}ms   "
        f"decode {o['decode_tps']} tok/s   peak RAM {o['peak_ram_mb']}MB",
        "by category:",
    ]
    for name, block in result["summary"]["by_category"].items():
        lines.append(f"  {name:32} {block['objective']:.2f}  (n={block['n']})")
    lines.append("by slice:")
    for name, block in result["summary"]["by_slice"].items():
        lines.append(f"  {name:32} {block['objective']:.2f}  (n={block['n']})")
    return "\n".join(lines)


def probe(query: str, weights: Path | None = None, corpus_dir: Path = CORPUS_DIR) -> dict:
    """One question against the assistant catalogue."""
    tools_path = corpus_dir / "tools.json"
    tools = json.loads(tools_path.read_text()) if tools_path.exists() else TOOLS
    system_path = corpus_dir / "system.txt"
    system = system_path.read_text().strip() if system_path.exists() else SYSTEM
    agent = _agent(tools, system, weights)
    try:
        return agent.complete(query)
    finally:
        close = getattr(agent, "close", None)
        if close:
            close()
