import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

const CLIP_BASES: ReadonlyArray<string> = [
  "1 - Knight vs Green Electric Dragon",
  "1 - Knight vs Green Electric Dragon - Pass",
  "1 - Knight vs Green Electric Dragon - Success",
  "1 - Knight vs Green Electric Dragon - Early Failure Ending",
  "2 - Knight vs White Ice Dragon",
  "2 - Knight vs White Ice Dragon - Pass",
  "2 - Knight vs White Ice Dragon - Success",
  "2 - Knight vs White Ice Dragon - Early Failure Ending",
  "3 - Knight vs Red Fire Dragon",
  "3 - Knight vs Red Fire Dragon - Pass Ending",
  "3 - Knight vs Red Fire Dragon - Perfect Ending",
  "3 - Knight vs Red Fire Dragon - Failure Ending",
];

type TrackId = "original" | "speech" | "music" | "effects";

interface TrackDef {
  id: TrackId;
  label: string;
  hint: string;
  url: (base: string) => string;
  defaultMuted: boolean;
  defaultVolume: number;
  accent: string;
}

const TRACKS: ReadonlyArray<TrackDef> = [
  {
    id: "original",
    label: "Original",
    hint: "Untouched audio straight from the source MP4",
    url: (b) => `/media/videos/${encodeURIComponent(b)}.mp4`,
    defaultMuted: true,
    defaultVolume: 1,
    accent: "#a0a0bb",
  },
  {
    id: "speech",
    label: "Speech",
    hint: "BandIt-DnR dialogue stem",
    url: (b) => `/media/stems/${encodeURIComponent(b)}/speech.wav`,
    defaultMuted: false,
    defaultVolume: 1,
    accent: "#5dd0ff",
  },
  {
    id: "effects",
    label: "Effects (SFX)",
    hint: "Battle / impact / ambient sounds",
    url: (b) => `/media/stems/${encodeURIComponent(b)}/effects.wav`,
    defaultMuted: false,
    defaultVolume: 1,
    accent: "#ffd24a",
  },
  {
    id: "music",
    label: "Music",
    hint: "Score / soundtrack \u2014 muted by default",
    url: (b) => `/media/stems/${encodeURIComponent(b)}/music.wav`,
    defaultMuted: true,
    defaultVolume: 1,
    accent: "#ff3da4",
  },
];

interface TrackState {
  muted: boolean;
  soloed: boolean;
  volume: number;
}

const initialTrackState = (): Record<TrackId, TrackState> => {
  const out = {} as Record<TrackId, TrackState>;
  for (const t of TRACKS) {
    out[t.id] = { muted: t.defaultMuted, soloed: false, volume: t.defaultVolume };
  }
  return out;
};

const PRESETS: ReadonlyArray<{ label: string; muted: Partial<Record<TrackId, boolean>> }> = [
  { label: "Original only", muted: { original: false, speech: true, music: true, effects: true } },
  { label: "Cleaned (Speech + SFX)", muted: { original: true, speech: false, music: true, effects: false } },
  { label: "Speech only", muted: { original: true, speech: false, music: true, effects: true } },
  { label: "Music only", muted: { original: true, speech: true, music: false, effects: true } },
  { label: "SFX only", muted: { original: true, speech: true, music: true, effects: false } },
];

