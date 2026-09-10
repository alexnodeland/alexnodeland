"""The trainer's own logic: the by-target split, epoch selection, and the
epoch hook — nothing that needs JAX."""

import json
from types import SimpleNamespace

import pytest

from site_needle import train
from site_needle.paths import load_config


def _row(i, calls, kind="assistant", family="f"):
    return {"id": f"r{i}", "kind": kind, "category": "c", "family": family,
            "query": f"question {i}", "answers": calls, "tools": [], "system": "s"}


def _call(name, **args):
    return {"name": name, "arguments": args}


def test_group_key_folds_phrasing_and_case_but_not_targets():
    a = _row(1, [_call("check_skill", skill="Rust")])
    b = _row(2, [_call("check_skill", skill="rust ")])
    c = _row(3, [_call("check_skill", skill="Go")])
    assert train.group_key(a) == train.group_key(b) != train.group_key(c)
    # Refusals and extraction passages are their own groups.
    assert train.group_key(_row(4, [])) != train.group_key(_row(5, []))
    x = _row(6, [_call("role_record", title="t")], kind="extraction")
    y = _row(7, [_call("role_record", title="t")], kind="extraction")
    assert train.group_key(x) != train.group_key(y)


def test_split_by_target_keeps_every_group_whole_and_is_deterministic():
    rows = []
    i = 0
    for skill in ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]:
        for _ in range(4):  # four phrasings of each target
            rows.append(_row(i, [_call("check_skill", skill=skill)]))
            i += 1
    for _ in range(20):
        rows.append(_row(i, []))
        i += 1
    fit, dev, stats = train.split_by_target(rows, 0.2, seed=3)
    assert len(fit) + len(dev) == len(rows) and stats["dev"] == len(dev)
    assert 0.15 * len(rows) <= len(dev) <= 0.3 * len(rows)
    fit_keys = {train.group_key(r) for r in fit}
    assert not any(train.group_key(r) in fit_keys for r in dev)
    again = train.split_by_target(rows, 0.2, seed=3)
    assert [r["id"] for r in again[1]] == [r["id"] for r in dev]
    other = train.split_by_target(rows, 0.2, seed=4)
    assert [r["id"] for r in other[1]] != [r["id"] for r in dev]


def test_split_by_target_leaves_a_giant_group_in_training():
    rows = [_row(i, [_call("contact", channel="email")]) for i in range(50)]
    rows += [_row(100 + i, [_call("check_skill", skill=str(i))]) for i in range(10)]
    fit, dev, _ = train.split_by_target(rows, 0.1, seed=0)
    assert all(r["answers"][0]["name"] == "check_skill" for r in dev)
    assert len(dev) <= 6


def test_select_epoch_rules_and_fallbacks():
    records = [
        {"epoch": 1, "loss": 0.5, "val_loss": 0.4, "dev_objective": 0.5},
        {"epoch": 2, "loss": 0.3, "val_loss": 0.3, "dev_objective": 0.7},
        {"epoch": 3, "loss": 0.2, "val_loss": 0.35, "dev_objective": 0.7},
    ]
    assert train.select_epoch(records, "dev") == (2, "highest dev objective")
    assert train.select_epoch(records, "val_loss") == (2, "lowest validation loss")
    assert train.select_epoch(records, "last") == (3, "last epoch")
    ungraded = [{k: v for k, v in r.items() if k != "dev_objective"} for r in records]
    assert train.select_epoch(ungraded, "dev")[1] == "lowest validation loss"
    bare = [{"epoch": 1, "loss": 0.5}, {"epoch": 2, "loss": 0.4}]
    assert train.select_epoch(bare, "dev") == (2, "last epoch")
    with pytest.raises(ValueError):
        train.select_epoch([], "dev")


class _Tracker:
    def __init__(self):
        self.logged = []

    def metric(self, key, value, step=None):
        self.logged.append((key, value, step))


class _Log:
    def __init__(self):
        self.said = []

    def say(self, *a, **k):
        self.said.append((a, k))


