import json

from site_needle.catalogue import CHANNELS, SECTIONS, TOOL_NAMES, TOOLS, WHICH
from site_needle.generate import generate, topics
from site_needle.validate import check_example


def test_catalogue_is_five_tools_with_descriptions():
    assert len(TOOLS) <= 5
    for tool in TOOLS:
        assert tool["description"]
        assert tool["parameters"]["type"] == "object"
    assert len(json.dumps(TOOLS, separators=(",", ":"))) < 1400


def test_generation_is_deterministic(content, corpus_cfg):
    a = [e.row() for e in generate(content, corpus_cfg)]
    b = [e.row() for e in generate(content, corpus_cfg)]
    assert a == b


def test_seed_changes_sampling(content, corpus_cfg):
    from dataclasses import replace

    a = [e.query for e in generate(content, corpus_cfg)]
    b = [e.query for e in generate(content, replace(corpus_cfg, seed=corpus_cfg.seed + 1))]
    assert a != b


def test_every_example_is_grounded_and_well_formed(content, corpus_cfg):
    problems = [p for e in generate(content, corpus_cfg) for p in check_example(e)]
    assert problems == []


def test_every_tool_and_enum_value_is_covered(content, corpus_cfg):
    examples = generate(content, corpus_cfg)
    calls = [a for e in examples for a in e.answers]
    assert {c["name"] for c in calls} >= set(TOOL_NAMES)
    assert {c["arguments"].get("which") for c in calls if c["name"] == "lookup_role"} >= set(WHICH)
    assert {c["arguments"]["channel"] for c in calls if c["name"] == "contact"} == set(CHANNELS)
    assert {c["arguments"]["section"] for c in calls if c["name"] == "search_site"} == set(SECTIONS)


def test_refusals_cover_the_critical_categories(content, corpus_cfg):
    examples = generate(content, corpus_cfg)
    critical = [e for e in examples if e.critical]
    assert critical
    assert all(e.answers == [] for e in critical)
    assert {e.category for e in critical} == {"refusal:negation", "refusal:injection"}


def test_site_prompts_are_graded(content, corpus_cfg):
    examples = generate(content, corpus_cfg)
    graded = [e for e in examples if e.slice == "site_prompts"]
    assert {e.query for e in graded} == set(content.chat.sample_prompts)
    assert all(e.split == "test" for e in graded)


def test_extraction_uses_one_schema_and_copies_values(content, corpus_cfg):
    for e in (x for x in generate(content, corpus_cfg) if x.kind == "extraction"):
        assert len(e.tools) == 1
        assert e.system is None
        for answer in e.answers:
            assert answer["name"] == e.tools[0]["name"]


def test_topics_come_from_the_content(content):
    t = topics(content)
    posts = " ".join(
        p.title + p.description + " ".join(p.paragraphs) for p in content.posts).lower()
    tags = {tag.replace("-", " ") for p in content.projects.projects for tag in p.tags}
    expertise = {x.title for x in content.homepage.expertise}
    for word in t["writing"]:
        assert word in posts or word in tags or word in expertise
    # A word that appears only in a title is a turn of phrase, not a subject.
    for post in content.posts:
        body = f"{post.description} {' '.join(post.paragraphs)}".lower()
        for word in post.title.lower().split():
            if len(word) > 6 and word.isalpha() and word not in body:
                assert word not in t["writing"] or word in tags or word in expertise
    languages = {p.language.lower() for p in content.projects.projects}
    assert languages <= set(t["projects"])
