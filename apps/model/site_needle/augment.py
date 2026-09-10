"""Optional paraphrase augmentation through Needle's own data generator.

Templates give the corpus its grounding and its determinism, and they are
also its ceiling: a held-out phrasing the templates never approached is a
phrasing the model never saw. Needle ships a generator that asks a large
model (via OpenRouter) for varied questions against a tool catalogue, and
this module runs it against the site's catalogue and keeps only what
passes the same checks every templated example passes — arguments copied
from the question, enums in their sets, no question with two answers.

Augmented examples always train and never test: the test split stays the
deterministic one, so a number is comparable across runs whether or not
augmentation was on. Needs ``OPENROUTER_API_KEY``.
"""

from __future__ import annotations

import os

from .catalogue import SYSTEM, TOOLS
from .generate import REFUSAL, Example, call
from .log import Log
from .validate import check_example

DEFAULT_MODEL = "deepseek/deepseek-v4-flash"


def augment(existing: list[Example], count: int, model: str = DEFAULT_MODEL,
            workers: int = 8, log: Log | None = None, generate=None) -> tuple[list[Example], dict]:
    """``count`` generated assistant examples, validated and deduplicated
    against ``existing``. ``generate`` is injectable for tests; by default
    it is ``needle.model.finetune.generate_dataset``."""
    if count <= 0:
        return [], {"requested": 0}
    if generate is None:
        if not os.environ.get("OPENROUTER_API_KEY"):
            raise RuntimeError("set OPENROUTER_API_KEY to augment the corpus")
        from needle.model.finetune import generate_dataset
        generate = generate_dataset
    log = log or Log()
    rows = generate(TOOLS, count, model=model, workers=workers)
    seen = {e.query.strip().lower() for e in existing}
    kept: list[Example] = []
    invalid = duplicate = 0
    for i, row in enumerate(rows):
        query = str(row.get("query") or "").strip()
        answers = [call(a["name"], **(a.get("arguments") or {}))
                   for a in (row.get("answers") or []) if isinstance(a, dict) and a.get("name")]
        category = f"augmented:{answers[0]['name']}" if answers else f"augmented:{REFUSAL}"
        example = Example(
            id=f"augmented:{i}", kind="assistant", category=category, family=f"augmented:{i}",
            entities=(), query=query, tools=TOOLS, answers=answers,
            reasoning=str(row.get("reasoning") or "").strip() or "generated", system=SYSTEM,
            split="train", tags=("augmented",),
        )
        if not query or query.lower() in seen:
            duplicate += 1
            continue
        if check_example(example):
            invalid += 1
            continue
        seen.add(query.lower())
        kept.append(example)
    stats = {"requested": count, "model": model, "returned": len(rows), "kept": len(kept),
             "dropped_invalid": invalid, "dropped_duplicate": duplicate}
    log.say("augment", **stats)
    return kept, stats
