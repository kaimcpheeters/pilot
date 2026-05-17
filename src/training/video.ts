import { videos } from "../game/manifest";
import type { VideoEntry } from "../game/types";

/**
 * Standalone "training" video — not part of the act manifest, but shaped
 * like a VideoEntry so anything that wants to consume it as if it were a
 * gameplay video can. Hosted alongside the gameplay MP4s in R2 under
 * `media/videos/training.mp4` so we don't ship ~2 MB of video through
 * Pages on every deploy.
 *
 * `act` / `variant` / `duration` aren't read at runtime (only
 * `src`/`label`/`id` are). They're stubbed with the closest valid
 * literals just to satisfy the type.
 */
export const TRAINING_VIDEO: VideoEntry = {
  id: "training",
  act: 1,
  variant: "main",
  src: videos("training.mp4"),
  duration: 15,
  label: "Training",
};

/** Beatmap key that the bundled `beatmaps/latest.json` ships under. */
export const TRAINING_BEATMAP_ID = TRAINING_VIDEO.id;
