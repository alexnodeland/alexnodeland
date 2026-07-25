#!/usr/bin/env bash
#
# Archives the external articles linked from src/content/blog.
#
# Two independent safeguards against link rot: a local copy in archive/press
# (plus a plain-text extraction, so the words outlive the markup), and a fresh
# Wayback Machine snapshot. Neither is published — see archive/press/README.md.
#
# Safe to re-run; existing copies are overwritten only on a successful fetch.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/archive/press"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

mkdir -p "$OUT_DIR"

# name|url — keep in sync with the table in archive/press/README.md
ARTICLES=(
  "2015-11_the-future-of-sound|https://sbpress.com/2015/11/the-future-of-sound/"
  "2016-02_cewit-newsletter|https://www.cewit.org/programs/_documents/CEWITNewsletter_FEB2016.pdf"
  "2016-11_cewit-newsletter|https://www.cewit.org/programs/_documents/CEWITNewsletter_NOV2016.pdf"
  "2019-03_supercomputing-shouldnt-be-rocket-science|https://www.asianscientist.com/2019/03/features/supercomputing-shouldnt-be-rocket-science/"
  "2019-04_hpcwire-archanan-launch|https://www.hpcwire.com/2019/04/26/singapore-startup-hatches-hpc-dev-cloud/"
  "2019-10_hpcwire-test-driving|https://www.hpcwire.com/2019/10/07/try-before-you-buy-test-driving-a-supercomputer-system/"
)

# Returns the URL of the most recent Wayback snapshot, or empty if none exists.
wayback_url() {
  curl -s --max-time 30 "https://archive.org/wayback/available?url=$1" |
    python3 -c "import sys,json; print(json.load(sys.stdin).get('archived_snapshots',{}).get('closest',{}).get('url',''))" 2>/dev/null
}

failures=0

for entry in "${ARTICLES[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  ext=html
  [[ "$url" == *.pdf ]] && ext=pdf
  dest="$OUT_DIR/$name.$ext"
  tmp="$(mktemp)"

  echo "==> $name"

  if curl -sfL --max-time 60 -A "$UA" "$url" -o "$tmp" && [ -s "$tmp" ] &&
    ! grep -qa "Attention Required! | Cloudflare" "$tmp"; then
    mv "$tmp" "$dest"
    echo "    fetched from origin"
  else
    # Origin refused us (HPCwire sits behind Cloudflare) — fall back to Wayback.
    snapshot="$(wayback_url "$url")"
    if [ -n "$snapshot" ] && curl -sfL --max-time 90 -A "$UA" "$snapshot" -o "$tmp" && [ -s "$tmp" ]; then
      mv "$tmp" "$dest"
      echo "    origin blocked; fetched from Wayback"
    else
      rm -f "$tmp"
      echo "    FAILED: origin and Wayback both unavailable"
      failures=$((failures + 1))
      continue
    fi
  fi

  # Plain-text extraction so the content survives the markup (macOS textutil).
  if [ "$ext" = html ] && command -v textutil >/dev/null 2>&1; then
    textutil -convert txt -stdout "$dest" 2>/dev/null |
      sed '/^[[:space:]]*$/d' >"$OUT_DIR/$name.txt"
    echo "    extracted $(wc -w <"$OUT_DIR/$name.txt" | tr -d ' ') words"
  fi

  # Ask the Wayback Machine for a fresh capture. Best-effort: this endpoint is
  # rate-limited and slow, and a failure here costs us nothing.
  curl -s -o /dev/null --max-time 60 "https://web.archive.org/save/$url" &&
    echo "    resubmitted to Wayback" ||
    echo "    Wayback save skipped (rate-limited or slow)"
done

echo
if [ "$failures" -gt 0 ]; then
  echo "Done with $failures failure(s). Existing copies were left untouched."
  exit 1
fi
echo "Done. $(ls -1 "$OUT_DIR" | grep -vc README.md) files in archive/press."
