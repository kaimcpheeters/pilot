import type { Judgment } from "./types";

/**
 * Hard cap on the displayed and persisted score. Anything earned past this
 * point is clamped, arcade-style. Keep wide enough that the cumulative score
 * counter looks consistent (5 digits with a comma).
 */
export const SCORE_CAP = 99_999;

/** Maximum life. Shared across difficulties (the energy bar caps here). */
export const LIFE_MAX = 100;

/** Default approach time (seconds) when a note doesn't specify its own. */
export const DEFAULT_APPROACH = 1.0;

export interface JudgmentResult {
  judgment: Judgment;
  score: number;
  lifeDelta: number;
  comboReset: boolean;
}

/**
 * Per-playthrough difficulty knobs. The beatmap (note positions and times)
 * is identical across profiles -- only the handling changes, à la osu!'s
 * HP/CS/AR/OD model. Adding Easy/Hard/Insane later is a matter of declaring
 * additional profiles; Gameplay and NoteOverlay don't need to change.
 */
export interface DifficultyProfile {
  /** Stable id for persistence / leaderboard segmentation. */
  id: string;
  /** Display label for difficulty selectors. */
  label: string;
  /** Half-width of the Perfect window in seconds. (osu! "300".) */
  perfectWindow: number;
  /** Half-width of the Good window in seconds. (osu! "100".) */
  goodWindow: number;
  /** Click hit-test radius, normalized 0..1 of the video width. (osu! CS.) */
  hitRadiusNorm: number;
  /** Multiplier applied to each note's approach time. (osu! AR.) */
  approachMul: number;
  /** Life the player starts the run at (must be <= LIFE_MAX). (osu! HP.) */
  lifeStart: number;
  perfectLifeDelta: number;
  goodLifeDelta: number;
  missLifeDelta: number;
  /**
   * Flat scalar applied to every score gain on this profile, à la osu!'s
   * difficulty / mod multiplier slot (Easy halves, HardRock/DT inflate, etc.).
   * Stacks multiplicatively on top of the combo-tier bonus so a high-combo
   * run on Insane meaningfully out-points the same run on Easy.
   */
  scoreMul: number;
}

export const NORMAL_PROFILE: DifficultyProfile = {
  id: "normal",
  label: "Normal",
  perfectWindow: 0.08,
  goodWindow: 0.16,
  hitRadiusNorm: 0.06,
  approachMul: 1.0,
  lifeStart: 70,
  perfectLifeDelta: 5,
  goodLifeDelta: 1,
  missLifeDelta: -15,
  scoreMul: 1.0,
};

/**
 * Forgiving profile unlocked on the player's first Normal loss. Windows and
 * targets are larger, the approach gives more reading time, and the life
 * economy is generous so a single miss is recoverable. Roughly osu! OD ≈ 2 /
 * AR ≈ 4 in feel.
 */
export const EASY_PROFILE: DifficultyProfile = {
  id: "easy",
  label: "Easy",
  perfectWindow: 0.11,
  goodWindow: 0.22,
  hitRadiusNorm: 0.09,
  approachMul: 1.5,
  lifeStart: 85,
  perfectLifeDelta: 6,
  goodLifeDelta: 2,
  missLifeDelta: -8,
  scoreMul: 0.5,
};

/**
 * Tightened profile for players who've beaten Normal comfortably. Windows
 * are ~30% narrower, the approach gives noticeably less reading time, and
 * a Good hit no longer heals -- you have to chain Perfects to recover HP
 * lost to misses. Roughly osu! OD ≈ 6 / AR ≈ 7 in feel.
 */
export const HARD_PROFILE: DifficultyProfile = {
  id: "hard",
  label: "Hard",
  perfectWindow: 0.056,
  goodWindow: 0.112,
  hitRadiusNorm: 0.05,
  approachMul: 0.75,
  lifeStart: 60,
  perfectLifeDelta: 4,
  goodLifeDelta: 0,
  missLifeDelta: -20,
  scoreMul: 1.5,
};

