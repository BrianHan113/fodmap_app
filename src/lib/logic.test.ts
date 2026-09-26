import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { SEED_FOODS, buildFoods } from '../data/foods';
import { FodmapDB } from '../db/db';
import type { Challenge, Food, Meal, SymptomEntry } from '../types';
import { exportData, importData } from './backup';
import { evaluateChallenge, reactionThreshold } from './challengeOutcome';
import { foodSymptomStats } from './correlations';
import { addDays, daysBetween } from './dates';
import { computeLoad, resolveItem, stackingWarnings } from './fodmapLoad';
import { bigSafePortion, combinedRank, lowInLargePortions, mergeFoods, safeServing, servingAmount, sortFoods } from './foods';
import { glDensity, glLevel, glServingShort } from './glycemic';
import { eliminationDay, reintroReadiness, reintroState } from './phase';
import { personalVerdict, toleranceMap } from './tolerance';

const foodMap = new Map(SEED_FOODS.map((f) => [f.id, f]));
const byName = (n: string) => SEED_FOODS.find((f) => f.name === n)!;

describe('food database', () => {
  it('parses all rows with unique ids and ~250 foods', () => {
    expect(SEED_FOODS.length).toBeGreaterThanOrEqual(240);
    expect(new Set(SEED_FOODS.map((f) => f.id)).size).toBe(SEED_FOODS.length);
  });

  it('every non-low serving names at least one driving group', () => {
    for (const f of SEED_FOODS)
      for (const s of f.servings) if (s.level !== 'low') expect(Object.keys(s.groups).length, f.name).toBeGreaterThan(0);
  });

  it('parses codes, forced levels and fructan source', () => {
    const [f] = buildFoods([['Test', 'veg', '1 cup:L|2 cups:M fw so!']]);
    expect(f.servings[1]).toEqual({ label: '2 cups', level: 'moderate', groups: { fructan: 'moderate', sorbitol: 'high' } });
    expect(f.fructanSource).toBe('wheat');
    expect(() => buildFoods([['Bad', 'veg', '1 cup:Q']])).toThrow();
  });

  it('links single-source fructan foods to their challenge; mixed sources use the strictest result', () => {
    expect(byName('Pita bread, wheat').fructanSource).toBe('wheat');
    expect(byName('Garlic bread').fructanSource).toBeUndefined();
    const tol = toleranceMap([
      { group: 'fructan-wheat', food: 'x', startDate: '2026-03-01', doses: [], status: 'done', outcome: 'tolerated' },
      { group: 'fructan-garlic', food: 'x', startDate: '2026-03-01', doses: [], status: 'done', outcome: 'not-tolerated' },
    ]);
    expect(personalVerdict(byName('Pita bread, wheat'), tol)).toBe('ok');
    expect(personalVerdict(byName('Garlic bread'), tol)).toBe('avoid');
  });

  it('finds the largest safe serving', () => {
    expect(safeServing(byName('Avocado'))?.label).toBe('1/8 avocado (30g)');
    expect(safeServing(byName('Apple'))).toBeUndefined();
  });

  it('sorts by FODMAP level in both directions', () => {
    const picks = ['Garlic', 'Carrot', 'Avocado', 'Apple', 'Honey'].map(byName);
    const low = sortFoods(picks, 'low').map((f) => f.name);
    // Carrot is low at every serving; Avocado/Honey are low only in small amounts; Apple/Garlic have no low serving.
    expect(low[0]).toBe('Carrot');
    expect(low.slice(1, 3).sort()).toEqual(['Avocado', 'Honey']);
    expect(low.slice(3).sort()).toEqual(['Apple', 'Garlic']);
    const high = sortFoods(picks, 'high').map((f) => f.name);
    expect(high.at(-1)).toBe('Carrot');
    expect(high.slice(0, 2).sort()).toEqual(['Apple', 'Garlic']);
    expect(sortFoods(picks, 'name').map((f) => f.name)).toEqual(['Apple', 'Avocado', 'Carrot', 'Garlic', 'Honey']);
  });

  it('sorts favourites first, A-Z within each group', () => {
    const picks = ['Garlic', 'Carrot', 'Avocado', 'Apple', 'Honey'].map(byName);
    const favs = new Set([byName('Honey').id, byName('Carrot').id]);
    expect(sortFoods(picks, 'fav', favs).map((f) => f.name)).toEqual(['Carrot', 'Honey', 'Apple', 'Avocado', 'Garlic']);
  });

  it('finds foods low at any amount and foods with a big safe portion', () => {
    expect(lowInLargePortions(byName('Carrot'))).toBe(true); // no FODMAPs detected
    expect(lowInLargePortions(byName('Avocado'))).toBe(false); // moderate at 1/4
    expect(lowInLargePortions(byName('Soy sauce'))).toBe(true); // Monash: nil FODMAPs detected
    expect(lowInLargePortions(byName('Maple syrup'))).toBe(false); // only tested at 2 tbsp
    expect(lowInLargePortions(byName('Spinach, baby'))).toBe(false); // moderate fructans at 150g
    expect(lowInLargePortions(byName('Salt & pepper'))).toBe(true); // FODMAP-free
    expect(lowInLargePortions(byName('Chicken (plain)'))).toBe(true);
    expect(byName('Chicken (plain)').fodmapFree).toBe(true);
    expect(byName('Butter').fodmapFree).toBeUndefined(); // trace lactose
    expect(servingAmount('1 cup (125g)')).toEqual({ amount: 125, unit: 'g' });
    expect(servingAmount('1 glass (250ml)')).toEqual({ amount: 250, unit: 'ml' });
    expect(servingAmount('any')).toBeUndefined();
    expect(bigSafePortion(byName('Blueberries'))).toBe(true); // 1 cup (125g)
    expect(bigSafePortion(byName('Carrot'))).toBe(true); // 75g
    expect(bigSafePortion(byName('Avocado'))).toBe(false); // 30g
    expect(bigSafePortion(byName('Almonds'))).toBe(false); // 12g
    expect(bigSafePortion(byName('Milk, lactose-free'))).toBe(true); // 250ml
    expect(bigSafePortion(byName('Coconut milk, canned'))).toBe(false); // 60ml
    expect(bigSafePortion(byName('Apple'))).toBe(false); // no low serving
  });

  it('every seed food has a glycaemic load, serving and (if it has carbs) serving weight', () => {
    for (const f of SEED_FOODS) {
      expect(f.gl, f.name).toBeTypeOf('number');
      expect(f.glServing, f.name).toBeTruthy();
      if (f.gl! > 0) expect(f.glAmount, f.name).toBeGreaterThan(0);
      expect(glDensity(f), f.name).toBeTypeOf('number');
    }
  });

  it('states GL servings compactly with their weight', () => {
    expect(glServingShort(byName('Sugar (white, brown, raw)'))).toBe('1 tbsp (12g)');
    expect(glServingShort(byName('Rice, white / basmati / jasmine'))).toBe('1 cup cooked (190g)');
    expect(glServingShort(byName('Potato, white'))).toBe('1 medium (150g)');
    expect(glServingShort(byName('Soft drink (sugar-sweetened)'))).toBe('1 can (375ml)');
    expect(glServingShort(byName('Blueberries'))).toBe('1 cup (125g)');
    expect(glServingShort(byName('Cashews'))).toBe('30g');
  });

  it('compares GL per 100g (per glass for drinks)', () => {
    expect(glDensity(byName('Sugar (white, brown, raw)'))).toBe(67); // 8 per 12g
    expect(glDensity(byName('Rice, white / basmati / jasmine'))).toBe(17); // 32 per 190g
    expect(glDensity(byName('Carrot'))).toBe(3);
    expect(glDensity(byName('Chicken (plain)'))).toBe(0);
    expect(glDensity(byName('Soft drink (sugar-sweetened)'))).toBe(17); // 25 per 375ml -> per 250ml
  });

  it('bands glycaemic load at 10 and 20', () => {
    expect([0, 10, 11, 19, 20, 32].map(glLevel)).toEqual(['low', 'low', 'medium', 'medium', 'high', 'high']);
  });

  it('sorts by GL and by combined FODMAP + GL', () => {
    const picks = ['Rice, white / basmati / jasmine', 'Carrot', 'Apple', 'Bagel, wheat', 'Chicken (plain)', 'Oats, rolled'].map(byName);
    // By GL per 100g: bagel (28/100g) is densest; rice is 17/100g cooked.
    const glLow = sortFoods(picks, 'gl-low').map((f) => f.name);
    expect(glLow[0]).toBe('Chicken (plain)');
    expect(glLow.at(-1)).toBe('Bagel, wheat');
    expect(sortFoods(picks, 'gl-high')[0].name).toBe('Bagel, wheat');
    // Chicken & carrot: low FODMAP + low GL. Bagel: high FODMAP + high GL is last.
    const combined = sortFoods(picks, 'combined').map((f) => f.name);
    expect(combined.slice(0, 2).sort()).toEqual(['Carrot', 'Chicken (plain)']);
    expect(combined.at(-1)).toBe('Bagel, wheat');
    // Sugar has no FODMAPs but is very high GL per 100g, so it must not rank as "eat freely".
    const sweet = ['Sugar (white, brown, raw)', 'Carrot', 'Chicken (plain)', 'Rice, white / basmati / jasmine'].map(byName);
    expect(sortFoods(sweet, 'combined').map((f) => f.name)).toEqual(['Chicken (plain)', 'Carrot', 'Rice, white / basmati / jasmine', 'Sugar (white, brown, raw)']);
    // Unknown GL is treated as high in the combined ranking and sorts last by GL.
    const noGl: Food = { id: 'x', name: 'Mystery', category: 'Snacks', servings: [{ label: '1', level: 'low', groups: {} }] };
    expect(combinedRank(noGl)[0]).toBe(2);
    expect(sortFoods([noGl, ...picks], 'gl-low').at(-1)?.name).toBe('Mystery');
    expect(sortFoods([noGl, ...picks], 'gl-high').at(-1)?.name).toBe('Mystery');
  });

  it('applies user overrides and hides foods', () => {
    const avo = byName('Avocado');
    const merged = mergeFoods([
      { ...avo, name: 'Avocado (mine)' },
      { id: 'custom-1', name: 'My snack', category: 'Snacks', servings: [{ label: '1', level: 'low', groups: {} }], custom: true },
      { ...byName('Apple'), hidden: true },
    ]);
    expect(merged.find((f) => f.id === avo.id)?.name).toBe('Avocado (mine)');
    expect(merged.some((f) => f.id === 'custom-1')).toBe(true);
    expect(merged.some((f) => f.name === 'Apple')).toBe(false);
  });
});

