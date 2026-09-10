"""Data quality checks the corpus must pass before anything trains on it.

Every rule here is one Needle's fine-tuning guide states or one the site
needs: arguments only ever contain spans from the query, enums stay inside
their sets, refusals exist in the right proportion, and nothing exceeds the
token budget. A corpus that fails a check is not written.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from .catalogue import TOOL_NAMES
from .generate import REFUSAL, Example


@dataclass(frozen=True)
class Problem:
    example_id: str
    message: str

    def __str__(self) -> str:
        return f"{self.example_id}: {self.message}"


def _grounded(value, schema: dict, query: str) -> str | None:
    """Why a value is not evidenced by the query, or None if it is."""
    if "enum" in schema:
        return None if value in schema["enum"] else f"{value!r} not in enum {schema['enum']}"
    kind = schema.get("type", "string")
    if kind == "string":
        if not isinstance(value, str) or not value:
            return f"{value!r} is not a non-empty string"
        if value in query:
            return None
        return f"{value!r} does not appear verbatim in the query"
    if kind == "integer":
        if isinstance(value, bool) or not isinstance(value, int):
            return f"{value!r} is not an integer"
        return None if str(value) in query else f"{value!r} does not appear in the query"
    if kind == "array":
        if not isinstance(value, list) or not value:
            return f"{value!r} is not a non-empty list"
        for item in value:
            why = _grounded(item, schema.get("items", {"type": "string"}), query)
            if why:
                return why
        return None
    return None


def check_example(example: Example) -> list[Problem]:
    problems: list[Problem] = []
    tools = {t["name"]: t for t in example.tools}
    if not example.query.strip():
        problems.append(Problem(example.id, "empty query"))
    if not example.reasoning.strip():
        problems.append(Problem(example.id, "missing reasoning"))
    if len(example.tools) > 5:
        problems.append(Problem(
            example.id, f"{len(example.tools)} tools; Needle renders at most 5"))
    for answer in example.answers:
        name = answer.get("name")
        if name not in tools:
            problems.append(Problem(example.id, f"answer names unknown tool {name!r}"))
            continue
        params = tools[name].get("parameters", {})
        props = params.get("properties", {})
        arguments = answer.get("arguments") or {}
        if not arguments:
            problems.append(Problem(example.id, f"{name} called with no arguments"))
        for key in params.get("required", []):
            if key not in arguments:
                problems.append(Problem(example.id, f"{name} is missing required {key!r}"))
        for key, value in arguments.items():
            if key not in props:
                problems.append(Problem(example.id, f"{name} has no argument {key!r}"))
                continue
            why = _grounded(value, props[key], example.query)
            if why:
                problems.append(Problem(example.id, f"{name}.{key}: {why}"))
    return problems


def check_corpus(examples: list[Example], max_tokens: int | None, lengths: dict[str, int],
                 refusal_bounds: tuple[float, float] = (0.10, 0.30),
                 min_per_tool: int = 5) -> list[Problem]:
    """``max_tokens`` None skips the budget check (lengths are estimates)."""
    problems: list[Problem] = []
    for example in examples:
        problems.extend(check_example(example))
        if max_tokens is not None and lengths.get(example.id, 0) > max_tokens:
            problems.append(Problem(
                example.id, f"{lengths[example.id]} tokens exceeds the budget of {max_tokens}"))

    # The same passage against a different schema is a legitimate refusal;
    # the same question against the same tools with different answers is a
    # labelling error. Case matters: arguments copy the question's casing, so
    # "what is Fugue?" and "what is fugue?" are two inputs with two answers.
    seen: dict[tuple, tuple[str, list]] = {}
    for example in examples:
        key = (example.query.strip(), tuple(t["name"] for t in example.tools))
        if key in seen and seen[key][1] != example.answers:
            problems.append(Problem(
                example.id, f"same query as {seen[key][0]} with different answers"))
        seen.setdefault(key, (example.id, example.answers))

    assistant = [e for e in examples if e.kind == "assistant"]
    if assistant:
        share = sum(1 for e in assistant if not e.answers) / len(assistant)
        lo, hi = refusal_bounds
        if not lo <= share <= hi:
            problems.append(Problem(
                "corpus", f"refusal share {share:.2f} outside [{lo}, {hi}]"))

    train_tools = Counter(
        a["name"] for e in examples if e.split == "train" for a in e.answers)
    for name in TOOL_NAMES:
        if train_tools[name] < min_per_tool:
            problems.append(Problem(
                "corpus",
                f"{name} appears {train_tools[name]} times in train; need {min_per_tool}"))

    splits = Counter(e.split for e in examples)
    if not splits.get("test"):
        problems.append(Problem("corpus", "no test examples"))
    slices = {e.slice for e in examples if e.split == "test"}
    for needed in ("paraphrase", "novel_entity"):
        if needed not in slices:
            problems.append(Problem("corpus", f"test split has no {needed!r} slice"))
    if not any(e.category.startswith(REFUSAL) and e.split == "test" for e in examples):
        problems.append(Problem("corpus", "test split has no refusals"))
    return problems
