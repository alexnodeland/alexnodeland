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
POINTER_PATH = MODELS_DIR / "site-needle.json"
AUGMENT_DIR = APP_DIR / "augment"
CHECKPOINT_DIR = APP_DIR / "checkpoints"
EVAL_CACHE_DIR = RUNS_DIR / "eval-cache"
EVALS_DIR = APP_DIR / "evals"
HANDWRITTEN_PATH = EVALS_DIR / "handwritten.jsonl"
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
    max_per_skill: int = 1
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
    grade_epochs: bool = True
    select: str = "dev"
    # Whose weights encode the cached catalogue prefix: "tuned" (Needle's
    # arrangement) or "base" (an experiment knob; see site_needle.prefix).
    prefix_regime: str = "tuned"
    # Whether gradients flow through the tuned prefix cache. Off, the cache
    # is still recomputed from the current adapter every step; the Metal
    # backend cannot compile the backward pass through it.
    prefix_grad: bool = False
    # Loss weight of refusal rows relative to tool-call rows.
    refusal_weight: float = 1.0
    # Shape of the refusal reasoning: "phrase" as written in the corpus, or
    # "span", the tool rows' shape ('<query>' -> no tool).
    refusal_target: str = "phrase"


@dataclass
class EvalConfig:
    max_new_tokens: int = 128
    tolerance: float = 0.02
    critical_categories: list[str] = field(default_factory=lambda: ["negation", "injection"])
    critical_min_pass: float = 0.9
    # Whether a critical-category miss fails the gate or is only reported.
    critical_blocking: bool = True


@dataclass
class RegistryConfig:
    hf_model_repo: str = "alexnodeland/site-needle"
    hf_dataset_repo: str = "alexnodeland/site-needle-corpus"
    hf_private: bool = False


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
