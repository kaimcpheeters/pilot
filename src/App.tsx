import { Route, Routes } from "react-router-dom";
import { PlayerView } from "./views/PlayerView";
import { EditorView } from "./views/EditorView";
import { AudioCompareView } from "./views/AudioCompareView";
import { StyleGuideView } from "./views/StyleGuideView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlayerView />} />
      <Route path="/editor" element={<EditorView />} />
      <Route path="/audio" element={<AudioCompareView />} />
      <Route path="/style-guide" element={<StyleGuideView />} />
      <Route path="*" element={<PlayerView />} />
    </Routes>
  );
}
