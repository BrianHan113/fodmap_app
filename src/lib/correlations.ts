import type { Food, Meal, SymptomEntry } from '../types';
import { toTimestamp } from './dates';
import { average, entryScore } from './symptoms';

export interface FoodStat {
  foodId: string;
  name: string;
  times: number;
  /** Average worst symptom in the 24h after eating it (only meals followed by a symptom log). */
  avgAfter: number;
  /** Difference from your overall average symptom score. */
  delta: number;
}

const DAY_MS = 24 * 3600 * 1000;

export function foodSymptomStats(
  meals: Meal[],
  symptoms: SymptomEntry[],
  foods: Map<string, Food>,
  minTimes = 2,
): { baseline?: number; stats: FoodStat[] } {
  const logs = symptoms.map((s) => ({ t: toTimestamp(s.date, s.time), score: entryScore(s) })).sort((a, b) => a.t - b.t);
  const baseline = average(logs.map((l) => l.score));
  const byFood = new Map<string, number[]>();

  for (const meal of meals) {
    const t0 = toTimestamp(meal.date, meal.time);
    const window = logs.filter((l) => l.t >= t0 && l.t <= t0 + DAY_MS);
    if (!window.length) continue;
    const worst = Math.max(...window.map((l) => l.score));
    for (const id of new Set(meal.items.map((i) => i.foodId))) {
      if (!byFood.has(id)) byFood.set(id, []);
      byFood.get(id)!.push(worst);
    }
  }

  const stats: FoodStat[] = [];
  for (const [foodId, scores] of byFood) {
    if (scores.length < minTimes) continue;
    const avgAfter = average(scores)!;
    stats.push({
      foodId,
      name: foods.get(foodId)?.name ?? foodId,
      times: scores.length,
      avgAfter,
      delta: avgAfter - (baseline ?? 0),
    });
  }
  stats.sort((a, b) => b.avgAfter - a.avgAfter);
  return { baseline, stats };
}
