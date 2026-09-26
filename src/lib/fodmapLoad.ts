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
  /**
   * What this item adds to each FODMAP group's meal load (1 = a moderate amount, 2 = high).
   * Low amounts add a fraction, so several low foods sharing a FODMAP can add up past low.
   */
  load: Partial<Record<Group, number>>;
}

/**
 * Load from a low amount, estimated from the next tested (moderate/high) amount, since low tiers
 * don't say which FODMAPs they contain. A group that is moderate at the next amount reaches 1
 * there. A group that jumps straight to high is assumed to turn moderate halfway between the
 * largest low amount and the high one, then rise to 2 at the high amount. Either way an amount
 * up to the tested low limit stays below 1.
 */
function lowAmountLoad(grams: number, largestLow: number, next: Serving): Partial<Record<Group, number>> {
  const out: Partial<Record<Group, number>> = {};
  for (const [g, lvl] of Object.entries(next.groups) as [Group, Level][]) {
    if (lvl === 'moderate') {
      out[g] = grams / next.grams!;
      continue;
    }
    const cutoff = (largestLow + next.grams!) / 2;
    out[g] = grams <= cutoff ? grams / cutoff : 1 + (grams - cutoff) / (next.grams! - cutoff);
  }
  return out;
}

/** Load from a moderate/high tier, scaled by how many times its amount was eaten. */
function tierLoad(tier: Serving, factor: number): Partial<Record<Group, number>> {
  const out: Partial<Record<Group, number>> = {};
  for (const [g, lvl] of Object.entries(tier.groups) as [Group, Level][]) out[g] = LEVEL_SCORE[lvl] * Math.max(1, factor);
  return out;
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
  if (!food || !picked) return { food, picked, level: 'low', groups: {}, factor: 0, beyondTested: false, load: {} };
  if (food.fodmapFree)
    return { food, picked, tier: picked, level: 'low', groups: {}, factor: 0, beyondTested: false, load: {}, grams: picked.grams && picked.grams * item.qty };

  const tiers = food.servings;
  const allWeighed = tiers.every((t) => t.grams !== undefined) && picked.grams !== undefined;
  if (!allWeighed) {
    // Without weights, fall back to "picked serving × qty"; flag going past the last low tier.
    const isLargest = item.servingIndex === tiers.length - 1;
    // A low serving is assumed to be about half the next tested amount in the list.
    const next = tiers.find((t, i) => i > item.servingIndex && t.level !== 'low');
    const load: Partial<Record<Group, number>> = {};
    if (picked.level === 'low' && next) for (const g of Object.keys(next.groups) as Group[]) load[g] = 0.5 * item.qty;
    return {
      food,
      picked,
      tier: picked,
      level: picked.level,
      groups: picked.groups,
      factor: item.qty,
      beyondTested: picked.level === 'low' && isLargest && item.qty > 1,
      largestTier: tiers[tiers.length - 1],
      load: picked.level === 'low' ? load : tierLoad(picked, item.qty),
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
    load: matched.level !== 'low' ? tierLoad(matched, factor) : nextTier ? lowAmountLoad(grams, largestLow!.grams!, nextTier) : {},
  };
}

/**
 * Per-group load for a list of items: a moderate tier adds 1, a high tier 2, scaled by how many
 * times that tier's amount was eaten. Low amounts add their share (see lowAmountLoad).
 */
export function computeLoad(items: MealItem[], foods: Map<string, Food>): Load {
  const load = emptyLoad();
  for (const item of items) {
    for (const [g, v] of Object.entries(resolveItem(item, foods).load) as [Group, number][]) load[g] += v;
  }
  return load;
}

/** Slack for float sums, so e.g. three thirds of a moderate amount still count as moderate. */
const EPS = 1e-9;

export function loadLevel(score: number): Level {
  if (score >= 2 - EPS) return 'high';
  if (score >= 1 - EPS) return 'moderate';
  return 'low';
}

export interface StackWarning {
  group: Group;
  score: number;
  /** The meal's level for this group, higher than any one of its foods reaches alone. */
  level: Level;
  foods: string[];
  /** Every contributing food is low on its own. */
  allLow: boolean;
}

/**
 * Servings are cleared one food at a time, but the same FODMAP from different foods adds up:
 * several low servings can make a moderate load, and moderate ones a high load. Warn when the
 * foods together reach a higher level than the biggest contributor does alone; a single food
 * over its limit is already flagged on its own.
 */
export function stackingWarnings(items: MealItem[], foods: Map<string, Food>): StackWarning[] {
  const resolved = items.map((i) => resolveItem(i, foods));
  const out: StackWarning[] = [];
  for (const g of GROUPS) {
    const contributors = resolved.filter((r) => (r.load[g] ?? 0) > 0);
    if (contributors.length < 2) continue;
    const score = contributors.reduce((sum, r) => sum + r.load[g]!, 0);
    const biggest = Math.max(...contributors.map((r) => r.load[g]!));
    if (LEVEL_SCORE[loadLevel(score)] <= LEVEL_SCORE[loadLevel(biggest)]) continue;
    out.push({
      group: g,
      score,
      level: loadLevel(score),
      foods: contributors.map((r) => r.food!.name),
      allLow: contributors.every((r) => r.level === 'low' && !r.beyondTested),
    });
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
