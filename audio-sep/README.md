# audio-sep

Offline pipeline that strips the music stem from each gameplay video, leaving a
"clean" track of speech + sound effects. The clean videos back the editor view,
and the per-clip stems back the audio compare view.

```
audio-sep/
├── process.sh             entry point — extract WAV, run BandIt, remux MP4
├── analysis/
│   └── bpm.py             estimate BPM per music stem
├── data/                  generated; gitignored
│   ├── audio_in/          raw WAVs from each source MP4
│   ├── audio_out/         per-clip stems (speech.wav / music.wav / effects.wav)
│   ├── videos_out/        remuxed MP4s with music dropped
│   └── bpm.json           cached BPM analysis output
├── weights/               BandIt config + checkpoint (see weights/README.md)
└── mss/                   vendored ZFTurbo/Music-Source-Separation-Training
```

`public/media/stems` is a symlink into `audio-sep/data/audio_out/` so the web
app can stream stems directly without copying.

## One-time setup

### 1. Python venv

```bash
python3 -m venv .venv-audio          # from the repo root
source .venv-audio/bin/activate
pip install -r audio-sep/mss/requirements.txt
pip install librosa numpy            # for analysis/bpm.py
```

### 2. Vendored MSS toolkit

`audio-sep/mss/` is **not** tracked in git (it's an external research repo and
was previously a phantom submodule). Clone it yourself at the pinned commit:

```bash
git clone https://github.com/ZFTurbo/Music-Source-Separation-Training.git audio-sep/mss
git -C audio-sep/mss checkout c0197a0b2f1fffa8631779e1e92835a2e24d1c99
```

### 3. Model weights

See [`weights/README.md`](weights/README.md) for the BandIt checkpoint.

## Running the pipeline

```bash
./audio-sep/process.sh
```

The script is idempotent — already-extracted WAVs and already-remuxed MP4s are
skipped. Override the input directory or venv location with env vars:

```bash
VIDEOS_SRC=/path/to/other/mp4s ./audio-sep/process.sh
VENV=/path/to/another/venv     ./audio-sep/process.sh
```

## BPM analysis

```bash
python audio-sep/analysis/bpm.py
```

Reads each `data/audio_out/<clip>/music.wav`, runs three librosa estimators
(beat-track, static tempo, tempogram peak), folds each into the 60–180 BPM
window, and writes the consensus + spread to `data/bpm.json`.
