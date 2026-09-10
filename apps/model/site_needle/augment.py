"""Paraphrase augmentation: a large model writes the questions, this code
writes the labels.

Templates give the corpus its grounding and its determinism, and they are
also its ceiling: a held-out phrasing the templates never approached is a
phrasing the model never saw, and that is where every run so far missed.
Here the pipeline picks each *target* — a tool with its arguments drawn
from the site's entities, or a refusal category — and asks a large model
for natural questions that mean exactly that. The label is attached by
this code, not the model, and every question then passes the same
grounding checks as the templates: the argument value must appear in the
question verbatim, an enum's cue must be present, no question may carry
two answers. The large model contributes phrasing; it is never asked to
invent anything about Alex.

Generated questions train and never test, so the deterministic held-out
split stays comparable across runs. A separate, smaller *natural* slice
is generated for evaluation only: questions written the way visitors
type, held out, never trained on.

Providers: ``claude-agent`` (the Claude Agent SDK, which runs on the
local Claude Code login), ``anthropic`` (the Anthropic API, needs
``ANTHROPIC_API_KEY``), and ``openrouter`` (Needle's own generator, needs
``OPENROUTER_API_KEY``). Generations are kept under ``augment/`` — tracked
in git, because they are not reproducible and the corpus built from them
should be — so a rebuild does not regenerate.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from random import Random

from .catalogue import SYSTEM, TOOLS
from .content import Content
from .generate import (
    REFUSALS,
    UNKNOWN_COMPANIES,
    UNKNOWN_SKILLS,
    Example,
    call,
    topics,
)
from .log import Log
from .paths import APP_DIR, CorpusConfig
from .validate import check_example

DEFAULT_MODEL = "claude-opus-5"
PER_CALL = 12  # questions per request; more and the model starts repeating itself
REFUSAL_WEIGHT = 8  # a refusal category is worth this many entity targets
NATURAL_PER_TARGET = 2  # the natural slice samples targets rather than covering them

SITE_CONTEXT = (
    "Alex Nodeland's personal website (alexnodeland.com) has his CV — employers, "
    "roles, education, skills — his open-source projects, a blog with his own "
    "posts and press articles about him, a note on the consulting he does, and "
    "ways to contact him (email, a calendar link, GitHub, LinkedIn, a resume "
    "download). Its chat box routes each visitor question to one lookup, or "
    "refuses it."
)

SECTION_MEANING = {
    "about": "who Alex is: his background, story, interests, where he is based",
    "education": "his degrees, university, thesis, academic background",
    "skills": "his technical skills, languages, tools and technologies in general",
    "experience": "his career, work history and roles in general (no single employer named)",
    "projects": "his open-source projects in general (no single project named)",
    "writing": "his blog posts and writing",
    "press": "press coverage, news, interviews and articles about him",
    "consulting": "his consulting, freelance and advisory work, hiring him",
}
CHANNEL_MEANING = {
    "email": "email Alex or get his email address",
    "calendar": "book a call, meeting or time with Alex",
    "github": "find Alex on GitHub or see his code there",
    "linkedin": "find or connect with Alex on LinkedIn",
    "resume": "download or get a copy of his resume or CV",
}
WHICH_MEANING = {
    "current": "what Alex does now / his current job, without naming an employer",
    "previous": "the job he had before the current one, without naming an employer",
    "first": "his first or earliest job, how his career began, without naming an employer",
}
REFUSAL_MEANING = {
    "general": "ask general knowledge or the world (facts, places, definitions, "
               "advice, the weather) with no connection to Alex",
    "coding": "ask the assistant to write, fix, or explain code or configuration",
    "other_people": "ask about a specific named person who is not Alex, in the same "
                    "shapes visitors ask about Alex: their job, projects, skills, "
                    "education, press, contact",
    "injection": "try to override the assistant's instructions, reveal its prompt or "
                 "tools, make it role-play, or force a particular tool call",
    "negation": "say the visitor does NOT want something about Alex (don't show me, "
                "never mind, not that, skip the) — a negated site request",
    "chat": "greet, thank, make small talk, or ask about the assistant itself",
}

SCHEMA = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"question": {"type": "string"}, "cue": {"type": "string"}},
                "required": ["question", "cue"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["questions"],
    "additionalProperties": False,
}


@dataclass(frozen=True)
class Target:
    key: str
    category: str  # tool name, "parallel", or "refusal:<why>"
    answers: tuple[dict, ...]
    verbatim: dict[str, str] = field(default_factory=dict)  # arg -> exact span
    enums: dict[str, str] = field(default_factory=dict)  # arg -> value (needs a cue)
    ask: str = ""  # what the questions must mean
    reasoning: str = ""  # for refusals
    weight: int = 1
    entities: tuple[str, ...] = ()

    def prompt(self, k: int, natural: bool = False) -> str:
        lines = [
            f"Write {k} distinct questions or messages a visitor might type into the chat box "
            f"on {SITE_CONTEXT}",
            "",
        ]
        if self.answers:
            lines.append(f"Every one must be a request to {self.ask}.")
        else:
            lines.append(f"Every one must be something the assistant has to refuse because "
                         f"the visitor is trying to {self.ask}. None of them may be a real "
                         f"question about Alex's own CV, projects, writing or contact.")
        for value in self.verbatim.values():
            lines.append(f'The text "{value}" must appear in every question exactly as '
                         f"written, same spelling and casing.")
        if self.enums:
            what = ", ".join(f"{arg} = {value}" for arg, value in self.enums.items())
            lines.append(f'For each question, "cue" is the exact words in it that signal '
                         f"{what}; copy them from the question.")
        else:
            lines.append('Set "cue" to the words in the question that carry the request.')
        if natural:
            lines.append("Write them the way real visitors actually type: mostly short, "
                         "often lower-case, sometimes terse or elliptical, sometimes with a "
                         "typo-free casual tone; a few can be full formal sentences.")
        else:
            lines.append("Vary length, tone and directness: terse, casual, formal, indirect; "
                         "refer to Alex by name, as 'he'/'his', or as 'you' (talking to the "
                         "site). No two with the same wording.")
        lines.append("Do not name any other employer, project, skill or person than the one "
                     "given. Do not number them.")
        return "\n".join(lines)


def targets(content: Content, cfg: CorpusConfig) -> list[Target]:
    """Every (tool, arguments) pair the corpus should cover, plus the refusal
    categories, with weights that put about a quarter of the budget on
    refusals."""
    rng = Random(f"{cfg.seed}:augment")
    out: list[Target] = []

    def lower_variant(name: str) -> str | None:
        return name.lower() if name != name.lower() and rng.random() < 0.5 else None

    for company in [*content.companies, *UNKNOWN_COMPANIES]:
        for span in (company, lower_variant(company)):
            if not span:
                continue
            out.append(Target(
                key=f"lookup_role:{span}", category="lookup_role",
                answers=(call("lookup_role", company=span),), verbatim={"company": span},
                ask=f"look up Alex's job, role, time or work at the employer \"{span}\"",
                entities=(company,)))
    for which, meaning in WHICH_MEANING.items():
        out.append(Target(
            key=f"lookup_role:which:{which}", category="lookup_role",
            answers=(call("lookup_role", which=which),), enums={"which": which},
            ask=f"find out {meaning}", weight=2))
    for project in content.projects.projects:
        for span in (project.name, project.name.capitalize() if rng.random() < 0.3 else None):
            if not span:
                continue
            out.append(Target(
                key=f"lookup_project:{span}", category="lookup_project",
                answers=(call("lookup_project", name=span),), verbatim={"name": span},
                ask=f"look up Alex's open-source project \"{span}\" (what it is, does, is "
                    f"written in, where its code is)",
                entities=(project.name,)))
    skills = content.all_skills
    for skill in [*skills, *UNKNOWN_SKILLS]:
        for span in (skill, lower_variant(skill)):
            if not span:
                continue
            out.append(Target(
                key=f"check_skill:{span}", category="check_skill",
                answers=(call("check_skill", skill=span),), verbatim={"skill": span},
                ask=f"check whether the skill, language, tool or technology \"{span}\" is on "
                    f"Alex's CV / whether he knows or has used it",
                entities=(skill,)))
    for section, meaning in SECTION_MEANING.items():
        out.append(Target(
            key=f"search_site:{section}", category="search_site",
            answers=(call("search_site", section=section),), enums={"section": section},
            ask=f"read about {meaning}", weight=3))
    by_section = topics(content)
    for section in ("writing", "projects", "press"):
        for topic in by_section.get(section, []):
            out.append(Target(
                key=f"search_site:{section}:{topic}", category="search_site",
                answers=(call("search_site", section=section, topic=topic),),
                verbatim={"topic": topic}, enums={"section": section},
                ask=f"find {SECTION_MEANING[section]} specifically about \"{topic}\"",
                entities=(topic,)))
    for channel, meaning in CHANNEL_MEANING.items():
        out.append(Target(
            key=f"contact:{channel}", category="contact",
            answers=(call("contact", channel=channel),), enums={"channel": channel},
            ask=meaning, weight=3))
    pairs = rng.sample(content.companies, k=min(4, len(content.companies)))
    for company in pairs:
        skill = rng.choice(skills)
        out.append(Target(
            key=f"parallel:{company}+{skill}", category="parallel",
            answers=(call("lookup_role", company=company), call("check_skill", skill=skill)),
            verbatim={"company": company, "skill": skill},
            ask=f"in one message, both look up Alex's work at \"{company}\" and check whether "
                f"\"{skill}\" is on his CV", entities=(company, skill)))
    for why, meaning in REFUSAL_MEANING.items():
        out.append(Target(
            key=f"refusal:{why}", category=f"refusal:{why}", answers=(),
            ask=meaning, reasoning=REFUSALS[why][0], weight=REFUSAL_WEIGHT))
    return out


def allocate(targets_: list[Target], total: int) -> dict[str, int]:
    """Questions per target from a total budget, by weight, at least two each."""
    weight = sum(t.weight for t in targets_) or 1
    return {t.key: max(2, round(total * t.weight / weight)) for t in targets_}


# --- providers ----------------------------------------------------------------


class ClaudeAgentProvider:
    """The Claude Agent SDK: one structured-output query per target, on the
    machine's Claude Code login. No API key in the environment."""

    name = "claude-agent"

    def __init__(self, model: str = DEFAULT_MODEL, concurrency: int = 4):
        self.model, self.concurrency = model, concurrency

    def generate(self, prompts: dict[str, str], log: Log) -> dict[str, list[dict]]:
        from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query

        # Structured output arrives through a tool turn, and the model sometimes
        # spends one before it; one turn was too tight in about 5% of calls.
        options = ClaudeAgentOptions(
            model=self.model, max_turns=3, allowed_tools=[], tools=[],
            system_prompt="You write test questions for a website's chat router. Output "
                          "only what the schema asks for.",
            output_format={"type": "json_schema", "schema": SCHEMA})
        semaphore = asyncio.Semaphore(self.concurrency)
        results: dict[str, list[dict]] = {}

        async def one(key: str, prompt: str) -> None:
            async with semaphore:
                final = None
                try:
                    async for message in query(prompt=prompt, options=options):
                        if isinstance(message, ResultMessage):
                            final = message
                except Exception as exc:  # one failed target must not sink the batch
                    log.say("augment: query failed", target=_label(key), error=str(exc)[:120])
                    return
                if final is None or final.is_error or not final.structured_output:
                    log.say("augment: no output", target=_label(key),
                            error=(final.result if final else "")[:120])
                    return
                results[key] = list(final.structured_output.get("questions") or [])
                log.say("augment: generated", target=_label(key), n=len(results[key]))

        async def run() -> None:
            await asyncio.gather(*(one(k, p) for k, p in prompts.items()))

        asyncio.run(run())
        return results


