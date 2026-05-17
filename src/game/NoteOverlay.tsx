import { useMemo } from "react";
import type { Judgment, Note } from "./types";
import { DEFAULT_APPROACH } from "./judgments";

export interface ActiveNote extends Note {
  /** Progress from 0 (just appeared) to 1 (hit moment). > 1 = past hit time. */
  progress: number;
  /** Has this note already been judged? */
  resolved?: boolean;
  /** Latest judgment, if any. */
  judgment?: Judgment;
  /** Index in sequence (for visual ordering). */
  index?: number;
}

interface NoteOverlayProps {
  notes: Note[];
  currentTime: number;
  /** Map of note id -> latest judgment, for visual feedback. */
  judgments?: Record<string, Judgment | undefined>;
  /** Whether to show note numbers (osu! style). Default true. */
  showNumbers?: boolean;
  /** Called when the user clicks an active note. */
  onNoteClick?: (note: Note, ev: React.PointerEvent) => void;
  /** Hovered/selected note id, for editor preview. */
  selectedId?: string;
  /** Called when a note is dragged in the editor. */
  onNoteDrag?: (id: string, x: number, y: number) => void;
}

export function NoteOverlay({
  notes,
  currentTime,
  judgments,
  showNumbers = true,
  onNoteClick,
  selectedId,
  onNoteDrag,
}: NoteOverlayProps) {
  const sorted = useMemo(
    () => [...notes].sort((a, b) => a.t - b.t).map((n, i) => ({ ...n, index: i + 1 })),
    [notes],
  );

  const visible = sorted.filter((n) => {
    const ap = n.approach ?? DEFAULT_APPROACH;
    return currentTime >= n.t - ap && currentTime <= n.t + 0.3;
  });

  return (
    <div className="note-overlay">
      {visible.map((n) => {
        const ap = n.approach ?? DEFAULT_APPROACH;
        const progress = Math.min(1, Math.max(0, (currentTime - (n.t - ap)) / ap));
        const approachScale = 2.4 - progress * 1.4; // approach ring shrinks from 2.4x to 1.0x
        const judgment = judgments?.[n.id];
        const past = currentTime > n.t;
        const selected = selectedId === n.id;
        return (
          <div
            key={n.id}
            className={[
              "note",
              past ? "note--past" : "note--approaching",
              judgment ? `note--${judgment}` : "",
              selected ? "note--selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{
              left: `${n.x * 100}%`,
              top: `${n.y * 100}%`,
            }}
            onPointerDown={(ev) => {
              if (onNoteDrag) {
                ev.preventDefault();
                const overlay = (ev.currentTarget.parentElement as HTMLElement) ?? null;
                if (!overlay) return;
                const rect = overlay.getBoundingClientRect();
                const move = (e: PointerEvent) => {
                  const x = (e.clientX - rect.left) / rect.width;
                  const y = (e.clientY - rect.top) / rect.height;
                  onNoteDrag(n.id, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
                };
                const up = () => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }
              onNoteClick?.(n, ev);
            }}
          >
            <div
              className="note__approach"
              style={{
                transform: `translate(-50%, -50%) scale(${approachScale})`,
                opacity: 1 - progress * 0.3,
              }}
            />
            <div className="note__hit" />
            {showNumbers ? <div className="note__num">{n.index}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
