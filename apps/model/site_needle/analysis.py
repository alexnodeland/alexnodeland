"""What is in the corpus, and is it any good.

The corpus is the model: every miss so far traced back to phrasing the
training set did not have, a name it treated like one of Alex's, or two
sources of questions overlapping in a way the split did not intend. This
module makes those things visible before a two-hour run spends the compute:

- **lexical diversity** per source and per tool — vocabulary, distinct
  n-gram ratios, length, how formulaic the openings are;
- **duplicates and near-duplicates** (TF-IDF cosine over word uni- and
  bigrams), and **leakage**: a training question that is nearly a test one;
- **distance from the templates**: does a generated paraphrase say
  something the templates did not, or restate one;
- **label drift**: a question whose nearest neighbours mostly carry a
  different label — a mislabel, or an ambiguity the model must learn;
- **coverage**: entities, enum values, refusal categories and phrasing
  families per split and per source;
- **clusters** of phrasing with their label purity and source mix, and a
  two-dimensional **map**;
- **diagnosis** of an evaluation's misses by nearest training neighbours:
  a coverage gap, a phrasing conflict between two labels, or a plain model
  error.

Everything is TF-IDF and scikit-learn: no model download, seconds to run.
"""

from __future__ import annotations

import json
import math
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

WORD = re.compile(r"[a-z0-9][a-z0-9'./+#-]*")
NEAR_DUPLICATE = 0.9
LEAKAGE = 0.9
COVERAGE_GAP = 0.35
LABEL_DRIFT_SIM = 0.3
LABEL_DRIFT_AGREEMENT = 0.8

# Fixed categorical order (the reference dataviz palette, light surface):
# identity by hue for the first three, hue plus shape after that.
PALETTE = [
    ("lookup_role", "#2a78d6", "circle"),
    ("lookup_project", "#eb6834", "circle"),
    ("check_skill", "#1baf7a", "circle"),
    ("search_site", "#eda100", "square"),
    ("contact", "#e87ba4", "diamond"),
    ("(refusal)", "#008300", "triangle"),
]
OTHER = ("other", "#8a8a8a", "circle")


def _sklearn():
    try:
        import sklearn  # noqa: F401
    except ImportError as exc:
        raise RuntimeError(
            "the analysis needs scikit-learn: `uv sync --extra analysis`") from exc


@dataclass
class Row:
    id: str
    kind: str
    category: str
    split: str
    slice: str
    source: str  # template | augmented | natural
    query: str
    tool: str  # first call's name, "(refusal)", or "parallel"
    entities: tuple[str, ...]
    family: str
    answers: list[dict] = field(default_factory=list)

    @classmethod
    def from_json(cls, raw: dict) -> Row:
        rid = raw["id"]
        source = ("natural" if rid.startswith("natural:")
                  else "augmented" if rid.startswith("augmented:") else "template")
        answers = raw.get("answers") or []
        names = [a.get("name") for a in answers]
        tool = "(refusal)" if not names else ("parallel" if len(names) > 1 else names[0])
        return cls(rid, raw.get("kind", ""), raw.get("category", ""), raw.get("split", ""),
                   raw.get("slice", "") or "", source, raw["query"], tool,
                   tuple(raw.get("entities") or ()), raw.get("family", ""), answers)


def load_rows(corpus_dir: Path, kinds: tuple[str, ...] = ("assistant",)) -> list[Row]:
    rows: list[Row] = []
    for name in ("train.jsonl", "test.jsonl"):
        path = corpus_dir / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            if line.strip():
                row = Row.from_json(json.loads(line))
                if row.kind in kinds:
                    rows.append(row)
    return rows


def words(text: str) -> list[str]:
    return WORD.findall(text.lower())


# --- lexical diversity ---------------------------------------------------------


def lexical(texts: list[str]) -> dict:
    toks = [words(t) for t in texts]
    flat = [w for t in toks for w in t]
    lengths = [len(t) for t in toks]
    if not flat:
        return {"n": len(texts)}

    def distinct(n: int) -> float:
        grams = [tuple(t[i:i + n]) for t in toks for i in range(len(t) - n + 1)]
        return round(len(set(grams)) / len(grams), 3) if grams else 0.0

    starters = Counter(t[0] for t in toks if t)
    top = starters.most_common(3)
    return {
        "n": len(texts),
        "tokens": len(flat),
        "vocab": len(set(flat)),
        "type_token_ratio": round(len(set(flat)) / len(flat), 3),
        "distinct_1": distinct(1),
        "distinct_2": distinct(2),
        "distinct_3": distinct(3),
        "length_mean": round(statistics.fmean(lengths), 1),
        "length_median": int(statistics.median(lengths)),
        "length_p95": sorted(lengths)[min(len(lengths) - 1, int(0.95 * len(lengths)))],
        "top_openers": [(w, round(c / len(toks), 3)) for w, c in top],
        "opener_concentration": round(sum(c for _, c in top) / len(toks), 3),
    }


