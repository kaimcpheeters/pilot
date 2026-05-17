import { useMemo } from "react";
import "../styles/notes.css";
import type { Judgment, Note } from "./types";
import { DEFAULT_APPROACH, NORMAL_PROFILE } from "./judgments";

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
  /**
   * Half-width of the Good window in seconds. Drives both the late-edge of
   * the visible window and the fade-out timing of the approach ring during
   * the late portion of the hit window. Defaults to the Normal profile so
   * the editor (which doesn't carry a difficulty) gets sensible behaviour.
   */
  goodWindow?: number;
  /** Multiplier applied to each note's `approach` time. Default 1.0. */
  approachMul?: number;
  /** Called when the user clicks an active note. */
  onNoteClick?: (note: Note, ev: React.PointerEvent) => void;
  /** Hovered/selected note id, for editor preview. */
  selectedId?: string;
  /** Called when a note is dragged in the editor. */
  onNoteDrag?: (id: string, x: number, y: number) => void;
}

/**
 * Initial scale of the approach ring at the moment a note appears. Shrinks
 * linearly to 1.0× by the hit moment, at which point the ring's outer edge
 * sits exactly on the hit circle's outer edge (the two share a base size in
 * CSS). This is the canonical osu! "approach circle lands on hit circle"
 * timing cue.
 */
const APPROACH_START_SCALE = 3.0;

export function NoteOverlay({
  notes,
  currentTime,
  judgments,
  showNumbers = true,
  goodWindow = NORMAL_PROFILE.goodWindow,
  approachMul = 1,
  onNoteClick,
  selectedId,
  onNoteDrag,
}: NoteOverlayProps) {
  const sorted = useMemo(
    () => [...notes].sort((a, b) => a.t - b.t).map((n, i) => ({ ...n, index: i + 1 })),
    [notes],
  );

  // Visibility: a note is on-screen from the start of its approach until
  // the end of its Good window. Tying the late edge to `goodWindow` (rather
  // than a magic 0.3s) means the note disappears the instant it auto-misses,
  // so the player never sees a "lingering" note they can no longer hit.
  const visible = sorted.filter((n) => {
    const ap = (n.approach ?? DEFAULT_APPROACH) * approachMul;
    return currentTime >= n.t - ap && currentTime <= n.t + goodWindow;
  });

  return (
    <div className="note-overlay">
      {visible.map((n) => {
        const ap = (n.approach ?? DEFAULT_APPROACH) * approachMul;
        const dt = currentTime - n.t;
        const judgment = judgments?.[n.id];
        const past = dt > 0;
        const selected = selectedId === n.id;

        let approachScale: number;
        let approachOpacity: number;
        if (judgment) {
          // Already judged -- the hit circle's judgment colour is the feedback,
          // the approach ring no longer carries information.
          approachScale = 1;
          approachOpacity = 0;
        } else if (dt < 0) {
          // Approach phase: ring shrinks from APPROACH_START_SCALE → 1.0 over
          // the note's approach window, slightly dimming as it lands.
          const early = Math.min(1, Math.max(0, (currentTime - (n.t - ap)) / ap));
          approachScale =
            APPROACH_START_SCALE - early * (APPROACH_START_SCALE - 1);
          approachOpacity = 1 - early * 0.3;
        } else {
          // Late window: ring sits at scale 1.0 (locked onto the hit circle)
          // and fades to nothing exactly as the Good window closes, giving the
          // player a visible "time running out" cue during the 160 ms tail.
          const late = Math.min(1, dt / Math.max(goodWindow, 1e-6));
          approachScale = 1;
          approachOpacity = 0.7 * (1 - late);
        }

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
                opacity: approachOpacity,
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
