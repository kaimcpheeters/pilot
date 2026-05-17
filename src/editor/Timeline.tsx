import { useCallback, useEffect, useRef, useState } from "react";
import type { Note } from "../game/types";

interface TimelineProps {
  duration: number;
  currentTime: number;
  notes: Note[];
  selectedId?: string;
  onSeek: (t: number) => void;
  onSelectNote: (id: string) => void;
}

export function Timeline({
  duration,
  currentTime,
  notes,
  selectedId,
  onSeek,
  onSelectNote,
}: TimelineProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(pct * duration);
    },
    [duration, onSeek],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => seekFromEvent(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, seekFromEvent]);

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate tick marks every 0.5s.
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 0.001; t += 0.5) ticks.push(t);

  return (
    <div className="timeline">
      <div
        className="timeline__track"
        ref={ref}
        onPointerDown={(e) => {
          setDragging(true);
          seekFromEvent(e.clientX);
        }}
      >
        {ticks.map((t) => (
          <div
            key={t}
            className={`timeline__tick ${Math.abs(t - Math.round(t)) < 1e-6 ? "timeline__tick--major" : ""}`}
            style={{ left: `${(t / duration) * 100}%` }}
          />
        ))}
        {notes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`timeline__note ${selectedId === n.id ? "is-selected" : ""}`}
            style={{ left: `${(n.t / duration) * 100}%` }}
            title={`t=${n.t.toFixed(3)}s`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectNote(n.id);
              onSeek(n.t);
            }}
          />
        ))}
        <div className="timeline__playhead" style={{ left: `${pct}%` }} />
      </div>
      <div className="timeline__labels">
        {ticks
          .filter((t) => Math.abs(t - Math.round(t)) < 1e-6)
          .map((t) => (
            <div
              key={t}
              className="timeline__label"
              style={{ left: `${(t / duration) * 100}%` }}
            >
              {t.toFixed(0)}s
            </div>
          ))}
      </div>
    </div>
  );
}