const formatTime = (t: number): string => {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export function AudioCompareView() {
  const [base, setBase] = useState<string>(CLIP_BASES[0]);
  const [tracks, setTracks] = useState<Record<TrackId, TrackState>>(initialTrackState);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRefs = useRef<Record<TrackId, HTMLAudioElement | null>>({
    original: null,
    speech: null,
    music: null,
    effects: null,
  });

  const anySolo = useMemo(() => TRACKS.some((t) => tracks[t.id].soloed), [tracks]);

  const effectiveMuted = (id: TrackId): boolean => {
    const s = tracks[id];
    if (anySolo) return !s.soloed;
    return s.muted;
  };

  // Apply mute / volume state to media elements.
  useEffect(() => {
    for (const t of TRACKS) {
      const el = t.id === "original" ? videoRef.current : audioRefs.current[t.id];
      if (!el) continue;
      el.muted = effectiveMuted(t.id);
      el.volume = tracks[t.id].volume;
    }
  }, [tracks, anySolo, base]);

  // Pause + reset everything when the clip changes.
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    for (const t of TRACKS) {
      if (t.id === "original") continue;
      const a = audioRefs.current[t.id];
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    }
  }, [base]);

  const playAll = async () => {
    const v = videoRef.current;
    if (!v) return;
    const targets: HTMLMediaElement[] = [v];
    for (const t of TRACKS) {
      if (t.id === "original") continue;
      const a = audioRefs.current[t.id];
      if (a) targets.push(a);
    }
    for (const el of targets) el.currentTime = v.currentTime;
    await Promise.all(targets.map((el) => el.play().catch(() => undefined)));
    setPlaying(true);
  };

  const pauseAll = () => {
    const v = videoRef.current;
    if (v) v.pause();
    for (const t of TRACKS) {
      if (t.id === "original") continue;
      const a = audioRefs.current[t.id];
      if (a) a.pause();
    }
    setPlaying(false);
  };

  const seekAll = (t: number) => {
    const v = videoRef.current;
    if (v) v.currentTime = t;
    for (const tr of TRACKS) {
      if (tr.id === "original") continue;
      const a = audioRefs.current[tr.id];
      if (a) a.currentTime = t;
    }
    setTime(t);
  };

  // Keep the scrubber in sync via the video's timeupdate.
  const onVideoTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setTime(v.currentTime);
    // Drift correction: nudge audio elements if they wander more than 80ms.
    for (const t of TRACKS) {
      if (t.id === "original") continue;
      const a = audioRefs.current[t.id];
      if (!a) continue;
      if (Math.abs(a.currentTime - v.currentTime) > 0.08) {
        a.currentTime = v.currentTime;
      }
    }
  };

  const onVideoMeta = () => {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  };

  const onVideoEnded = () => setPlaying(false);

  const setTrack = (id: TrackId, patch: Partial<TrackState>) => {
    setTracks((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const applyPreset = (muted: Partial<Record<TrackId, boolean>>) => {
    setTracks((prev) => {
      const next = { ...prev };
      for (const t of TRACKS) {
        const m = muted[t.id];
        next[t.id] = { ...next[t.id], muted: m ?? next[t.id].muted, soloed: false };
      }
      return next;
    });
  };

  return (
    <div className="audio-compare">
      <header className="audio-compare__top">
        <div>
          <h1 className="audio-compare__title">Stem Mixer</h1>
          <p className="audio-compare__sub">
            Compare original audio against BandIt-DnR speech / music / effects stems. All tracks share one transport.
          </p>
        </div>
        <Link to="/" className="audio-compare__back">
          &larr; back to player
        </Link>
      </header>

      <div className="audio-compare__layout">
        <aside className="audio-compare__sidebar">
          <div className="audio-compare__sidebar-label">Clip</div>
          <ul className="audio-compare__clip-list">
            {CLIP_BASES.map((b) => (
              <li key={b}>
                <button
                  type="button"
                  className={`audio-compare__clip${b === base ? " is-active" : ""}`}
                  onClick={() => setBase(b)}
                >
                  {b}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="audio-compare__main">
          <div className="audio-compare__video-wrap">
            <video
              ref={videoRef}
              key={base}
              className="audio-compare__video"
              src={`/media/videos/${encodeURIComponent(base)}.mp4`}
              onTimeUpdate={onVideoTime}
              onLoadedMetadata={onVideoMeta}
              onEnded={onVideoEnded}
              playsInline
              preload="auto"
            />
            {TRACKS.filter((t) => t.id !== "original").map((t) => (
              <audio
                key={`${base}-${t.id}`}
                ref={(el) => {
                  audioRefs.current[t.id] = el;
                }}
                src={t.url(base)}
                preload="auto"
              />
            ))}
          </div>

          <div className="audio-compare__transport">
            <button
              type="button"
              className="audio-compare__play"
              onClick={playing ? pauseAll : playAll}
            >
              {playing ? "Pause" : "Play"}
            </button>
            <div className="audio-compare__time">{formatTime(time)}</div>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.01}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seekAll(parseFloat(e.target.value))}
              className="audio-compare__scrub"
            />
            <div className="audio-compare__time">{formatTime(duration)}</div>
          </div>

          <div className="audio-compare__presets">
            <span className="audio-compare__presets-label">Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="audio-compare__preset"
                onClick={() => applyPreset(p.muted)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="audio-compare__mixer">
            {TRACKS.map((t) => {
              const s = tracks[t.id];
              const live = !effectiveMuted(t.id) && playing;
              return (
                <div
                  key={t.id}
                  className={`audio-compare__track${live ? " is-live" : ""}`}
                  style={{ ["--track-accent" as any]: t.accent }}
                >
                  <div className="audio-compare__track-head">
                    <div className="audio-compare__track-name">{t.label}</div>
                    <div className="audio-compare__track-hint">{t.hint}</div>
                  </div>
                  <div className="audio-compare__track-controls">
                    <button
                      type="button"
                      className={`audio-compare__tbtn${s.muted ? " is-on" : ""}`}
                      onClick={() => setTrack(t.id, { muted: !s.muted })}
                      title="Mute"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`audio-compare__tbtn audio-compare__tbtn--solo${s.soloed ? " is-on" : ""}`}
                      onClick={() => setTrack(t.id, { soloed: !s.soloed })}
                      title="Solo"
                    >
                      S
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={s.volume}
                      onChange={(e) => setTrack(t.id, { volume: parseFloat(e.target.value) })}
                      className="audio-compare__vol"
                    />
                    <div className="audio-compare__vol-readout">
                      {Math.round(s.volume * 100)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