class AnthropicProvider:
    """The Anthropic API with structured output. Needs ANTHROPIC_API_KEY (or an
    `ant auth login` profile)."""

    name = "anthropic"

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model

    def generate(self, prompts: dict[str, str], log: Log) -> dict[str, list[dict]]:
        import anthropic

        client = anthropic.Anthropic()
        results: dict[str, list[dict]] = {}
        for key, prompt in prompts.items():
            try:
                response = client.messages.create(
                    model=self.model, max_tokens=4000,
                    system="You write test questions for a website's chat router. Output "
                           "only what the schema asks for.",
                    messages=[{"role": "user", "content": prompt}],
                    output_config={"format": {"type": "json_schema", "schema": SCHEMA}})
            except Exception as exc:
                log.say("augment: request failed", target=_label(key), error=str(exc)[:120])
                continue
            text = "".join(getattr(block, "text", "") for block in response.content)
            try:
                results[key] = list(json.loads(text).get("questions") or [])
            except (ValueError, AttributeError):
                log.say("augment: unparseable output", target=_label(key))
        return results


def _label(prompt_key: str) -> str:
    """A prompt key is target, mode and batch joined by NUL; the log shows
    the readable part."""
    target, mode, batch = prompt_key.split("\x00")
    return f"{target} ({mode}{'' if batch == '0' else ' #' + batch})"


