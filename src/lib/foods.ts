import { SEED_FOODS } from '../data/foods';
import type { Food, Level, Serving } from '../types';
import { glDensity, glLevel } from './glycemic';

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
 * plus the band of GL per 100g (each 0-2), then GL per 100g, then the worst FODMAP level at
 * any serving. GL per 100g stops small-serving foods like sugar ranking as "low".
 * Unknown GL counts as high.
 */
export function combinedRank(food: Food): [number, number, number] {
  const [base, worst] = fodmapRank(food);
  const density = glDensity(food);
  const glBand = density === undefined ? 2 : GL_RANK[glLevel(density)];
  return [base + glBand, density ?? 999, worst];
}

export type FoodSort = 'name' | 'low' | 'high' | 'fav' | 'gl-low' | 'gl-high' | 'combined';

export function sortFoods(foods: Food[], sort: FoodSort, favourites: Set<string> = new Set()): Food[] {
  if (sort === 'name') return [...foods].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'gl-low' || sort === 'gl-high') {
    // By GL per 100g (per glass for drinks). Foods without one go last in both directions.
    const dir = sort === 'gl-low' ? 1 : -1;
    const d = new Map(foods.map((f) => [f.id, glDensity(f)]));
    return [...foods].sort((a, b) => {
      const da = d.get(a.id);
      const db = d.get(b.id);
      if (da === undefined || db === undefined) return Number(da === undefined) - Number(db === undefined) || a.name.localeCompare(b.name);
      return (da - db) * dir || a.name.localeCompare(b.name);
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

export const BIG_PORTION_G = 75;
export const BIG_PORTION_ML = 125;

/** Grams or millilitres stated in a serving label, e.g. "1 cup (125g)" -> {amount: 125, unit: 'g'}. */
export function servingAmount(label: string): { amount: number; unit: 'g' | 'ml' } | undefined {
  const m = label.match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);
  return m ? { amount: Number(m[1]), unit: m[2].toLowerCase() as 'g' | 'ml' } : undefined;
}

/** The largest low-FODMAP serving is at least 75g (or 125ml for drinks). */
export function bigSafePortion(food: Food): boolean {
  const safe = safeServing(food);
  const amt = safe && servingAmount(safe.label);
  if (!amt) return false;
  return amt.amount >= (amt.unit === 'g' ? BIG_PORTION_G : BIG_PORTION_ML);
}

/**
 * Safe to eat in large portions: either FODMAP-free, or low at every listed serving with
 * the largest one at least 75g / 125ml. Foods only tested at small amounts (soy sauce,
 * maple syrup, spices) are excluded because larger amounts are unknown.
 */
export function lowInLargePortions(food: Food): boolean {
  if (food.fodmapFree) return true;
  return food.servings.every((s) => s.level === 'low') && bigSafePortion(food);
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
