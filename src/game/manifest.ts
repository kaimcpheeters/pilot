import type { ActId, Variant, VideoEntry } from "./types";

const videos = (path: string) => `/media/videos/${encodeURIComponent(path)}`;
const cleanVideos = (base: string) =>
  `/media/videos-clean/${encodeURIComponent(`${base} - no music`)}.mp4`;

export const COVER_ART = "/media/images/coverart.png";

export const VIDEO_MANIFEST: VideoEntry[] = [
  {
    id: "act1-main",
    act: 1,
    variant: "main",
    src: videos("1 - Knight vs Green Electric Dragon.mp4"),
    cleanSrc: cleanVideos("1 - Knight vs Green Electric Dragon"),
    duration: 15,
    label: "Act 1 - Green Electric Dragon",
  },
  {
    id: "act1-pass",
    act: 1,
    variant: "pass",
    src: videos("1 - Knight vs Green Electric Dragon - Pass.mp4"),
    cleanSrc: cleanVideos("1 - Knight vs Green Electric Dragon - Pass"),
    duration: 15,
    label: "Act 1 - Pass",
  },
  {
    id: "act1-success",
    act: 1,
    variant: "success",
    src: videos("1 - Knight vs Green Electric Dragon - Success.mp4"),
    cleanSrc: cleanVideos("1 - Knight vs Green Electric Dragon - Success"),
    duration: 15,
    label: "Act 1 - Success",
  },
  {
    id: "act1-earlyFailure",
    act: 1,
    variant: "earlyFailure",
    src: videos("1 - Knight vs Green Electric Dragon - Early Failure Ending.mp4"),
    cleanSrc: cleanVideos("1 - Knight vs Green Electric Dragon - Early Failure Ending"),
    duration: 8,
    label: "Act 1 - Early Failure",
  },

  {
    id: "act2-main",
    act: 2,
    variant: "main",
    src: videos("2 - Knight vs White Ice Dragon.mp4"),
    cleanSrc: cleanVideos("2 - Knight vs White Ice Dragon"),
    duration: 15,
    label: "Act 2 - White Ice Dragon",
  },
  {
    id: "act2-pass",
    act: 2,
    variant: "pass",
    src: videos("2 - Knight vs White Ice Dragon - Pass.mp4"),
    cleanSrc: cleanVideos("2 - Knight vs White Ice Dragon - Pass"),
    duration: 15,
    label: "Act 2 - Pass",
  },
  {
    id: "act2-success",
    act: 2,
    variant: "success",
    src: videos("2 - Knight vs White Ice Dragon - Success.mp4"),
    cleanSrc: cleanVideos("2 - Knight vs White Ice Dragon - Success"),
    duration: 15,
    label: "Act 2 - Success",
  },
  {
    id: "act2-earlyFailure",
    act: 2,
    variant: "earlyFailure",
    src: videos("2 - Knight vs White Ice Dragon - Early Failure Ending.mp4"),
    cleanSrc: cleanVideos("2 - Knight vs White Ice Dragon - Early Failure Ending"),
    duration: 8,
    label: "Act 2 - Early Failure",
  },

  {
    id: "act3-main",
    act: 3,
    variant: "main",
    src: videos("3 - Knight vs Red Fire Dragon.mp4"),
    cleanSrc: cleanVideos("3 - Knight vs Red Fire Dragon"),
    duration: 15,
    label: "Act 3 - Red Fire Dragon",
  },
  {
    id: "act3-passEnding",
    act: 3,
    variant: "passEnding",
    src: videos("3 - Knight vs Red Fire Dragon - Pass Ending.mp4"),
    cleanSrc: cleanVideos("3 - Knight vs Red Fire Dragon - Pass Ending"),
    duration: 8,
    label: "Act 3 - Pass Ending",
  },
  {
    id: "act3-perfectEnding",
    act: 3,
    variant: "perfectEnding",
    src: videos("3 - Knight vs Red Fire Dragon - Perfect Ending.mp4"),
    cleanSrc: cleanVideos("3 - Knight vs Red Fire Dragon - Perfect Ending"),
    duration: 8,
    label: "Act 3 - Perfect Ending",
  },
  {
    id: "act3-failureEnding",
    act: 3,
    variant: "failureEnding",
    src: videos("3 - Knight vs Red Fire Dragon - Failure Ending.mp4"),
    cleanSrc: cleanVideos("3 - Knight vs Red Fire Dragon - Failure Ending"),
    duration: 8,
    label: "Act 3 - Failure Ending",
  },
];

export function getVideo(act: ActId, variant: Variant): VideoEntry {
  const match = VIDEO_MANIFEST.find(
    (v) => v.act === act && v.variant === variant,
  );
  if (!match) {
    throw new Error(`No video for act=${act} variant=${variant}`);
  }
  return match;
}

export function getVideoById(id: string): VideoEntry | undefined {
  return VIDEO_MANIFEST.find((v) => v.id === id);
}

export const MAIN_VIDEOS: VideoEntry[] = VIDEO_MANIFEST.filter(
  (v) => v.variant === "main",
);

/**
 * Variants that get their own authored beatmap in the editor. Excludes the
 * various "failure" videos, which are passive cutscenes that play when the
 * player loses and never have notes overlaid.
 */
const EDITABLE_VARIANTS: ReadonlySet<Variant> = new Set<Variant>([
  "main",
  "pass",
  "success",
  "passEnding",
  "perfectEnding",
]);

export const EDITABLE_VIDEOS: VideoEntry[] = VIDEO_MANIFEST.filter((v) =>
  EDITABLE_VARIANTS.has(v.variant),
);
