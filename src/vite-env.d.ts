/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL (no trailing slash) where the gameplay MP4s in
   * `public/media/videos/` are hosted. In production this points at the
   * R2-backed `media.pilot.kaimcpheeters.com` bucket. Leave unset locally
   * to serve the files from Vite's `public/` directory.
   */
  readonly VITE_MEDIA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
