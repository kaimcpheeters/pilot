import type { Judgment } from "./types";

export const PERFECT_WINDOW = 0.08; // +/- 80ms
export const GOOD_WINDOW = 0.16; // +/- 160ms
export const DEFAULT_APPROACH = 1.0; // seconds

export const HIT_RADIUS_NORM = 0.06; // 6% of video width radius for click detection

export const LIFE_MAX = 100;
export const LIFE_START = 70;

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
 * The maximum possible score given a beatmap length, assuming every note is hit Perfect.
 * Used for results screen percentages.
 */
export function maxScore(noteCount: number): number {
  return noteCount * 300;
}

export interface ScoreThresholds {
  /** At or above this fraction of max score -> "success" / "perfect". */
  highFraction: number;
}

export const ACT_THRESHOLDS: ScoreThresholds = { highFraction: 0.7 };
