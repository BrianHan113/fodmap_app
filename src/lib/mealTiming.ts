import type { Meal } from '../types';
import { toTimestamp } from './dates';

/** Leaving 3-4 hours between meals lets each meal's FODMAPs clear rather than add up. */
export const MIN_MEAL_GAP_HOURS = 3;

/** Closest meals before and after a given moment, excluding one meal (the one being edited). */
export function neighbourMeals(meals: Meal[], at: number, excludeId?: number) {
  let prev: { meal: Meal; t: number } | undefined;
  let next: { meal: Meal; t: number } | undefined;
  for (const meal of meals) {
    if (excludeId !== undefined && meal.id === excludeId) continue;
    const t = toTimestamp(meal.date, meal.time);
    if (t <= at && (!prev || t > prev.t)) prev = { meal, t };
    if (t > at && (!next || t < next.t)) next = { meal, t };
  }
  return { prev, next };
}

/** "2h 15m", "45m", "3 days". */
export function fmtDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function tooSoon(gapMs: number): boolean {
  return gapMs < MIN_MEAL_GAP_HOURS * 3600 * 1000;
}

/** Display name for a meal: its own name, legacy type, or its time. */
export function mealTitle(meal: Meal): string {
  if (meal.name?.trim()) return meal.name.trim();
  if (meal.type) return meal.type[0].toUpperCase() + meal.type.slice(1);
  return `Meal at ${meal.time}`;
}
