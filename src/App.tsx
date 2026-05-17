import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { PlayerView } from "./views/PlayerView";
import { StyleGuideView } from "./views/StyleGuideView";

/**
 * /editor and /audio are authoring tools used while iterating on
 * beatmaps and audio stems locally — they're not part of the shipped
 * experience.
 *
 * `import.meta.env.DEV` is replaced at build time with a static `false`
 * in production, so Rollup tree-shakes both the `lazy()` calls and the
 * dynamic imports below. EditorView, AudioCompareView, and their
 * transitive deps never make it into the prod bundle, and the routes
 * fall through to the `*` catchall (PlayerView).
 */
const EditorView = import.meta.env.DEV
  ? lazy(() =>
      import("./views/EditorView").then((m) => ({ default: m.EditorView })),
    )
  : null;
const AudioCompareView = import.meta.env.DEV
  ? lazy(() =>
      import("./views/AudioCompareView").then((m) => ({
        default: m.AudioCompareView,
      })),
    )
  : null;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerView />} />
      <Route path="/style-guide" element={<StyleGuideView />} />
      {EditorView && (
        <Route
          path="/editor"
          element={
            <Suspense fallback={null}>
              <EditorView />
            </Suspense>
          }
        />
      )}
      {AudioCompareView && (
        <Route
          path="/audio"
          element={
            <Suspense fallback={null}>
              <AudioCompareView />
            </Suspense>
          }
        />
      )}
      <Route path="*" element={<PlayerView />} />
    </Routes>
  );
}
