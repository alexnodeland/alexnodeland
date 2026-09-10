"""The Hub registry, against a fake API: what gets committed where, the
tags, the cards' front matter, and the pointer the site reads."""

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from site_needle import registry
from site_needle.paths import RegistryConfig


class _FakeApi:
    """Records repos, commits and tags the way HfApi would."""

    def __init__(self):
        self.repos = []
        self.commits = []
        self.tags = []

    def create_repo(self, repo_id, repo_type=None, private=False, exist_ok=False):
        self.repos.append((repo_id, repo_type, private))

    def create_commit(self, repo_id, repo_type, operations, commit_message):
        files = {}
        for op in operations:
            payload = op.path_or_fileobj
            files[op.path_in_repo] = (Path(payload).read_bytes() if isinstance(payload, str)
                                      else payload)
        oid = f"{len(self.commits):040x}"
        self.commits.append({"repo": repo_id, "type": repo_type, "files": files,
                             "message": commit_message, "oid": oid})
        return SimpleNamespace(oid=oid)

    def create_tag(self, repo_id, tag, revision=None, repo_type=None, exist_ok=False):
        self.tags.append((repo_id, tag, revision, repo_type))


@pytest.fixture
def run_dir(tmp_path):
    run = tmp_path / "20260910-000000-abc1234"
    (run / "corpus").mkdir(parents=True)
    (run / "model.cact").write_bytes(b"cact-bytes")
    (run / "run.json").write_text(json.dumps({"id": run.name}))
    (run / "corpus" / "tools.json").write_text("[]")
    (run / "corpus" / "system.txt").write_text("sys")
    (run / "corpus" / "manifest.json").write_text(json.dumps({
        "content": {"hash": "sha256:c0ffee", "counts": {"roles": 3, "projects": 2, "posts": 1,
                                                          "skills": 9}},
        "corpus": {"hash": "sha256:abcdef0123456789", "counts": {"train": 10, "test": 3},
                   "by_slice": {"paraphrase": 2, "novel_entity": 1},
                   "refusal_share_assistant": 0.2,
                   "length": {"tokens": {"max": 400}},
                   "augmentation": {"model": "claude-opus-5", "kept": 4}}}))
    (run / "corpus" / "train.jsonl").write_text('{"query": "a"}\n')
    (run / "corpus" / "test.jsonl").write_text('{"query": "b"}\n')
    (run / "eval-tuned.json").write_text("{}")
    (run / "summary.json").write_text(json.dumps({
        "run_id": run.name,
        "eval": {"tuned": {"objective": 0.5, "tool_accuracy": 0.7, "arg_f1": 0.6,
                           "false_refusal_rate": 0.0, "missed_refusal_rate": 0.3},
                 "handwritten": {"tuned": {"objective": 0.4, "tool_accuracy": None}}}}))
    (run / "model-card.md").write_text("# card\n")
    return run


def test_publish_model_commits_the_files_and_tags_the_run(run_dir):
    api = _FakeApi()
    cfg = RegistryConfig(hf_model_repo="me/site-needle", hf_dataset_repo="me/corpus")
    result = registry.publish_model(run_dir, cfg, api=api, corpus_tag="corpus-abcdef012345")
    assert api.repos == [("me/site-needle", "model", False)]
    commit = api.commits[0]
    assert commit["repo"] == "me/site-needle" and commit["message"].endswith("objective 0.500")
    assert commit["files"]["site-needle.cact"] == b"cact-bytes"
    assert {"tools.json", "system.txt", "manifest.json", "eval.json", "run.json",
            "summary.json", "model-card.md", "README.md"} <= set(commit["files"])
    readme = commit["files"]["README.md"].decode()
    assert readme.startswith("---\nlicense: apache-2.0\nbase_model: Cactus-Compute/needle2\n")
    assert "- me/corpus" in readme and "revision: corpus-abcdef012345" in readme
    assert "value: 0.5" in readme and "value: 0.4" in readme and "None" not in readme
    assert readme.rstrip().endswith("# card")
    assert api.tags == [("me/site-needle", f"run-{run_dir.name}", commit["oid"], "model")]
    assert result["tag"] == f"run-{run_dir.name}" and result["revision"] == commit["oid"]


