import json
from dataclasses import replace

import pytest

from site_needle import corpus, tokens
from site_needle.generate import Example
from site_needle.validate import check_corpus, check_example


def test_build_in_memory_is_clean_and_split(content, content_path, corpus_cfg):
    built = corpus.build_in_memory(content, content_path, corpus_cfg)
    assert built.problems == []
    assert built.train and built.test
    slices = {e.slice for e in built.test}
    assert {"paraphrase", "novel_entity", "site_prompts"} <= slices
    # Held-out entities never appear as an entity of a training example.
    holdout = {n.lower() for n in [*corpus_cfg.holdout_projects, *corpus_cfg.holdout_companies,
                                   *corpus_cfg.holdout_skills]}
    for e in built.train:
        assert not {x.lower() for x in e.entities} & holdout
    # Template families are whole: no family straddles the split.
    by_family = {}
    for e in built.examples:
        if e.slice == "novel_entity":
            continue
        by_family.setdefault(e.family, set()).add(e.split)
    assert all(len(v) == 1 for v in by_family.values())


def test_manifest_hashes_are_stable(content, content_path, corpus_cfg):
    a = corpus.build_in_memory(content, content_path, corpus_cfg).manifest
    b = corpus.build_in_memory(content, content_path, corpus_cfg).manifest
    assert a["corpus"]["hash"] == b["corpus"]["hash"]
    assert a["content"]["hash"] == b["content"]["hash"]
    assert a["corpus"]["length"]["bucket"] in (128, 256, 512)
    counts = a["corpus"]["counts"]
    assert counts["total"] == counts["train"] + counts["test"]


def test_write_and_read_back(tmp_path, content, content_path, corpus_cfg):
    built = corpus.build_in_memory(content, content_path, corpus_cfg)
    corpus.write(built, tmp_path)
    for name in ("train.jsonl", "test.jsonl", "manifest.json", "tools.json", "system.txt"):
        assert (tmp_path / name).exists()
    rows = [json.loads(line) for line in (tmp_path / "train.jsonl").read_text().splitlines()]
    assert all({"query", "tools", "answers", "reasoning"} <= set(r) for r in rows)
    assert all(r["split"] == "train" for r in rows)
    manifest = corpus.read_manifest(tmp_path / "manifest.json")
    assert manifest["corpus"]["hash"] == built.manifest["corpus"]["hash"]


def test_diff_reports_new_sources_and_moved_counts(content, content_path, corpus_cfg):
    new = corpus.build_in_memory(content, content_path, corpus_cfg).manifest
    old = json.loads(json.dumps(new))
    old["content"]["sources"]["posts"] = old["content"]["sources"]["posts"][:-1]
    old["content"]["hash"] = "sha256:old"
    old["corpus"]["hash"] = "sha256:old"
    old["corpus"]["template_hash"] = "sha256:old"
    old["corpus"]["by_category"]["lookup_project"] -= 2
    d = corpus.diff(old, new)
    assert d["content_changed"] and d["corpus_changed"]
    assert d["added"]["posts"] == [new["content"]["sources"]["posts"][-1]]
    assert d["counts"]["lookup_project"]["after"] - d["counts"]["lookup_project"]["before"] == 2
    assert corpus.diff(new, new)["corpus_changed"] is False
    assert corpus.diff(None, new)["baseline"] is None


def test_build_fails_on_problems(tmp_path, content, content_path, corpus_cfg):
    bad = replace(corpus_cfg, max_tokens=64)  # everything is over budget
    if tokens.try_tokenizer() is None:
        pytest.skip("the budget is only enforced with the real tokenizer")
    with pytest.raises(corpus.CorpusError, match="exceeds the budget"):
        corpus.build(bad, content_path, tmp_path / "out")
    assert not (tmp_path / "out" / "train.jsonl").exists()