# --- similarity ------------------------------------------------------------------


def vectorize(texts: list[str]):
    _sklearn()
    from sklearn.feature_extraction.text import TfidfVectorizer

    vec = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, token_pattern=WORD.pattern,
                          lowercase=True)
    return vec.fit_transform(texts), vec


def _dense_sim(a, b):
    return (a @ b.T).toarray()


def near_duplicates(rows: list[Row], X, threshold: float = NEAR_DUPLICATE) -> dict:
    """Exact duplicates (after lower-casing and whitespace) and near ones
    (cosine at or above ``threshold``), with who they are between."""
    exact: dict[str, list[int]] = defaultdict(list)
    for i, r in enumerate(rows):
        exact[" ".join(r.query.lower().split())].append(i)
    exact_groups = [ix for ix in exact.values() if len(ix) > 1]
    sim = _dense_sim(X, X)
    pairs = []
    n = len(rows)
    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= threshold and rows[i].query.lower() != rows[j].query.lower():
                pairs.append((i, j, round(float(sim[i, j]), 3)))
    by_sources = Counter(tuple(sorted((rows[i].source, rows[j].source))) for i, j, _ in pairs)
    conflicting = [(i, j, s) for i, j, s in pairs
                   if json.dumps(rows[i].answers, sort_keys=True)
                   != json.dumps(rows[j].answers, sort_keys=True)]
    return {
        "threshold": threshold,
        "exact_groups": len(exact_groups),
        "exact_extra_rows": sum(len(g) - 1 for g in exact_groups),
        "near_pairs": len(pairs),
        "near_by_sources": {" + ".join(k): v for k, v in by_sources.most_common()},
        "near_with_different_labels": len(conflicting),
        "examples": [
            {"a": rows[i].query, "b": rows[j].query, "sim": s,
             "same_label": (i, j, s) not in conflicting}
            for i, j, s in sorted(pairs, key=lambda p: -p[2])[:8]],
    }


def leakage(rows: list[Row], X, threshold: float = LEAKAGE) -> dict:
    """Training questions within ``threshold`` of a test question, by source.
    Between templates that is the paraphrase design, not a leak; from a
    generated training row into the test split it is."""
    train = [i for i, r in enumerate(rows) if r.split == "train"]
    test = [i for i, r in enumerate(rows) if r.split == "test"]
    if not train or not test:
        return {"threshold": threshold, "pairs": 0}
    sim = _dense_sim(X[train], X[test])
    pairs = []
    for a, i in enumerate(train):
        b = int(sim[a].argmax())
        if sim[a, b] >= threshold:
            pairs.append((i, test[b], round(float(sim[a, b]), 3)))
    by_source = Counter(f"{rows[i].source} -> {rows[j].source}" for i, j, _ in pairs)
    generated = [p for p in pairs if rows[p[0]].source != "template"]
    return {
        "threshold": threshold,
        "pairs": len(pairs),
        "by_source": dict(by_source.most_common()),
        "generated_into_test": len(generated),
        "examples": [{"train": rows[i].query, "test": rows[j].query, "sim": s}
                     for i, j, s in sorted(generated, key=lambda p: -p[2])[:6]],
    }


