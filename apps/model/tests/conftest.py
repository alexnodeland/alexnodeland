import json
from pathlib import Path

import pytest

from site_needle.content import load_content
from site_needle.paths import CorpusConfig

FIXTURE = Path(__file__).parent / "fixtures" / "site-content.json"


@pytest.fixture(scope="session", autouse=True)
def _no_hub():
    """Tests never touch the Hub: no fetching of kept generations, and any
    accidental download fails fast instead of waiting on the network.
    Session-scoped so module-scoped corpus fixtures are covered too."""
    from site_needle import augment

    patch = pytest.MonkeyPatch()
    patch.setattr(augment, "fetch_kept", lambda path, log=None: False)
    patch.setenv("HF_HUB_OFFLINE", "1")
    yield
    patch.undo()


@pytest.fixture(scope="session")
def content_path() -> Path:
    return FIXTURE


@pytest.fixture(scope="session")
def content(content_path):
    return load_content(content_path)


@pytest.fixture(scope="session")
def raw_content(content_path) -> dict:
    return json.loads(content_path.read_text())


@pytest.fixture(scope="session")
def corpus_cfg(content) -> CorpusConfig:
    """Hold-outs that exist in the fixture, so every slice is exercised."""
    return CorpusConfig(
        seed=7,
        max_tokens=512,
        test_template_fraction=0.2,
        holdout_projects=[content.projects.projects[1].name],
        holdout_companies=[content.companies[1]],
        holdout_skills=[content.cv.skills.technical[2]],
        max_per_project=3,
        max_per_company=4,
        max_skills=12,
        max_search=60,
        max_extraction_paragraphs_per_post=1,
    )