describe('FODMAP load', () => {
  const avo = byName('Avocado');
  const corn = byName('Corn, sweet (cob)');

  it('sums moderate servings and warns on stacking', () => {
    const items = [
      { foodId: avo.id, servingIndex: 1, qty: 1 }, // sorbitol moderate
      { foodId: corn.id, servingIndex: 1, qty: 1 }, // sorbitol moderate
    ];
    expect(computeLoad(items, foodMap).sorbitol).toBe(2);
    const w = stackingWarnings(items, foodMap);
    expect(w).toHaveLength(1);
    expect(w[0].group).toBe('sorbitol');
  });

  it('does not warn for low servings or a single high item', () => {
    expect(stackingWarnings([{ foodId: avo.id, servingIndex: 0, qty: 3 }], foodMap)).toHaveLength(0);
    expect(stackingWarnings([{ foodId: avo.id, servingIndex: 2, qty: 1 }], foodMap)).toHaveLength(0);
  });

  it('adds up low servings that share a FODMAP', () => {
    const strawberries = byName('Strawberries'); // 65g low, 130g moderate fructose
    const mango = byName('Mango'); // 40g low, 80g high fructose
    const mandarin = byName('Mandarin'); // 90g low, 100g high fructose
    const low = (f: Food) => ({ foodId: f.id, servingIndex: 0, qty: 1 });
    expect(computeLoad([low(strawberries)], foodMap).fructose).toBeCloseTo(0.5);
    // A low amount on its own always stays below a moderate load, even just under a high tier.
    expect(computeLoad([low(mandarin)], foodMap).fructose).toBeLessThan(1);
    expect(stackingWarnings([low(mandarin)], foodMap)).toHaveLength(0);

    const w = stackingWarnings([low(strawberries), low(mango)], foodMap);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ group: 'fructose', level: 'moderate', allLow: true });
    const fruitSalad = [low(strawberries), low(mango), low(mandarin), low(byName('Raspberries')), low(byName('Orange'))];
    expect(computeLoad(fruitSalad, foodMap).fructose).toBeGreaterThanOrEqual(2);
    expect(stackingWarnings(fruitSalad, foodMap)[0]).toMatchObject({ group: 'fructose', level: 'high' });
  });

  it('does not warn when a small extra does not change the level', () => {
    const items = [
      { foodId: avo.id, servingIndex: 0, qty: 1 }, // low, half-way to moderate sorbitol
      { foodId: corn.id, servingIndex: 1, qty: 1 }, // sorbitol moderate
    ];
    expect(computeLoad(items, foodMap).sorbitol).toBeCloseTo(1.5);
    expect(stackingWarnings(items, foodMap)).toHaveLength(0);
  });

  it('rates the total amount eaten, not the picked serving', () => {
    // 2 × 1/8 avocado = 60g = the tested moderate tier.
    const twoEighths = resolveItem({ foodId: avo.id, servingIndex: 0, qty: 2 }, foodMap);
    expect(twoEighths.grams).toBe(60);
    expect(twoEighths.level).toBe('moderate');
    expect(computeLoad([{ foodId: avo.id, servingIndex: 0, qty: 2 }], foodMap).sorbitol).toBe(1);
    // 2 × 1/4 avocado = 120g, past the 80g high tier: high, counted 1.5× that amount.
    const twoQuarters = resolveItem({ foodId: avo.id, servingIndex: 1, qty: 2 }, foodMap);
    expect(twoQuarters.level).toBe('high');
    expect(computeLoad([{ foodId: avo.id, servingIndex: 1, qty: 2 }], foodMap).sorbitol).toBeCloseTo(3);
    // A single food over its limit is flagged on the item, not as stacking.
    expect(stackingWarnings([{ foodId: avo.id, servingIndex: 1, qty: 2 }], foodMap)).toHaveLength(0);
  });

  it('flags amounts above the largest tested low serving as untested', () => {
    const spinach = byName('Spinach, baby'); // 75g low, 150g moderate
    const r1 = resolveItem({ foodId: spinach.id, servingIndex: 0, qty: 1.5 }, foodMap); // 112g
    expect(r1.level).toBe('low');
    expect(r1.beyondTested).toBe(true); // past the 75g low limit, before the 150g moderate amount
    expect(r1.nextTier?.label).toBe('3 cups (150g)');
    expect(resolveItem({ foodId: spinach.id, servingIndex: 0, qty: 1 }, foodMap).beyondTested).toBe(false);
    expect(resolveItem({ foodId: spinach.id, servingIndex: 0, qty: 2 }, foodMap).level).toBe('moderate'); // 150g
    const choy = byName('Choy sum'); // only tested at 85g, low
    expect(resolveItem({ foodId: choy.id, servingIndex: 0, qty: 1 }, foodMap).beyondTested).toBe(false);
    expect(resolveItem({ foodId: choy.id, servingIndex: 0, qty: 2 }, foodMap).beyondTested).toBe(true);
    // FODMAP-free foods have no limit.
    expect(resolveItem({ foodId: byName('Carrot').id, servingIndex: 0, qty: 6 }, foodMap).beyondTested).toBe(false);
  });
});