def test_publish_dataset_includes_handwritten_and_kept_generations(run_dir, tmp_path):
    api = _FakeApi()
    cfg = RegistryConfig(hf_model_repo="me/site-needle", hf_dataset_repo="me/corpus")
    handwritten = tmp_path / "handwritten.jsonl"
    handwritten.write_text('{"query": "hi", "answers": []}\n')
    augment = tmp_path / "augment"
    augment.mkdir()
    (augment / "claude-agent-abc.jsonl").write_text("{}\n")
    (augment / "generate.log").write_text("noise\n")
    result = registry.publish_dataset(run_dir / "corpus", cfg, handwritten=handwritten,
                                      augment_dir=augment, api=api)
    commit = api.commits[0]
    assert commit["type"] == "dataset" and commit["message"].startswith("corpus abcdef012345")
    assert {"train.jsonl", "test.jsonl", "manifest.json", "tools.json", "system.txt",
            "handwritten.jsonl", "augment/claude-agent-abc.jsonl", "README.md"} \
        == set(commit["files"])
    readme = commit["files"]["README.md"].decode()
    assert "config_name: handwritten" in readme and "path: train.jsonl" in readme
    assert "10 rows (4 LLM paraphrases)" in readme
    assert api.tags == [("me/corpus", "corpus-abcdef012345", commit["oid"], "dataset")]
    assert result["corpus_hash"] == "sha256:abcdef0123456789"


def test_promote_publishes_both_and_writes_the_pointer(run_dir, tmp_path, monkeypatch):
    api = _FakeApi()
    cfg = RegistryConfig(hf_model_repo="me/site-needle", hf_dataset_repo="me/corpus")
    pointer_path = tmp_path / "models" / "site-needle.json"
    monkeypatch.setattr(registry, "POINTER_PATH", pointer_path)
    monkeypatch.setattr(registry, "HANDWRITTEN_PATH", tmp_path / "none.jsonl")
    monkeypatch.setattr(registry, "AUGMENT_DIR", tmp_path / "no-augment")
    result = registry.promote(run_dir, cfg, api=api)
    assert [c["type"] for c in api.commits] == ["dataset", "model"]
    pointer = json.loads(pointer_path.read_text())
    assert pointer["repo"] == "me/site-needle" and pointer["tag"] == f"run-{run_dir.name}"
    assert pointer["revision"] == api.commits[1]["oid"]
    assert pointer["dataset"]["tag"] == "corpus-abcdef012345"
    assert pointer["sha256"] == registry._sha256(run_dir / "model.cact")
    assert pointer["objective"] == 0.5 and pointer["handwritten_objective"] == 0.4
    assert pointer["resolve"].endswith(f"/{pointer['revision']}/")
    assert registry.read_pointer(pointer_path) == pointer
    assert "pointer:" in registry.describe(result)


def test_model_files_accepts_a_materialised_snapshot(tmp_path):
    snapshot = tmp_path / "models"
    snapshot.mkdir()
    (snapshot / "site-needle.cact").write_bytes(b"x")
    (snapshot / "tools.json").write_text("[]")
    (snapshot / "summary.json").write_text(json.dumps({"run_id": "r1"}))
    files = registry.model_files(snapshot)
    assert set(files) == {"site-needle.cact", "tools.json", "summary.json"}
    assert registry.run_id_of(snapshot, files) == "r1"
    with pytest.raises(FileNotFoundError):
        registry.model_files(tmp_path)


def test_published_manifest_reads_the_pointer_revision(monkeypatch, tmp_path):
    calls = []

    def fake_download(repo_id, filename, repo_type=None, revision=None, token=None):
        calls.append((repo_id, filename, repo_type, revision))
        path = tmp_path / filename
        path.write_text(json.dumps({"corpus": {"hash": "sha256:1"}}))
        return str(path)

    import huggingface_hub

    monkeypatch.setattr(huggingface_hub, "hf_hub_download", fake_download)
    cfg = RegistryConfig(hf_model_repo="me/site-needle")
    manifest = registry.published_manifest(cfg, {"revision": "deadbeef"})
    assert manifest == {"corpus": {"hash": "sha256:1"}}
    assert calls == [("me/site-needle", "manifest.json", "model", "deadbeef")]

    def broken(*a, **k):
        raise OSError("offline")

    monkeypatch.setattr(huggingface_hub, "hf_hub_download", broken)
    assert registry.published_manifest(cfg, {"revision": "deadbeef"}) is None
