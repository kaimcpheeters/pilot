import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/editor.css";
import { EDITABLE_VIDEOS } from "../game/manifest";
import type { ActId, Beatmap, Note, VideoEntry } from "../game/types";
import {
  downloadAllBeatmaps,
  downloadBeatmap,
  importBeatmapJson,
  loadBeatmap,
  saveBeatmap,
  clearBeatmap,
} from "../game/storage";
import { NoteOverlay } from "../game/NoteOverlay";
import { Timeline } from "../editor/Timeline";
import { NoteList } from "../editor/NoteList";

const SPEEDS: number[] = [0.25, 0.5, 1];

const VARIANT_LABEL: Record<string, string> = {
  main: "Main fight",
  pass: "Pass",
  success: "Success",
  passEnding: "Pass ending",
  perfectEnding: "Perfect ending",
};

const ACT_TITLE: Record<ActId, string> = {
  1: "Act 1 \u2014 Green Electric Dragon",
  2: "Act 2 \u2014 White Ice Dragon",
  3: "Act 3 \u2014 Red Fire Dragon",
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function EditorView() {
  const [videoId, setVideoId] = useState<string>(EDITABLE_VIDEOS[0].id);
  const video = useMemo(
    () => EDITABLE_VIDEOS.find((v) => v.id === videoId) ?? EDITABLE_VIDEOS[0],
    [videoId],
  );

  const videosByAct = useMemo(() => {
    const acts: ActId[] = [1, 2, 3];
    const out: Array<{ act: ActId; videos: VideoEntry[] }> = [];
    for (const act of acts) {
      const videos = EDITABLE_VIDEOS.filter((v) => v.act === act);
      if (videos.length > 0) out.push({ act, videos });
    }
    return out;
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const [beatmap, setBeatmap] = useState<Beatmap>(() => loadBeatmap(video.id));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(video.duration);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  useEffect(() => {
    setBeatmap(loadBeatmap(video.id));
    setSelectedId(undefined);
    setCurrentTime(0);
    setPlaying(false);
  }, [video.id]);

  useEffect(() => {
    saveBeatmap(beatmap);
  }, [beatmap]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      setCurrentTime(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [video.id]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, t));
  }, [duration]);

  const handleFrameClick = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const el = overlayRef.current;
      if (!el) return;
      // Ignore clicks that originate on an existing note (handled by NoteOverlay drag).
      if ((ev.target as HTMLElement).closest(".note")) return;
      const rect = el.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const y = (ev.clientY - rect.top) / rect.height;
      const t = videoRef.current?.currentTime ?? currentTime;
      const note: Note = {
        id: newId(),
        t: Number(t.toFixed(3)),
        x: Number(x.toFixed(3)),
        y: Number(y.toFixed(3)),
        approach: 1,
      };
      setBeatmap((bm) => ({ ...bm, notes: [...bm.notes, note] }));
      setSelectedId(note.id);
    },
    [currentTime],
  );

  const handleNoteDrag = useCallback((id: string, x: number, y: number) => {
    setBeatmap((bm) => ({
      ...bm,
      notes: bm.notes.map((n) =>
        n.id === id ? { ...n, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) } : n,
      ),
    }));
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setBeatmap((bm) => ({
      ...bm,
      notes: bm.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setBeatmap((bm) => ({ ...bm, notes: bm.notes.filter((n) => n.id !== id) }));
    setSelectedId((s) => (s === id ? undefined : s));
  }, []);

  const handleExport = () => downloadBeatmap(beatmap);

  const handleImport = (file: File) => {
    importBeatmapJson(file)
      .then((bm) => {
        if (bm.videoId !== video.id) {
          if (!confirm(`Beatmap is for ${bm.videoId}. Import anyway and rebind to ${video.id}?`)) {
            return;
          }
          bm = { ...bm, videoId: video.id };
        }
        setBeatmap(bm);
      })
      .catch((err) => alert(`Failed to import: ${err.message}`));
  };

  const handleClear = () => {
    if (!confirm("Delete all notes for this video?")) return;
    clearBeatmap(video.id);
    setBeatmap({ videoId: video.id, notes: [] });
    setSelectedId(undefined);
  };

  return (
    <div className="editor">
      <header className="editor__header">
        <h1>Beatmap Editor</h1>
        <div className="editor__header-right">
          <label className="editor__field">
            Video
            <select value={videoId} onChange={(e) => setVideoId(e.target.value)}>
              {videosByAct.map(({ act, videos }) => (
                <optgroup key={act} label={ACT_TITLE[act]}>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {VARIANT_LABEL[v.variant] ?? v.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <Link to="/" className="editor__link">
            Back to player
          </Link>
        </div>
      </header>

      <div className="editor__body">
        <div className="editor__stage">
          <div
            className="editor__frame"
            ref={overlayRef}
            onPointerDown={handleFrameClick}
          >
            <video
              ref={videoRef}
              className="editor__video"
              src={video.cleanSrc ?? video.src}
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDuration(Number.isFinite(v.duration) ? v.duration : video.duration);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <NoteOverlay
              notes={beatmap.notes}
              currentTime={currentTime}
              judgments={{}}
              selectedId={selectedId}
              onNoteClick={(n) => setSelectedId(n.id)}
              onNoteDrag={handleNoteDrag}
            />
          </div>

          <div className="editor__controls">
            <button type="button" onClick={togglePlay}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => seek(0)}>
              Restart
            </button>
            <label className="editor__field">
              Speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                {SPEEDS.map((s) => (
                  <option key={s} value={s}>
                    {s}x
                  </option>
                ))}
              </select>
            </label>
            <div className="editor__time">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </div>
          </div>

          <Timeline
            duration={duration}
            currentTime={currentTime}
            notes={beatmap.notes}
            selectedId={selectedId}
            onSeek={seek}
            onSelectNote={(id) => setSelectedId(id)}
          />
        </div>

        <aside className="editor__side">
          <div className="editor__io">
            <button type="button" onClick={handleExport}>
              Export JSON
            </button>
            <button type="button" onClick={() => downloadAllBeatmaps()}>
              Export All
            </button>
            <label className="editor__import">
              Import JSON
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" className="editor__danger" onClick={handleClear}>
              Clear
            </button>
          </div>
          <NoteList
            notes={beatmap.notes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={deleteNote}
            onUpdate={updateNote}
          />
        </aside>
      </div>
    </div>
  );
}
