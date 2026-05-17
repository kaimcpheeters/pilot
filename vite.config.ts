import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Strip the heavy media directories (gameplay videos, no-music videos,
 * audio stems) out of the build output. They're served from R2 in
 * production (see `src/game/manifest.ts` + `VITE_MEDIA_BASE_URL`), so
 * shipping them through Cloudflare Pages would just bloat the deploy.
 */
function stripHeavyMedia(): Plugin {
  const HEAVY = [
    "media/videos",
    "media/videos-clean",
    "media/stems",
  ];
  return {
    name: "pilot:strip-heavy-media",
    apply: "build",
    async closeBundle() {
      const outDir = resolve(__dirname, "dist");
      for (const sub of HEAVY) {
        await rm(resolve(outDir, sub), { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), stripHeavyMedia()],
  server: {
    host: true,
  },
});
