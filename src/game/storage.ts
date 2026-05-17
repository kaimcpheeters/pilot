import type { Beatmap } from "./types";

const KEY_PREFIX = "pilot:beatmap:";

export interface BeatmapBundle {
  exportedAt: string;
  beatmaps: Beatmap[];
}

export function loadBeatmap(videoId: string): Beatmap {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + videoId);
    if (!raw) return { videoId, notes: [] };
    const parsed = JSON.parse(raw) as Beatmap;
    if (!parsed || parsed.videoId !== videoId || !Array.isArray(parsed.notes)) {
      return { videoId, notes: [] };
    }
    return parsed;
  } catch {
    return { videoId, notes: [] };
  }
}

/**
 * Loads every beatmap currently persisted in localStorage, regardless of
 * whether its videoId still appears in the manifest. Malformed entries are
 * skipped. Results are sorted by videoId for stable export ordering.
 */
export function loadAllBeatmaps(): Beatmap[] {
  const out: Beatmap[] = [];
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
        out.push(parsed);
      }
    } catch {
      // ignore malformed entries
    }
  }
  out.sort((a, b) => a.videoId.localeCompare(b.videoId));
  return out;
}

export function saveBeatmap(bm: Beatmap): void {
  localStorage.setItem(KEY_PREFIX + bm.videoId, JSON.stringify(bm));
}

export function clearBeatmap(videoId: string): void {
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
