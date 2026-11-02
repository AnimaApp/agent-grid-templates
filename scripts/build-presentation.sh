#!/usr/bin/env bash
# Rebuilds presentation/ — the presentation template as Agent Grid commits it — from its source:
# draws the placeholder images, writes the agent-written Presentation IR, compiles it with the
# presentation compiler, and lints the result with the presentation format's own lint.
#
# Usage: scripts/build-presentation.sh <anima-design-to-code checkout>
#
# The compiler is not published, so it runs from an anima-design-to-code checkout with its
# dependencies installed (`yarn install` there).
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <anima-design-to-code checkout>" >&2
  exit 2
fi

repo="$(cd "$(dirname "$0")/.." && pwd)"
anima="$(cd "$1" && pwd)"
compiler="$anima/packages/presentation-compiler"
out="$(mktemp -d)/presentation"
trap 'rm -rf "$(dirname "$out")"' EXIT

node "$repo/scripts/presentation/images.mjs" "$anima"
node "$repo/scripts/presentation/deck.mjs"

# `compile` lints its own output and exits non-zero on any error or failed slide.
(cd "$compiler" && bun run src/cli/main.ts compile "$repo/presentation-source/deck.presentation-ir.json" --out "$out")
(cd "$compiler" && bun run src/cli/main.ts lint "$out")

rm -rf "$repo/presentation"
cp -R "$out" "$repo/presentation"
echo "presentation/ rebuilt: $(find "$repo/presentation" -type f | wc -l | tr -d ' ') files"
