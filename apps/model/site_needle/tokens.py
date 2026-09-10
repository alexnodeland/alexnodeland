"""Token accounting for the training budget.

Needle pads every example to the longest one in the file, rounded up to a
power of two, so one example over the bucket doubles the cost of every
step. Exact counts need the model's SentencePiece tokenizer, which is part
of the training extra and downloads on first use; without it the estimate
below is deliberately pessimistic, and the training command re-checks with
the real tokenizer before it spends any compute.
"""

from __future__ import annotations

import json
import math

# Mirrors needle.model.tokenizer, so the rendering below matches what the
# trainer feeds the model without importing sentencepiece.
IM_START, IM_END = "<|im_start|>", "<|im_end|>"
THINK_START, THINK_END = "<think>", "</think>"
TOOLS_START, TOOLS_END = "<tools>", "</tools>"
TOOL_CALL_START, TOOL_CALL_END = "<tool_call>", "</tool_call>"

# Measured on this corpus: JSON-heavy prompts tokenize at ~4.2 characters per
# token under the 8k-piece vocabulary; 3.6 leaves a margin. Estimates are
# for the manifest's statistics only — the budget is enforced with the real
# tokenizer, which is why sentencepiece is a base dependency.
CHARS_PER_TOKEN_ESTIMATE = 3.6


def render(row: dict) -> tuple[str, str]:
    """The exact prompt and target strings needle.model.finetune renders."""
    tools_json = json.dumps(row.get("tools", []), separators=(",", ":"), ensure_ascii=False)
    answers_json = json.dumps(row.get("answers", []), separators=(",", ":"), ensure_ascii=False)
    reasoning = (row.get("reasoning") or "").strip()
    system = (row.get("system") or "").strip()
    prefix = IM_START + "system\n" + system + IM_END + "\n" if system else ""
    prompt = (prefix + IM_START + "user\n" + TOOLS_START + tools_json + TOOLS_END + "\n"
              + row["query"] + IM_END + "\n" + IM_START + "assistant\n")
    think = THINK_START + "\n" + reasoning + "\n" + THINK_END + "\n" if reasoning else ""
    target = think + TOOL_CALL_START + answers_json + TOOL_CALL_END + IM_END
    return prompt, target


def try_tokenizer():
    """The real tokenizer when the training extra is installed and the
    model files are reachable; None otherwise."""
    try:
        from needle.model.tokenizer import get_tokenizer
        return get_tokenizer()
    except Exception:
        return None


def count(row: dict, tokenizer=None) -> int:
    """Tokens the rendered example occupies, BOS and EOS included."""
    prompt, target = render(row)
    if tokenizer is not None:
        return 2 + len(tokenizer.encode(prompt)) + len(tokenizer.encode(target))
    return 2 + math.ceil((len(prompt) + len(target)) / CHARS_PER_TOKEN_ESTIMATE)


def bucket(longest: int, cap: int) -> int:
    """The sequence length training will pad to: needle's fit_max_len."""
    size = 128
    while size < min(longest, cap):
        size *= 2
    return min(size, cap)