def label_drift(rows: list[Row], X, k: int = 5, min_sim: float = LABEL_DRIFT_SIM,
                agreement: float = LABEL_DRIFT_AGREEMENT) -> dict:
    """Questions whose nearest neighbours mostly carry a different label.

    The grounding check proves an argument was copied from the question; it
    cannot tell whether the question *means* what the target asked for. A
    generated question that landed among another tool's phrasings is either
    labelled wrong, or a legitimate ambiguity the model will have to learn
    — either way it is worth a look. Each row's ``k`` nearest neighbours at
    cosine ≥ ``min_sim`` vote; a row is flagged when at least ``agreement``
    of the votes go to one other label."""
    n = len(rows)
    empty = {"k": k, "min_sim": min_sim, "agreement": agreement, "n": 0, "share": 0.0,
             "by_source": {}, "by_pair": {}, "examples": [], "ids": []}
    if n < k + 1:
        return empty
    sim = _dense_sim(X, X)
    np.fill_diagonal(sim, -1.0)
    labels = [r.tool for r in rows]
    flagged: list[dict] = []
    for i in range(n):
        order = np.argsort(-sim[i])[:k]
        near = [(int(j), float(sim[i, j])) for j in order if sim[i, j] >= min_sim]
        if len(near) < 3:
            continue
        votes = Counter(labels[j] for j, _ in near)
        top, count = votes.most_common(1)[0]
        if top == labels[i] or count / len(near) < agreement:
            continue
        flagged.append({
            "id": rows[i].id, "query": rows[i].query, "label": labels[i],
            "neighbour_label": top, "votes": f"{count}/{len(near)}",
            "source": rows[i].source, "split": rows[i].split,
            "mean_sim": round(sum(s for _, s in near) / len(near), 3),
            "neighbours": [{"query": rows[j].query, "tool": labels[j], "source": rows[j].source,
                            "sim": round(s, 3)} for j, s in near[:3]],
        })
    flagged.sort(key=lambda f: -f["mean_sim"])
    return {
        **empty,
        "n": len(flagged), "share": round(len(flagged) / n, 4),
        "by_source": dict(Counter(f["source"] for f in flagged).most_common()),
        "by_pair": dict(Counter(f"{f['label']} → {f['neighbour_label']}"
                                for f in flagged).most_common()),
        "examples": flagged[:12],
        "ids": [f["id"] for f in flagged],
    }


def template_distance(rows: list[Row], X) -> dict:
    """How far each generated question sits from its nearest template."""
    template = [i for i, r in enumerate(rows) if r.source == "template"]
    out = {}
    for source in ("augmented", "natural"):
        idx = [i for i, r in enumerate(rows) if r.source == source]
        if not idx or not template:
            continue
        sim = _dense_sim(X[idx], X[template]).max(axis=1)
        bins = [(0.0, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 1.01)]
        hist = {f"{lo:.1f}-{min(hi, 1.0):.1f}": int(((sim >= lo) & (sim < hi)).sum())
                for lo, hi in bins}
        out[source] = {
            "n": len(idx),
            "nearest_template_mean": round(float(sim.mean()), 3),
            "nearest_template_median": round(float(statistics.median(sim.tolist())), 3),
            "share_novel_under_0.5": round(float((sim < 0.5).mean()), 3),
            "share_restating_over_0.8": round(float((sim >= 0.8).mean()), 3),
            "histogram": hist,
        }
    return out


# --- coverage --------------------------------------------------------------------


def coverage(rows: list[Row]) -> dict:
    by_tool_split: dict[str, Counter] = defaultdict(Counter)
    by_source_split: dict[str, Counter] = defaultdict(Counter)
    entities: dict[str, dict[str, set]] = defaultdict(lambda: defaultdict(set))
    enums: dict[str, dict[str, Counter]] = defaultdict(lambda: defaultdict(Counter))
    refusals: dict[str, Counter] = defaultdict(Counter)
    families: dict[str, set] = defaultdict(set)
    for r in rows:
        by_tool_split[r.tool][r.split] += 1
        by_source_split[r.source][r.split] += 1
        for e in r.entities:
            entities[r.tool][r.split].add(e.lower())
        for a in r.answers:
            for key, value in (a.get("arguments") or {}).items():
                if key in ("which", "section", "channel"):
                    enums[key][r.split][value] += 1
        if r.tool == "(refusal)":
            refusals[r.split][r.category] += 1
        families[r.split].add(r.family)
    train_entities = {t: v.get("train", set()) for t, v in entities.items()}
    unseen = {t: sorted(v.get("test", set()) - train_entities.get(t, set()))
              for t, v in entities.items()}
    return {
        "by_tool": {t: dict(c) for t, c in sorted(by_tool_split.items())},
        "by_source": {s: dict(c) for s, c in sorted(by_source_split.items())},
        "entities_per_tool": {t: {s: len(v) for s, v in vs.items()} for t, vs in entities.items()},
        "test_entities_unseen_in_train": {t: v for t, v in unseen.items() if v},
        "enums": {k: {s: dict(c) for s, c in v.items()} for k, v in enums.items()},
        "refusal_categories": {s: dict(c) for s, c in refusals.items()},
        "families": {s: len(v) for s, v in families.items()},
    }


