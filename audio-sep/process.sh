#!/usr/bin/env bash
# Strip music from all videos in public/media/videos/, keeping speech + SFX.
# Uses ZFTurbo's BandIt Plus DnR (speech / music / effects 3-stem split).

set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"
VIDEOS_SRC="/Users/kai/src/pilot/public/media/videos"
VIDEOS_OUT="$ROOT/videos_out"
AUDIO_IN="$ROOT/audio_in"
AUDIO_OUT="$ROOT/audio_out"
MSS="$ROOT/mss"
WEIGHTS="$ROOT/weights"

mkdir -p "$VIDEOS_OUT" "$AUDIO_IN" "$AUDIO_OUT"

source "$ROOT/../.venv-audio/bin/activate"

echo "=== Step 1/3: extract audio to WAV ==="
shopt -s nullglob
for src in "$VIDEOS_SRC"/*.mp4; do
  base="$(basename "$src" .mp4)"
  wav="$AUDIO_IN/$base.wav"
  if [[ -f "$wav" ]]; then
    echo "  skip (exists): $base.wav"
    continue
  fi
  echo "  extract: $base"
  ffmpeg -y -loglevel error -i "$src" -vn -ac 2 -ar 44100 -acodec pcm_s16le "$wav"
done

echo
echo "=== Step 2/3: run BandIt DnR separation (MPS on Apple Silicon) ==="
cd "$MSS"
PYTORCH_ENABLE_MPS_FALLBACK=1 python inference.py \
  --model_type bandit \
  --config_path "$WEIGHTS/config_dnr_bandit_bsrnn_multi_mus64.yaml" \
  --start_check_point "$WEIGHTS/model_bandit_plus_dnr_sdr_11.47.chpt" \
  --input_folder "$AUDIO_IN" \
  --store_dir "$AUDIO_OUT"

cd "$ROOT"

echo
echo "=== Step 3/3: mix speech + effects and remux into MP4 ==="
for src in "$VIDEOS_SRC"/*.mp4; do
  base="$(basename "$src" .mp4)"
  speech="$AUDIO_OUT/$base/speech.wav"
  effects="$AUDIO_OUT/$base/effects.wav"
  out="$VIDEOS_OUT/$base - no music.mp4"
  if [[ ! -f "$speech" || ! -f "$effects" ]]; then
    echo "  MISSING stems for: $base"
    continue
  fi
  if [[ -f "$out" ]]; then
    echo "  skip (exists): $base"
    continue
  fi
  echo "  remux: $base"
  ffmpeg -y -loglevel error \
    -i "$src" \
    -i "$speech" \
    -i "$effects" \
    -filter_complex "[1:a][2:a]amix=inputs=2:duration=longest:normalize=0[aout]" \
    -map 0:v:0 -map "[aout]" \
    -c:v copy -c:a aac -b:a 192k -shortest \
    "$out"
done

echo
echo "Done. Cleaned videos in: $VIDEOS_OUT"
ls -lah "$VIDEOS_OUT"