def test_estimated_lengths_do_not_fail_the_budget(content, content_path, corpus_cfg):
    tight = replace(corpus_cfg, max_tokens=64)
    built = corpus.build_in_memory(content, content_path, tight, tokenizer=None)
    assert not any("budget" in p.message for p in built.problems)
    assert built.manifest["corpus"]["length"]["tokenizer"] == "estimate"


def _example(**overrides) -> Example:
    base = dict(
        id="x", kind="assistant", category="lookup_project", family="f", entities=(),
        query="what is fugue?", tools=[{"name": "lookup_project", "parameters": {
            "type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]}}],
        answers=[{"name": "lookup_project", "arguments": {"name": "fugue"}}],
        reasoning="'fugue' -> name",
    )
    base.update(overrides)
    return Example(**base)


def test_validation_catches_ungrounded_and_malformed_calls():
    assert check_example(_example()) == []
    ungrounded = _example(answers=[{"name": "lookup_project", "arguments": {"name": "quiver"}}])
    assert any("verbatim" in p.message for p in check_example(ungrounded))
    unknown = _example(answers=[{"name": "nope", "arguments": {"name": "fugue"}}])
    assert any("unknown tool" in p.message for p in check_example(unknown))
    missing = _example(answers=[{"name": "lookup_project", "arguments": {}}])
    assert any("required" in p.message or "no arguments" in p.message
               for p in check_example(missing))
    extra = _example(answers=[{"name": "lookup_project", "arguments": {"name": "fugue", "x": 1}}])
    assert any("no argument" in p.message for p in check_example(extra))
    enum_tool = [{"name": "contact", "parameters": {"type": "object", "properties": {
        "channel": {"type": "string", "enum": ["email"]}}, "required": ["channel"]}}]
    bad_enum = _example(tools=enum_tool,
                        answers=[{"name": "contact", "arguments": {"channel": "fax"}}])
    assert any("enum" in p.message for p in check_example(bad_enum))


def test_corpus_level_checks():
    a = _example(id="a", split="train")
    b = _example(id="b", split="train", answers=[])  # same query, same tools, different answers
    problems = check_corpus([a, b], max_tokens=512, lengths={"a": 10, "b": 10})
    assert any("different answers" in p.message for p in problems)
    assert any("no test examples" in p.message for p in problems)


def test_augmentation_keeps_only_grounded_novel_rows(content, content_path, corpus_cfg):
    plain = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None)
    already = next(e for e in plain.examples if e.kind == "assistant" and e.answers)
    rows = [
        {"query": "yo, has alex touched kubernetes at all?", "reasoning": "'kubernetes' -> skill",
         "answers": [{"name": "check_skill", "arguments": {"skill": "kubernetes"}}]},
        {"query": already.query.upper(), "reasoning": "dup of a template",
         "answers": already.answers},
        {"query": "tell me about his time at Google", "reasoning": "ungrounded",
         "answers": [{"name": "lookup_role", "arguments": {"company": "Alphabet"}}]},
        {"query": "what's the tallest building in Dubai?", "reasoning": "off-topic",
         "answers": []},
    ]
    built = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                                   augment=4, generate_fn=lambda *a, **k: rows)
    augmented = [e for e in built.examples if "augmented" in e.tags]
    assert {e.query for e in augmented} == {
        "yo, has alex touched kubernetes at all?", "what's the tallest building in Dubai?"}
    assert all(e.split == "train" for e in augmented)
    stats = built.manifest["corpus"]["augmentation"]
    assert stats["kept"] == 2 and stats["dropped_invalid"] == 1 and stats["dropped_duplicate"] == 1
    # The deterministic part is unchanged, so the template hash still matches
    # a build without augmentation, while the corpus hash does not.
    assert built.manifest["corpus"]["template_hash"] == plain.manifest["corpus"]["template_hash"]
    assert built.manifest["corpus"]["hash"] != plain.manifest["corpus"]["hash"]
    assert corpus.diff(plain.manifest, built.manifest)["corpus_changed"] is False


def test_augmentation_needs_a_key(content, content_path, corpus_cfg, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None, augment=5)