# --- clusters and the map --------------------------------------------------------


def clusters(rows: list[Row], X, vec, k: int | None = None) -> dict:
    _sklearn()
    from sklearn.cluster import KMeans

    n = len(rows)
    k = k or max(4, min(40, int(math.sqrt(n / 2))))
    model = KMeans(n_clusters=k, n_init=5, random_state=0).fit(X)
    labels = model.labels_
    terms = vec.get_feature_names_out()
    out = []
    for c in range(k):
        idx = [i for i in range(n) if labels[i] == c]
        if not idx:
            continue
        tools = Counter(rows[i].tool for i in idx)
        majority, count = tools.most_common(1)[0]
        sources = Counter(rows[i].source for i in idx)
        centre = model.cluster_centers_[c]
        top = [terms[j] for j in centre.argsort()[::-1][:6]]
        dist = np.asarray(X[idx] @ centre.reshape(-1, 1)).ravel()
        examples = [rows[idx[j]].query for j in dist.argsort()[::-1][:3]]
        out.append({
            "cluster": c,
            "size": len(idx),
            "top_terms": top,
            "majority_tool": majority,
            "purity": round(count / len(idx), 3),
            "tools": dict(tools.most_common()),
            "sources": dict(sources.most_common()),
            "examples": examples,
            "flags": [f for f, ok in (
                ("mixed labels", count / len(idx) < 0.6),
                ("template only", set(sources) == {"template"}),
                ("generated only", "template" not in sources),
            ) if ok],
        })
    out.sort(key=lambda c: -c["size"])
    return {
        "k": k,
        "inertia": round(float(model.inertia_), 2),
        "mixed": sum(1 for c in out if "mixed labels" in c["flags"]),
        "template_only": sum(1 for c in out if "template only" in c["flags"]),
        "generated_only": sum(1 for c in out if "generated only" in c["flags"]),
        "clusters": out,
    }


def projection(X):
    _sklearn()
    from sklearn.decomposition import TruncatedSVD

    coords = TruncatedSVD(n_components=2, random_state=0).fit_transform(X)
    return coords.tolist()


def _style(tool: str) -> tuple[str, str, str]:
    for name, colour, shape in PALETTE:
        if name == tool:
            return name, colour, shape
    return OTHER


