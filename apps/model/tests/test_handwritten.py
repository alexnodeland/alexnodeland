"""The hand-written set is graded under the same rules as the corpus: every
free-text argument is a verbatim span of the question, every enum value is
in its enum, every tool exists, and the set covers the whole surface."""

from collections import Counter

from site_needle import evaluate
from site_needle.catalogue import TOOLS
from site_needle.paths import HANDWRITTEN_PATH
from site_needle.validate import _grounded

SCHEMAS = {t["name"]: t["parameters"] for t in TOOLS}


def _rows():
    return evaluate.load_set(HANDWRITTEN_PATH, HANDWRITTEN_PATH.parent / "no-corpus")


def test_every_row_is_grounded_and_well_formed():
    rows = _rows()
    assert len(rows) >= 60
    ids = [r["id"] for r in rows]
    assert len(set(ids)) == len(ids)
    for row in rows:
        assert row["query"].strip() and row["tools"] and row["system"]
        for call in row["answers"]:
            schema = SCHEMAS[call["name"]]
            for key in schema.get("required", []):
                assert key in call["arguments"], (row["id"], key)
            for key, value in call["arguments"].items():
                assert key in schema["properties"], (row["id"], key)
                why = _grounded(value, schema["properties"][key], row["query"])
                assert why is None, (row["id"], why)


def test_the_set_covers_every_tool_and_refusal_category():
    rows = _rows()
    tools = Counter(c["name"] for r in rows for c in r["answers"])
    assert set(tools) == set(SCHEMAS)
    categories = Counter(r["category"] for r in rows)
    for name in ("refusal:general", "refusal:coding", "refusal:other_people",
                 "refusal:injection", "refusal:negation", "refusal:chat", "parallel"):
        assert categories[name] >= 2, name
    assert all(r["critical"] for r in rows
               if r["category"] in ("refusal:injection", "refusal:negation"))
    assert all(len(r["answers"]) == 2 for r in rows if r["category"] == "parallel")
    assert all(not r["answers"] for r in rows if r["category"].startswith("refusal"))
    assert all(r["slice"] == "handwritten" for r in rows)


def test_load_set_attaches_the_corpus_catalogue(tmp_path):
    (tmp_path / "tools.json").write_text('[{"name": "only_tool", "parameters": {}}]')
    (tmp_path / "system.txt").write_text("sys\n")
    (tmp_path / "set.jsonl").write_text('{"query": "hi", "answers": []}\n')
    rows = evaluate.load_set(tmp_path / "set.jsonl", tmp_path)
    assert rows[0]["tools"][0]["name"] == "only_tool" and rows[0]["system"] == "sys"
    assert rows[0]["id"] == "set:0" and rows[0]["category"] == "refusal"
    assert rows[0]["slice"] == "set"
    assert evaluate.load_handwritten(tmp_path, tmp_path / "missing.jsonl") == []


def test_rows_hash_and_model_key_identify_a_grading():
    rows = _rows()
    h = evaluate.rows_hash(rows)
    assert h == evaluate.rows_hash(list(rows)) and len(h) == 64
    changed = [dict(rows[0], query=rows[0]["query"] + "?"), *rows[1:]]
    assert evaluate.rows_hash(changed) != h
    assert evaluate.model_key(None).startswith("base")
