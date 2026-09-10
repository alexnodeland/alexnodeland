import json

from site_needle import evaluate, registry, report
from site_needle.paths import load_config


def _call(tool, **args):
    return {"name": tool, "arguments": args}


def test_score_exact_and_partial():
    want = [_call("lookup_role", company="Musiio")]
    assert evaluate.score(want, [_call("lookup_role", company="Musiio")])["exact"]
    s = evaluate.score(want, [_call("lookup_role", company="musiio")])
    assert not s["exact"] and s["tool_match"]
    assert s["arg_tp"] == 1  # argument triples compare case-insensitively
    s = evaluate.score(want, [_call("lookup_project", name="Musiio")])
    assert not s["tool_match"] and s["arg_fp"] == 1 and s["arg_fn"] == 1
    s = evaluate.score([], [])
    assert s["exact"] and s["refusal_expected"] and s["refused"]
    s = evaluate.score(want, [])
    assert not s["exact"] and s["refused"] and not s["refusal_expected"]
    two = [_call("check_skill", skill="a"), _call("check_skill", skill="b")]
    assert evaluate.score(two, list(reversed(two)))["exact"]


def _cases():
    role = [_call("lookup_role", company="x")]
    return [
        {"id": "1", "category": "lookup_role", "slice": "paraphrase", "critical": False,
         "query": "what did he do at x?", "want": role, "got": role,
         "ms": 10.0, "prefill_tps": 300, "decode_tps": 200, "peak_ram_mb": 40, "error": None,
         **evaluate.score(role, role)},
        {"id": "2", "category": "refusal:negation", "slice": "paraphrase", "critical": True,
         "query": "don't look up x", "want": [], "got": [_call("lookup_role", company="x")],
         "ms": 20.0, "prefill_tps": 300, "decode_tps": 200, "peak_ram_mb": 41, "error": None,
         **evaluate.score([], [_call("lookup_role", company="x")])},
        {"id": "3", "category": "check_skill", "slice": "novel_entity", "critical": False,
         "query": "does he know y?", "want": [_call("check_skill", skill="y")], "got": [],
         "ms": 30.0, "prefill_tps": 300, "decode_tps": 200, "peak_ram_mb": 42, "error": None,
         **evaluate.score([_call("check_skill", skill="y")], [])},
    ]


def test_summarise_and_gate():
    cfg = load_config()
    summary = evaluate.summarise(_cases(), cfg)
    o = summary["overall"]
    assert o["n"] == 3 and abs(o["objective"] - 1 / 3) < 1e-3
    assert o["false_refusal_rate"] == 0.5 and o["missed_refusal_rate"] == 1.0
    assert o["critical_n"] == 1 and o["critical_pass"] == 0.0
    assert o["peak_ram_mb"] == 42 and o["latency_ms"]["p50"] == 20.0
    assert set(summary["by_tool"]) == {"lookup_role", "check_skill", "(refusal)"}

    tuned = {"summary": summary}
    verdict = evaluate.gate(tuned, base=None, baseline=None, cfg=cfg)
    assert not verdict["ok"] and any("critical" in r for r in verdict["reasons"])
    good = {"summary": {"overall": {**o, "critical_pass": 1.0, "objective": 0.9, "errors": 0}}}
    assert evaluate.gate(good, {"summary": {"overall": {"objective": 0.5}}}, None, cfg)["ok"]
    worse = evaluate.gate(good, {"summary": {"overall": {"objective": 0.95}}}, None, cfg)
    assert not worse["ok"]
    regress = evaluate.gate(good, None, {"summary": {"overall": {"objective": 0.95}}}, cfg)
    assert not regress["ok"]
    within = evaluate.gate(good, None, {"summary": {"overall": {"objective": 0.91}}}, cfg)
    assert within["ok"]


class _StubAgent:
    """Records what the evaluator hands the engine."""

    built: list[tuple] = []

    def __init__(self, tools, system, weights):
        _StubAgent.built.append((json.dumps(tools), system, weights))

    def reset(self):
        pass

    def complete(self, query, max_new_tokens=256):
        return {"function_calls": [], "reasoning": "stub"}

    def close(self):
        pass


def test_run_cases_hands_the_engine_the_tools_verbatim(monkeypatch):
    monkeypatch.setattr(evaluate, "_agent", lambda tools, system, weights: _StubAgent(
        tools, system, weights))
    _StubAgent.built.clear()
    tools = [{"name": "z_tool", "description": "d",
              "parameters": {"type": "object", "properties": {"b": {"type": "string"},
                                                              "a": {"type": "string"}}}}]
    rows = [
        {"id": "1", "category": "c", "query": "q1", "tools": tools, "system": "s", "answers": []},
        {"id": "2", "category": "c", "query": "q2", "tools": tools, "system": "s", "answers": []},
        {"id": "3", "category": "c", "query": "q3", "tools": tools, "system": None, "answers": []},
    ]
    results = evaluate.run_cases(rows, None, 64)
    assert len(results) == 3 and all(r["exact"] for r in results)
    # One agent per distinct surface, built from the rows' own objects: key
    # order exactly as written, never alphabetised.
    assert [b[1] for b in _StubAgent.built] == ["s", None]
    assert all(b[0] == json.dumps(tools) for b in _StubAgent.built)
    assert '"name": "z_tool", "description"' in _StubAgent.built[0][0]


