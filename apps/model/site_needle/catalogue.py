"""The tool surface the model is tuned for.

Five assistant tools, because Needle renders five or fewer directly and
puts a retrieval head between the model and anything larger: an unselected
tool would be unreachable, not merely unlikely. Each one maps onto something
the site can act on exactly — a filter on the chat's retrieval index, a
lookup against the skills list, a link. Free-text arguments are copied
verbatim from the visitor, which is what lets the site do exact lookups and
what Needle's own grounding check expects. Closed sets are enums, so the
grammar cannot emit anything else.

The record schemas are for extraction: the site's own prose rendered as
"parse this back into a record" examples, which is how every passage on the
site ends up in the corpus.

Descriptions are terse on purpose. The catalogue is re-sent with every
training example (about 300 tokens of the 512 budget) and pinned in the
KV cache at inference; every word costs.
"""

from __future__ import annotations

SECTIONS = [
    "about",
    "education",
    "skills",
    "experience",
    "projects",
    "writing",
    "press",
    "consulting",
]
CHANNELS = ["email", "calendar", "github", "linkedin", "resume"]
WHICH = ["current", "previous", "first"]

TOOLS: list[dict] = [
    {
        "name": "lookup_role",
        "description": "A job on Alex's CV, by employer or by place in his career.",
        "parameters": {
            "type": "object",
            "properties": {
                "company": {"type": "string", "description": "employer as the visitor wrote it"},
                "which": {"type": "string", "enum": WHICH},
            },
        },
    },
    {
        "name": "lookup_project",
        "description": "One of Alex's open-source projects, by name.",
        "parameters": {
            "type": "object",
            "properties": {"name": {"type": "string"}},
            "required": ["name"],
        },
    },
    {
        "name": "check_skill",
        "description": "Whether a skill or technology is on Alex's CV.",
        "parameters": {
            "type": "object",
            "properties": {"skill": {"type": "string"}},
            "required": ["skill"],
        },
    },
    {
        "name": "search_site",
        "description": "Search a section of the site, optionally for a topic.",
        "parameters": {
            "type": "object",
            "properties": {
                "section": {"type": "string", "enum": SECTIONS},
                "topic": {"type": "string"},
            },
            "required": ["section"],
        },
    },
    {
        "name": "contact",
        "description": "A way to reach Alex, or his resume.",
        "parameters": {
            "type": "object",
            "properties": {"channel": {"type": "string", "enum": CHANNELS}},
            "required": ["channel"],
        },
    },
]

TOOL_NAMES = [t["name"] for t in TOOLS]

# Environment facts for the assistant turn. Needle trains with and without a
# system turn; this one is short because it is in every prompt.
SYSTEM = (
    "assistant: guide to alexnodeland.com, Alex Nodeland's site. Copy names, "
    "skills and topics verbatim from the visitor; a request no tool serves "
    "returns no call."
)


def record_schemas(project_categories: list[str], post_categories: list[str]) -> dict[str, dict]:
    """Extraction records. The enum members come from the content so the
    schemas stay true to the site as it changes."""
    string = {"type": "string"}
    return {
        "role_record": {
            "name": "role_record",
            "description": "A job on Alex's CV.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": string,
                    "company": string,
                    "location": string,
                    "duration": string,
                    "skills": {"type": "array", "items": string},
                },
                "required": ["title", "company"],
            },
        },
        "education_record": {
            "name": "education_record",
            "description": "A degree on Alex's CV.",
            "parameters": {
                "type": "object",
                "properties": {
                    "degree": string,
                    "institution": string,
                    "location": string,
                    "duration": string,
                },
                "required": ["degree", "institution"],
            },
        },
        "project_record": {
            "name": "project_record",
            "description": "One of Alex's open-source projects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": string,
                    "language": string,
                    "stars": {"type": "integer"},
                    "category": {"type": "string", "enum": project_categories},
                },
                "required": ["name"],
            },
        },
        "post_record": {
            "name": "post_record",
            "description": "A post or press article on Alex's blog.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": string,
                    "date": string,
                    "category": {"type": "string", "enum": post_categories},
                },
                "required": ["title"],
            },
        },
        "certification_record": {
            "name": "certification_record",
            "description": "A certification on Alex's CV.",
            "parameters": {
                "type": "object",
                "properties": {"name": string, "issuer": string, "year": string},
                "required": ["name", "issuer"],
            },
        },
        "contact_record": {
            "name": "contact_record",
            "description": "Who Alex is and how to reach him.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": string,
                    "title": string,
                    "location": string,
                    "email": string,
                    "website": string,
                },
                "required": ["name"],
            },
        },
    }
