"""The site's content, as exported by ``apps/web/scripts/export-site-content.mjs``.

Typed so a change to the export shape fails loudly here rather than as a
subtly wrong corpus. ``content_hash`` is the content version: the manifest
records it, and the published model carries the one it was trained on.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

SUPPORTED_SCHEMA = 1


class _Model(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)


class Contact(_Model):
    email: str
    location: str
    website: str


class Social(_Model):
    linkedin: str = ""
    github: str = ""


class Services(_Model):
    calendar: str = ""


class NavItem(_Model):
    name: str
    href: str


class Site(_Model):
    name: str
    url: str
    description: str
    author: str
    contact: Contact
    social: Social
    services: Services
    navigation: list[NavItem]


class Hero(_Model):
    title: str
    subtitle: str


class Consulting(_Model):
    title: str
    description: str


class Expertise(_Model):
    title: str
    description: str


class Homepage(_Model):
    hero: Hero
    about: list[str]
    consulting: Consulting
    expertise: list[Expertise]


class Personal(_Model):
    name: str
    title: str
    email: str
    location: str
    website: str
    summary: str


class Role(_Model):
    title: str
    company: str
    location: str
    duration: str
    description: str = ""
    achievements: list[str]
    skills: list[str] = []

    @property
    def short_company(self) -> str:
        """``Musiio (acquired by SoundCloud)`` is how the CV says it; ``Musiio``
        is how a visitor does."""
        return self.company.split(" (")[0].strip()


class Education(_Model):
    degree: str
    institution: str
    location: str
    duration: str
    description: str = ""
    coursework: list[str] = []
    achievements: list[str] = []


class Certification(_Model):
    name: str
    issuer: str
    date: str


class Skills(_Model):
    technical: list[str]


class CV(_Model):
    personal: Personal
    experience: list[Role]
    education: list[Education]
    certifications: list[Certification]
    skills: Skills


class Category(_Model):
    id: str
    title: str


class Project(_Model):
    name: str
    description: str
    language: str
    tags: list[str]
    url: str
    site: str = ""
    stars: int = 0
    category: str


class Projects(_Model):
    subtitle: str
    categories: list[Category]
    projects: list[Project]


class Post(_Model):
    slug: str
    url: str
    title: str
    date: str
    description: str
    category: str
    word_count: int = Field(alias="wordCount")
    paragraphs: list[str]


class Chat(_Model):
    sample_prompts: list[str] = Field(default_factory=list, alias="samplePrompts")


class Content(_Model):
    schema_version: int = Field(alias="schema")
    site: Site
    homepage: Homepage
    cv: CV
    projects: Projects
    posts: list[Post]
    chat: Chat = Chat()

    @property
    def companies(self) -> list[str]:
        """Distinct employers, in CV order (most recent first)."""
        seen: list[str] = []
        for role in self.cv.experience:
            name = role.short_company
            if name not in seen:
                seen.append(name)
        return seen

    @property
    def all_skills(self) -> list[str]:
        """The skills list plus every skill named on a role, deduplicated in
        order of first appearance."""
        seen: list[str] = []
        listed = [*self.cv.skills.technical, *(s for r in self.cv.experience for s in r.skills)]
        for skill in listed:
            if skill not in seen:
                seen.append(skill)
        return seen


def content_hash(path: Path) -> str:
    """Version of the content: a hash of the export's bytes. The export is
    deterministic, so two builds of an unchanged site agree."""
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def load_content(path: Path) -> Content:
    if not path.exists():
        raise FileNotFoundError(
            f"no content snapshot at {path}; run `npm run build:content` in apps/web "
            "(or `just corpus` from the repo root)"
        )
    raw = json.loads(path.read_text())
    schema = raw.get("schema")
    if schema != SUPPORTED_SCHEMA:
        raise ValueError(
            f"content snapshot schema {schema!r} is not the {SUPPORTED_SCHEMA} this "
            "package reads; update the exporter and this package together"
        )
    return Content.model_validate(raw)