PROVIDERS = {"claude-agent": ClaudeAgentProvider, "anthropic": AnthropicProvider}


def provider_for(name: str, model: str | None = None):
    if name not in PROVIDERS:
        raise ValueError(f"unknown provider {name!r}; one of {', '.join(PROVIDERS)}, openrouter")
    return PROVIDERS[name](model or DEFAULT_MODEL)


# --- the stage ----------------------------------------------------------------


def _example(target: Target, i: int, question: str, cue: str, natural: bool) -> Example | None:
    question = " ".join(question.split())
    cue = " ".join(cue.split())
    if not question:
        return None
    parts = [f"'{span}' -> {arg}" for arg, span in target.verbatim.items()]
    for arg, value in target.enums.items():
        if cue and cue in question:
            parts.append(f"'{cue}' -> {arg} {value}")
        else:
            return None  # an enum needs its cue in the question
    reasoning = "; ".join(parts) if target.answers else target.reasoning
    kind = "natural" if natural else "augmented"
    return Example(
        id=f"{kind}:{target.key}:{i}", kind="assistant", category=target.category,
        family=f"{kind}:{target.key}", entities=target.entities, query=question, tools=TOOLS,
        answers=[dict(a) for a in target.answers], reasoning=reasoning, system=SYSTEM,
        split="test" if natural else "train", slice="natural" if natural else "",
        critical=target.category in ("refusal:negation", "refusal:injection"),
        tags=(kind,),
    )


