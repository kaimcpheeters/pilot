import type { Beatmap } from "./types";
import bundledBeatmaps from "../../beatmaps/latest.json";

const KEY_PREFIX = "pilot:beatmap:";

/**
 * `localStorage` is only used by the `/editor` authoring flow, which is
 * dev-only (see `src/App.tsx`). In production this is replaced with
 * a static `false`, and Rollup tree-shakes every `localStorage` access
 * below out of the bundle — prod loads beatmaps exclusively from the
 * bundled `beatmaps/latest.json` defaults.
 */
const DEV = import.meta.env.DEV;

export interface BeatmapBundle {
  exportedAt: string;
  beatmaps: Beatmap[];
}

/**
 * Beatmaps shipped with the production build. These are baked into the JS
 * bundle from `beatmaps/latest.json` (promoted from a `/editor` export via
 * `npm run beatmaps:promote`). In production they are the *only* source
 * of notes — every player on pilot.kaimcpheeters.com gets the authored
 * notes out of the box. In dev, localStorage edits from `/editor` take
 * precedence so an in-progress edit isn't silently clobbered.
 */
const BUNDLED_BEATMAPS: ReadonlyMap<string, Beatmap> = new Map(
  (bundledBeatmaps as BeatmapBundle).beatmaps
    .filter(
      (b): b is Beatmap =>
        !!b && typeof b.videoId === "string" && Array.isArray(b.notes),
    )
    .map((b) => [b.videoId, b]),
);

function bundledOrEmpty(videoId: string): Beatmap {
  const bundled = BUNDLED_BEATMAPS.get(videoId);
  if (!bundled) return { videoId, notes: [] };
  return { videoId: bundled.videoId, notes: [...bundled.notes] };
}

function readBeatmapFromStorage(videoId: string): Beatmap | null {
  if (!DEV) return null;
  try {
    const raw = localStorage.getItem(KEY_PREFIX + videoId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Beatmap;
    if (!parsed || parsed.videoId !== videoId || !Array.isArray(parsed.notes)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadBeatmap(videoId: string): Beatmap {
  const stored = readBeatmapFromStorage(videoId);
  if (stored) return stored;
  return bundledOrEmpty(videoId);
}

/**
 * Loads every beatmap available. In dev, this is the bundled defaults
 * merged with any localStorage edits (localStorage wins per videoId). In
 * production, this returns the bundled defaults only — localStorage is
 * not consulted. Results are sorted by videoId for stable export
 * ordering.
 */
export function loadAllBeatmaps(): Beatmap[] {
  const merged = new Map<string, Beatmap>();
  for (const [id, bm] of BUNDLED_BEATMAPS) {
    merged.set(id, { videoId: bm.videoId, notes: [...bm.notes] });
  }
  if (DEV) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Beatmap;
        if (
          parsed &&
          typeof parsed.videoId === "string" &&
          Array.isArray(parsed.notes)
        ) {
          merged.set(parsed.videoId, parsed);
        }
      } catch {
        // ignore malformed entries
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) =>
    a.videoId.localeCompare(b.videoId),
  );
}

export function saveBeatmap(bm: Beatmap): void {
  if (!DEV) return;
  localStorage.setItem(KEY_PREFIX + bm.videoId, JSON.stringify(bm));
}

export function clearBeatmap(videoId: string): void {
  if (!DEV) return;
  localStorage.removeItem(KEY_PREFIX + videoId);
}

export function exportBeatmapJson(bm: Beatmap): string {
  return JSON.stringify(bm, null, 2);
}

export function exportAllBeatmapsJson(): string {
  const bundle: BeatmapBundle = {
    exportedAt: new Date().toISOString(),
    beatmaps: loadAllBeatmaps(),
  };
  return JSON.stringify(bundle, null, 2);
}

function triggerDownload(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadBeatmap(bm: Beatmap): void {
  triggerDownload(`${bm.videoId}.beatmap.json`, exportBeatmapJson(bm));
}

export function downloadAllBeatmaps(): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  triggerDownload(`pilot-beatmaps-${stamp}.json`, exportAllBeatmapsJson());
}

export async function importBeatmapJson(file: File): Promise<Beatmap> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Beatmap;
  if (!parsed || typeof parsed.videoId !== "string" || !Array.isArray(parsed.notes)) {
    throw new Error("Invalid beatmap JSON");
  }
  return parsed;
}
