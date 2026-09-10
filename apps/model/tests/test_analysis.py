import json

import pytest

from site_needle import analysis, corpus

pytest.importorskip("sklearn")


@pytest.fixture(scope="module")
def built(content, content_path, corpus_cfg, tmp_path_factory):
    """A corpus with templates, generated paraphrases and a natural slice,
    written to disk the way the pipeline writes it."""
    from site_needle import augment as augment_mod
    from tests.test_corpus import _FakeProvider

    tmp = tmp_path_factory.mktemp("analysis")
    augment_mod.CACHE_DIR, old = tmp / "kept", augment_mod.CACHE_DIR
    try:
        b = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                                   augment=60, natural=12, provider_obj=_FakeProvider())
    finally:
        augment_mod.CACHE_DIR = old
    corpus.write(b, tmp / "corpus")
    return tmp / "corpus", b


def test_rows_and_sources(built):
    corpus_dir, b = built
    rows = analysis.load_rows(corpus_dir)
    assert {r.source for r in rows} == {"template", "augmented", "natural"}
    assert all(r.kind == "assistant" for r in rows)
    assert {r.tool for r in rows} >= {"lookup_role", "lookup_project", "(refusal)"}


def test_lexical_numbers_are_sane():
    stats = analysis.lexical(["what is fugue?", "what is quiver?", "does he know rust?"])
    assert stats["n"] == 3 and stats["vocab"] == 8
    assert 0 < stats["distinct_2"] <= 1 and stats["length_median"] == 3
    assert stats["top_openers"][0][0] == "what"
    assert analysis.lexical([]) == {"n": 0}


def test_duplicates_leakage_and_template_distance(built):
    corpus_dir, _ = built
    rows = analysis.load_rows(corpus_dir)
    rows.append(analysis.Row("x:1", "assistant", "lookup_project", "train", "", "augmented",
                             rows[0].query.upper() + " ", rows[0].tool, (), "x", rows[0].answers))
    X, _ = analysis.vectorize([r.query for r in rows])
    d = analysis.near_duplicates(rows, X)
    assert d["exact_groups"] >= 1
    lk = analysis.leakage(rows, X)
    assert lk["threshold"] == analysis.LEAKAGE and "pairs" in lk
    td = analysis.template_distance(rows, X)
    assert set(td) >= {"augmented", "natural"}
    for s in td.values():
        assert 0 <= s["share_novel_under_0.5"] <= 1
        assert sum(s["histogram"].values()) == s["n"]


def test_coverage_counts_entities_enums_and_slices(built):
    corpus_dir, _ = built
    rows = analysis.load_rows(corpus_dir)
    cov = analysis.coverage(rows)
    assert cov["by_source"]["natural"] == {"test": cov["by_source"]["natural"]["test"]}
    assert "lookup_role" in cov["entities_per_tool"]
    assert set(cov["enums"]) >= {"section", "channel", "which"}
    assert cov["families"]["train"] > 0 and cov["families"]["test"] > 0


def test_clusters_projection_and_map(built):
    corpus_dir, _ = built
    rows = analysis.load_rows(corpus_dir)
    X, vec = analysis.vectorize([r.query for r in rows])
    cl = analysis.clusters(rows, X, vec, k=6)
    assert cl["k"] == 6 and sum(c["size"] for c in cl["clusters"]) == len(rows)
    for c in cl["clusters"]:
        assert 0 < c["purity"] <= 1 and c["top_terms"] and len(c["examples"]) <= 3
    coords = analysis.projection(X)
    assert len(coords) == len(rows) and len(coords[0]) == 2
    svg = analysis.map_svg(rows, coords)
    assert svg.startswith("<svg") and "held-out (test)" in svg and "<title>" in svg
    assert analysis.map_svg(rows, []) == ""


def test_diagnose_classifies_misses(built):
    corpus_dir, _ = built
    rows = analysis.load_rows(corpus_dir)
    X, _ = analysis.vectorize([r.query for r in rows])
    test_rows = [r for r in rows if r.split == "test" and r.answers]
    victim = test_rows[0]
    evaluation = {"cases": [
        {"id": victim.id, "category": victim.category, "slice": victim.slice,
         "query": victim.query, "want": victim.answers, "got": [], "exact": False},
        {"id": "not-a-row", "query": "?", "want": [], "got": [], "exact": False},
        {"id": test_rows[1].id, "query": test_rows[1].query, "want": test_rows[1].answers,
         "got": test_rows[1].answers, "exact": True},
    ]}
    dg = analysis.diagnose(rows, X, evaluation)
    assert dg["n_missed"] == 1
    miss = dg["misses"][0]
    assert miss["verdict"] in ("coverage gap", "phrasing conflict", "model error")
    assert miss["got"] == ["(refusal)"] and len(miss["neighbours"]) == 3
    assert all(n["sim"] <= 1.0 for n in miss["neighbours"])


def test_analyze_writes_report(built, tmp_path):
    corpus_dir, _ = built
    result = analysis.analyze(corpus_dir, k=5)
    paths = analysis.write(result, tmp_path / "out")
    names = {p.name for p in paths}
    assert names == {"map.svg", "analysis.json", "analysis.md"}
    text = (tmp_path / "out" / "analysis.md").read_text()
    for heading in ("## Diversity", "## Duplicates and leakage", "## Coverage", "## Clusters"):
        assert heading in text
    assert json.loads((tmp_path / "out" / "analysis.json").read_text())["n"] == result["n"]


def test_build_removes_near_duplicates_and_leakage(content, content_path, corpus_cfg, tmp_path,
                                                   monkeypatch):
    """A generated training question that restates a held-out one is dropped
    (the test row wins); a generated question that restates an earlier one
    is dropped as a near-duplicate."""
    from site_needle import augment as augment_mod
    from site_needle.generate import generate

    monkeypatch.setattr(augment_mod, "CACHE_DIR", tmp_path)
    plain = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None)
    held_out = next(e for e in plain.examples if e.split == "test" and e.kind == "assistant"
                    and e.answers and e.entities)
    span = held_out.entities[0]
    templates = generate(content, corpus_cfg)
    assert templates

    class _Leaky:
        name, model = "leaky", "1"

        def generate(self, prompts, log):
            out = {}
            for key, prompt in prompts.items():
                target_key, mode, _ = key.split("\x00")
                value = next((line.split('"')[1] for line in prompt.splitlines()
                              if line.startswith('The text "')), None)
                if mode == "train" and value and value.lower() == span.lower():
                    # Nearly the held-out question, and then the same thing twice.
                    out[key] = [{"question": held_out.query + "!", "cue": value},
                                {"question": f"hey does alex know {value} at all?", "cue": value},
                                {"question": f"hey does Alex know {value} at all??", "cue": value}]
                elif value:
                    out[key] = [{"question": f"quick one on {value} for you", "cue": value}]
                else:
                    out[key] = [{"question": "and what about the weather", "cue": "weather"}]
            return out

    built = corpus.build_in_memory(content, content_path, corpus_cfg, tokenizer=None,
                                   augment=60, provider_obj=_Leaky())
    stats = built.manifest["corpus"]["augmentation"]
    assert stats["dropped_leakage"] >= 1
    assert stats["dropped_near_duplicate"] >= 1
    generated = [e for e in built.examples if "augmented" in e.tags]
    assert not any(e.query == held_out.query + "!" for e in generated)
    assert "near-duplicates" in stats["quality"]
