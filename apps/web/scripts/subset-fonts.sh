#!/usr/bin/env bash
#
# Cuts the site's typeface from the upstream release into src/fonts.
#
# The site is set in JetBrains Mono and ships it itself (src/styles/fonts.scss).
# The upstream webfonts are ~70KB a style, most of it glyphs this site never
# sets and a ligature table it does not want, so each style is cut into two
# pieces along a `unicode-range` split and a page only fetches the piece it
# uses:
#
#   latin   ASCII, Latin-1, dashes and quotes, the four arrows, ⌘, and the two
#           disclosure triangles: what the chrome and ordinary prose reach for.
#   ext     accented Latin, Greek, the mathematical operators, the technical
#           symbols, box drawing and the shapes: what a post reaches for.
#
# Cyrillic is left out — nothing here is written in it — so a word set in it
# falls back to the platform's monospace. That is the only script the face has
# that these files do not.
#
# The code ligatures (`calt`) are cut on purpose. They turn `--` into one long
# dash and `!=` into ≠, which is a fine thing in an editor and the wrong thing
# on a page whose code is install commands meant to be read and typed.
#
# The hinting is kept: it is what holds 15px text crisp on a low-density
# Windows display, and it is worth the few kilobytes.
#
# The ranges here are the ranges src/styles/fonts.scss declares. Change them
# together.
#
# Needs npm (to fetch the upstream files) and uv (to run fontTools).
# Re-running it rewrites src/fonts in place; the output is deterministic for a
# given upstream version.

set -euo pipefail

# The upstream release, as packaged for npm: font version 2.242.
UPSTREAM="jetbrains-mono@1.0.6"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$REPO_ROOT/src/fonts"

LATIN="U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+2190-2193,U+2318,U+25B8,U+25BE,U+FFFD"
EXT="U+0100-024F,U+0259,U+02B0-02FF,U+0300-036F,U+0370-03FF,U+1E00-1EFF,U+2070-209F,U+20A0-20CF,U+2100-214F,U+2150-218F,U+2194-21FF,U+2200-22FF,U+2300-2317,U+2319-23FF,U+2400-243F,U+2500-259F,U+25A0-25B7,U+25B9-25BD,U+25BF-25FF,U+2600-26FF,U+2700-27BF"

# upstream style name | the name the stylesheet asks for
STYLES=(
  "Regular|400"
  "Italic|400-italic"
  "SemiBold|600"
  "SemiBoldItalic|600-italic"
)

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

(cd "$WORK" && npm pack --silent "$UPSTREAM" >/dev/null && tar -xzf ./*.tgz)
SRC_DIR="$WORK/package/fonts/webfonts"

subset() {
  local source="$1" range="$2" target="$3"
  uvx --quiet --from 'fonttools[woff]' pyftsubset "$source" \
    --unicodes="$range" \
    --flavor=woff2 \
    --layout-features-=calt \
    --name-IDs=0,1,2,3,4,5,6,13,14 \
    --output-file="$target"
}

mkdir -p "$OUT_DIR"
for entry in "${STYLES[@]}"; do
  IFS='|' read -r upstream name <<<"$entry"
  subset "$SRC_DIR/JetBrainsMono-$upstream.woff2" "$LATIN" "$OUT_DIR/jetbrains-mono-latin-$name.woff2"
  subset "$SRC_DIR/JetBrainsMono-$upstream.woff2" "$EXT" "$OUT_DIR/jetbrains-mono-ext-$name.woff2"
done

ls -l "$OUT_DIR"/*.woff2
