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


class _FakeProvider:
    """Answers every prompt from what its target asks for: one grounded
    question, one ungrounded one, and for natural prompts one casual one."""

    name = "fake"
    model = "fake-1"

    def __init__(self):
        self.calls = 0

    def generate(self, prompts, log):
        from site_needle import augment as augment_mod

        self.calls += 1
        out = {}
        for key, prompt in prompts.items():
            target_key, mode, _ = key.split("\x00")
            span = None
            for line in prompt.splitlines():
                if line.startswith('The text "'):
                    span = line.split('"')[1]
                    break
            if mode == "natural":
                q = f"{span} tho?" if span else "wait what's this about"
                out[key] = [{"question": q, "cue": span or "what"}]
            elif span:
                out[key] = [{"question": f"yo, has alex touched {span} at all?", "cue": span},
                            {"question": "tell me about that thing", "cue": "thing"}]
            elif target_key.startswith("refusal"):
                out[key] = [{"question": f"[{target_key}] what's the tallest building in Dubai?",
                             "cue": "tallest"}]
            else:  # an enum target: the cue must appear in the question
                out[key] = [{"question": "so what does he do now, job-wise?", "cue": "now"}]
        assert augment_mod.SCHEMA["required"] == ["questions"]
        return out


def test_augmentation_keeps_only_grounded_novel_rows(content, content_path, corpus_cfg,
                                                     tmp_path, monkeypatch):
    from site_needle import augment as augment_mod

    monkeypatch.setattr(augment_mod, "CACHE_DIR", tmp_path)
    plain = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None)
    provider = _FakeProvider()
    built = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                                   augment=40, natural=10, provider_obj=provider)
    assert provider.calls == 1
    generated = [e for e in built.examples if "augmented" in e.tags or "natural" in e.tags]
    assert generated
    train = [e for e in generated if e.split == "train"]
    natural = [e for e in generated if e.split == "test"]
    assert train and natural
    assert all(e.slice == "natural" for e in natural)
    assert all(e.tags == ("natural",) for e in natural)
    # Ungrounded questions were dropped, every kept one passes the checks.
    assert not any(e.query == "tell me about that thing" for e in generated)
    stats = built.manifest["corpus"]["augmentation"]
    assert stats["kept"] == len(train) and stats["natural_kept"] == len(natural)
    assert stats["dropped_invalid"] > 0 and stats["provider"] == "fake"
    # Refusal targets carry their category and the critical flag where due.
    refusals = [e for e in train if not e.answers]
    assert refusals and any(e.critical for e in refusals)
    # The deterministic part is unchanged; the corpus hash is not.
    assert built.manifest["corpus"]["template_hash"] == plain.manifest["corpus"]["template_hash"]
    assert built.manifest["corpus"]["hash"] != plain.manifest["corpus"]["hash"]
    assert corpus.diff(plain.manifest, built.manifest)["corpus_changed"] is False
    assert built.problems == []

    # A second build reads the kept generations: the provider is not called again.
    again = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                                   augment=40, natural=10, provider_obj=provider)
    assert provider.calls == 1
    assert again.manifest["corpus"]["hash"] == built.manifest["corpus"]["hash"]

    # Drop one request's rows from the kept file: only that request is remade.
    kept = list(tmp_path.glob("fake-*.jsonl"))[0]
    rows = [json.loads(line) for line in kept.read_text().splitlines()]
    victim = rows[0]["request"]
    kept.write_text("".join(json.dumps(r) + "\n" for r in rows if r["request"] != victim))
    provider.seen = None

    class _Spy(_FakeProvider):
        def generate(self, prompts, log):
            provider.seen = list(prompts)
            return super().generate(prompts, log)

    spy = _Spy()
    corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                           augment=40, natural=10, provider_obj=spy)
    assert [k.replace("\x00", "|") for k in provider.seen] == [victim]


def test_augment_targets_cover_every_tool(content, corpus_cfg):
    from site_needle import augment as augment_mod
    from site_needle.catalogue import TOOL_NAMES

    ts = augment_mod.targets(content, corpus_cfg)
    named = {a["name"] for t in ts for a in t.answers}
    assert named == set(TOOL_NAMES)
    assert {t.category for t in ts if not t.answers} == {
        f"refusal:{why}" for why in augment_mod.REFUSAL_MEANING}
    per = augment_mod.allocate(ts, 100)
    assert sum(per.values()) >= 100 and min(per.values()) >= 2
    assert per["refusal:general"] > per[ts[0].key]
    picked = augment_mod.spread(ts, 6)
    assert len(picked) == 6 and len({t.category for t in picked}) >= 3
    prompts, counts = augment_mod.prompts_for(ts, 10, 12)
    natural_prompts = [k for k in prompts if "natural" in k]
    assert len(natural_prompts) == 6 and all(counts[k] == 2 for k in natural_prompts)
    # Asking again with everything covered makes no requests; a bigger
    # budget adds batches that continue the numbering.
    covered = {(t.key, "train"): 999 for t in ts} | {(t.key, "natural"): 999 for t in ts}
    assert augment_mod.prompts_for(ts, 10, 12, covered)[0] == {}
    more, _ = augment_mod.prompts_for(ts, 4000, 0, {(ts[0].key, "train"): 2},
                                      {(ts[0].key, "train"): 1})
    assert any(k.startswith(ts[0].key + "\x00train\x001") for k in more)
    prompt = ts[0].prompt(5)
    assert "5 distinct" in prompt and "exactly as written" in prompt


def test_held_out_entities_get_no_training_paraphrases(content, corpus_cfg):
    from site_needle import augment as augment_mod

    ts = augment_mod.targets(content, corpus_cfg)
    holdout = {*corpus_cfg.holdout_projects, *corpus_cfg.holdout_companies,
               *corpus_cfg.holdout_skills}
    want = augment_mod.desired(ts, 200, 20, holdout)
    by_key = {t.key: t for t in ts}
    for (key, mode) in want:
        if mode == "train":
            assert not {e.lower() for e in by_key[key].entities} & {h.lower() for h in holdout}
    assert any(mode == "train" for _, mode in want)


def test_greetings_are_thinned():
    from site_needle import augment as augment_mod

    target = augment_mod.Target(key="check_skill:rust", category="check_skill",
                                answers=(augment_mod.call("check_skill", skill="rust"),),
                                verbatim={"skill": "rust"})
    kept, stripped = 0, 0
    for i in range(40):
        ex = augment_mod._example(target, i, f"hey, does alex know rust? (variant {i})", "rust",
                                  False)
        assert ex is not None and "rust" in ex.query
        if ex.query.lower().startswith("hey"):
            kept += 1
        else:
            stripped += 1
    assert kept > 0 and stripped > 0


def test_openrouter_augmentation_needs_a_key(content, content_path, corpus_cfg, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="OPENROUTER_API_KEY"):
        corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None, augment=5,
                               provider="openrouter")
