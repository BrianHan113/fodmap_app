import { SEED_FOODS } from '../data/foods';
import type { Food, Level, Serving } from '../types';
import { glLevel } from './glycemic';

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

const GL_RANK = { low: 0, medium: 1, high: 2 } as const;

/**
 * Combined FODMAP + glycaemic ranking (lowest first): FODMAP level at the smallest serving
 * plus GL band (each 0-2), then the GL value, then the worst FODMAP level at any serving.
 * Unknown GL counts as high.
 */
export function combinedRank(food: Food): [number, number, number] {
  const [base, worst] = fodmapRank(food);
  const glBand = food.gl === undefined ? 2 : GL_RANK[glLevel(food.gl)];
  return [base + glBand, food.gl ?? 99, worst];
}

export type FoodSort = 'name' | 'low' | 'high' | 'fav' | 'gl-low' | 'gl-high' | 'combined';

export function sortFoods(foods: Food[], sort: FoodSort, favourites: Set<string> = new Set()): Food[] {
  if (sort === 'name') return [...foods].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'gl-low' || sort === 'gl-high') {
    // Foods without a GL go last in both directions.
    const dir = sort === 'gl-low' ? 1 : -1;
    return [...foods].sort((a, b) => {
      if (a.gl === undefined || b.gl === undefined) return Number(a.gl === undefined) - Number(b.gl === undefined) || a.name.localeCompare(b.name);
      return (a.gl - b.gl) * dir || a.name.localeCompare(b.name);
    });
  }
  if (sort === 'combined') {
    const keys = new Map(foods.map((f) => [f.id, combinedRank(f)]));
    return [...foods].sort((a, b) => {
      const ka = keys.get(a.id)!;
      const kb = keys.get(b.id)!;
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return a.name.localeCompare(b.name);
    });
  }
  if (sort === 'fav') {
    // Favourites first, then everything else; A-Z within each.
    return [...foods].sort((a, b) => Number(favourites.has(b.id)) - Number(favourites.has(a.id)) || a.name.localeCompare(b.name));
  }
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
