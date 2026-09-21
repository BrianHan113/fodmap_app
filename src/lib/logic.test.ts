import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { SEED_FOODS, buildFoods } from '../data/foods';
import { FodmapDB } from '../db/db';
import type { Challenge, Food, Meal, SymptomEntry } from '../types';
import { exportData, importData } from './backup';
import { evaluateChallenge, reactionThreshold } from './challengeOutcome';
import { foodSymptomStats } from './correlations';
import { addDays, daysBetween } from './dates';
import { computeLoad, stackingWarnings } from './fodmapLoad';
import { mergeFoods, safeServing, sortFoods } from './foods';
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

  it('warns for double portions of a moderate serving', () => {
    expect(stackingWarnings([{ foodId: avo.id, servingIndex: 1, qty: 2 }], foodMap)).toHaveLength(1);
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
    const dump = JSON.parse(JSON.stringify(await exportData(db)));
    await db.meals.clear();
    await db.meals.add({ date: '2099-01-01', time: '08:00', type: 'snack', items: [] });
    await importData(db, dump);
    expect(await db.meals.toArray()).toHaveLength(1);
    expect((await db.meals.toArray())[0].date).toBe('2026-01-01');
    expect(await db.foods.get('c1')).toEqual(custom);
    await expect(importData(db, { nope: true })).rejects.toThrow();
    db.close();
  });
});
