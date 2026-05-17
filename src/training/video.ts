import type { VideoEntry } from "../game/types";

/**
 * Standalone "training" video — not part of the act manifest, but shaped
 * like a VideoEntry so anything that wants to consume it as if it were a
 * gameplay video can. Lives at `/training.mp4` in `public/` and ships
 * through Pages rather than R2.
 *
 * `act` / `variant` / `duration` aren't read at runtime (only
 * `src`/`label`/`id` are). They're stubbed with the closest valid
 * literals just to satisfy the type.
 */
export const TRAINING_VIDEO: VideoEntry = {
  id: "training",
  act: 1,
  variant: "main",
  src: "/training.mp4",
  duration: 15,
  label: "Training",
};

/** Beatmap key that the bundled `beatmaps/latest.json` ships under. */
export const TRAINING_BEATMAP_ID = TRAINING_VIDEO.id;
