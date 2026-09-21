import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import { NUTRITION } from '../data/nutrition';
import type { Meal } from '../types';
import { MIN_MEAL_GAP_HOURS, fmtDuration, mealTitle, neighbourMeals, tooSoon } from './mealTiming';
import { itemNutrition, macroLine, sumNutrition } from './nutrition';
import { toTimestamp } from './dates';

const foods = new Map(SEED_FOODS.map((f) => [f.id, f]));
const byName = (n: string) => SEED_FOODS.find((f) => f.name === n)!;

describe('nutrition data', () => {
  it('every seed food has nutrition and every serving has a weight', () => {
    for (const f of SEED_FOODS) {
      expect(f.nutrition, f.name).toBeDefined();
      f.servings.forEach((s, i) => expect(s.grams, `${f.name} #${i} ${s.label}`).toBeGreaterThan(0));
    }
  });

  it('calories roughly match the macros (catches typos)', () => {
    // Alcohol, polyols, vinegar acids and very high-fibre foods don't follow 4/4/9 kcal per gram.
    const skip = /beer|wine|spirits|rum|cider|sugar-alcohol|gum|psyllium|chicory|stevia|salt-pepper|coffee-instant|flour-coconut|bran|chia|flax|vinegar/;
    for (const [id, [kcal, p, c, fat, fib]] of Object.entries(NUTRITION)) {
      if (skip.test(id)) continue;
      const est = 4 * p + 4 * Math.max(0, c - fib) + 9 * fat + 2 * fib;
      expect(Math.abs(est - kcal), `${id}: ${kcal} kcal vs ${Math.round(est)} from macros`).toBeLessThanOrEqual(Math.max(15, 0.2 * kcal));
    }
  });
});

describe('nutrition totals', () => {
  const rice = byName('Rice, white / basmati / jasmine'); // 1 cup cooked (190g), 130 kcal/100g
  const chicken = byName('Chicken (plain)'); // 1 serve (150g), 165 kcal/100g

  it('scales per-100g values by serving weight and quantity', () => {
    const n = itemNutrition({ foodId: rice.id, servingIndex: 0, qty: 1.5 }, foods)!;
    expect(n.kcal).toBeCloseTo(130 * 1.9 * 1.5);
    expect(n.carbs).toBeCloseTo(28 * 1.9 * 1.5);
  });

  it('sums a meal and counts items without data', () => {
    const custom = { id: 'c', name: 'Mystery', category: 'Snacks' as const, servings: [{ label: '1', level: 'low' as const, groups: {} }] };
    const map = new Map([...foods, ['c', custom]]);
    const { total, missing } = sumNutrition(
      [
        { foodId: rice.id, servingIndex: 0, qty: 1 },
        { foodId: chicken.id, servingIndex: 0, qty: 1 },
        { foodId: 'c', servingIndex: 0, qty: 1 },
      ],
      map,
    );
    expect(total.kcal).toBeCloseTo(130 * 1.9 + 165 * 1.5);
    expect(total.protein).toBeCloseTo(2.7 * 1.9 + 31 * 1.5);
    expect(missing).toBe(1);
    expect(macroLine(total)).toBe('495 kcal · P 52g · C 53g · F 6g');
  });
});

describe('meal timing', () => {
  const meal = (date: string, time: string, extra: Partial<Meal> = {}): Meal => ({ date, time, items: [], ...extra });
  const meals = [meal('2026-01-01', '08:00', { id: 1 }), meal('2026-01-01', '12:30', { id: 2 }), meal('2026-01-01', '19:00', { id: 3 })];

  it('finds the meals either side of a time, excluding the one being edited', () => {
    const { prev, next } = neighbourMeals(meals, toTimestamp('2026-01-01', '14:00'));
    expect(prev?.meal.id).toBe(2);
    expect(next?.meal.id).toBe(3);
    expect(neighbourMeals(meals, toTimestamp('2026-01-01', '12:30'), 2).prev?.meal.id).toBe(1);
  });

  it(`flags gaps under ${MIN_MEAL_GAP_HOURS} hours`, () => {
    expect(tooSoon(2.5 * 3600000)).toBe(true);
    expect(tooSoon(3 * 3600000)).toBe(false);
    expect(fmtDuration(95 * 60000)).toBe('1h 35m');
    expect(fmtDuration(45 * 60000)).toBe('45m');
    expect(fmtDuration(3 * 3600000)).toBe('3h');
  });

  it('titles meals by name, legacy type, or time', () => {
    expect(mealTitle(meal('2026-01-01', '10:15', { name: ' Brunch ' }))).toBe('Brunch');
    expect(mealTitle(meal('2026-01-01', '10:15', { type: 'lunch' }))).toBe('Lunch');
    expect(mealTitle(meal('2026-01-01', '10:15'))).toBe('Meal at 10:15');
  });
});