/**
 * Maximum-tension profile for full-combo hunting. Hit windows are roughly
 * half of Normal's, approach is barely a half-second of reading, and a
 * Good now *drains* HP -- only Perfects keep you alive. Roughly osu!
 * OD ≈ 8 / AR ≈ 9 in feel.
 */
export const INSANE_PROFILE: DifficultyProfile = {
  id: "insane",
  label: "Insane",
  perfectWindow: 0.04,
  goodWindow: 0.08,
  hitRadiusNorm: 0.042,
  approachMul: 0.55,
  lifeStart: 50,
  perfectLifeDelta: 3,
  goodLifeDelta: -1,
  missLifeDelta: -25,
  scoreMul: 2.0,
};

/**
 * All difficulty profiles in display order, easiest first. The cover-screen
 * slider walks left-to-right across this list (filtered to unlocked ones).
 */
export const DIFFICULTIES: readonly DifficultyProfile[] = [
  EASY_PROFILE,
  NORMAL_PROFILE,
  HARD_PROFILE,
  INSANE_PROFILE,
];

/** Look up a profile by id, falling back to Normal for unknown ids. */
export function getDifficulty(id: string): DifficultyProfile {
  return DIFFICULTIES.find((d) => d.id === id) ?? NORMAL_PROFILE;
}

/**
 * Score the timing delta of a click against a note's expected time `t`.
 * Returns null for clicks outside the Good window -- the canonical osu!/EBA
 * behaviour is to silently swallow taps that are too far early/late rather
 * than penalise. Auto-miss is handled separately by the gameplay loop once
 * `dt > goodWindow`.
 */
export function judgeHit(
  deltaSec: number,
  profile: DifficultyProfile,
): JudgmentResult | null {
  const abs = Math.abs(deltaSec);
  if (abs <= profile.perfectWindow) {
    return {
      judgment: "perfect",
      score: 300,
      lifeDelta: profile.perfectLifeDelta,
      comboReset: false,
    };
  }
  if (abs <= profile.goodWindow) {
    return {
      judgment: "good",
      score: 100,
      lifeDelta: profile.goodLifeDelta,
      comboReset: false,
    };
  }
  return null;
}

/** Build the result applied when a note expires unhit. */
export function missResult(profile: DifficultyProfile): JudgmentResult {
  return {
    judgment: "miss",
    score: 0,
    lifeDelta: profile.missLifeDelta,
    comboReset: true,
  };
}

/**
 * Combo-tier bonus multiplier applied to the base hit score. Thresholds align
 * with the existing combo tier display (`rising`/`hot`/`gold`/`apex`) so the
 * visual tier readout doubles as a payout indicator. The multiplier is keyed
 * off the combo count *after* the current hit lands.
 */
export function comboMultiplier(combo: number): number {
  if (combo >= 100) return 2.0;
  if (combo >= 50) return 1.5;
  if (combo >= 25) return 1.25;
  if (combo >= 10) return 1.1;
  return 1.0;
}

/**
 * The maximum possible score given a beatmap length and active difficulty,
 * assuming every note is hit Perfect with no combo break (so the full
 * combo-tier multiplier curve is realised). The per-difficulty `scoreMul`
 * stacks on each hit exactly the way it does at runtime, keeping the
 * "fraction of max" branch threshold consistent across profiles.
 */
export function maxScore(
  noteCount: number,
  profile: DifficultyProfile = NORMAL_PROFILE,
): number {
  let total = 0;
  for (let i = 1; i <= noteCount; i++) {
    total += Math.round(300 * comboMultiplier(i) * profile.scoreMul);
  }
  return total;
}

export interface ScoreThresholds {
  /** At or above this fraction of max score -> "success" / "perfect". */
  highFraction: number;
}

export const ACT_THRESHOLDS: ScoreThresholds = { highFraction: 0.7 };