describe('dates & phase', () => {
  it('date math', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(daysBetween('2026-01-01', '2026-01-15')).toBe(14);
    expect(eliminationDay('2026-01-01', '2026-01-01')).toBe(1);
  });

  it('readiness requires 14 days and settled symptoms', () => {
    const scores = new Map<string, number>();
    for (let i = 0; i < 7; i++) scores.set(addDays('2026-01-01', i), 7);
    expect(reintroReadiness('2026-01-01', '2026-01-10', scores).ready).toBe(false);
    for (let i = 10; i < 16; i++) scores.set(addDays('2026-01-01', i), 2);
    const r = reintroReadiness('2026-01-01', '2026-01-16', scores);
    expect(r.minDaysMet).toBe(true);
    expect(r.improved).toBe(true);
    expect(r.ready).toBe(true);
  });

  it('tracks active challenge, washout and remaining groups', () => {
    const cs: Challenge[] = [
      { group: 'lactose', food: 'Milk', startDate: '2026-02-01', doses: [], status: 'done', outcome: 'tolerated', washoutUntil: '2026-02-08' },
      { group: 'fructose', food: 'Honey', startDate: '2026-02-08', doses: [{ amount: '1 tsp', severity: 1 }, { amount: '2 tsp' }, { amount: '1 tbsp' }], status: 'active' },
    ];
    const s = reintroState(cs, '2026-02-09');
    expect(s.active?.group).toBe('fructose');
    expect(s.nextDose).toBe(1);
    expect(s.remaining).not.toContain('lactose');
    expect(s.remaining).not.toContain('fructose');
    expect(reintroState([cs[0]], '2026-02-05').inWashout).toBe(true);
    expect(reintroState([cs[0]], '2026-02-08').inWashout).toBe(false);
  });
});

