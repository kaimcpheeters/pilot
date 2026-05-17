export interface LeaderboardEntry {
  name: string;
  score: number;
  achievedAt: string;
}

/** Result of a successful submission. `accepted` is the freshly-inserted row. */
export interface SubmitResult {
  entries: LeaderboardEntry[];
  accepted: LeaderboardEntry;
}

const KEY = "pilot:leaderboard";
export const LEADERBOARD_MAX_ENTRIES = 100;
export const INITIALS_LENGTH = 6;

/** Pages Function path. Same-origin in prod; unused in dev. */
const REMOTE_URL = "/api/leaderboard";

/** Hard ceiling on fetch round-trip before we give up on the user. */
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Prod builds (Cloudflare Pages) hit the KV-backed Pages Function at
 * `/api/leaderboard`. `npm run dev` (vite dev server) has no Functions
 * runtime, so we fall back to localStorage so the editor / gameplay loop
 * still works offline.
 *
 * In prod we do *not* fall back to localStorage on network errors — a
 * silent local write would lie to the player about their score being on
 * the global board. Failures surface to the UI instead.
 */
const useRemote = import.meta.env.PROD;

/**
 * Thrown when a remote leaderboard call fails. `kind` distinguishes
 * recoverable conditions (the UI can show a tailored message and offer
 * a retry).
 */
export class LeaderboardError extends Error {
  constructor(
    public readonly kind:
      | "network"
      | "timeout"
      | "rate_limited"
      | "invalid"
      | "server",
    message: string,
  ) {
    super(message);
    this.name = "LeaderboardError";
  }
}

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

function sortAndCap(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.achievedAt.localeCompare(b.achievedAt))
    .slice(0, LEADERBOARD_MAX_ENTRIES);
}

// ---------- Local (dev) storage ----------

function loadLocal(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortAndCap(parsed.filter(isEntry));
  } catch {
    return [];
  }
}

function saveLocal(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sortAndCap(entries)));
  } catch {
    // localStorage may be full or disabled; drop silently.
  }
}

// ---------- Remote (prod) API ----------

interface RemoteListResponse {
  entries?: unknown;
}

interface RemoteSubmitResponse {
  entries?: unknown;
  accepted?: unknown;
}

function parseEntries(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return sortAndCap(raw.filter(isEntry));
}

async function callJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: "application/json", ...(init.headers ?? {}) },
    });
  } catch (err) {
    const kind = err instanceof DOMException && err.name === "TimeoutError"
      ? "timeout"
      : "network";
    throw new LeaderboardError(
      kind,
      err instanceof Error ? err.message : "Network error",
    );
  }
  if (res.status === 429) {
    throw new LeaderboardError("rate_limited", "Too many submissions — try again in a minute.");
  }
  if (res.status >= 400 && res.status < 500) {
    throw new LeaderboardError("invalid", `Rejected (${res.status})`);
  }
  if (!res.ok) {
    throw new LeaderboardError("server", `Server error (${res.status})`);
  }
  try {
    return await res.json();
  } catch {
    throw new LeaderboardError("server", "Malformed server response");
  }
}

async function fetchRemote(): Promise<LeaderboardEntry[]> {
  const payload = (await callJson(REMOTE_URL)) as RemoteListResponse;
  return parseEntries(payload.entries);
}

async function submitRemote(name: string, score: number): Promise<SubmitResult> {
  const payload = (await callJson(REMOTE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, score }),
  })) as RemoteSubmitResponse;
  const entries = parseEntries(payload.entries);
  if (!isEntry(payload.accepted)) {
    throw new LeaderboardError("server", "Server omitted accepted entry");
  }
  return { entries, accepted: payload.accepted };
}

// ---------- Public async API used by the UI ----------

/**
 * Loads the current top scores. In prod this hits the Pages Function and
 * throws {@link LeaderboardError} on failure — the UI is responsible for
 * presenting it. In dev it reads from localStorage and never throws.
 */
export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!useRemote) return loadLocal();
  return await fetchRemote();
}

/**
 * Submits a new score. In prod this round-trips to KV and returns the
 * canonical post-insert board plus the server-stamped `accepted` entry.
 * Failures throw {@link LeaderboardError}; do not silently fall back to
 * local storage in prod — a local-only "submitted" UI would lie to the
 * player.
 *
 * In dev this writes localStorage and synthesises an `accepted` entry so
 * the UI flow is identical.
 */
export async function submitLeaderboardEntry(
  name: string,
  score: number,
): Promise<SubmitResult> {
  const normalized = normalizeInitials(name);
  if (useRemote) {
    return await submitRemote(normalized, score);
  }
  const accepted: LeaderboardEntry = {
    name: normalized,
    score,
    achievedAt: new Date().toISOString(),
  };
  const entries = sortAndCap([...loadLocal(), accepted]);
  saveLocal(entries);
  return { entries, accepted };
}

// ---------- Pure helpers (UI uses these against the loaded board) ----------

/**
 * Returns the 1-based rank a score would occupy on the board (ties resolve in
 * the candidate's favour, i.e. the new score slots *above* existing entries
 * of equal score). Returns null if the score wouldn't make the top
 * {@link LEADERBOARD_MAX_ENTRIES}.
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

/**
 * Normalises a typed string to arcade initials: uppercase A-Z and 0-9 only,
 * trimmed to {@link INITIALS_LENGTH} characters. Whitespace-only / empty
 * input falls back to "AAA"; otherwise the typed length is preserved (no
 * right-padding).
 */
export function normalizeInitials(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, INITIALS_LENGTH);
  if (cleaned.length === 0) return "AAA";
  return cleaned;
}
