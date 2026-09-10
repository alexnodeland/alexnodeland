import json

import pytest

from site_needle import tokens
from site_needle.train import _Progress


def test_render_matches_needle_exactly(content, corpus_cfg):
    needle_finetune = pytest.importorskip("needle.model.finetune")
    from site_needle.generate import generate

    for e in generate(content, corpus_cfg)[:40]:
        row = e.row()
        assert tokens.render(row) == needle_finetune.render_example(row)


def test_bucket_rounds_to_power_of_two_under_cap():
    assert tokens.bucket(100, 1024) == 128
    assert tokens.bucket(129, 1024) == 256
    assert tokens.bucket(300, 512) == 512
    assert tokens.bucket(900, 512) == 512


def test_estimate_tracks_the_real_tokenizer(content, corpus_cfg):
    """The estimate feeds the manifest's statistics when the tokenizer is
    absent; it should be in the right neighbourhood, and never far under."""
    tokenizer = tokens.try_tokenizer()
    if tokenizer is None:
        pytest.skip("tokenizer not available")
    from site_needle.generate import generate

    for e in generate(content, corpus_cfg)[::9]:
        row = e.row()
        real = tokens.count(row, tokenizer)
        assert 0.95 * real <= tokens.count(row) <= 1.35 * real


class _Run:
    def __init__(self):
        self.metrics = []

    def append_metric(self, **fields):
        self.metrics.append(fields)


class _Tracker:
    def __init__(self):
        self.logged = []

    def metric(self, key, value, step=None):
        self.logged.append((key, value, step))


class _Log:
    def say(self, *a, **k):
        pass


def test_progress_parses_needles_lines():
    run, tracker = _Run(), _Tracker()
    progress = _Progress(run, tracker, _Log())
    progress("  data      391 examples  seq_len 512  cap 512")
    progress("  schedule  264 steps  warmup 13  cosine decay  clip 1.0  (compiling...)")
    progress("  step      5/264  loss 1.0708")
    progress("  step      10/264  loss 0.9500")
    progress("  epoch     1/6  loss 0.9500  val 0.9100")
    progress("  epoch     2/6  loss 0.9000")
    summary = progress.summary()
    assert summary["total_steps"] == 264 and summary["seq_len"] == 512
    assert summary["examples"] == 391
    assert summary["final_loss"] == 0.95
    assert summary["best_val_loss"] == 0.91
    assert [m for m in run.metrics if "step" in m][-1]["loss"] == 0.95
    assert ("val_loss", 0.91, 1) in tracker.logged
    assert json.dumps(summary)  # serialisable
