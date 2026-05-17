import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/player.css";
import type { ActId, Variant, VideoEntry } from "../game/types";
import { COVER_ART, VIDEO_MANIFEST, getVideo } from "../game/manifest";
import { loadBeatmap } from "../game/storage";
import { Gameplay, type GameplayResult } from "../game/Gameplay";
import { ACT_THRESHOLDS, LIFE_START, maxScore } from "../game/judgments";
import { OrientationGate } from "../game/OrientationGate";
import { useOrientationGate } from "../game/useOrientationGate";

type Phase =
  | { kind: "cover" }
  | { kind: "play"; act: ActId; variant: Variant }
  | { kind: "cutscene"; act: ActId; variant: Variant }
  | { kind: "gameOver"; act: ActId }
  | { kind: "results"; finalVariant: Variant; totals: GameState };

interface GameState {
  life: number;
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  noteCount: number;
}

const initialGameState: GameState = {
  life: LIFE_START,
  score: 0,
  maxCombo: 0,
  perfect: 0,
  good: 0,
  miss: 0,
  noteCount: 0,
};

function mergeSectionResult(prev: GameState, r: GameplayResult): GameState {
  return {
    life: r.lifeRemaining,
    score: prev.score + r.score,
    maxCombo: Math.max(prev.maxCombo, r.maxCombo),
    perfect: prev.perfect + r.perfect,
    good: prev.good + r.good,
    miss: prev.miss + r.miss,
    noteCount: prev.noteCount + r.noteCount,
  };
}

function pickBranch(act: ActId, result: GameplayResult): Variant {
  const max = maxScore(result.noteCount);
  const fraction = max === 0 ? 1 : result.score / max;
  if (act === 3) {
    return fraction >= ACT_THRESHOLDS.highFraction ? "perfectEnding" : "passEnding";
  }
  return fraction >= ACT_THRESHOLDS.highFraction ? "success" : "pass";
}

export function PlayerView() {
  const { blocked } = useOrientationGate();
  const [phase, setPhase] = useState<Phase>({ kind: "cover" });
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const reset = useCallback(() => {
    setGameState(initialGameState);
    setPhase({ kind: "cover" });
  }, []);

  const handleStart = useCallback(() => {
    if (blocked) return;
    setGameState(initialGameState);
    setPhase({ kind: "play", act: 1, variant: "main" });
  }, [blocked]);

  const handleComplete = useCallback(
    (act: ActId, variant: Variant, result: GameplayResult) => {
      const nextState = mergeSectionResult(gameState, result);
      setGameState(nextState);

      if (result.failed) {
        const failureVariant: Variant = act === 3 ? "failureEnding" : "earlyFailure";
        setPhase({ kind: "cutscene", act, variant: failureVariant });
        return;
      }

      if (variant === "main") {
        setPhase({ kind: "play", act, variant: pickBranch(act, result) });
        return;
      }

      if (act === 3) {
        setPhase({ kind: "results", finalVariant: variant, totals: nextState });
        return;
      }

      const nextAct = (act + 1) as ActId;
      setPhase({ kind: "play", act: nextAct, variant: "main" });
    },
    [gameState],
  );

  const handleCutsceneEnded = useCallback(
    (act: ActId, variant: Variant) => {
      if (variant === "earlyFailure") {
        setPhase({ kind: "gameOver", act });
        return;
      }
      if (variant === "failureEnding") {
        setPhase({ kind: "results", finalVariant: "failureEnding", totals: gameState });
        return;
      }
    },
    [gameState],
  );

  return (
    <div className="screen">
      <VideoPreloader />

      {phase.kind === "cover" && (
        <CoverScreen blocked={blocked} onStart={handleStart} />
      )}

      {phase.kind === "play" && (
        <PlayPhase
          act={phase.act}
          variant={phase.variant}
          initialLife={gameState.life}
          initialScore={gameState.score}
          onComplete={(r) => handleComplete(phase.act, phase.variant, r)}
        />
      )}

      {phase.kind === "cutscene" && (
        <CutscenePhase
          act={phase.act}
          variant={phase.variant}
          onEnded={() => handleCutsceneEnded(phase.act, phase.variant)}
        />
      )}

      {phase.kind === "gameOver" && (
        <EndScreen
          title="Game Over"
          subtitle={`You fell in Act ${phase.act}.`}
          actionLabel="Retry"
          onAction={reset}
        />
      )}

      {phase.kind === "results" && (
        <ResultsScreen
          variant={phase.finalVariant}
          totals={phase.totals}
          onReplay={reset}
        />
      )}
    </div>
  );
}

