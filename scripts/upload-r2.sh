#!/usr/bin/env bash
# Upload the 12 gameplay MP4s in public/media/videos/ to the R2 bucket.
#
# Layout in R2 mirrors the local path so the prod base URL is just
# `https://media.pilot.kaimcpheeters.com` + the same `/media/videos/...`
# suffix the dev server uses.
#
# Usage: ./scripts/upload-r2.sh [bucket-name]
set -euo pipefail

BUCKET="${1:-pilot-media}"
SRC_DIR="public/media/videos"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "error: $SRC_DIR not found (run from repo root)" >&2
  exit 1
fi

shopt -s nullglob
files=("$SRC_DIR"/*.mp4)
shopt -u nullglob

if (( ${#files[@]} == 0 )); then
  echo "error: no mp4 files in $SRC_DIR" >&2
  exit 1
fi

echo "Uploading ${#files[@]} file(s) to r2://$BUCKET/media/videos/"
for f in "${files[@]}"; do
  name="$(basename "$f")"
  key="media/videos/$name"
  echo "  -> $key"
  npx wrangler r2 object put "$BUCKET/$key" \
    --file "$f" \
    --content-type "video/mp4" \
    --remote
done

echo "Done."
