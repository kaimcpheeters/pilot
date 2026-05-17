import type { Judgment } from "./types";

export const PERFECT_WINDOW = 0.08; // +/- 80ms
export const GOOD_WINDOW = 0.16; // +/- 160ms
export const DEFAULT_APPROACH = 1.0; // seconds

export const HIT_RADIUS_NORM = 0.06; // 6% of video width radius for click detection

export const LIFE_MAX = 100;
export const LIFE_START = 70;

/**
 * Hard cap on the displayed and persisted score. Anything earned past this
 * point is clamped, arcade-style. Keep wide enough that the cumulative score
 * counter looks consistent (5 digits with a comma).
 */
export const SCORE_CAP = 99_999;

export interface JudgmentResult {
  judgment: Judgment;
  score: number;
  lifeDelta: number;
  comboReset: boolean;
}

export function judgeHit(deltaSec: number): JudgmentResult | null {
  const abs = Math.abs(deltaSec);
  if (abs <= PERFECT_WINDOW) {
    return { judgment: "perfect", score: 300, lifeDelta: 5, comboReset: false };
  }
  if (abs <= GOOD_WINDOW) {
    return { judgment: "good", score: 100, lifeDelta: 1, comboReset: false };
  }
  return null;
}

export const MISS_RESULT: JudgmentResult = {
  judgment: "miss",
  score: 0,
  lifeDelta: -15,
  comboReset: true,
};

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
 * The maximum possible score given a beatmap length, assuming every note is
 * hit Perfect with no combo break (so the full combo-tier multiplier curve is
 * realised). Used for results screen percentages.
 */
export function maxScore(noteCount: number): number {
  let total = 0;
  for (let i = 1; i <= noteCount; i++) {
    total += Math.round(300 * comboMultiplier(i));
  }
  return total;
}

export interface ScoreThresholds {
  /** At or above this fraction of max score -> "success" / "perfect". */
  highFraction: number;
}

export const ACT_THRESHOLDS: ScoreThresholds = { highFraction: 0.7 };
