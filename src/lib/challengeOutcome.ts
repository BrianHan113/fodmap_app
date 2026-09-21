import type { DoseResult, Outcome } from '../types';

/**
 * A dose "reacts" when the worst symptom after it reaches at least 4/10 and is
 * clearly (3+ points) above your usual elimination-phase baseline.
 */
export function reactionThreshold(baseline = 0): number {
  return Math.max(4, Math.round(baseline) + 3);
}

export function isReaction(severity: number, baseline = 0): boolean {
  return severity >= reactionThreshold(baseline);
}

export interface Evaluation {
  outcome?: Outcome;
  /** Index of the largest dose tolerated; -1 if none. */
  toleratedDose: number;
  /** Index of the first dose that caused a reaction. */
  reactedAt?: number;
  /** True when the challenge should stop now (a reaction or all doses done). */
  finished: boolean;
}

export function evaluateChallenge(doses: DoseResult[], baseline = 0): Evaluation {
  let toleratedDose = -1;
  for (let i = 0; i < doses.length; i++) {
    const sev = doses[i].severity;
    if (sev === undefined) {
      return { toleratedDose, finished: false };
    }
    if (isReaction(sev, baseline)) {
      return { outcome: i === 0 ? 'not-tolerated' : 'partial', toleratedDose, reactedAt: i, finished: true };
    }
    toleratedDose = i;
  }
  return { outcome: 'tolerated', toleratedDose, finished: true };
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  tolerated: 'Tolerated',
  partial: 'Tolerated in small amounts',
  'not-tolerated': 'Not tolerated',
};
