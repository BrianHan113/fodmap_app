import { SEED_FOODS } from '../data/foods';
import type { Food, Level, Serving } from '../types';

/** Seed foods with user overrides applied, plus custom foods; hidden foods removed. */
export function mergeFoods(overrides: Food[]): Food[] {
  const byId = new Map(SEED_FOODS.map((f) => [f.id, f]));
  for (const o of overrides) byId.set(o.id, o);
  return [...byId.values()].filter((f) => !f.hidden).sort((a, b) => a.name.localeCompare(b.name));
}

export function seedFood(id: string): Food | undefined {
  return SEED_FOODS.find((f) => f.id === id);
}

/** The largest low-FODMAP serving, if any. */
export function safeServing(food: Food): Serving | undefined {
  return [...food.servings].reverse().find((s) => s.level === 'low');
}

/** Overall rating of a food = rating of its first (smallest) serving tier. */
export function baseLevel(food: Food): Level {
  return food.servings[0]?.level ?? 'low';
}

const LEVEL_RANK: Record<Level, number> = { low: 0, moderate: 1, high: 2 };

/**
 * How FODMAP-heavy a food is, for sorting. Compared in order: level at the smallest
 * serving, worst level at any listed serving, then how many FODMAP groups it has.
 * Serving sizes aren't compared since their units differ between foods.
 */
export function fodmapRank(food: Food): [number, number, number] {
  const base = LEVEL_RANK[baseLevel(food)];
  const worst = Math.max(...food.servings.map((s) => LEVEL_RANK[s.level]));
  const groups = new Set(food.servings.flatMap((s) => Object.keys(s.groups))).size;
  return [base, worst, groups];
}

export type FoodSort = 'name' | 'low' | 'high';

export function sortFoods(foods: Food[], sort: FoodSort): Food[] {
  if (sort === 'name') return [...foods].sort((a, b) => a.name.localeCompare(b.name));
  const dir = sort === 'low' ? 1 : -1;
  const ranks = new Map(foods.map((f) => [f.id, fodmapRank(f)]));
  return [...foods].sort((a, b) => {
    const ra = ranks.get(a.id)!;
    const rb = ranks.get(b.id)!;
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return (ra[i] - rb[i]) * dir;
    return a.name.localeCompare(b.name);
  });
}

export function matchesQuery(food: Food, q: string): boolean {
  if (!q) return true;
  const hay = food.name.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
