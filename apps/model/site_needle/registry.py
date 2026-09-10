"""Where published models and corpora live: the Hugging Face Hub.

Two repositories. The **model repo** takes one commit per shipped run,
tagged ``run-<id>``: the ``.cact``, ``tools.json``, ``system.txt``, the
corpus manifest, every evaluation, the run record, the curve, the report,
and the model card as its README. The **dataset repo** takes one commit
per corpus build, tagged ``corpus-<hash>``: the train and test JSONL, the
manifest, the analysis, the hand-written set, and the kept LLM generations.

In git there is one small file, ``models/site-needle.json``: a pointer —
repo, revision, tag, SHA-256 — to the model the site builds against.
``corpus status`` reads the manifest at that revision, ``pull``
materialises the files, and ``promote`` publishes a run and moves the
pointer. Nothing here needs a token to read a public repo; publishing
needs ``HF_TOKEN``.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path

from .paths import AUGMENT_DIR, HANDWRITTEN_PATH, MODELS_DIR, POINTER_PATH, RegistryConfig

BASE_MODEL = "Cactus-Compute/needle2"

# run-directory path → path in the model repo
RUN_FILES = {
    "model.cact": "site-needle.cact",
    "corpus/tools.json": "tools.json",
    "corpus/system.txt": "system.txt",
    "corpus/manifest.json": "manifest.json",
    "eval-tuned.json": "eval.json",
    "eval-base.json": "eval-base.json",
    "eval-tuned-handwritten.json": "eval-handwritten.json",
    "eval-base-handwritten.json": "eval-base-handwritten.json",
    "summary.json": "summary.json",
    "run.json": "run.json",
    "metrics.jsonl": "metrics.jsonl",
    "report.md": "report.md",
    "loss.svg": "loss.svg",
    "model-card.md": "model-card.md",
}
# a materialised snapshot (``models/`` after ``pull``) carries repo paths already
SNAPSHOT_FILES = tuple(RUN_FILES.values())
DATASET_FILES = ("train.jsonl", "test.jsonl", "fit.jsonl", "dev.jsonl", "manifest.json",
                 "tools.json", "system.txt")
ANALYSIS_FILES = ("analysis/analysis.md", "analysis/analysis.json", "analysis/map.svg")


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _api(token: str | None = None, api=None):
    if api is not None:
        return api
    from huggingface_hub import HfApi

    return HfApi(token=token or os.environ.get("HF_TOKEN"))


def _json(path: Path | None) -> dict:
    return json.loads(path.read_text()) if path and path.exists() else {}


# --- what gets published -----------------------------------------------------


def model_files(source: Path) -> dict[str, Path]:
    """Repo path → local file, from a run directory or a snapshot directory."""
    source = Path(source)
    if (source / "run.json").exists() and (source / "model.cact").exists():
        pairs = ((source / local, repo) for local, repo in RUN_FILES.items())
    elif (source / "site-needle.cact").exists():
        pairs = ((source / name, name) for name in SNAPSHOT_FILES)
    else:
        raise FileNotFoundError(f"{source} is neither a run directory (model.cact + run.json) "
                                "nor a model snapshot (site-needle.cact)")
    return {repo: local for local, repo in pairs if local.exists()}


def run_id_of(source: Path, files: dict[str, Path]) -> str:
    record = _json(files.get("run.json"))
    summary = _json(files.get("summary.json"))
    return record.get("id") or summary.get("run_id") or Path(source).name


def _yaml_list(key: str, values: list[str], indent: str = "") -> list[str]:
    return [f"{indent}{key}:", *[f"{indent}- {v}" for v in values]]


def model_readme(files: dict[str, Path], cfg: RegistryConfig,
                 corpus_tag: str | None = None) -> str:
    """The model card with the Hub's front matter: base model, dataset, tags,
    and the evaluation as ``model-index`` results so the numbers show on
    the repo page."""
    summary = _json(files.get("summary.json"))
    evaluation = summary.get("eval") or {}
    tuned = evaluation.get("tuned") or {}
    handwritten = (evaluation.get("handwritten") or {}).get("tuned") or {}
    lines = ["---", "license: apache-2.0", f"base_model: {BASE_MODEL}",
             *_yaml_list("language", ["en"]),
             *_yaml_list("datasets", [cfg.hf_dataset_repo]),
             *_yaml_list("tags", ["cactus-needle", "needle", "tool-calling", "function-calling",
                                  "intent-router", "lora", "on-device"])]
    results = []
    for split, block, name in (("test", tuned, "held-out split"),
                               ("handwritten", handwritten, "hand-written set")):
        metrics = [("exact_match", "objective (exact call)", block.get("objective")),
                   ("accuracy", "tool accuracy", block.get("tool_accuracy")),
                   ("f1", "argument F1", block.get("arg_f1")),
                   ("false_refusal_rate", "false refusal rate", block.get("false_refusal_rate")),
                   ("missed_refusal_rate", "missed refusal rate",
                    block.get("missed_refusal_rate"))]
        metrics = [(t, n, v) for t, n, v in metrics if isinstance(v, (int, float))]
        if not metrics:
            continue
        results += ["  - task:", "      type: text-classification",
                    f"      name: intent routing ({name})",
                    "    dataset:", f"      name: {cfg.hf_dataset_repo}",
                    f"      type: {cfg.hf_dataset_repo}", f"      split: {split}"]
        if corpus_tag:
            results.append(f"      revision: {corpus_tag}")
        results.append("    metrics:")
        for kind, name_, value in metrics:
            results += [f"    - type: {kind}", f"      name: {name_}", f"      value: {value}"]
    if results:
        lines += ["model-index:", "- name: site-needle", "  results:", *results]
    lines.append("---")
    card = files.get("model-card.md")
    body = card.read_text() if card and card.exists() else "# site-needle\n"
    return "\n".join(lines) + "\n\n" + body


def dataset_readme(manifest: dict, cfg: RegistryConfig, has_handwritten: bool,
                   kept: list[str]) -> str:
    corpus = manifest.get("corpus") or {}
    content = manifest.get("content") or {}
    counts = corpus.get("counts") or {}
    aug = corpus.get("augmentation") or {}
    by_slice = corpus.get("by_slice") or {}
    lines = ["---", "license: mit", *_yaml_list("language", ["en"]),
             *_yaml_list("tags", ["needle", "tool-calling", "intent-router", "synthetic",
                                  "llm-generated"]),
             *_yaml_list("task_categories", ["text-classification"]),
             *_yaml_list("size_categories", ["1K<n<10K"]),
             "configs:", "- config_name: default", "  data_files:",
             "  - split: train", "    path: train.jsonl",
             "  - split: test", "    path: test.jsonl"]
    if has_handwritten:
        lines += ["- config_name: handwritten", "  data_files:",
                  "  - split: test", "    path: handwritten.jsonl"]
    lines += ["---", "", "# site-needle-corpus", "",
              "The training corpus for [site-needle](https://huggingface.co/"
              f"{cfg.hf_model_repo}): Needle 2 fine-tuned into an intent router for "
              "[alexnodeland.com](https://alexnodeland.com). Every row is a visitor's "
              "question with the tool call it should produce — one of five typed site tools, "
              "or the empty call for anything off-topic, injected, negated or conversational — "
              "rendered the way Needle trains: `query`, `tools`, `answers`, `reasoning`, "
              "`system`, plus the pipeline's own `id`, `kind`, `category`, `family`, `split`, "
              "`slice`, `critical` and `entities`.", "",
              "## Where it comes from", "",
              f"Derived from the site's content at `{content.get('hash', '')[:19]}` "
              f"({(content.get('counts') or {}).get('roles', '?')} roles, "
              f"{(content.get('counts') or {}).get('projects', '?')} projects, "
              f"{(content.get('counts') or {}).get('posts', '?')} posts, "
              f"{(content.get('counts') or {}).get('skills', '?')} skills) by seeded templates "
              "over every entity, section and channel, plus refusals in six categories, plus "
              "the site's prose as extraction records. On top of that, an LLM "
              f"({aug.get('model', 'none') if aug else 'none'}) was asked for *questions "
              "only* — the pipeline wrote every label and validated every argument as a "
              "verbatim span of the question. Near-duplicates and anything within 0.9 cosine "
              "of a test question were dropped in the build.", "",
              "## Splits", "",
              f"- `train`: {counts.get('train', '?')} rows"
              + (f" ({aug.get('kept', 0)} LLM paraphrases)" if aug else ""),
              f"- `test`: {counts.get('test', '?')} rows, held out three ways: whole phrasing "
              f"families (`paraphrase`, {by_slice.get('paraphrase', '?')}), whole entities "
              f"(`novel_entity`, {by_slice.get('novel_entity', '?')}), and LLM-written questions "
              f"never used in training (`natural`, {by_slice.get('natural', '?')})",
              *(["- `handwritten`: questions written by a person, never generated and never "
                 "used for selection"] if has_handwritten else []),
              "", f"Corpus `{corpus.get('hash', '')[:19]}`, "
              f"{corpus.get('refusal_share_assistant', 0):.0%} refusals among the assistant "
              f"rows, {(corpus.get('length') or {}).get('tokens', {}).get('max', '?')} tokens "
              "at most with Needle's tokenizer.", "",
              "## Files", "",
              "- `train.jsonl`, `test.jsonl` — the splits; `fit.jsonl`, `dev.jsonl` when "
              "present are the by-target validation split of a training run",
              "- `manifest.json` — hashes, counts, lengths, the generator config, the "
              "augmentation stats",
              "- `tools.json`, `system.txt` — the catalogue every row was rendered with; pass "
              "them to the engine unchanged",
              "- `analysis/` — diversity, duplicates, leakage, label drift, coverage, clusters, "
              "a map",
              *([f"- `augment/{name}` — the kept LLM generations the build reads, so a rebuild "
                 "is free" for name in kept]),
              "", "Built by `apps/model` in "
              "[alexnodeland/alexnodeland](https://github.com/alexnodeland/alexnodeland); "
              f"rendered {datetime.now(UTC).isoformat(timespec='seconds')}.", ""]
    return "\n".join(lines)


# --- publishing ----------------------------------------------------------------


def publish_model(source: Path, cfg: RegistryConfig, token: str | None = None,
                  corpus_tag: str | None = None, api=None) -> dict:
    """One commit on the model repo with the run's files and a rendered
    README, tagged ``run-<id>``. Returns the repo, revision and tag."""
    from huggingface_hub import CommitOperationAdd

    api = _api(token, api)
    files = model_files(source)
    run_id = run_id_of(source, files)
    summary = _json(files.get("summary.json"))
    objective = ((summary.get("eval") or {}).get("tuned") or {}).get("objective")
    api.create_repo(cfg.hf_model_repo, repo_type="model", private=cfg.hf_private, exist_ok=True)
    operations = [CommitOperationAdd(path_in_repo=repo, path_or_fileobj=str(local))
                  for repo, local in files.items()]
    operations.append(CommitOperationAdd(
        path_in_repo="README.md",
        path_or_fileobj=model_readme(files, cfg, corpus_tag).encode("utf-8")))
    message = f"run {run_id}" + (f": objective {objective:.3f}"
                                 if isinstance(objective, (int, float)) else "")
    info = api.create_commit(repo_id=cfg.hf_model_repo, repo_type="model",
                             operations=operations, commit_message=message)
    tag = f"run-{run_id}"
    api.create_tag(cfg.hf_model_repo, tag=tag, revision=info.oid, repo_type="model",
                   exist_ok=True)
    return {"repo": cfg.hf_model_repo, "revision": info.oid, "tag": tag, "run_id": run_id,
            "objective": objective, "files": sorted(files) + ["README.md"],
            "url": f"https://huggingface.co/{cfg.hf_model_repo}/tree/{tag}"}


def publish_dataset(corpus_dir: Path, cfg: RegistryConfig, token: str | None = None,
                    handwritten: Path | None = None, augment_dir: Path | None = None,
                    api=None) -> dict:
    """One commit on the dataset repo with the corpus, its analysis, the
    hand-written set and the kept generations, tagged ``corpus-<hash>``."""
    from huggingface_hub import CommitOperationAdd

    api = _api(token, api)
    handwritten = HANDWRITTEN_PATH if handwritten is None else handwritten
    augment_dir = AUGMENT_DIR if augment_dir is None else augment_dir
    corpus_dir = Path(corpus_dir)
    manifest = _json(corpus_dir / "manifest.json")
    if not manifest:
        raise FileNotFoundError(f"no manifest.json in {corpus_dir}")
    short = manifest["corpus"]["hash"].split(":")[-1][:12]
    files: dict[str, Path] = {}
    for name in (*DATASET_FILES, *ANALYSIS_FILES):
        if (corpus_dir / name).exists():
            files[name] = corpus_dir / name
    if handwritten and Path(handwritten).exists():
        files["handwritten.jsonl"] = Path(handwritten)
    kept = sorted(p.name for p in Path(augment_dir).glob("*.jsonl")) \
        if Path(augment_dir).exists() else []
    for name in kept:
        files[f"augment/{name}"] = Path(augment_dir) / name
    api.create_repo(cfg.hf_dataset_repo, repo_type="dataset", private=cfg.hf_private,
                    exist_ok=True)
    operations = [CommitOperationAdd(path_in_repo=repo, path_or_fileobj=str(local))
                  for repo, local in files.items()]
    operations.append(CommitOperationAdd(
        path_in_repo="README.md",
        path_or_fileobj=dataset_readme(manifest, cfg, "handwritten.jsonl" in files,
                                       kept).encode("utf-8")))
    counts = manifest["corpus"].get("counts") or {}
    message = (f"corpus {short}: {counts.get('train', '?')} train / "
               f"{counts.get('test', '?')} test")
    info = api.create_commit(repo_id=cfg.hf_dataset_repo, repo_type="dataset",
                             operations=operations, commit_message=message)
    tag = f"corpus-{short}"
    api.create_tag(cfg.hf_dataset_repo, tag=tag, revision=info.oid, repo_type="dataset",
                   exist_ok=True)
    return {"repo": cfg.hf_dataset_repo, "revision": info.oid, "tag": tag,
            "corpus_hash": manifest["corpus"]["hash"],
            "content_hash": (manifest.get("content") or {}).get("hash"),
            "files": sorted(files) + ["README.md"],
            "url": f"https://huggingface.co/datasets/{cfg.hf_dataset_repo}/tree/{tag}"}


# --- the pointer ---------------------------------------------------------------


def pointer_for(source: Path, published: dict, dataset: dict | None = None) -> dict:
    files = model_files(source)
    manifest = _json(files.get("manifest.json"))
    summary = _json(files.get("summary.json"))
    evaluation = summary.get("eval") or {}
    cact = files["site-needle.cact"]
    return {
        "schema": 1,
        "repo": published["repo"],
        "revision": published["revision"],
        "tag": published["tag"],
        "run_id": published["run_id"],
        "published_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "sha256": _sha256(cact),
        "bytes": cact.stat().st_size,
        "corpus_hash": (manifest.get("corpus") or {}).get("hash"),
        "content_hash": (manifest.get("content") or {}).get("hash"),
        "objective": (evaluation.get("tuned") or {}).get("objective"),
        "handwritten_objective": ((evaluation.get("handwritten") or {}).get("tuned")
                                  or {}).get("objective"),
        "dataset": ({"repo": dataset["repo"], "revision": dataset["revision"],
                     "tag": dataset["tag"]} if dataset else None),
        "files": {"model": "site-needle.cact", "tools": "tools.json", "system": "system.txt",
                  "manifest": "manifest.json", "eval": "eval.json"},
        "resolve": f"https://huggingface.co/{published['repo']}/resolve/{published['revision']}/",
    }


def write_pointer(pointer: dict, path: Path | None = None) -> Path:
    path = POINTER_PATH if path is None else path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(pointer, indent=2) + "\n")
    return path


def read_pointer(path: Path | None = None) -> dict | None:
    path = POINTER_PATH if path is None else path
    return json.loads(path.read_text()) if path.exists() else None


# --- reading what is published ---------------------------------------------------


def published_file(cfg: RegistryConfig, name: str, pointer: dict | None = None,
                   token: str | None = None) -> Path | None:
    """A file from the model repo at the pointer's revision (``main`` without
    a pointer), from the Hub cache; None when it cannot be fetched."""
    from huggingface_hub import hf_hub_download

    try:
        return Path(hf_hub_download(cfg.hf_model_repo, name, repo_type="model",
                                    revision=(pointer or {}).get("revision"),
                                    token=token or os.environ.get("HF_TOKEN")))
    except Exception:  # network, missing repo, missing file: all mean "not readable"
        return None


def published_manifest(cfg: RegistryConfig, pointer: dict | None = None) -> dict | None:
    path = published_file(cfg, "manifest.json", pointer)
    return _json(path) if path else None


def published_eval(cfg: RegistryConfig, pointer: dict | None = None) -> dict | None:
    path = published_file(cfg, "eval.json", pointer)
    return _json(path) if path else None


def pull(cfg: RegistryConfig, out_dir: Path | None = None, revision: str | None = None,
         token: str | None = None) -> Path:
    """Materialise the published model into ``out_dir`` (the pointer's
    revision unless one is given)."""
    from huggingface_hub import snapshot_download

    out_dir = MODELS_DIR if out_dir is None else out_dir
    pointer = read_pointer()
    revision = revision or (pointer or {}).get("revision")
    out_dir.mkdir(parents=True, exist_ok=True)
    snapshot_download(cfg.hf_model_repo, repo_type="model", revision=revision,
                      local_dir=str(out_dir), token=token or os.environ.get("HF_TOKEN"))
    return out_dir / "site-needle.cact"


def promote(source: Path, cfg: RegistryConfig, token: str | None = None,
            dataset: bool = True, corpus_dir: Path | None = None, api=None) -> dict:
    """Publish a run (or a materialised snapshot) and, when it has a corpus,
    the corpus; then move the pointer to the new revision."""
    source = Path(source)
    corpus_dir = corpus_dir or (source / "corpus")
    published_dataset = None
    if dataset and (Path(corpus_dir) / "manifest.json").exists():
        published_dataset = publish_dataset(corpus_dir, cfg, token, api=api)
    published = publish_model(source, cfg, token,
                              corpus_tag=published_dataset["tag"] if published_dataset else None,
                              api=api)
    pointer = pointer_for(source, published, published_dataset)
    path = write_pointer(pointer)
    return {"model": published, "dataset": published_dataset, "pointer": pointer,
            "pointer_path": str(path)}


def describe(result: dict) -> str:
    lines = [f"model: {result['model']['url']}  ({result['model']['revision'][:12]})"]
    if result.get("dataset"):
        lines.append(f"dataset: {result['dataset']['url']}  "
                     f"({result['dataset']['revision'][:12]})")
    if result.get("pointer_path"):
        lines.append(f"pointer: {result['pointer_path']}")
    return "\n".join(lines)
