"""The shared-prefix encoder: the ids it produces are the ids the engine
sees, rows are grouped by prefix, and padding keeps masks honest. Needs
Needle's tokenizer (shipped with the package), not a checkpoint."""

import numpy as np
import pytest

from site_needle import prefix
from site_needle.catalogue import SYSTEM, TOOLS

needle_tok = pytest.importorskip("needle.model.tokenizer")


@pytest.fixture(scope="module")
def tok():
    return needle_tok.get_tokenizer()


def _row(i, query, answers, tools=None, system=SYSTEM, reasoning="r"):
    return {"id": f"r{i}", "query": query, "answers": answers, "reasoning": reasoning,
            "tools": TOOLS if tools is None else tools, "system": system}


def test_split_prompt_cuts_at_the_engines_turn_boundary():
    row = _row(0, "what's sleeve?", [])
    head, turn, target = prefix.split_prompt(row)
    assert head.endswith("</tools>")
    assert turn.startswith("\nwhat's sleeve?")
    assert target.startswith("<think>\n") and target.endswith("<|im_end|>")


def test_encode_rows_matches_whole_prompt_tokenisation(tok):
    from needle.model.finetune import render_example
    from needle.model.tokenizer import BOS_ID, EOS_ID

    call = {"name": "lookup_project", "arguments": {"name": "sleeve"}}
    rows = [_row(0, "what's sleeve?", [call]),
            _row(1, "tell me about Alex's time at perch insights", [])]
    enc = prefix.encode_rows(rows, tok)
    for i, row in enumerate(rows):
        prompt, target = render_example(row)
        whole = [BOS_ID] + tok.encode(prompt) + tok.encode(target) + [EOS_ID]
        n = int(enc.valid[i].sum())
        assert list(enc.prefix) + enc.tokens[i, :n].tolist() == whole
        # Only the target is supervised, and every target token is.
        turn = len(whole) - len(list(enc.prefix)) - (len(tok.encode(target)) + 1)
        assert enc.mask[i, :turn].sum() == 0 and enc.mask[i, turn:n].sum() == n - turn
        assert not enc.valid[i, n:].any() and enc.mask[i, n:].sum() == 0
    # The split the engine makes ("\n" + query encoded on its own) would
    # insert a token; the encoder cuts the whole tokenisation instead.
    head, turn, _ = prefix.split_prompt(rows[0])
    assert tok.encode(head) + tok.encode(turn) != tok.encode(head + turn)


def test_encode_rows_refuses_a_second_prefix(tok):
    rows = [_row(0, "a", []), _row(1, "b", [], tools=[TOOLS[0]])]
    with pytest.raises(ValueError, match="does not share the corpus prefix"):
        prefix.encode_rows(rows, tok)


def test_encode_groups_one_group_per_prefix_largest_first(tok):
    schema = [{"name": "role_record", "description": "d",
               "parameters": {"type": "object", "properties": {"title": {"type": "string"}},
                              "required": ["title"]}}]
    rows = [_row(0, "a", []), _row(1, "b", []), _row(2, "c", []),
            _row(3, "Engineer at X (2020)", [], tools=schema),
            _row(4, "d", [], tools=schema)]
    groups = prefix.encode_groups(rows, tok)
    assert [len(g.rows) for g in groups] == [3, 2]
    assert groups[0].rows.tolist() == [0, 1, 2] and groups[1].rows.tolist() == [3, 4]
    assert groups[0].prefix_len != groups[1].prefix_len
    assert prefix.encode_groups([], tok) == []


def test_pad_to_and_fit_seq_len(tok):
    enc = prefix.encode_rows([_row(0, "a", []), _row(1, "a much longer question here", [])], tok)
    target = prefix.fit_seq_len(enc)
    assert target >= enc.seq_len and target % 32 == 0
    padded = prefix.pad_to(enc, target)
    assert padded.tokens.shape == (2, target)
    assert np.array_equal(padded.valid[:, :enc.seq_len], enc.valid)
    assert not padded.valid[:, enc.seq_len:].any()
    assert padded.mask.sum() == enc.mask.sum()
    assert prefix.pad_to(enc, 4) is enc  # never truncates
