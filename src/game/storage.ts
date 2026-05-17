import type { Beatmap } from "./types";

const KEY_PREFIX = "pilot:beatmap:";

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

export function saveBeatmap(bm: Beatmap): void {
  localStorage.setItem(KEY_PREFIX + bm.videoId, JSON.stringify(bm));
}

export function clearBeatmap(videoId: string): void {
  localStorage.removeItem(KEY_PREFIX + videoId);
}

export function exportBeatmapJson(bm: Beatmap): string {
  return JSON.stringify(bm, null, 2);
}

export function downloadBeatmap(bm: Beatmap): void {
  const blob = new Blob([exportBeatmapJson(bm)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${bm.videoId}.beatmap.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBeatmapJson(file: File): Promise<Beatmap> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Beatmap;
  if (!parsed || typeof parsed.videoId !== "string" || !Array.isArray(parsed.notes)) {
    throw new Error("Invalid beatmap JSON");
  }
  return parsed;
}
