import { GROUPS, type Food, type Group, type Level, type MealItem } from '../types';

export const LEVEL_SCORE: Record<Level, number> = { low: 0, moderate: 1, high: 2 };

export type Load = Record<Group, number>;

export function emptyLoad(): Load {
  return Object.fromEntries(GROUPS.map((g) => [g, 0])) as Load;
}

/** Per-group load for a list of items: moderate = 1, high = 2 per serving, times qty. */
export function computeLoad(items: MealItem[], foods: Map<string, Food>): Load {
  const load = emptyLoad();
  for (const item of items) {
    const serving = foods.get(item.foodId)?.servings[item.servingIndex];
    if (!serving) continue;
    for (const [g, lvl] of Object.entries(serving.groups) as [Group, Level][]) {
      load[g] += LEVEL_SCORE[lvl] * item.qty;
    }
  }
  return load;
}

export function loadLevel(score: number): Level {
  if (score >= 2) return 'high';
  if (score >= 1) return 'moderate';
  return 'low';
}

export interface StackWarning {
  group: Group;
  score: number;
  foods: string[];
}

/**
 * Low-FODMAP servings are cleared individually, but several moderate servings of the
 * same FODMAP in one sitting add up. Warn when a group reaches a "high" load from
 * more than a single high item (which is already flagged on its own).
 */
export function stackingWarnings(items: MealItem[], foods: Map<string, Food>): StackWarning[] {
  const load = computeLoad(items, foods);
  const out: StackWarning[] = [];
  for (const g of GROUPS) {
    if (load[g] < 2) continue;
    const contributors = items.filter((i) => foods.get(i.foodId)?.servings[i.servingIndex]?.groups[g]);
    const single = contributors.length === 1 && contributors[0].qty === 1;
    if (single) continue;
    out.push({ group: g, score: load[g], foods: contributors.map((i) => foods.get(i.foodId)!.name) });
  }
  return out;
}

/** Items that are moderate/high on their own. */
export function flaggedItems(items: MealItem[], foods: Map<string, Food>) {
  return items
    .map((item) => {
      const food = foods.get(item.foodId);
      return { item, food, serving: food?.servings[item.servingIndex] };
    })
    .filter((x) => x.serving && x.serving.level !== 'low');
}
