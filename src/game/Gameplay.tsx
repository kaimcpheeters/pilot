import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../styles/hud.css";
import type { Beatmap, Judgment, Note, VideoEntry } from "./types";
import { NoteOverlay } from "./NoteOverlay";
import {
  DEFAULT_APPROACH,
  GOOD_WINDOW,
  HIT_RADIUS_NORM,
  LIFE_MAX,
  MISS_RESULT,
  SCORE_CAP,
  comboMultiplier,
  judgeHit,
} from "./judgments";

export interface GameplayResult {
  score: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  noteCount: number;
  /** Final life remaining at section end (0 if the player got doomed). */
  lifeRemaining: number;
  /** True if life dropped to 0 at any point during this section. */
  failed: boolean;
}

interface GameplayProps {
  video: VideoEntry;
  beatmap: Beatmap;
  /** Carried-over life from the prior section. Section starts at this value. */
  initialLife: number;
  /** Cumulative score so far across the run; HUD displays initial + local. */
  initialScore: number;
  onComplete: (result: GameplayResult) => void;
}

interface JudgmentFlash {
  id: number;
  x: number;
  y: number;
  kind: Judgment;
}

interface ScoreDelta {
  id: number;
  amount: number;
  kind: Judgment;
}

type ComboTier = "base" | "rising" | "hot" | "gold" | "apex";

function comboTier(combo: number): ComboTier {
  if (combo >= 100) return "apex";
  if (combo >= 50) return "gold";
  if (combo >= 25) return "hot";
  if (combo >= 10) return "rising";
  return "base";
}

/** Combo counts that earn a milestone burst above the combo readout. */
function isComboMilestone(c: number): boolean {
  if (c === 10 || c === 25 || c === 50 || c === 100) return true;
  return c > 100 && c % 50 === 0;
}

