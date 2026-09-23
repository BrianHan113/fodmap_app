import { GROUPS, type Food, type Group, type Level, type MealItem, type Serving } from '../types';

export const LEVEL_SCORE: Record<Level, number> = { low: 0, moderate: 1, high: 2 };

export type Load = Record<Group, number>;

export function emptyLoad(): Load {
  return Object.fromEntries(GROUPS.map((g) => [g, 0])) as Load;
}

/** Amounts within 2% of a tested tier count as that tier (rounding in labels). */
const TOLERANCE = 1.02;

export interface ResolvedItem {
  food?: Food;
  /** The serving option the user picked. */
  picked?: Serving;
  /** Total amount eaten: picked serving weight × qty. */
  grams?: number;
  /** The tested tier that matches the amount eaten. */
  tier?: Serving;
  level: Level;
  groups: Partial<Record<Group, Level>>;
  /** How many times the matched tier's amount was eaten (≥1 when above the smallest tier). */
  factor: number;
  /**
   * Eaten more than the largest amount tested as low, while still below the next tested (moderate/high)
   * amount or past every tested amount. It may no longer be low FODMAP.
   */
  beyondTested: boolean;
  /** The largest amount tested as low, for "tested low up to …" messages. */
  largestTier?: Serving;
  /** The next tested amount above the low limit (moderate/high), if known. */
  nextTier?: Serving;
}

/**
 * Work out the FODMAP level of what was actually eaten. The picked serving × qty is turned into
 * grams and matched to the largest tested tier at or below that amount. So 2× "1/8 avocado"
 * (60g) counts as the 60g moderate tier, not "low twice". When the amount goes past every
 * tested tier and the largest one is low, it is flagged as untested rather than assumed low.
 */
export function resolveItem(item: MealItem, foods: Map<string, Food>): ResolvedItem {
  const food = foods.get(item.foodId);
  const picked = food?.servings[item.servingIndex];
  if (!food || !picked) return { food, picked, level: 'low', groups: {}, factor: 0, beyondTested: false };
  if (food.fodmapFree) return { food, picked, tier: picked, level: 'low', groups: {}, factor: 0, beyondTested: false, grams: picked.grams && picked.grams * item.qty };

  const tiers = food.servings;
  const allWeighed = tiers.every((t) => t.grams !== undefined) && picked.grams !== undefined;
  if (!allWeighed) {
    // Without weights, fall back to "picked serving × qty"; flag going past the last low tier.
    const isLargest = item.servingIndex === tiers.length - 1;
    return {
      food,
      picked,
      tier: picked,
      level: picked.level,
      groups: picked.groups,
      factor: item.qty,
      beyondTested: picked.level === 'low' && isLargest && item.qty > 1,
      largestTier: tiers[tiers.length - 1],
    };
  }

  const grams = picked.grams! * item.qty;
  const sorted = [...tiers].sort((a, b) => a.grams! - b.grams!);
  // Largest tested tier at or below the amount eaten (below the smallest tier, use the smallest).
  const matched = [...sorted].reverse().find((t) => t.grams! <= grams * TOLERANCE) ?? sorted[0];
  const factor = grams / matched.grams!;
  // Past the largest amount tested as low: flag it, whether or not a higher tier is known.
  const largestLow = [...sorted].reverse().find((t) => t.level === 'low');
  const nextTier = largestLow && sorted.find((t) => t.grams! > largestLow.grams! && t.level !== 'low');
  const beyondTested = matched.level === 'low' && !!largestLow && grams > largestLow.grams! * TOLERANCE;
  return {
    food,
    picked,
    grams,
    tier: matched,
    level: matched.level,
    groups: matched.groups,
    factor,
    beyondTested,
    largestTier: largestLow,
    nextTier,
  };
}

/**
 * Per-group load for a list of items: a moderate tier adds 1, a high tier 2, scaled by how many
 * times that tier's amount was eaten.
 */
export function computeLoad(items: MealItem[], foods: Map<string, Food>): Load {
  const load = emptyLoad();
  for (const item of items) {
    const r = resolveItem(item, foods);
    for (const [g, lvl] of Object.entries(r.groups) as [Group, Level][]) {
      load[g] += LEVEL_SCORE[lvl] * Math.max(1, r.factor);
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
 * Low-FODMAP servings are cleared individually, but moderate servings of the same FODMAP
 * from different foods add up. Warn when a group reaches a "high" load from two or more
 * foods; a single food over its limit is already flagged on its own.
 */
export function stackingWarnings(items: MealItem[], foods: Map<string, Food>): StackWarning[] {
  const load = computeLoad(items, foods);
  const out: StackWarning[] = [];
  for (const g of GROUPS) {
    if (load[g] < 2) continue;
    const contributors = items.filter((i) => resolveItem(i, foods).groups[g]);
    if (contributors.length < 2) continue;
    out.push({ group: g, score: load[g], foods: contributors.map((i) => foods.get(i.foodId)!.name) });
  }
  return out;
}

/** Items that are moderate/high, or past their tested low amount, at the amount eaten. */
export function flaggedItems(items: MealItem[], foods: Map<string, Food>) {
  return items.map((item) => ({ item, ...resolveItem(item, foods) })).filter((r) => r.level !== 'low' || r.beyondTested);
}

/** "150g" / "250ml"-style amount text; drinks and milks use ml. */
export function amountText(grams: number, food?: Food): string {
  const ml = food?.category === 'Drinks' || /milk/i.test(food?.name ?? '');
  return `${Math.round(grams)}${ml ? 'ml' : 'g'}`;
}