def map_svg(rows: list[Row], coords: list[list[float]], width: int = 760,
            height: int = 520) -> str:
    """The corpus on two SVD components of its TF-IDF vectors, one mark per
    question, identity by hue and (past the third class) shape, a legend,
    and the axes left unlabeled because the components have no units."""
    if not coords:
        return ""
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    pad_l, pad_r, pad_t, pad_b = 24, 170, 40, 24
    x_lo, x_hi = min(xs), max(xs)
    y_lo, y_hi = min(ys), max(ys)

    def sx(x):
        return pad_l + (x - x_lo) / ((x_hi - x_lo) or 1) * (width - pad_l - pad_r)

    def sy(y):
        return pad_t + (1 - (y - y_lo) / ((y_hi - y_lo) or 1)) * (height - pad_t - pad_b)

    def mark(x, y, colour, shape, r=3.2):
        ring = 'stroke="#ffffff" stroke-width="1"'
        if shape == "square":
            return (f'<rect x="{x - r:.1f}" y="{y - r:.1f}" width="{2 * r:.1f}" '
                    f'height="{2 * r:.1f}" fill="{colour}" {ring}/>')
        if shape == "diamond":
            return (f'<polygon points="{x:.1f},{y - r - 1:.1f} {x + r + 1:.1f},{y:.1f} '
                    f'{x:.1f},{y + r + 1:.1f} {x - r - 1:.1f},{y:.1f}" fill="{colour}" {ring}/>')
        if shape == "triangle":
            return (f'<polygon points="{x:.1f},{y - r - 1:.1f} {x + r + 1:.1f},{y + r:.1f} '
                    f'{x - r - 1:.1f},{y + r:.1f}" fill="{colour}" {ring}/>')
        return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{colour}" {ring}/>'

    counts = Counter(_style(r.tool)[0] for r in rows)
    # Test rows drawn last so the held-out questions sit on top, hollow.
    order = sorted(range(len(rows)), key=lambda i: rows[i].split == "test")
    marks = []
    for i in order:
        name, colour, shape = _style(rows[i].tool)
        x, y = sx(coords[i][0]), sy(coords[i][1])
        if rows[i].split == "test":
            marks.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="none" stroke="{colour}" '
                         f'stroke-width="1.5"><title>{_esc(rows[i].query)}</title></circle>')
        else:
            tag = {"square": "rect", "diamond": "polygon", "triangle": "polygon"}.get(
                shape, "circle")
            marks.append(mark(x, y, colour, shape).replace(
                "/>", f"><title>{_esc(rows[i].query)}</title></{tag}>"))
    legend = []
    ly = pad_t
    for name, colour, shape in [*PALETTE, OTHER]:
        if name not in counts:
            continue
        legend.append(mark(width - pad_r + 18, ly + 6, colour, shape, 4))
        legend.append(f'<text x="{width - pad_r + 30}" y="{ly + 10}" font-size="12" '
                      f'fill="#333333">{name} ({counts[name]})</text>')
        ly += 20
    legend.append(f'<circle cx="{width - pad_r + 18}" cy="{ly + 6}" r="4" fill="none" '
                  f'stroke="#333333" stroke-width="1.5"/>')
    legend.append(f'<text x="{width - pad_r + 30}" y="{ly + 10}" font-size="12" '
                  f'fill="#333333">held-out (test)</text>')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" '
        f'height="{height}" font-family="system-ui, sans-serif">'
        f'<rect width="{width}" height="{height}" fill="#ffffff"/>'
        f'<text x="{pad_l}" y="24" font-size="14" fill="#111111">The corpus: {len(rows)} '
        f'questions on two SVD components of their TF-IDF vectors</text>'
        f'<rect x="{pad_l}" y="{pad_t}" width="{width - pad_l - pad_r}" '
        f'height="{height - pad_t - pad_b}" fill="none" stroke="#dddddd"/>'
        f'{"".join(marks)}{"".join(legend)}</svg>'
    )


def _esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


# --- diagnosis of an evaluation ---------------------------------------------------


def diagnose(rows: list[Row], X, evaluation: dict, k: int = 3) -> dict:
    """Each missed test case with its nearest training questions and what
    they are labelled, and a verdict: no near neighbour at all (coverage
    gap), neighbours labelled differently from the expected call (phrasing
    conflict — two intents share wording), or neighbours that agree with
    the expected call (the model simply missed)."""
    by_id = {r.id: i for i, r in enumerate(rows)}
    train = [i for i, r in enumerate(rows) if r.split == "train"]
    if not train:
        return {"n_missed": 0}
    misses = [c for c in evaluation.get("cases", []) if not c.get("exact")]
    verdicts: list[dict] = []
    for case in misses:
        i = by_id.get(case["id"])
        if i is None:
            continue
        sim = _dense_sim(X[i], X[train]).ravel()
        top = sim.argsort()[::-1][:k]
        neighbours = [(rows[train[j]], round(float(sim[j]), 3)) for j in top]
        want_tools = sorted(a["name"] for a in case.get("want") or []) or ["(refusal)"]
        neighbour_tools = Counter(
            tuple(sorted(a["name"] for a in r.answers) or ["(refusal)"]) for r, _ in neighbours)
        majority = list(neighbour_tools.most_common(1)[0][0])
        if neighbours[0][1] < COVERAGE_GAP:
            verdict = "coverage gap"
        elif majority != want_tools:
            verdict = "phrasing conflict"
        else:
            verdict = "model error"
        verdicts.append({
            "id": case["id"], "category": case.get("category"), "slice": case.get("slice"),
            "query": case["query"], "want": want_tools,
            "got": sorted(a["name"] for a in case.get("got") or []) or ["(refusal)"],
            "verdict": verdict,
            "neighbours": [{"query": r.query, "tool": r.tool, "source": r.source, "sim": s}
                           for r, s in neighbours],
        })
    by_verdict = Counter(v["verdict"] for v in verdicts)
    by_category: dict[str, Counter] = defaultdict(Counter)
    for v in verdicts:
        by_category[v["category"] or "-"][v["verdict"]] += 1
    return {
        "n_missed": len(verdicts),
        "by_verdict": dict(by_verdict.most_common()),
        "by_category": {c: dict(v) for c, v in sorted(by_category.items())},
        "misses": verdicts,
    }


