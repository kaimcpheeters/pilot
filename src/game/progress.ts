import {
  DIFFICULTIES,
  EASY_PROFILE,
  HARD_PROFILE,
  INSANE_PROFILE,
  NORMAL_PROFILE,
  type DifficultyProfile,
} from "./judgments";

/**
 * localStorage key for the player's difficulty progress. Versioned so a
 * future schema change (e.g. tracking per-act unlocks, per-difficulty
 * high scores) can migrate without trampling old data.
 */
const STORAGE_KEY = "pilot.progress.v1";

export interface Progress {
  /** Difficulty ids the player has unlocked, in unspecified order. */
  unlocked: readonly string[];
  /** The difficulty id the player currently has selected. */
  selected: string;
  /**
   * Whether the cover-screen Training entry point is visible. Flipped on
   * the player's first defeat (any difficulty) and never flips back.
   */
  trainingUnlocked: boolean;
}

/**
 * Default starting state for a new player: only Normal is unlocked and
 * selected, and Training is hidden until the first defeat.
 */
export const DEFAULT_PROGRESS: Progress = {
  unlocked: [NORMAL_PROFILE.id],
  selected: NORMAL_PROFILE.id,
  trainingUnlocked: false,
};

function hasStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function sanitize(raw: unknown): Progress {
  if (!raw || typeof raw !== "object") return DEFAULT_PROGRESS;
  const known = new Set(DIFFICULTIES.map((d) => d.id));
  const parsed = raw as {
    unlocked?: unknown;
    selected?: unknown;
    trainingUnlocked?: unknown;
  };

  const unlocked = Array.isArray(parsed.unlocked)
    ? parsed.unlocked.filter(
        (id: unknown): id is string => typeof id === "string" && known.has(id),
      )
    : [];
  if (!unlocked.includes(NORMAL_PROFILE.id)) {
    unlocked.push(NORMAL_PROFILE.id);
  }

  const selected =
    typeof parsed.selected === "string" &&
    known.has(parsed.selected) &&
    unlocked.includes(parsed.selected)
      ? parsed.selected
      : NORMAL_PROFILE.id;

  const trainingUnlocked = parsed.trainingUnlocked === true;

  return { unlocked, selected, trainingUnlocked };
}

export function loadProgress(): Progress {
  if (!hasStorage()) return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return sanitize(JSON.parse(raw));
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function write(progress: Progress): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Quota / privacy-mode / SecurityError -- progress just won't persist.
  }
}

/**
 * Unlock a difficulty by id. No-op if already unlocked or unknown. Returns
 * the resulting Progress so callers can mirror it into React state without
 * re-reading from storage.
 */
export function unlockDifficulty(id: string, current: Progress): Progress {
  if (current.unlocked.includes(id)) return current;
  if (!DIFFICULTIES.some((d) => d.id === id)) return current;
  const next: Progress = {
    ...current,
    unlocked: [...current.unlocked, id],
  };
  write(next);
  return next;
}

/**
 * Set the active difficulty selection. No-op if the id is unknown or not
 * yet unlocked.
 */
export function selectDifficulty(id: string, current: Progress): Progress {
  if (current.selected === id) return current;
  if (!current.unlocked.includes(id)) return current;
  const next: Progress = { ...current, selected: id };
  write(next);
  return next;
}

/**
 * Flip the Training entry-point on. Idempotent; persists. Once unlocked,
 * Training stays unlocked across sessions.
 */
export function unlockTraining(current: Progress): Progress {
  if (current.trainingUnlocked) return current;
  const next: Progress = { ...current, trainingUnlocked: true };
  write(next);
  return next;
}

/**
 * The unlocked difficulty profiles, ordered easiest-first per the global
 * {@link DIFFICULTIES} list (not insertion order). Useful for rendering
 * the cover-screen selector.
 */
export function unlockedProfiles(progress: Progress): DifficultyProfile[] {
  const unlocked = new Set(progress.unlocked);
  return DIFFICULTIES.filter((d) => unlocked.has(d.id));
}

/**
 * Apply the progress updates earned by losing a run on the given difficulty:
 *
 * - Training always unlocks on the first defeat (idempotent thereafter).
 * - A defeat *specifically on Normal* reveals Easy as an escape hatch so the
 *   player has somewhere softer to retreat to.
 *
 * Losing on Easy / Hard / Insane only unlocks Training -- we don't want to
 * hand out Easy to someone who's already grinding Insane.
 */
export function applyDefeat(
  difficultyId: string,
  current: Progress,
): Progress {
  let next = unlockTraining(current);
  if (difficultyId === NORMAL_PROFILE.id) {
    next = unlockDifficulty(EASY_PROFILE.id, next);
  }
  return next;
}

/**
 * Apply the progress updates earned by clearing a run on the given
 * difficulty:
 *
 * - Beating Normal reveals Hard.
 * - Beating Hard reveals Insane.
 *
 * Wins on Easy or Insane don't unlock anything new (Easy is the floor; Insane
 * is the ceiling).
 */
export function applyVictory(
  difficultyId: string,
  current: Progress,
): Progress {
  if (difficultyId === NORMAL_PROFILE.id) {
    return unlockDifficulty(HARD_PROFILE.id, current);
  }
  if (difficultyId === HARD_PROFILE.id) {
    return unlockDifficulty(INSANE_PROFILE.id, current);
  }
  return current;
}