describe('challenge outcome', () => {
  it('threshold scales with baseline', () => {
    expect(reactionThreshold(0)).toBe(4);
    expect(reactionThreshold(3)).toBe(6);
  });

  it('classifies outcomes', () => {
    const d = (...sev: (number | undefined)[]) => sev.map((severity) => ({ amount: 'x', severity }));
    expect(evaluateChallenge(d(1, 2, 2))).toMatchObject({ outcome: 'tolerated', toleratedDose: 2, finished: true });
    expect(evaluateChallenge(d(1, 6, undefined))).toMatchObject({ outcome: 'partial', toleratedDose: 0, reactedAt: 1, finished: true });
    expect(evaluateChallenge(d(7, undefined, undefined))).toMatchObject({ outcome: 'not-tolerated', toleratedDose: -1 });
    expect(evaluateChallenge(d(1, undefined, undefined))).toMatchObject({ finished: false, toleratedDose: 0 });
  });
});

describe('personal tolerance', () => {
  const done = (group: Challenge['group'], outcome: Challenge['outcome']): Challenge => ({
    group, food: 'x', startDate: '2026-03-01', doses: [], status: 'done', outcome,
  });

  it('uses fructan source when known, worst result otherwise', () => {
    const tol = toleranceMap([done('fructan-wheat', 'tolerated'), done('fructan-garlic', 'not-tolerated')]);
    expect(personalVerdict(byName('Bread, white wheat'), tol)).toBe('ok');
    expect(personalVerdict(byName('Garlic'), tol)).toBe('avoid');
    expect(personalVerdict(byName('Okra'), tol)).toBe('avoid');
    expect(personalVerdict(byName('Carrot'), tol)).toBeUndefined();
    expect(personalVerdict(byName('Honey'), tol)).toBe('untested');
  });
});

