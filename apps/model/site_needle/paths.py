"""Where things live, and the versioned configuration.

Every path is relative to the app directory (``apps/model``), never to the
current working directory, so the commands behave the same from the repo
root, from the app, and from CI.
"""

from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / "data"
CORPUS_DIR = DATA_DIR / "corpus"
RUNS_DIR = APP_DIR / "runs"
MODELS_DIR = APP_DIR / "models"
CHECKPOINT_DIR = APP_DIR / "checkpoints"
CONFIG_PATH = APP_DIR / "config.toml"
CONTENT_PATH = DATA_DIR / "site-content.json"

BASE_REPO = "Cactus-Compute/needle2"
BASE_CHECKPOINT = "checkpoints/needle2.pkl"


@dataclass
class CorpusConfig:
    seed: int = 20260910
    max_tokens: int = 512
    test_template_fraction: float = 0.15
    holdout_projects: list[str] = field(default_factory=list)
    holdout_companies: list[str] = field(default_factory=list)
    holdout_skills: list[str] = field(default_factory=list)
    refusal_share: float = 0.15
    max_per_project: int = 3
    max_per_company: int = 5
    max_skills: int = 45
    max_search: int = 70
    max_extraction_paragraphs_per_post: int = 2


@dataclass
class TrainConfig:
    epochs: int = 6
    batch_size: int = 8
    lr: float = 1e-4
    lora_rank: int = 16
    lora_alpha: float = 32.0
    val_split: float = 0.1
    seed: int = 0
    qat_bits: str = "auto"


@dataclass
class EvalConfig:
    max_new_tokens: int = 128
    tolerance: float = 0.02
    critical_categories: list[str] = field(default_factory=lambda: ["negation", "injection"])
    critical_min_pass: float = 0.9


@dataclass
class RegistryConfig:
    github_repo: str = "alexnodeland/alexnodeland"
    release_tag_prefix: str = "model-"


@dataclass
class Config:
    corpus: CorpusConfig
    train: TrainConfig
    eval: EvalConfig
    registry: RegistryConfig

    def as_dict(self) -> dict:
        return {
            "corpus": vars(self.corpus),
            "train": vars(self.train),
            "eval": vars(self.eval),
            "registry": vars(self.registry),
        }


def load_config(path: Path | None = None) -> Config:
    path = path or Path(os.environ.get("SITE_NEEDLE_CONFIG", CONFIG_PATH))
    raw = tomllib.loads(path.read_text()) if path.exists() else {}
    return Config(
        corpus=CorpusConfig(**raw.get("corpus", {})),
        train=TrainConfig(**raw.get("train", {})),
        eval=EvalConfig(**raw.get("eval", {})),
        registry=RegistryConfig(**raw.get("registry", {})),
    )
