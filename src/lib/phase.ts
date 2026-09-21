import { CHALLENGES, WASHOUT_DAYS } from '../data/challenges';
import type { Challenge, ChallengeGroup } from '../types';
import { addDays, daysBetween } from './dates';
import { average } from './symptoms';

export const ELIM_MIN_DAYS = 14;
export const ELIM_MAX_DAYS = 42;

export function eliminationDay(start: string, today: string): number {
  return daysBetween(start, today) + 1;
}

export interface Readiness {
  day: number;
  minDaysMet: boolean;
  earlyAvg?: number;
  recentAvg?: number;
  improved?: boolean;
  ready: boolean;
  message: string;
}

/**
 * Ready for reintroduction after at least 2 weeks of elimination with symptoms that
 * are either mild (recent average <= 3/10) or clearly improved vs. the first week.
 */
export function reintroReadiness(start: string, today: string, dayScores: Map<string, number>): Readiness {
  const day = eliminationDay(start, today);
  const minDaysMet = day >= ELIM_MIN_DAYS;
  const pick = (from: string, to: string) =>
    [...dayScores.entries()].filter(([d]) => d >= from && d <= to).map(([, s]) => s);
  const earlyAvg = average(pick(start, addDays(start, 6)));
  const recentAvg = average(pick(addDays(today, -6), today));

  let improved: boolean | undefined;
  if (recentAvg !== undefined) {
    improved = recentAvg <= 3 || (earlyAvg !== undefined && earlyAvg - recentAvg >= 2);
  }

  let message: string;
  if (!minDaysMet) {
    message = `Stick with elimination for at least ${ELIM_MIN_DAYS} days (${ELIM_MIN_DAYS - day} to go). Keep logging symptoms so you can see the trend.`;
  } else if (improved === undefined) {
    message = 'Log your symptoms for a few days so the app can check whether they have settled.';
  } else if (improved) {
    message = 'Your symptoms have settled. You can start reintroducing FODMAP groups one at a time.';
  } else if (day >= ELIM_MAX_DAYS) {
    message = `You've been eliminating for ${day} days without clear improvement. Low-FODMAP may not be the whole answer. Talk to your doctor or dietitian before continuing.`;
  } else {
    message = 'Symptoms are not clearly better yet. Keep going (up to 6 weeks) and double-check for hidden onion/garlic, sugar-free sweeteners and portion sizes.';
  }

  return { day, minDaysMet, earlyAvg, recentAvg, improved, ready: minDaysMet && !!improved, message };
}

export interface ReintroState {
  active?: Challenge;
  /** Index of the next dose to take in the active challenge (0-2), 3 = all taken. */
  nextDose?: number;
  washoutUntil?: string;
  inWashout: boolean;
  completed: ChallengeGroup[];
  remaining: ChallengeGroup[];
}

export function reintroState(challenges: Challenge[], today: string): ReintroState {
  const active = challenges.find((c) => c.status === 'active');
  const done = challenges.filter((c) => c.status === 'done');
  const completed = [...new Set(done.map((c) => c.group))];
  const remaining = CHALLENGES.map((c) => c.group).filter((g) => !completed.includes(g) && g !== active?.group);
  const washoutUntil = done
    .map((c) => c.washoutUntil)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1);
  const inWashout = !active && !!washoutUntil && today < washoutUntil;
  const nextDose = active ? active.doses.filter((d) => d.severity !== undefined).length : undefined;
  return { active, nextDose, washoutUntil, inWashout, completed, remaining };
}

/** Washout ends WASHOUT_DAYS after the last dose day. */
export function washoutEnd(lastDoseDate: string): string {
  return addDays(lastDoseDate, WASHOUT_DAYS + 1);
}
