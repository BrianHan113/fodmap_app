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

export function matchesQuery(food: Food, q: string): boolean {
  if (!q) return true;
  const hay = food.name.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}