def test_loss_svg_draws_both_series():
    metrics = [{"step": 5, "loss": 1.0}, {"step": 10, "loss": 0.8},
               {"epoch": 1, "loss": 0.8, "val_loss": 0.85}]
    svg = report.loss_svg(metrics)
    assert svg.startswith("<svg") and "validation loss" in svg and "<circle" in svg
    assert report.loss_svg([]) == ""


def test_report_renders_from_a_run_dir(tmp_path, content, content_path, corpus_cfg):
    from site_needle import corpus
    from site_needle.runs import Run

    run = Run.new(tmp_path, "test-run")
    built = corpus.build_in_memory(content, content_path, corpus_cfg)
    corpus.write(built, run.path("corpus"))
    run.update(train={"lora_rank": 16, "lora_alpha": 32, "lr": 1e-4, "batch_size": 8,
                      "epochs": 1, "seed": 0, "qat_bits": "auto"},
               stages={"train": {"total_steps": 10, "seq_len": 512, "final_loss": 0.5,
                                 "best_val_loss": 0.6, "seconds": 100, "seconds_per_step": 10,
                                 "epochs": [{"epoch": 1, "loss": 0.5, "val_loss": 0.6}]},
                       "build": {"bytes": 1000, "sha256": "ab" * 32, "seconds": 1}},
               gate={"ok": True, "reasons": []})
    cfg = load_config()
    cases = _cases()
    result = {"model": "x", "n": len(cases), "seconds": 1, "cases": cases,
              "summary": evaluate.summarise(cases, cfg)}
    run.write("eval-tuned.json", result)
    run.write("eval-base.json", result)
    run.append_metric(step=5, loss=1.0)
    run.append_metric(epoch=1, loss=0.5, val_loss=0.6)
    paths = report.render(run, cfg)
    names = {p.name for p in paths}
    assert {"report.md", "model-card.md", "summary.json", "loss.svg"} <= names
    text = run.path("report.md").read_text()
    assert "PASS" in text and "By slice" in text and "objective (exact call)" in text
    assert "site-needle.cact" in run.path("model-card.md").read_text()
    files = registry.write_snapshot(run, tmp_path / "models")
    assert {p.name for p in files} >= {"model-card.md", "eval.json", "manifest.json", "tools.json"}


def test_latest_release_picks_newest_model_tag(monkeypatch):
    from site_needle.paths import RegistryConfig

    releases = [
        {"tag_name": "v1.0", "published_at": "2026-01-01T00:00:00Z", "assets": []},
        {"tag_name": "model-20260101-000000-abc", "published_at": "2026-01-02T00:00:00Z",
         "assets": [{"name": "manifest.json", "browser_download_url": "u1"}]},
        {"tag_name": "model-20260201-000000-def", "published_at": "2026-02-02T00:00:00Z",
         "assets": [{"name": "manifest.json", "browser_download_url": "u2"}],
         "html_url": "h"},
        {"tag_name": "model-draft", "draft": True, "published_at": "2026-03-02T00:00:00Z",
         "assets": []},
    ]
    monkeypatch.setattr(registry, "_get_json", lambda url, token=None: releases)
    latest = registry.latest_release(RegistryConfig())
    assert latest["tag"] == "model-20260201-000000-def"
    assert latest["assets"]["manifest.json"] == "u2"
    by_tag = registry.latest_release(RegistryConfig(), tag="model-20260101-000000-abc")
    assert by_tag["tag"].endswith("abc")

    def unreachable(url, token=None):
        raise TimeoutError()

    monkeypatch.setattr(registry, "_get_json", unreachable)
    assert registry.latest_release(RegistryConfig()) is None


def test_cli_parses_every_command():
    from site_needle.cli import build_parser

    parser = build_parser()
    for argv in (["corpus", "build"], ["corpus", "check"], ["corpus", "status"],
                 ["corpus", "diff", "--against", "x"], ["train", "--epochs", "1"],
                 ["build", "r"], ["eval", "--weights", "base"], ["pipeline", "--promote"],
                 ["report", "r"], ["probe", "hi"], ["publish", "r", "--github"], ["pull"],
                 ["finish", "r", "--promote"], ["ui"], ["compare", "base", "runs/x"],
                 ["eval", "--weights", "base", "--set", "evals/handwritten.jsonl"],
                 ["train", "--no-epoch-grading"], ["analyze", "--eval", "e.json"]):
        args = parser.parse_args(argv)
        assert callable(args.func)
    assert json.dumps(vars(parser.parse_args(["train"])), default=str)
