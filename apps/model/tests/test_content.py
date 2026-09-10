import json

import pytest

from site_needle.content import content_hash, load_content


def test_loads_and_derives(content):
    assert content.schema_version == 1
    assert content.companies[0] == content.cv.experience[0].short_company
    assert len(content.companies) == len(set(content.companies))
    assert content.cv.skills.technical[0] in content.all_skills
    assert content.chat.sample_prompts


def test_short_company_drops_parenthetical(content):
    role = next(r for r in content.cv.experience if "(" in r.company)
    assert "(" not in role.short_company
    assert role.company.startswith(role.short_company)


def test_hash_is_of_bytes(tmp_path, raw_content):
    a = tmp_path / "a.json"
    b = tmp_path / "b.json"
    a.write_text(json.dumps(raw_content))
    b.write_text(json.dumps(raw_content, indent=2))
    assert content_hash(a) != content_hash(b)
    assert content_hash(a) == content_hash(a)


def test_rejects_unknown_schema(tmp_path, raw_content):
    p = tmp_path / "c.json"
    p.write_text(json.dumps({**raw_content, "schema": 99}))
    with pytest.raises(ValueError, match="schema"):
        load_content(p)


def test_missing_snapshot_says_how_to_make_one(tmp_path):
    with pytest.raises(FileNotFoundError, match="build:content"):
        load_content(tmp_path / "nope.json")
