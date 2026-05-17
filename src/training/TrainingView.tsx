import { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/player.css";
import "../styles/training.css";
import { Gameplay, type GameplayResult, type HitKind } from "../game/Gameplay";
import {
  DIFFICULTIES,
  NORMAL_PROFILE,
  type DifficultyProfile,
} from "../game/judgments";
import { loadBeatmap } from "../game/storage";
import { TRAINING_VIDEO } from "./video";
import { playSfx, preloadSfx } from "./sfx";

interface TrainingViewProps {
  /**
   * Called when the player exits training — either via the Quit button
   * or after running out of energy. The hosting view is expected to
   * unmount this component (e.g. swap phase back to "cover").
   */
  onQuit: () => void;
}

/**
 * Loops `TRAINING_VIDEO` with the bundled training beatmap until the
 * player runs out of energy. The mounting view (`PlayerView`) is
 * expected to have already produced a user gesture (the cover-screen
 * Training click), so playback autoplays cleanly here — no internal
 * start gate is needed.
 */
export function TrainingView({ onQuit }: TrainingViewProps) {
  const [runId, setRunId] = useState(0);
  const [difficulty, setDifficulty] =
    useState<DifficultyProfile>(NORMAL_PROFILE);
  const [result, setResult] = useState<GameplayResult | null>(null);

  // Pull notes from storage so /editor authoring flows through.
  // Bumping runId rereads (in case the player edited and came back).
  const beatmap = useMemo(() => loadBeatmap(TRAINING_VIDEO.id), [runId]);

  useEffect(() => {
    preloadSfx();
  }, []);

  const handleJudgment = useCallback((kind: HitKind, _deltaSec: number) => {
    playSfx(kind);
  }, []);

  const handleComplete = useCallback((r: GameplayResult) => {
    if (r.failed) {
      setResult(r);
      return;
    }
    // Video ran out without doom — loop by remounting Gameplay with fresh
    // resolved-note set. State (counts, etc.) inside Gameplay is reset
    // implicitly by the `key={runId}` bump.
    setRunId((id) => id + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setResult(null);
    setRunId((id) => id + 1);
  }, []);

  const handlePickDifficulty = useCallback(
    (profile: DifficultyProfile) => {
      if (profile.id === difficulty.id) return;
      setDifficulty(profile);
      setRunId((id) => id + 1);
    },
    [difficulty.id],
  );

  const done = result !== null;

  return (
    <div className="screen training-screen">
      <Gameplay
        key={runId}
        video={TRAINING_VIDEO}
        beatmap={beatmap}
        initialLife={difficulty.lifeStart}
        initialScore={0}
        difficulty={difficulty}
        onJudgment={handleJudgment}
        onComplete={handleComplete}
      />

      {!done && (
        <div className="training-toolbar">
          <div
            className="training-toolbar__group"
            role="radiogroup"
            aria-label="Difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={d.id === difficulty.id}
                className={
                  "training-pill" +
                  (d.id === difficulty.id ? " training-pill--active" : "")
                }
                onClick={() => handlePickDifficulty(d)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button type="button" className="training-quit" onClick={onQuit}>
            Quit
          </button>
        </div>
      )}

      {done && result && (
        <div className="end">
          <h1 className="end__title">Out of Energy</h1>
          <p className="end__sub">
            Perfect {result.perfect} · Good {result.good} · Miss {result.miss}
          </p>
          <div className="training-end-actions">
            <button className="end__action" onClick={handleRetry}>
              Try again
            </button>
            <button className="training-quit" type="button" onClick={onQuit}>
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