export function Gameplay({
  video,
  beatmap,
  initialLife,
  initialScore,
  onComplete,
}: GameplayProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const sortedNotes = useMemo(
    () => [...beatmap.notes].sort((a, b) => a.t - b.t),
    [beatmap.notes],
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [life, setLife] = useState(() => Math.max(0, Math.min(LIFE_MAX, initialLife)));
  const [judgmentsById, setJudgmentsById] = useState<Record<string, Judgment | undefined>>({});
  const [flashes, setFlashes] = useState<JudgmentFlash[]>([]);
  const [scoreDeltas, setScoreDeltas] = useState<ScoreDelta[]>([]);
  const [comboBurst, setComboBurst] = useState<{ id: number; value: number } | null>(null);
  const [comboBroken, setComboBroken] = useState<{ id: number } | null>(null);
  const [counts, setCounts] = useState({ perfect: 0, good: 0, miss: 0 });
  const [doomedAt, setDoomedAt] = useState<number | null>(initialLife <= 0 ? 0 : null);

  const resolvedRef = useRef(new Set<string>());
  const doomedRef = useRef(initialLife <= 0);
  const doomedAtRef = useRef<number>(0);
  const completedRef = useRef(false);
  const flashIdRef = useRef(0);
  const deltaIdRef = useRef(0);
  const burstIdRef = useRef(0);
  const breakIdRef = useRef(0);
  const comboRef = useRef(0);

  const doomed = doomedAt !== null;
  const noteCount = sortedNotes.length;

  const visibleNotes = useMemo(() => {
    if (doomedAt === null) return sortedNotes;
    return sortedNotes.filter(
      (n) => n.t - (n.approach ?? DEFAULT_APPROACH) <= doomedAt,
    );
  }, [sortedNotes, doomedAt]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const result: GameplayResult = {
      score,
      maxCombo,
      perfect: counts.perfect,
      good: counts.good,
      miss: counts.miss,
      noteCount,
      lifeRemaining: life,
      failed: doomedRef.current,
    };
    onComplete(result);
  }, [score, maxCombo, counts, noteCount, life, onComplete]);

  const applyResult = useCallback(
    (note: Note, judgment: Judgment, deltaLife: number, baseGained: number, resetCombo: boolean) => {
      resolvedRef.current.add(note.id);

      const prevCombo = comboRef.current;
      const nextCombo = resetCombo ? 0 : prevCombo + 1;
      comboRef.current = nextCombo;

      // Apply the combo-tier bonus multiplier off the combo count *after* this
      // hit lands, so the 10th/25th/50th/100th hit in a streak is the first to
      // earn the new tier's payout. Misses (baseGained === 0) stay at 0.
      const multiplier = baseGained > 0 ? comboMultiplier(nextCombo) : 1;
      const gained = Math.round(baseGained * multiplier);

      setJudgmentsById((m) => ({ ...m, [note.id]: judgment }));
      setScore((s) => s + gained);
      setCounts((c) => ({
        ...c,
        perfect: c.perfect + (judgment === "perfect" ? 1 : 0),
        good: c.good + (judgment === "good" ? 1 : 0),
        miss: c.miss + (judgment === "miss" ? 1 : 0),
      }));
      setLife((l) => {
        if (doomedRef.current) return 0;
        const next = Math.max(0, Math.min(LIFE_MAX, l + deltaLife));
        if (next <= 0) {
          doomedRef.current = true;
          doomedAtRef.current = videoRef.current?.currentTime ?? 0;
        }
        return next;
      });
      setCombo(nextCombo);
      setMaxCombo((mc) => Math.max(mc, nextCombo));

      if (gained > 0) {
        const did = ++deltaIdRef.current;
        setScoreDeltas((arr) => [...arr, { id: did, amount: gained, kind: judgment }]);
        window.setTimeout(() => {
          setScoreDeltas((arr) => arr.filter((d) => d.id !== did));
        }, 900);
      }

      // Snap-flash a "BREAK" tag only if the player had a meaningful run going.
      if (resetCombo && prevCombo >= 5) {
        const bid = ++breakIdRef.current;
        setComboBroken({ id: bid });
        window.setTimeout(() => {
          setComboBroken((b) => (b && b.id === bid ? null : b));
        }, 700);
      }

      if (!resetCombo && isComboMilestone(nextCombo)) {
        const mid = ++burstIdRef.current;
        setComboBurst({ id: mid, value: nextCombo });
        window.setTimeout(() => {
          setComboBurst((m) => (m && m.id === mid ? null : m));
        }, 1100);
      }

      const fid = ++flashIdRef.current;
      setFlashes((arr) => [...arr, { id: fid, x: note.x, y: note.y, kind: judgment }]);
      window.setTimeout(() => {
        setFlashes((arr) => arr.filter((f) => f.id !== fid));
      }, 600);
    },
    [],
  );

  // Mirror the doomed ref into render-visible state once life crosses 0, so
  // visibleNotes / HUD pick up the change.
  useEffect(() => {
    if (doomedRef.current && doomedAt === null) {
      setDoomedAt(doomedAtRef.current);
    }
  }, [life, doomedAt]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    let lastSeen = -1;
    const tick = () => {
      const t = v.currentTime;
      if (t !== lastSeen) {
        lastSeen = t;
        setCurrentTime(t);
        for (const n of visibleNotes) {
          if (resolvedRef.current.has(n.id)) continue;
          if (t > n.t + GOOD_WINDOW) {
            applyResult(
              n,
              MISS_RESULT.judgment,
              MISS_RESULT.lifeDelta,
              MISS_RESULT.score,
              MISS_RESULT.comboReset,
            );
          } else {
            break;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visibleNotes, applyResult]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onEnded = () => finish();
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [finish]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Browser may block autoplay - user gesture from cover screen should have unlocked it
      });
    }
  }, [video.src]);

  const handlePointerDown = useCallback(
    (ev: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const y = (ev.clientY - rect.top) / rect.height;
      const t = videoRef.current?.currentTime ?? 0;
      let best: { note: Note; dist: number; delta: number } | null = null;
      for (const n of visibleNotes) {
        if (resolvedRef.current.has(n.id)) continue;
        const ap = n.approach ?? DEFAULT_APPROACH;
        if (t < n.t - ap) continue;
        if (t > n.t + GOOD_WINDOW) continue;
        const dx = n.x - x;
        const dy = n.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist > HIT_RADIUS_NORM * 1.5) continue;
        if (!best || dist < best.dist) {
          best = { note: n, dist, delta: t - n.t };
        }
      }
      if (!best) return;
      const verdict = judgeHit(best.delta);
      if (verdict) {
        applyResult(
          best.note,
          verdict.judgment,
          verdict.lifeDelta,
          verdict.score,
          verdict.comboReset,
        );
      }
    },
    [visibleNotes, applyResult],
  );

  const lifePct = (life / LIFE_MAX) * 100;
  const cumulativeScore = Math.min(SCORE_CAP, initialScore + score);
  const tier = comboTier(combo);
  const multiplier = comboMultiplier(combo);

  return (
    <div className="gameplay" ref={containerRef} onPointerDown={handlePointerDown}>
      <video
        ref={videoRef}
        className="gameplay__video"
        src={video.src}
        playsInline
        preload="auto"
      />
      <NoteOverlay
        notes={visibleNotes}
        currentTime={currentTime}
        judgments={judgmentsById}
      />
      <div className="hud">
        {!doomed && (
          <div className="hud__top">
            <div
              className={`hud__energy${lifePct <= 25 ? " hud__energy--low" : ""}`}
              role="progressbar"
              aria-label="Energy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(lifePct)}
            >
              <span className="hud__energy-label">ENERGY</span>
              <div className="hud__energy-track">
                <div className="hud__energy-fill" style={{ width: `${lifePct}%` }}>
                  <div className="hud__energy-shimmer" />
                  <div className="hud__energy-edge" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="hud__corner hud__corner--tr">
          <div className="hud__score">
            <span className="hud__score-label">Score</span>
            <span key={cumulativeScore} className="hud__score-num">
              {cumulativeScore.toLocaleString()}
            </span>
            <div className="hud__score-deltas" aria-hidden="true">
              {scoreDeltas.map((d) => (
                <div
                  key={d.id}
                  className={`hud__score-delta hud__score-delta--${d.kind}`}
                >
                  +{d.amount}
                </div>
              ))}
            </div>
          </div>
          <div className={`hud__combo hud__combo--${tier}`} aria-live="polite">
            {combo > 1 ? (
              <>
                <span key={combo} className="hud__combo-num">
                  {combo}
                </span>
                <span className="hud__combo-label">
                  combo{multiplier > 1 ? ` ×${multiplier}` : ""}
                </span>
              </>
            ) : comboBroken ? (
              <span key={comboBroken.id} className="hud__combo-break">
                break
              </span>
            ) : (
              <span className="hud__combo-placeholder" aria-hidden="true">
                0
              </span>
            )}
            {comboBurst && (
              <div key={comboBurst.id} className="hud__combo-burst">
                <span className="hud__combo-burst-cross">×</span>
                <span className="hud__combo-burst-value">{comboBurst.value}</span>
                <span className="hud__combo-burst-label">streak</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flashes">
        {flashes.map((f) => (
          <div
            key={f.id}
            className={`flash flash--${f.kind}`}
            style={{ left: `${f.x * 100}%`, top: `${f.y * 100}%` }}
          >
            {f.kind === "perfect" ? "PERFECT" : f.kind === "good" ? "GOOD" : "MISS"}
          </div>
        ))}
      </div>
    </div>
  );
}
