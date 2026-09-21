import { NUTRIENTS, type Food, type MealItem, type Nutrient, type Nutrition } from '../types';

export const NUTRIENT_LABEL: Record<Nutrient, string> = { kcal: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fibre: 'Fibre' };
export const NUTRIENT_UNIT: Record<Nutrient, string> = { kcal: 'kcal', protein: 'g', carbs: 'g', fat: 'g', fibre: 'g' };

export function zeroNutrition(): Nutrition {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
}

/** Nutrition for one logged item (serving weight × qty), or undefined if the food or serving has no data. */
export function itemNutrition(item: MealItem, foods: Map<string, Food>): Nutrition | undefined {
  const food = foods.get(item.foodId);
  const grams = food?.servings[item.servingIndex]?.grams;
  if (!food?.nutrition || grams === undefined) return undefined;
  const k = (grams * item.qty) / 100;
  const out = zeroNutrition();
  for (const n of NUTRIENTS) out[n] = food.nutrition[n] * k;
  return out;
}

export interface NutritionTotal {
  total: Nutrition;
  /** Items that couldn't be counted (custom foods without nutrition data). */
  missing: number;
}

export function sumNutrition(items: MealItem[], foods: Map<string, Food>): NutritionTotal {
  const total = zeroNutrition();
  let missing = 0;
  for (const item of items) {
    const n = itemNutrition(item, foods);
    if (!n) {
      missing++;
      continue;
    }
    for (const k of NUTRIENTS) total[k] += n[k];
  }
  return { total, missing };
}

/** "1,240 kcal" / "32g". */
export function fmtNutrient(n: Nutrient, v: number): string {
  return n === 'kcal' ? `${Math.round(v).toLocaleString()} kcal` : `${v < 10 ? Math.round(v * 10) / 10 : Math.round(v)}g`;
}

/** Compact one-liner: "420 kcal · P 25g · C 40g · F 12g". */
export function macroLine(n: Nutrition): string {
  return `${Math.round(n.kcal)} kcal · P ${fmtNutrient('protein', n.protein)} · C ${fmtNutrient('carbs', n.carbs)} · F ${fmtNutrient('fat', n.fat)}`;
}
