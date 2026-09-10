"""Where published models live, and how the pipeline reads and writes them.

The registry is GitHub releases: one release per shipped run, tagged
``model-<run id>``, carrying the ``.cact``, the corpus manifest, the
evaluation, the model card and the run record. Releases are immutable and
downloadable without credentials, which is what lets ``corpus status`` on
any machine answer "is the published model current with the site?" and
lets the site's build fetch the model it wants.

Two conveniences beside it: a snapshot copied into ``models/`` (the one
committed in the repo, so the site can consume it without the registry)
and an optional upload to a Hugging Face repo.
"""

from __future__ import annotations

import json
import mimetypes
import os
import shutil
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from .paths import MODELS_DIR, RegistryConfig
from .runs import Run

API = "https://api.github.com"
UPLOADS = "https://uploads.github.com"
SNAPSHOT_FILES = {
    "model.cact": "site-needle.cact",
    "model-card.md": "model-card.md",
    "eval-tuned.json": "eval.json",
    "corpus/manifest.json": "manifest.json",
    "corpus/tools.json": "tools.json",
    "corpus/system.txt": "system.txt",
    "summary.json": "summary.json",
}
RELEASE_ASSETS = {
    "model.cact": "site-needle.cact",
    "model-card.md": "model-card.md",
    "eval-tuned.json": "eval.json",
    "eval-base.json": "eval-base.json",
    "corpus/manifest.json": "manifest.json",
    "corpus/tools.json": "tools.json",
    "corpus/system.txt": "system.txt",
    "run.json": "run.json",
    "metrics.jsonl": "metrics.jsonl",
    "report.md": "report.md",
    "loss.svg": "loss.svg",
}


def _headers(token: str | None = None, accept: str = "application/vnd.github+json") -> dict:
    headers = {"Accept": accept, "User-Agent": "site-needle"}
    token = token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _get_json(url: str, token: str | None = None):
    request = urllib.request.Request(url, headers=_headers(token))
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _download(url: str, dest: Path, token: str | None = None) -> Path:
    request = urllib.request.Request(url, headers=_headers(token, "application/octet-stream"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(request, timeout=120) as response, dest.open("wb") as out:
        shutil.copyfileobj(response, out)
    return dest


def latest_release(cfg: RegistryConfig, tag: str | None = None) -> dict | None:
    """The newest model release (or the one with ``tag``), as
    ``{tag, published_at, html_url, assets: {name: url}}``; None when the
    repo has no model releases or cannot be reached."""
    try:
        releases = _get_json(f"{API}/repos/{cfg.github_repo}/releases?per_page=50")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None
    candidates = [r for r in releases
                  if r.get("tag_name", "").startswith(cfg.release_tag_prefix)
                  and not r.get("draft")]
    if tag:
        candidates = [r for r in candidates if r.get("tag_name") == tag]
    if not candidates:
        return None
    newest = max(candidates, key=lambda r: r.get("published_at") or r.get("created_at") or "")
    return {
        "tag": newest["tag_name"],
        "published_at": newest.get("published_at") or "",
        "html_url": newest.get("html_url"),
        "assets": {a["name"]: a["browser_download_url"] for a in newest.get("assets", [])},
    }


def release_json(release: dict, asset: str) -> dict | None:
    url = release["assets"].get(asset)
    if not url:
        return None
    try:
        return _get_json(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError):
        return None


def release_manifest(release: dict) -> dict | None:
    return release_json(release, "manifest.json")


def release_eval(release: dict) -> dict | None:
    return release_json(release, "eval.json")


def snapshot(run: Run, models_dir: Path = MODELS_DIR) -> list[Path]:
    """Copy the shippable files into ``models/`` — the committed snapshot."""
    models_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for source, name in SNAPSHOT_FILES.items():
        src = run.path(source)
        if src.exists():
            shutil.copyfile(src, models_dir / name)
            written.append(models_dir / name)
    return written


def create_release(run: Run, cfg: RegistryConfig, token: str | None = None) -> str:
    """One immutable release per run, with the artifacts as assets."""
    token = token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise RuntimeError("set GITHUB_TOKEN to create a release")
    tag = f"{cfg.release_tag_prefix}{run.id}"
    summary = run.read("summary.json") or {}
    objective = (summary.get("eval") or {}).get("tuned", {}) or {}
    body = run.path("model-card.md").read_text() if run.path("model-card.md").exists() else ""
    payload = json.dumps({
        "tag_name": tag,
        "name": f"site model {run.id}"
        + (f" — objective {objective.get('objective'):.3f}"
           if objective.get("objective") is not None else ""),
        "body": body,
        "draft": False,
        "prerelease": False,
    }).encode()
    request = urllib.request.Request(
        f"{API}/repos/{cfg.github_repo}/releases", data=payload, method="POST",
        headers={**_headers(token), "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        release = json.loads(response.read().decode("utf-8"))
    upload_url = release["upload_url"].split("{")[0]
    for source, name in RELEASE_ASSETS.items():
        src = run.path(source)
        if not src.exists():
            continue
        mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
        data = src.read_bytes()
        request = urllib.request.Request(
            f"{upload_url}?{urllib.parse.urlencode({'name': name})}", data=data, method="POST",
            headers={**_headers(token), "Content-Type": mime,
                     "Content-Length": str(len(data))})
        with urllib.request.urlopen(request, timeout=300):
            pass
    return release.get("html_url", tag)


def upload_hf(run: Run, repo: str, token: str | None = None) -> str:
    from huggingface_hub import HfApi

    api = HfApi(token=token or os.environ.get("HF_TOKEN"))
    api.create_repo(repo, repo_type="model", exist_ok=True)
    for source, name in RELEASE_ASSETS.items():
        src = run.path(source)
        if src.exists():
            api.upload_file(path_or_fileobj=str(src), path_in_repo=name, repo_id=repo,
                            repo_type="model")
    card = run.path("model-card.md")
    if card.exists():
        api.upload_file(path_or_fileobj=str(card), path_in_repo="README.md", repo_id=repo,
                        repo_type="model")
    return f"https://huggingface.co/{repo}"


def publish(run: Run, cfg: RegistryConfig, hf_repo: str | None = None, github: bool = False,
            snapshot_too: bool = False, snapshot: bool = False) -> str:
    done = []
    if snapshot or snapshot_too:
        paths = globals()["snapshot"](run)
        done.append(f"snapshot: {len(paths)} files into {MODELS_DIR}")
    if github:
        done.append(f"release: {create_release(run, cfg)}")
    repo = hf_repo or os.environ.get("NEEDLE_HF_REPO")
    if repo:
        done.append(f"hugging face: {upload_hf(run, repo)}")
    return "\n".join(done) if done else "nothing to do (pass --snapshot, --github, or --hf-repo)"


def pull(cfg: RegistryConfig, out_dir: Path, tag: str | None = None) -> Path:
    """Fetch the published model's files into ``out_dir``."""
    release = latest_release(cfg, tag)
    if release is None:
        raise RuntimeError("no published model release found")
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, url in release["assets"].items():
        _download(url, out_dir / name)
    (out_dir / "release.json").write_text(json.dumps(release, indent=2) + "\n")
    return out_dir / "site-needle.cact"
