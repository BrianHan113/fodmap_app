import type { Food } from '../types';

export type GlLevel = 'low' | 'medium' | 'high';

/** Standard GL bands: low ≤10, medium 11–19, high ≥20. */
export function glLevel(gl: number): GlLevel {
  if (gl <= 10) return 'low';
  if (gl < 20) return 'medium';
  return 'high';
}

export const GL_LEVEL_LABEL: Record<GlLevel, string> = { low: 'Low GL', medium: 'Medium GL', high: 'High GL' };
/** Mid-sentence form: 'low GL'. */
export const GL_LEVEL_TEXT: Record<GlLevel, string> = { low: 'low GL', medium: 'medium GL', high: 'high GL' };

/** Drinks are compared per 250ml glass; per 100ml would make sugary drinks look low. */
export const GLASS_ML = 250;

/**
 * GL per 100g (or per 250ml glass for drinks). This compares foods fairly: a food with a
 * small typical serving (1 tbsp of sugar, GL 8) isn't made to look lower than one eaten by
 * the cupful. Carb-free foods are 0 at any amount. Undefined when the serving size is unknown.
 */
export function glDensity(food: Food): number | undefined {
  if (food.gl === undefined) return undefined;
  if (food.gl === 0) return 0;
  if (!food.glAmount) return undefined;
  const ref = food.glUnit === 'ml' ? GLASS_ML : 100;
  return Math.round((food.gl / food.glAmount) * ref);
}

/** "/100g" or "/glass" suffix for a density value. */
export function glDensityUnit(food: Food): string {
  return food.glUnit === 'ml' ? '/glass' : '/100g';
}

export function glDensityText(food: Food): string {
  return food.glUnit === 'ml' ? `per ${GLASS_ML}ml glass` : 'per 100g';
}

/**
 * Compact serving the GL applies to, always with its weight when known:
 * "1 cup cooked (basmati lower, jasmine higher)" -> "1 cup cooked (190g)",
 * "1 medium (150g), boiled" -> "1 medium (150g)".
 */
export function glServingShort(food: Food): string {
  if (!food.glServing) return '';
  let s = food.glServing
    .replace(/\s*\((?!\d+(?:\.\d+)?\s*(?:g|ml)\))[^)]*\)/gi, '') // drop explanatory notes, keep "(150g)"
    .split(',')[0]
    .trim();
  const amt = food.glAmount ? `${food.glAmount}${food.glUnit}` : '';
  if (amt && !s.includes(amt) && s !== amt) s += ` (${amt})`;
  return s;
}

/** "per 1 cup cooked (190g)", or "(negligible carbohydrate)" for carb-free foods. */
export function glBasisText(food: Food): string {
  if (!food.glServing) return '';
  if (food.gl === 0) return '(negligible carbohydrate)';
  const amt = food.glAmount && !food.glServing.includes(`${food.glAmount}${food.glUnit}`) ? ` (${food.glAmount}${food.glUnit})` : '';
  return `per ${food.glServing}${amt}`;
}
