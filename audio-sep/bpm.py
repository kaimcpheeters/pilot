#!/usr/bin/env python3
"""Estimate BPM for every music stem under audio_out/.

Uses three librosa estimators and reports the consensus + per-method values
so we can spot disagreement (a sign the result isn't reliable).

Outputs a Markdown table and a JSON sidecar (bpm.json) next to this script.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import librosa
import numpy as np

HERE = Path(__file__).resolve().parent
AUDIO_OUT = HERE / "audio_out"
JSON_OUT = HERE / "bpm.json"

# Plausible song-BPM window. Constrains beat_track so it doesn't pick a
# half/double-time octave that's clearly out of range for game music.
BPM_MIN = 60.0
BPM_MAX = 180.0


def fold_into_range(bpm: float, lo: float = BPM_MIN, hi: float = BPM_MAX) -> float:
    if not np.isfinite(bpm) or bpm <= 0:
        return float("nan")
    while bpm < lo:
        bpm *= 2
    while bpm > hi:
        bpm /= 2
    return float(bpm)


def estimate_one(path: Path) -> dict:
    y, sr = librosa.load(str(path), sr=None, mono=True)
    duration = len(y) / sr if sr else 0.0

    onset_env = librosa.onset.onset_strength(y=y, sr=sr)

    # 1) Global beat tracking (returns one BPM + beat frames).
    bpm_bt, beats = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, start_bpm=120.0
    )
    bpm_bt = fold_into_range(float(np.atleast_1d(bpm_bt)[0]))
    beat_times = librosa.frames_to_time(beats, sr=sr).tolist()

    # 2) Static tempo from autocorrelation of the onset envelope.
    bpm_static = fold_into_range(
        float(
            np.atleast_1d(
                librosa.feature.tempo(
                    onset_envelope=onset_env, sr=sr, aggregate=np.median
                )
            )[0]
        )
    )

    # 3) Tempogram peak (a different decision surface from #2).
    tg = librosa.feature.tempogram(onset_envelope=onset_env, sr=sr)
    tempi = librosa.tempo_frequencies(tg.shape[0], sr=sr)
    mask = (tempi >= BPM_MIN) & (tempi <= BPM_MAX)
    if mask.any():
        scores = np.median(tg[mask], axis=1)
        bpm_tg = fold_into_range(float(tempi[mask][int(np.argmax(scores))]))
    else:
        bpm_tg = float("nan")

    candidates = [b for b in (bpm_bt, bpm_static, bpm_tg) if np.isfinite(b)]
    consensus = float(np.median(candidates)) if candidates else float("nan")
    spread = float(max(candidates) - min(candidates)) if len(candidates) >= 2 else 0.0

    return {
        "file": path.relative_to(HERE).as_posix(),
        "duration_s": round(duration, 2),
        "bpm_beat_track": round(bpm_bt, 2) if np.isfinite(bpm_bt) else None,
        "bpm_static": round(bpm_static, 2) if np.isfinite(bpm_static) else None,
        "bpm_tempogram": round(bpm_tg, 2) if np.isfinite(bpm_tg) else None,
        "bpm": round(consensus, 2) if np.isfinite(consensus) else None,
        "spread_bpm": round(spread, 2),
        "beat_times": [round(t, 3) for t in beat_times],
    }


def main(argv: list[str]) -> int:
    if not AUDIO_OUT.exists():
        print(f"audio_out not found: {AUDIO_OUT}", file=sys.stderr)
        return 2

    stem_paths = sorted(AUDIO_OUT.glob("*/music.wav"))
    if not stem_paths:
        print("no music stems found.", file=sys.stderr)
        return 2

    results: list[dict] = []
    for p in stem_paths:
        clip = p.parent.name
        print(f"analyzing: {clip} ... ", end="", flush=True)
        r = estimate_one(p)
        r["clip"] = clip
        print(f"BPM ~ {r['bpm']} (spread {r['spread_bpm']})")
        results.append(r)

    JSON_OUT.write_text(json.dumps(results, indent=2))
    print(f"\nWrote: {JSON_OUT}\n")

    name_w = max(len(r["clip"]) for r in results)
    header = f"| {'Clip':<{name_w}} | BPM   | beat_track | static | tempogram | spread |"
    sep = f"|{'-' * (name_w + 2)}|-------|------------|--------|-----------|--------|"
    print(header)
    print(sep)
    for r in results:
        print(
            f"| {r['clip']:<{name_w}} | {r['bpm']:>5} | "
            f"{(r['bpm_beat_track'] or 0):>10} | "
            f"{(r['bpm_static'] or 0):>6} | "
            f"{(r['bpm_tempogram'] or 0):>9} | "
            f"{r['spread_bpm']:>6} |"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