interface CoverScreenProps {
  blocked: boolean;
  onStart: () => void;
}

function CoverScreen({ blocked, onStart }: CoverScreenProps) {
  return (
    <div className="cover" onClick={blocked ? undefined : onStart}>
      <img className="cover__art" src={COVER_ART} alt="Pilot cover art" />
      {!blocked && (
        <div className="cover__prompt">
          <button className="cover__start" type="button" onClick={onStart}>
            Click to start
          </button>
        </div>
      )}
      {blocked && <OrientationGate />}
    </div>
  );
}

interface PlayPhaseProps {
  act: ActId;
  variant: Variant;
  initialLife: number;
  initialScore: number;
  onComplete: (r: GameplayResult) => void;
}

function PlayPhase({ act, variant, initialLife, initialScore, onComplete }: PlayPhaseProps) {
  const video = useMemo(() => getVideo(act, variant), [act, variant]);
  const beatmap = useMemo(() => loadBeatmap(video.id), [video.id]);
  return (
    <Gameplay
      key={video.id}
      video={video}
      beatmap={beatmap}
      initialLife={initialLife}
      initialScore={initialScore}
      onComplete={onComplete}
    />
  );
}

function VideoPreloader() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: 0,
        height: 0,
        overflow: "hidden",
        pointerEvents: "none",
        opacity: 0,
      }}
    >
      {VIDEO_MANIFEST.map((v) => (
        <video key={v.id} src={v.src} preload="auto" muted playsInline />
      ))}
    </div>
  );
}

interface CutscenePhaseProps {
  act: ActId;
  variant: Variant;
  onEnded: () => void;
}

function CutscenePhase({ act, variant, onEnded }: CutscenePhaseProps) {
  const video: VideoEntry = useMemo(() => getVideo(act, variant), [act, variant]);
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, [video.src]);

  return (
    <div className="branch">
      <video
        ref={ref}
        className="branch__video"
        src={video.src}
        playsInline
        preload="auto"
        onEnded={onEnded}
      />
    </div>
  );
}

interface EndScreenProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

function EndScreen({ title, subtitle, actionLabel, onAction }: EndScreenProps) {
  return (
    <div className="end">
      <h1 className="end__title">{title}</h1>
      <p className="end__sub">{subtitle}</p>
      <button className="end__action" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

interface ResultsScreenProps {
  variant: Variant;
  totals: GameState;
  onReplay: () => void;
}

function ResultsScreen({ variant, totals, onReplay }: ResultsScreenProps) {
  const title =
    variant === "perfectEnding"
      ? "Perfect Victory"
      : variant === "passEnding"
        ? "Victory"
        : "Defeat";
  return (
    <div className="end end--results">
      <h1 className="end__title">{title}</h1>
      <div className="end__stats">
        <div>
          <span>Score</span>
          <strong>{totals.score.toLocaleString()}</strong>
        </div>
        <div>
          <span>Max Combo</span>
          <strong>{totals.maxCombo}</strong>
        </div>
        <div>
          <span>Perfect</span>
          <strong>{totals.perfect}</strong>
        </div>
        <div>
          <span>Good</span>
          <strong>{totals.good}</strong>
        </div>
        <div>
          <span>Miss</span>
          <strong>{totals.miss}</strong>
        </div>
      </div>
      <button className="end__action" onClick={onReplay}>
        Play again
      </button>
    </div>
  );
}
