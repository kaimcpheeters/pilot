export type ActId = 1 | 2 | 3;

export type Variant =
  | "main"
  | "pass"
  | "success"
  | "earlyFailure"
  | "passEnding"
  | "perfectEnding"
  | "failureEnding";

export interface VideoEntry {
  id: string;
  act: ActId;
  variant: Variant;
  src: string;
  /**
   * Optional alternate source with the music stem removed (speech + SFX only),
   * suitable for authoring beatmaps without score-driven distraction.
   */
  cleanSrc?: string;
  duration: 15 | 8;
  label: string;
}

export interface Note {
  id: string;
  /** Seconds into the main video at which the note should be hit. */
  t: number;
  /** Normalized 0..1 horizontal position within the video frame. */
  x: number;
  /** Normalized 0..1 vertical position within the video frame. */
  y: number;
  /** Seconds the approach ring is visible before t. Default 1.0. */
  approach?: number;
}

export interface Beatmap {
  videoId: string;
  notes: Note[];
}

export type Judgment = "perfect" | "good" | "miss";
