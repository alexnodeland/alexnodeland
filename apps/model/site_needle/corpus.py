"""Builds the corpus from the content snapshot, and knows whether it is current.

``build`` is deterministic: the same snapshot and config always produce
the same files, so the corpus hash in the manifest is a real version and
``check`` can tell a stale corpus from a fresh one without a diff. Nothing
generated is committed; the manifest travels with each published model,
and ``status`` compares the content the site has now against the content
the published model was trained on.
"""

from __future__ import annotations

import hashlib
import json
import statistics
from dataclasses import dataclass
from pathlib import Path

from . import __version__
from .catalogue import SYSTEM, TOOLS
from .content import Content, content_hash, load_content
from .generate import Example, generate
from .paths import CONTENT_PATH, CORPUS_DIR, CorpusConfig
from .tokens import bucket, count, try_tokenizer
from .validate import Problem, check_corpus

MANIFEST_SCHEMA = 1


class CorpusError(Exception):
    def __init__(self, problems: list[Problem]):
        self.problems = problems
        shown = "\n".join(f"  - {p}" for p in problems[:25])
        more = f"\n  ... and {len(problems) - 25} more" if len(problems) > 25 else ""
        super().__init__(f"{len(problems)} problem(s) in the corpus:\n{shown}{more}")


def _bucket_of(seed: int, family: str) -> float:
    digest = hashlib.sha256(f"{seed}:{family}".encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def assign_splits(examples: list[Example], cfg: CorpusConfig) -> None:
    """Test gets whole template families (unseen phrasings) and whole
    entities (unseen names); everything else trains."""
    holdout = {name.lower() for name in
               [*cfg.holdout_projects, *cfg.holdout_companies, *cfg.holdout_skills]}
    for example in examples:
        if example.split:
            continue
        if any(entity.lower() in holdout for entity in example.entities):
            example.split, example.slice = "test", "novel_entity"
        elif _bucket_of(cfg.seed, example.family) < cfg.test_template_fraction:
            example.split, example.slice = "test", "paraphrase"
        else:
            example.split = "train"


def dedupe(examples: list[Example]) -> tuple[list[Example], int]:
    seen: set[tuple[str, str]] = set()
    kept: list[Example] = []
    for example in examples:
        key = (example.query.strip(), tuple(t["name"] for t in example.tools),
               json.dumps(example.answers, sort_keys=True))
        if key in seen:
            continue
        seen.add(key)
        kept.append(example)
    return kept, len(examples) - len(kept)


def _percentiles(values: list[int]) -> dict:
    if not values:
        return {}
    ordered = sorted(values)
    return {
        "max": ordered[-1],
        "p50": int(statistics.median(ordered)),
        "p95": ordered[min(len(ordered) - 1, int(0.95 * len(ordered)))],
        "mean": round(statistics.fmean(ordered), 1),
    }


GENERATED_TAGS = ("augmented", "natural")


def template_hash(examples: list[Example]) -> str:
    """The deterministic part of the corpus: everything but generated rows."""
    return corpus_hash([e.row() for e in examples
                        if not any(tag in e.tags for tag in GENERATED_TAGS)])


def corpus_hash(rows: list[dict]) -> str:
    digest = hashlib.sha256()
    for row in rows:
        digest.update(json.dumps(row, sort_keys=True, ensure_ascii=False).encode())
        digest.update(b"\n")
    return "sha256:" + digest.hexdigest()


def manifest_for(examples: list[Example], content: Content, content_path: Path,
                 cfg: CorpusConfig, lengths: dict[str, int], tokenizer_name: str | None,
                 dropped: int, augmentation: dict | None = None) -> dict:
    rows = [e.row() for e in examples]
    by = lambda key: dict(sorted(_count(examples, key).items()))  # noqa: E731
    assistant = [e for e in examples if e.kind == "assistant"]
    longest = max(lengths.values()) if lengths else 0
    return {
        "schema": MANIFEST_SCHEMA,
        "generator": {"version": __version__, "config": vars(cfg)},
        "content": {
            "hash": content_hash(content_path),
            "counts": {
                "roles": len(content.cv.experience),
                "degrees": len(content.cv.education),
                "certifications": len(content.cv.certifications),
                "projects": len(content.projects.projects),
                "posts": len(content.posts),
                "paragraphs": sum(len(p.paragraphs) for p in content.posts),
                "skills": len(content.all_skills),
            },
            "sources": {
                "companies": content.companies,
                "projects": [p.name for p in content.projects.projects],
                "posts": [p.slug for p in content.posts],
            },
        },
        "corpus": {
            "hash": corpus_hash(rows),
            "template_hash": template_hash(examples),
            "augmentation": augmentation or {"requested": 0},
            "tools": [t["name"] for t in TOOLS],
            "counts": {
                "total": len(examples),
                "train": sum(1 for e in examples if e.split == "train"),
                "test": sum(1 for e in examples if e.split == "test"),
                "dropped_duplicates": dropped,
            },
            "by_kind": by(lambda e: e.kind),
            "by_category": by(lambda e: e.category),
            "by_slice": by(lambda e: e.slice or "train"),
            "refusal_share_assistant": round(
                sum(1 for e in assistant if not e.answers) / max(1, len(assistant)), 3),
            "length": {
                "tokenizer": tokenizer_name or "estimate",
                "tokens": _percentiles(list(lengths.values())),
                "bucket": bucket(longest, cfg.max_tokens),
                "budget": cfg.max_tokens,
            },
        },
    }


def _count(examples: list[Example], key) -> dict[str, int]:
    out: dict[str, int] = {}
    for example in examples:
        out[key(example)] = out.get(key(example), 0) + 1
    return out


@dataclass
class Built:
    examples: list[Example]
    manifest: dict
    problems: list[Problem]

    @property
    def train(self) -> list[Example]:
        return [e for e in self.examples if e.split == "train"]

    @property
    def test(self) -> list[Example]:
        return [e for e in self.examples if e.split == "test"]


def build_in_memory(content: Content, content_path: Path, cfg: CorpusConfig,
                    tokenizer=None, augment: int = 0, natural: int = 0,
                    provider: str = "claude-agent", augment_model: str | None = None,
                    regenerate: bool = False, provider_obj=None,
                    generate_fn=None) -> Built:
    examples = generate(content, cfg)
    examples, dropped = dedupe(examples)
    assign_splits(examples, cfg)
    augmentation = None
    if augment or natural:
        from . import augment as augment_mod

        if provider == "openrouter":
            extra, augmentation = augment_mod.augment_openrouter(
                examples, augment, model=augment_model, generate=generate_fn)
        else:
            prov = provider_obj or augment_mod.provider_for(provider, augment_model)
            extra, augmentation = augment_mod.augment(
                examples, content, cfg, augment, natural, provider=prov,
                regenerate=regenerate, content_hash=content_hash(content_path))
        examples = examples + extra
    if augmentation is not None:
        examples = _quality(examples, augmentation)
    lengths = {e.id: count(e.row(), tokenizer) for e in examples}
    # A generated question over the budget is dropped, not a build failure:
    # the large model does not know the token budget, and one long question
    # about a long employer name should not stop the corpus.
    if tokenizer is not None and augmentation is not None:
        over = {e.id for e in examples
                if any(t in e.tags for t in GENERATED_TAGS) and lengths[e.id] > cfg.max_tokens}
        if over:
            examples = [e for e in examples if e.id not in over]
            lengths = {k: v for k, v in lengths.items() if k not in over}
            augmentation["dropped_over_budget"] = len(over)
    # Without the real tokenizer the lengths are estimates, and a pessimistic
    # estimate must not fail a corpus the trainer will measure exactly: the
    # budget check waits for `site-needle train`'s preflight in that case.
    problems = check_corpus(examples, cfg.max_tokens if tokenizer else None, lengths)
    name = None
    if tokenizer is not None:
        name = f"needle2 sentencepiece ({tokenizer.vocab_size} pieces)"
    manifest = manifest_for(examples, content, content_path, cfg, lengths, name, dropped,
                            augmentation)
    return Built(examples, manifest, problems)


def _quality(examples: list[Example], stats: dict) -> list[Example]:
    """Two things a generator does that the split must not absorb: restate a
    question it (or a template) already wrote, and write a training question
    that is nearly a held-out one. Generated rows within the near-duplicate
    threshold of any earlier row are dropped, and generated training rows
    within the leakage threshold of any test row are dropped — the test row
    wins. Needs the analysis extra; without it the build says so and keeps
    everything."""
    try:
        from . import analysis
    except ImportError:
        stats["quality"] = "skipped (scikit-learn not installed)"
        return examples
    try:
        X, _ = analysis.vectorize([e.query for e in examples])
    except RuntimeError as exc:
        stats["quality"] = f"skipped ({exc})"
        return examples
    import numpy as np

    generated = [i for i, e in enumerate(examples) if any(t in e.tags for t in GENERATED_TAGS)]
    if not generated:
        return examples
    sim = (X[generated] @ X.T).toarray()
    is_test = np.array([e.split == "test" for e in examples])
    drop: set[int] = set()
    near = leak = 0
    for a, i in enumerate(generated):
        row = sim[a].copy()
        row[i] = 0.0
        # A training row that restates any held-out question is a leak,
        # whichever was generated first: the held-out question wins.
        if examples[i].split == "train":
            over_test = np.where(is_test, row, 0.0)
            if over_test.size and over_test.max() >= analysis.LEAKAGE:
                drop.add(i)
                leak += 1
                continue
        # Otherwise a near-duplicate of anything earlier in the corpus
        # (templates come first, so they always win a tie).
        earlier = row[:i]
        if earlier.size and earlier.max() >= analysis.NEAR_DUPLICATE:
            if int(earlier.argmax()) not in drop:
                drop.add(i)
                near += 1
    stats["dropped_near_duplicate"] = near
    stats["dropped_leakage"] = leak
    stats["quality"] = (f"near-duplicates ≥ {analysis.NEAR_DUPLICATE} and leakage ≥ "
                        f"{analysis.LEAKAGE} removed from generated rows")
    return [e for i, e in enumerate(examples) if i not in drop]


def write(built: Built, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    for split in ("train", "test"):
        with (out_dir / f"{split}.jsonl").open("w") as handle:
            for example in built.examples:
                if example.split == split:
                    handle.write(json.dumps(example.row(), ensure_ascii=False) + "\n")
    (out_dir / "tools.json").write_text(json.dumps(TOOLS, indent=2) + "\n")
    (out_dir / "system.txt").write_text(SYSTEM + "\n")
    (out_dir / "manifest.json").write_text(json.dumps(built.manifest, indent=2) + "\n")


def build(cfg: CorpusConfig, content_path: Path = CONTENT_PATH, out_dir: Path = CORPUS_DIR,
          use_tokenizer: bool = True, augment: int = 0, natural: int = 0,
          provider: str = "claude-agent", augment_model: str | None = None,
          regenerate: bool = False) -> Built:
    content = load_content(content_path)
    tokenizer = try_tokenizer() if use_tokenizer else None
    built = build_in_memory(content, content_path, cfg, tokenizer, augment, natural, provider,
                            augment_model, regenerate)
    if built.problems:
        raise CorpusError(built.problems)
    write(built, out_dir)
    return built


def read_manifest(path: Path) -> dict | None:
    return json.loads(path.read_text()) if path.exists() else None


def diff(old: dict | None, new: dict) -> dict:
    """What changed between two manifests, in terms a person reviews:
    content that appeared or vanished, and the example counts that moved."""
    if old is None:
        return {"baseline": None, "content_changed": True, "corpus_changed": True,
                "added": {}, "removed": {}, "counts": {}}
    added, removed = {}, {}
    for key, new_items in new["content"]["sources"].items():
        old_items = set(old.get("content", {}).get("sources", {}).get(key, []))
        plus = [x for x in new_items if x not in old_items]
        minus = [x for x in old_items if x not in new_items]
        if plus:
            added[key] = plus
        if minus:
            removed[key] = minus
    counts = {}
    old_counts = old.get("corpus", {}).get("by_category", {})
    for category, n in new["corpus"]["by_category"].items():
        if old_counts.get(category) != n:
            counts[category] = {"before": old_counts.get(category, 0), "after": n}
    for category, n in old_counts.items():
        if category not in new["corpus"]["by_category"]:
            counts[category] = {"before": n, "after": 0}
    # An augmented corpus is not reproducible byte for byte; its template
    # part is, and that is what "the same corpus" means between two builds.
    old_key = old.get("corpus", {}).get("template_hash") or old.get("corpus", {}).get("hash")
    new_key = new["corpus"].get("template_hash") or new["corpus"]["hash"]
    return {
        "baseline": {
            "content_hash": old.get("content", {}).get("hash"),
            "corpus_hash": old.get("corpus", {}).get("hash"),
        },
        "content_changed": old.get("content", {}).get("hash") != new["content"]["hash"],
        "corpus_changed": old_key != new_key,
        "added": added,
        "removed": removed,
        "counts": counts,
    }


def summary_lines(manifest: dict) -> list[str]:
    c = manifest["corpus"]
    length = c["length"]
    aug = c.get("augmentation") or {}
    lines = [
        f"examples: {c['counts']['total']} (train {c['counts']['train']}, test "
        f"{c['counts']['test']}, {c['counts']['dropped_duplicates']} duplicates dropped"
        + (f", {aug.get('kept', 0)} augmented" if aug.get("requested") else "")
        + (f", {aug.get('natural_kept', 0)} natural test" if aug.get("natural_kept") else "")
        + ")",
        f"content: {manifest['content']['hash'][:19]}  corpus: {c['hash'][:19]}",
        f"refusals: {c['refusal_share_assistant']:.0%} of assistant examples",
        f"length: p50 {length['tokens'].get('p50')} / p95 {length['tokens'].get('p95')} / max "
        f"{length['tokens'].get('max')} tokens ({length['tokenizer']}); training bucket "
        f"{length['bucket']} of budget {length['budget']}",
    ]
    for category, n in c["by_category"].items():
        lines.append(f"  {category:32} {n:4}")
    return lines
