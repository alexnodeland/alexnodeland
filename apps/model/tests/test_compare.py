from site_needle import compare, evaluate
from site_needle.paths import load_config


def _call(tool, **args):
    return {"name": tool, "arguments": args}


def _result(label, outcomes):
    """A fake evaluation: ``outcomes`` maps case id → (want, got)."""
    cases = []
    for cid, (want, got) in outcomes.items():
        cases.append({"id": cid, "category": "c", "slice": "s", "critical": False,
                      "query": f"q {cid}", "want": want, "got": got, "ms": 5.0,
                      "prefill_tps": 1, "decode_tps": 1, "peak_ram_mb": 1, "error": None,
                      **evaluate.score(want, got)})
    cfg = load_config()
    return {"model": label, "n": len(cases), "rows_hash": "abc", "seconds": 1,
            "summary": evaluate.summarise(cases, cfg), "cases": cases}


def test_flips_counts_fixed_broken_and_still_wrong():
    role = [_call("lookup_role", company="x")]
    skill = [_call("check_skill", skill="y")]
    before = _result("a", {"1": (role, role), "2": (skill, []), "3": ([], role), "4": (role, [])})
    after = _result("b", {"1": (role, []), "2": (skill, skill), "3": ([], role), "4": (role, role)})
    fl = compare.flips(before, after)
    assert (fl["fixed"], fl["broken"], fl["still_wrong"]) == (2, 1, 1)
    assert fl["examples"]["broken"][0]["id"] == "1"
    assert fl["examples"]["fixed"][0]["after"] == "check_skill(skill='y')"
    assert fl["examples"]["still_wrong"][0]["want"] == "∅"


def test_compare_grades_every_model_on_the_same_rows(monkeypatch, tmp_path):
    cfg = load_config()
    role = [_call("lookup_role", company="x")]
    rows = [{"id": "1", "query": "q 1", "answers": role, "tools": [], "system": "s",
             "category": "c", "slice": "s", "critical": False}]
    calls = []

    def fake_cached(cfg, rows, weights, name, cache_dir, limit, progress, corpus_dir):
        calls.append((str(weights), name))
        got = role if weights else []
        return _result(str(weights), {r["id"]: (r["answers"], got) for r in rows})

    monkeypatch.setattr(evaluate, "cached", fake_cached)
    (tmp_path / "run").mkdir()
    (tmp_path / "run" / "model.cact").write_bytes(b"x")
    result = compare.compare(cfg, ["base", str(tmp_path / "run")], {"test": rows}, tmp_path)
    assert result["models"] == ["base", "run"]
    assert [c[1] for c in calls] == ["test", "test"]
    entry = result["sets"]["test"]
    assert entry["overall"]["base"]["objective"] == 0.0
    assert entry["overall"]["run"]["objective"] == 1.0
    assert entry["flips"]["run"]["fixed"] == 1
    text = compare.render(result)
    assert "| `run` | 1.000 |" in text and "fixed 1, broke 0" in text
    written = compare.write(result, tmp_path / "out")
    assert {p.suffix for p in written} == {".md", ".json"}


def test_resolve_accepts_runs_snapshots_and_files(tmp_path):
    import pytest

    (tmp_path / "models").mkdir()
    (tmp_path / "models" / "site-needle.cact").write_bytes(b"x")
    label, weights = compare.resolve(str(tmp_path / "models"))
    assert label == "models" and weights.name == "site-needle.cact"
    assert compare.resolve("base") == ("base", None)
    label, weights = compare.resolve(str(tmp_path / "models" / "site-needle.cact"))
    assert label == "models/site-needle.cact"
    with pytest.raises(FileNotFoundError):
        compare.resolve(str(tmp_path / "nothing"))