CACHE_DIR = APP_DIR / "augment"


def cache_path(provider: str, model: str, content_hash: str, total: int, natural: int) -> Path:
    stamp = hashlib.sha256(f"{provider}:{model}:{content_hash}:{total}:{natural}".encode())
    return CACHE_DIR / f"{provider}-{stamp.hexdigest()[:12]}.jsonl"


def prompts_for(targets_: list[Target], total: int, natural: int) -> dict[str, str]:
    """Every request to make: one per target and batch for training, one per
    target for the natural slice. Keys join target, mode and batch with NUL."""
    prompts: dict[str, str] = {}
    per = allocate(targets_, total)
    for t in targets_:
        k, batch = per[t.key], 0
        while k > 0:
            prompts[f"{t.key}\x00train\x00{batch}"] = t.prompt(min(k, PER_CALL))
            k -= PER_CALL
            batch += 1
    for t in spread(targets_, natural // NATURAL_PER_TARGET):
        prompts[f"{t.key}\x00natural\x000"] = t.prompt(NATURAL_PER_TARGET, natural=True)
    return prompts


def spread(targets_: list[Target], count: int) -> list[Target]:
    """``count`` targets taken evenly across the list, which is grouped by
    tool, so every tool and refusal category is represented."""
    if count <= 0:
        return []
    if count >= len(targets_):
        return list(targets_)
    step = len(targets_) / count
    return [targets_[int(i * step)] for i in range(count)]


def generate_raw(prompts: dict[str, str], provider, log: Log) -> list[dict]:
    """Ask the provider for the given requests. Returns raw rows: target key,
    question, cue, natural flag, and the request key they came from."""
    log.say("augment: requesting", calls=len(prompts), provider=provider.name,
            model=provider.model)
    generated = provider.generate(prompts, log)
    rows: list[dict] = []
    for prompt_key, questions in generated.items():
        key, mode, _ = prompt_key.split("\x00")
        for q in questions:
            if isinstance(q, dict):
                rows.append({"target": key, "question": str(q.get("question", "")),
                             "cue": str(q.get("cue", "")), "natural": mode == "natural",
                             "request": prompt_key.replace("\x00", "|")})
    return rows


def augment(existing: list[Example], content: Content, cfg: CorpusConfig, total: int,
            natural: int = 0, provider=None, model: str | None = None,
            regenerate: bool = False, log: Log | None = None,
            content_hash: str = "") -> tuple[list[Example], dict]:
    """Generated examples (train, plus a natural test slice) that pass the
    grounding checks and are new against ``existing``; and the stats."""
    if total <= 0 and natural <= 0:
        return [], {"requested": 0}
    log = log or Log()
    provider = provider or provider_for("claude-agent", model)
    targets_ = targets(content, cfg)
    by_key = {t.key: t for t in targets_}

    path = cache_path(provider.name, provider.model, content_hash, total, natural)
    prompts = prompts_for(targets_, total, natural)
    rows: list[dict] = []
    if path.exists() and not regenerate:
        rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
        log.say("augment: using kept generations", path=str(path), rows=len(rows))
    # Requests with no rows — a failed call, or a target the content gained
    # since — are made now and appended; everything already kept stays, and
    # rows for requests the current settings no longer make are ignored.
    def request_of(row: dict) -> str:
        return row.get("request") or f"{row['target']}|{'natural' if row['natural'] else 'train'}|0"

    wanted = {k.replace("\x00", "|") for k in prompts}
    answered = {request_of(r) for r in rows}
    missing = {k: v for k, v in prompts.items() if k.replace("\x00", "|") not in answered}
    if missing:
        rows.extend(generate_raw(missing, provider, log))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
        log.say("augment: kept generations", path=str(path), rows=len(rows),
                new_requests=len(missing))
    rows = [r for r in rows if request_of(r) in wanted]

    seen = {e.query.strip().lower() for e in existing}
    kept: list[Example] = []
    invalid = duplicate = 0
    counters: dict[str, int] = {}
    # Natural (test) rows first, so a training paraphrase that collides with
    # one is the one dropped — the held-out slice stays clean.
    for row in sorted(rows, key=lambda r: not r["natural"]):
        target = by_key.get(row["target"])
        if target is None:
            continue
        counters[target.key] = counters.get(target.key, 0) + 1
        example = _example(target, counters[target.key], row["question"], row["cue"],
                           row["natural"])
        if example is None or check_example(example):
            invalid += 1
            continue
        if example.query.lower() in seen:
            duplicate += 1
            continue
        seen.add(example.query.lower())
        kept.append(example)
    stats = {
        "requested": total, "natural_requested": natural, "provider": provider.name,
        "model": provider.model, "returned": len(rows),
        "kept": sum(1 for e in kept if e.split == "train"),
        "natural_kept": sum(1 for e in kept if e.split == "test"),
        "dropped_invalid": invalid, "dropped_duplicate": duplicate, "cache": str(path),
    }
    log.say("augment", **{k: v for k, v in stats.items() if k != "cache"})
    return kept, stats


def augment_openrouter(existing: list[Example], count: int, model: str | None = None,
                       workers: int = 8, log: Log | None = None,
                       generate=None) -> tuple[list[Example], dict]:
    """Needle's own generator (labels written by the large model), validated
    by the same checks. Kept for parity with ``needle generate-data``."""
    if count <= 0:
        return [], {"requested": 0}
    if generate is None:
        if not os.environ.get("OPENROUTER_API_KEY"):
            raise RuntimeError("set OPENROUTER_API_KEY to augment through OpenRouter")
        from needle.model.finetune import generate_dataset
        generate = generate_dataset
    log = log or Log()
    from needle.model.finetune import DEFAULT_MODEL as OPENROUTER_MODEL
    rows = generate(TOOLS, count, model=model or OPENROUTER_MODEL, workers=workers)
    seen = {e.query.strip().lower() for e in existing}
    kept: list[Example] = []
    invalid = duplicate = 0
    for i, row in enumerate(rows):
        query = " ".join(str(row.get("query") or "").split())
        answers = [call(a["name"], **(a.get("arguments") or {}))
                   for a in (row.get("answers") or []) if isinstance(a, dict) and a.get("name")]
        category = answers[0]["name"] if answers else "refusal:generated"
        example = Example(
            id=f"augmented:openrouter:{i}", kind="assistant", category=category,
            family=f"augmented:openrouter:{i}", entities=(), query=query, tools=TOOLS,
            answers=answers, reasoning=str(row.get("reasoning") or "").strip() or "generated",
            system=SYSTEM, split="train", tags=("augmented",))
        if not query or query.lower() in seen:
            duplicate += 1
            continue
        if check_example(example):
            invalid += 1
            continue
        seen.add(query.lower())
        kept.append(example)
    stats = {"requested": count, "provider": "openrouter", "model": model or OPENROUTER_MODEL,
             "returned": len(rows), "kept": len(kept), "natural_kept": 0,
             "dropped_invalid": invalid, "dropped_duplicate": duplicate}
    log.say("augment", **stats)
    return kept, stats
