import type { Note } from "../game/types";

interface NoteListProps {
  notes: Note[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
}

export function NoteList({ notes, selectedId, onSelect, onDelete, onUpdate }: NoteListProps) {
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  return (
    <div className="notelist">
      <div className="notelist__header">
        <span>#</span>
        <span>t (s)</span>
        <span>x</span>
        <span>y</span>
        <span>ap</span>
        <span></span>
      </div>
      <div className="notelist__rows">
        {sorted.length === 0 && (
          <div className="notelist__empty">
            Click on the video frame while it plays (or paused) to add notes.
          </div>
        )}
        {sorted.map((n, i) => (
          <div
            key={n.id}
            className={`notelist__row ${selectedId === n.id ? "is-selected" : ""}`}
            onClick={() => onSelect(n.id)}
          >
            <span>{i + 1}</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={n.t}
              onChange={(e) => onUpdate(n.id, { t: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={n.x}
              onChange={(e) => onUpdate(n.id, { x: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={n.y}
              onChange={(e) => onUpdate(n.id, { y: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
            <input
              type="number"
              step="0.05"
              min={0.2}
              max={3}
              value={n.approach ?? 1}
              onChange={(e) => onUpdate(n.id, { approach: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              className="notelist__delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(n.id);
              }}
              aria-label="Delete note"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
