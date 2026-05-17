#!/usr/bin/env bash
# Promote a beatmap export to the canonical `beatmaps/latest.json` that
# gets baked into the production bundle.
#
# Usage:
#   ./scripts/promote-beatmap.sh                # use newest dated file in beatmaps/
#   ./scripts/promote-beatmap.sh path/to/x.json # use a specific file
#
# After running this, rebuild + redeploy:
#   npm run deploy
set -euo pipefail

DEST="beatmaps/latest.json"
SRC="${1:-}"

if [[ -z "$SRC" ]]; then
  # Newest dated export in beatmaps/
  SRC="$(ls -t beatmaps/pilot-beatmaps-*.json 2>/dev/null | head -n1 || true)"
fi

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "error: no source export found (pass a path or drop one in beatmaps/)" >&2
  exit 1
fi

if [[ "$(realpath "$SRC")" == "$(realpath "$DEST")" ]]; then
  echo "error: source and destination are the same file" >&2
  exit 1
fi

# Sanity-check structure before overwriting.
node -e "
const d = JSON.parse(require('fs').readFileSync('$SRC', 'utf8'));
if (!d || !Array.isArray(d.beatmaps)) {
  console.error('error: $SRC has no \"beatmaps\" array');
  process.exit(1);
}
const counts = d.beatmaps
  .slice()
  .sort((a, b) => a.videoId.localeCompare(b.videoId))
  .map(b => '  ' + b.videoId.padEnd(20) + ' ' + (b.notes?.length ?? 0).toString().padStart(4) + ' notes')
  .join('\n');
console.log('Promoting ' + '$SRC' + ' (exported ' + d.exportedAt + ')');
console.log(counts);
"

cp "$SRC" "$DEST"
echo "Wrote $DEST"
