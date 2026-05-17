/**
 * One-shot judgment sounds for /training. Cached HTMLAudioElements (one
 * per kind) get rewound + replayed on each call — fine for these short
 * cues where overlapping plays of the same kind are rare and tolerable.
 * Falls back silently if playback is rejected (e.g. autoplay policy on
 * cold load).
 */

export type SfxKind = "perfect" | "good" | "miss";

const SFX_SRC: Record<SfxKind, string> = {
  perfect: "/media/audio/Perfect.mp3",
  good: "/media/audio/Good.mp3",
  miss: "/media/audio/Miss.mp3",
};

const cache = new Map<SfxKind, HTMLAudioElement>();

function ensure(kind: SfxKind): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let a = cache.get(kind);
  if (!a) {
    a = new Audio(SFX_SRC[kind]);
    a.preload = "auto";
    a.volume = 0.75;
    cache.set(kind, a);
  }
  return a;
}

export function preloadSfx(): void {
  (Object.keys(SFX_SRC) as SfxKind[]).forEach((k) => ensure(k));
}

export function playSfx(kind: SfxKind): void {
  const a = ensure(kind);
  if (!a) return;
  try {
    a.currentTime = 0;
  } catch {
    // Some browsers throw on currentTime set while loading; safe to ignore.
  }
  const p = a.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}
