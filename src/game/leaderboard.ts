export interface LeaderboardEntry {
  name: string;
  score: number;
  achievedAt: string;
}

const KEY = "pilot:leaderboard";
export const LEADERBOARD_MAX_ENTRIES = 100;
export const INITIALS_LENGTH = 6;

function isEntry(v: unknown): v is LeaderboardEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Partial<LeaderboardEntry>;
  return (
    typeof e.name === "string" &&
    typeof e.score === "number" &&
    Number.isFinite(e.score) &&
    typeof e.achievedAt === "string"
  );
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isEntry)
      .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt))
      .slice(0, LEADERBOARD_MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(entries.slice(0, LEADERBOARD_MAX_ENTRIES)),
    );
  } catch {
    // localStorage may be full or disabled; drop silently.
  }
}

/**
 * Returns the 1-based rank a score would occupy on the board (ties resolve in
 * the candidate's favour, i.e. the new score slots *above* existing entries
 * of equal score). Returns null if the score wouldn't make the top
 * LEADERBOARD_MAX_ENTRIES.
 */
export function qualifyingRank(
  entries: LeaderboardEntry[],
  score: number,
): number | null {
  let above = 0;
  for (const e of entries) {
    if (e.score > score) above += 1;
  }
  const rank = above + 1;
  return rank <= LEADERBOARD_MAX_ENTRIES ? rank : null;
}

export function insertEntry(
  entries: LeaderboardEntry[],
  entry: LeaderboardEntry,
): LeaderboardEntry[] {
  const merged = [...entries, entry].sort(
    (a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt),
  );
  return merged.slice(0, LEADERBOARD_MAX_ENTRIES);
}

/**
 * Normalises a typed string to arcade initials: uppercase A-Z and 0-9 only,
 * trimmed to INITIALS_LENGTH characters. Whitespace-only / empty input falls
 * back to "AAA"; otherwise the typed length is preserved (no right-padding).
 */
export function normalizeInitials(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, INITIALS_LENGTH);
  if (cleaned.length === 0) return "AAA";
  return cleaned;
}