describe('correlations', () => {
  it('averages worst symptom within 24h after a food', () => {
    const apple = byName('Apple');
    const meals: Meal[] = [
      { date: '2026-01-01', time: '12:00', type: 'lunch', items: [{ foodId: apple.id, servingIndex: 0, qty: 1 }] },
      { date: '2026-01-02', time: '12:00', type: 'lunch', items: [{ foodId: apple.id, servingIndex: 0, qty: 1 }] },
    ];
    const s = (date: string, time: string, v: number): SymptomEntry => ({ date, time, bloating: v, pain: 0, gas: 0, nausea: 0 });
    const symptoms = [s('2026-01-01', '15:00', 6), s('2026-01-02', '18:00', 8), s('2026-01-05', '10:00', 1)];
    const { stats, baseline } = foodSymptomStats(meals, symptoms, foodMap);
    expect(baseline).toBe(5);
    expect(stats[0]).toMatchObject({ foodId: apple.id, times: 2, avgAfter: 7 });
  });
});

describe('backup', () => {
  it('round-trips all data', async () => {
    const db = new FodmapDB('test-backup');
    await db.meals.add({ date: '2026-01-01', time: '08:00', type: 'breakfast', items: [] });
    await db.settings.put({ key: 'app', onboarded: true, phase: 'elimination', elimStart: '2026-01-01', theme: 'system' });
    const custom: Food = { id: 'c1', name: 'Custom', category: 'Snacks', servings: [{ label: '1', level: 'low', groups: {} }], custom: true };
    await db.foods.put(custom);
    await db.favourites.put({ id: 'carrot' });
    const dump = JSON.parse(JSON.stringify(await exportData(db)));
    await db.meals.clear();
    await db.meals.add({ date: '2099-01-01', time: '08:00', type: 'snack', items: [] });
    await importData(db, dump);
    expect(await db.meals.toArray()).toHaveLength(1);
    expect((await db.meals.toArray())[0].date).toBe('2026-01-01');
    expect(await db.foods.get('c1')).toEqual(custom);
    expect(await db.favourites.toArray()).toEqual([{ id: 'carrot' }]);
    await expect(importData(db, { nope: true })).rejects.toThrow();
    db.close();
  });
});