def test_epoch_grader_saves_exports_grades_and_survives_failure(tmp_path, monkeypatch):
    from site_needle.runs import Run

    cfg = load_config()
    run = Run.new(tmp_path, "grader-run")
    (run.dir / "corpus").mkdir()
    tracker, log = _Tracker(), _Log()
    progress = train._Progress(run, tracker, log)
    exported = []

    def fake_export(checkpoint, adapter, out):
        exported.append(adapter)
        out.write_bytes(b"cact")
        return {"bytes": 4, "sha256": "x", "seconds": 0.1}

    def fake_cached(cfg, rows, weights, name, **kw):
        overall = {"objective": 0.5 if name == "dev" else 0.4, "tool_accuracy": 0.6,
                   "missed_refusal_rate": 0.1, "false_refusal_rate": 0.0,
                   "critical_pass": 1.0, "errors": 0}
        return {"summary": {"overall": overall}, "cases": [], "n": len(rows)}

    monkeypatch.setattr(train, "export", fake_export)
    monkeypatch.setattr(train.evaluate, "cached", fake_cached)
    sets = {"dev": [_row(1, [])], "test": [_row(2, [])]}
    grader = train._EpochGrader(cfg, run, tracker, log, progress, tmp_path / "ckpt", sets, True)

    def save(path):
        path.write_bytes(b"adapter")

    record = {"epoch": 1, "loss": 0.3, "val_loss": 0.2}
    grader(1, record, save)
    assert (run.dir / "epochs/01/adapter.pkl").read_bytes() == b"adapter"
    assert exported == [run.dir / "epochs/01/adapter.pkl"]
    assert record["dev_objective"] == 0.5 and record["test_objective"] == 0.4
    assert json.loads((run.dir / "epochs/01/eval-dev.json").read_text())["n"] == 1
    assert progress.epochs == [record]
    assert ("dev_objective", 0.5, 1) in tracker.logged and ("epoch_loss", 0.3, 1) in tracker.logged
    # The epoch line that follows must not add a second record.
    progress("  epoch     1/3  loss 0.3000  val 0.2000")
    assert len(progress.epochs) == 1

    def broken_export(checkpoint, adapter, out):
        raise RuntimeError("no export today")

    monkeypatch.setattr(train, "export", broken_export)
    record2 = {"epoch": 2, "loss": 0.2, "val_loss": 0.25}
    grader(2, record2, save)
    assert "no export today" in record2["grade_error"]
    assert (run.dir / "epochs/02/adapter.pkl").exists()
    assert train.select_epoch(progress.epochs, "dev") == (1, "highest dev objective")


def test_finetune_uses_needles_building_blocks():
    """The loop imports Needle's internals; the pinned range is what keeps
    them stable. This fails loudly if a release moves them."""
    pytest.importorskip("needle.model.finetune")
    pytest.importorskip("jax")
    from needle.model import finetune as nf

    for name in ("fit_max_len", "load_jsonl", "lora_target_paths", "init_lora", "merge_lora",
                 "_training_rng", "build_main"):
        assert callable(getattr(nf, name)), name
    from needle.model.quantize import (  # noqa: F401
        configure_deploy,
        cq_ste_mixed_params,
        cq_ste_params,
        parse_bits_map,
    )

    from site_needle.finetune import save_adapter

    assert callable(save_adapter)


def test_save_adapter_writes_needles_pickle_shape(tmp_path):
    pytest.importorskip("numpy")
    import pickle

    import numpy as np

    from site_needle.finetune import save_adapter

    lora = {("stack", "layers", "q_proj", "kernel"): {"A": np.zeros((2, 3)), "B": np.ones((3, 2))}}
    save_adapter(tmp_path / "a.pkl", lora, 2.0, "base.pkl", 3, None, "2:4", 0)
    with (tmp_path / "a.pkl").open("rb") as handle:
        loaded = pickle.load(handle)
    assert set(loaded) == {"lora", "scale", "base", "rank", "qat_bits", "qat_bits_map", "seed"}
    assert list(loaded["lora"]) == ["stack/layers/q_proj/kernel"]
    assert loaded["lora"]["stack/layers/q_proj/kernel"]["B"].shape == (3, 2)
    assert loaded["scale"] == 2.0 and loaded["qat_bits_map"] == "2:4"


def test_train_config_carries_the_selection_knobs():
    cfg = load_config()
    assert cfg.train.select in ("dev", "val_loss", "last")
    assert isinstance(cfg.train.grade_epochs, bool)
    assert SimpleNamespace(**vars(cfg.train)).lora_rank > 0