# --- all together ---------------------------------------------------------------


def analyze(corpus_dir: Path, evaluation: dict | None = None, k: int | None = None) -> dict:
    rows = load_rows(corpus_dir)
    if not rows:
        raise FileNotFoundError(f"no assistant examples in {corpus_dir}")
    X, vec = vectorize([r.query for r in rows])
    result = {
        "corpus": str(corpus_dir),
        "n": len(rows),
        "lexical": {
            "all": lexical([r.query for r in rows]),
            "by_source": {s: lexical([r.query for r in rows if r.source == s])
                          for s in ("template", "augmented", "natural")
                          if any(r.source == s for r in rows)},
            "by_tool": {t: lexical([r.query for r in rows if r.tool == t])
                        for t in sorted({r.tool for r in rows})},
        },
        "duplicates": near_duplicates(rows, X),
        "leakage": leakage(rows, X),
        "template_distance": template_distance(rows, X),
        "label_drift": label_drift(rows, X),
        "coverage": coverage(rows),
        "clusters": clusters(rows, X, vec, k),
    }
    result["map"] = map_svg(rows, projection(X))
    if evaluation is not None:
        result["diagnosis"] = diagnose(rows, X, evaluation)
    return result


def write(result: dict, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    svg = result.pop("map", "")
    if svg:
        (out_dir / "map.svg").write_text(svg)
        written.append(out_dir / "map.svg")
    (out_dir / "analysis.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    written.append(out_dir / "analysis.json")
    (out_dir / "analysis.md").write_text(render(result, has_map=bool(svg)))
    written.append(out_dir / "analysis.md")
    result["map"] = svg
    return written


def _f(value, digits=3):
    if value is None:
        return "–"
    return f"{value:.{digits}f}" if isinstance(value, float) else str(value)


def render(result: dict, has_map: bool = True) -> str:
    L = result["lexical"]
    d = result["duplicates"]
    lk = result["leakage"]
    cov = result["coverage"]
    cl = result["clusters"]
    lines = ["# Corpus analysis", "",
             f"`{result['corpus']}` — {result['n']} assistant questions.", ""]
    lines += ["## Diversity", "",
              "| slice | n | vocab | TTR | distinct-2 | distinct-3 | len (median / p95) "
              "| top openers |",
              "|---|---:|---:|---:|---:|---:|---|---|"]
    for name, stats in [("all", L["all"]), *L["by_source"].items(), *L["by_tool"].items()]:
        if "vocab" not in stats:
            continue
        openers = ", ".join(f"{w} {p:.0%}" for w, p in stats["top_openers"])
        lines.append(f"| {name} | {stats['n']} | {stats['vocab']} | "
                     f"{_f(stats['type_token_ratio'])} | {_f(stats['distinct_2'])} | "
                     f"{_f(stats['distinct_3'])} | {stats['length_median']} / "
                     f"{stats['length_p95']} | {openers} |")
    lines += ["", "## Duplicates and leakage", "",
              f"- exact duplicate groups: {d['exact_groups']} ({d['exact_extra_rows']} extra rows)",
              f"- near-duplicate pairs at cosine ≥ {d['threshold']}: {d['near_pairs']}"
              f" ({d['near_with_different_labels']} with different labels)"
              + (f" — {', '.join(f'{k}: {v}' for k, v in d['near_by_sources'].items())}"
                 if d["near_by_sources"] else ""),
              f"- training questions within {lk['threshold']} of a test question: "
              f"{lk.get('pairs', 0)}"
              + (f" ({lk.get('generated_into_test', 0)} from generated rows — the ones "
                 f"that count)" if lk.get("pairs") else "")]
    for ex in d.get("examples", [])[:4]:
        lines.append(f"  - {ex['sim']}: *{ex['a']}* ↔ *{ex['b']}*"
                     + ("" if ex["same_label"] else " **(different labels)**"))
    td = result.get("template_distance", {})
    if td:
        lines += ["", "## Distance from the templates", "",
                  "| source | n | nearest template (median) | novel (< 0.5) | restating (≥ 0.8) |",
                  "|---|---:|---:|---:|---:|"]
        for source, s in td.items():
            lines.append(f"| {source} | {s['n']} | {_f(s['nearest_template_median'])} | "
                         f"{s['share_novel_under_0.5']:.0%} | "
                         f"{s['share_restating_over_0.8']:.0%} |")
    ld = result.get("label_drift")
    if ld:
        pairs = ", ".join(f"{k} {v}" for k, v in ld["by_pair"].items())
        sources = ", ".join(f"{k} {v}" for k, v in ld["by_source"].items())
        lines += ["", "## Label drift", "",
                  f"{ld['n']} questions ({ld['share']:.1%}) sit among {ld['k']} nearest "
                  f"neighbours (cosine ≥ {ld['min_sim']}) that mostly carry another label"
                  + (f": by source {sources}; by pair {pairs}." if ld["n"] else ".")]
        for f in ld["examples"][:8]:
            near = "; ".join(f"*{n['query']}* → {n['tool']} ({n['sim']})"
                             for n in f["neighbours"][:2])
            lines.append(f"- `{f['id']}` — *{f['query']}* is labelled {f['label']}, "
                         f"neighbours say {f['neighbour_label']} ({f['votes']}): {near}")
    lines += ["", "## Coverage", "", "| tool | train | test |", "|---|---:|---:|"]
    for tool, c in cov["by_tool"].items():
        lines.append(f"| {tool} | {c.get('train', 0)} | {c.get('test', 0)} |")
    lines += ["", "| source | train | test |", "|---|---:|---:|"]
    for source, c in cov["by_source"].items():
        lines.append(f"| {source} | {c.get('train', 0)} | {c.get('test', 0)} |")
    if cov["test_entities_unseen_in_train"]:
        unseen = "; ".join(f"{t}: {', '.join(v)}"
                           for t, v in cov["test_entities_unseen_in_train"].items())
        lines += ["", f"Test entities never seen in training (the novel-entity slice): {unseen}"]
    for key, per_split in cov["enums"].items():
        train = per_split.get("train", {})
        test = per_split.get("test", {})
        seen = ", ".join(f"{v} ({n})" for v, n in sorted(train.items()))
        only_test = sorted(set(test) - set(train))
        lines.append(f"- `{key}` values in train: {seen}"
                     + (f"; only in test: {', '.join(only_test)}" if only_test else ""))
    lines += ["", f"## Clusters (k = {cl['k']})", "",
              f"{cl['mixed']} clusters mix labels (purity < 0.6), {cl['template_only']} are "
              f"template-only phrasing regions, {cl['generated_only']} are reached only by "
              f"generated questions.", "",
              "| size | majority tool | purity | sources | top terms | flags |",
              "|---:|---|---:|---|---|---|"]
    for c in cl["clusters"][:20]:
        sources = ", ".join(f"{s} {n}" for s, n in c["sources"].items())
        lines.append(f"| {c['size']} | {c['majority_tool']} | {_f(c['purity'], 2)} | {sources} | "
                     f"{', '.join(c['top_terms'][:5])} | {', '.join(c['flags'])} |")
    mixed = [c for c in cl["clusters"] if "mixed labels" in c["flags"]][:4]
    if mixed:
        lines += ["", "Mixed clusters, closest questions to the centre:"]
        for c in mixed:
            lines.append(f"- {dict(c['tools'])}: " + " / ".join(f"*{q}*" for q in c["examples"]))
    if has_map:
        lines += ["", "![map](map.svg)"]
    dg = result.get("diagnosis")
    if dg:
        verdicts = list(dg["by_verdict"])
        lines += ["", "## Misses, diagnosed", "",
                  f"{dg['n_missed']} missed cases: "
                  + ", ".join(f"{k} {v}" for k, v in dg["by_verdict"].items()), "",
                  "| category | " + " | ".join(verdicts) + " |", "|---|" + "---:|" * len(verdicts)]
        for cat, counts in dg["by_category"].items():
            cells = " | ".join(str(counts.get(v, 0)) for v in verdicts)
            lines.append(f"| {cat} | {cells} |")
        lines += ["", "First misses with their nearest training questions:", ""]
        for m in dg["misses"][:10]:
            nearest = "; ".join(f"*{n['query']}* → {n['tool']} ({n['sim']})"
                                for n in m["neighbours"][:2])
            lines.append(f"- **{m['verdict']}** `{m['id']}` — *{m['query']}*  ")
            lines.append(f"  want {m['want']} got {m['got']}; nearest: {nearest}")
    return "\n".join(lines) + "\n"
