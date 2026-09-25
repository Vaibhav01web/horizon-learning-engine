import type { ReviewGrade } from "@zpl/shared-types";

export interface ReviewState {
  box: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

/** Days a card waits in each Leitner box. */
const BOX_INTERVALS = [1, 2, 4, 7, 15];

const QUALITY: Record<ReviewGrade, number> = { again: 0, hard: 3, good: 4, easy: 5 };

/**
 * Leitner boxes drive scheduling (simple, demo-legible), with SM-2's ease
 * factor layered on so intervals still adapt to how hard a card actually is.
 */
export function schedule(previous: ReviewState | null, grade: ReviewGrade): ReviewState & {
  next_review: string;
  last_reviewed: string;
} {
  const state: ReviewState = previous ?? {
    box: 1,
    ease_factor: 2.5,
    interval_days: 1,
    repetitions: 0,
  };

  const quality = QUALITY[grade];
  const failed = quality < 3;

  // SM-2 ease update, clamped so a run of bad grades cannot collapse it.
  const ease = Math.max(
    1.3,
    state.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const box = failed ? 1 : Math.min(5, state.box + (grade === "easy" ? 2 : 1));
  const repetitions = failed ? 0 : state.repetitions + 1;

  const baseInterval = BOX_INTERVALS[box - 1];
  const intervalDays = failed ? 1 : Math.max(1, Math.round(baseInterval * (ease / 2.5)));

  const next = new Date();
  next.setDate(next.getDate() + intervalDays);

  return {
    box,
    ease_factor: Number(ease.toFixed(2)),
    interval_days: intervalDays,
    repetitions,
    last_reviewed: new Date().toISOString(),
    next_review: next.toISOString(),
  };
}

/** Points for a battle answer: correct answers are worth more when fast. */
export function battlePoints(isCorrect: boolean, timeMs: number): number {
  if (!isCorrect) return 0;
  const speedBonus = Math.max(0, 500 - Math.floor(timeMs / 40));
  return 500 + speedBonus;
}
