import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '../data/foods';
import type { Settings } from '../types';
import { buildLlmExport } from './llmExport';

const foods = new Map(SEED_FOODS.map((f) => [f.id, f]));
const id = (name: string) => SEED_FOODS.find((f) => f.name === name)!.id;
const settings: Settings = { key: 'app', onboarded: true, phase: 'elimination', elimStart: '2026-01-01', theme: 'system' };

describe('LLM export', () => {
  const text = buildLlmExport({
    start: '2026-01-10',
    end: '2026-01-12',
    today: '2026-01-12',
    settings,
    foods,
    focus: 'Why am I bloated at night?',
    meals: [
      {
        date: '2026-01-10',
        time: '12:30',
        type: 'lunch',
        items: [
          { foodId: id('Avocado'), servingIndex: 1, qty: 1 },
          { foodId: id('Corn, sweet (cob)'), servingIndex: 1, qty: 1 },
        ],
        note: 'cafe',
      },
      { date: '2026-01-20', time: '12:00', type: 'lunch', items: [{ foodId: id('Apple'), servingIndex: 0, qty: 1 }] },
    ],
    symptoms: [{ date: '2026-01-10', time: '20:00', bloating: 6, pain: 2, gas: 3, nausea: 0 }],
    bowel: [{ date: '2026-01-11', time: '08:00', bristol: 6, urgency: 2 }],
    days: [{ date: '2026-01-10', overall: 4, stress: 7, sleepHours: 6, period: true, notes: 'long day' }],
    challenges: [
      {
        group: 'lactose',
        food: 'Milk',
        startDate: '2026-01-11',
        status: 'active',
        doses: [{ amount: '1/2 cup', date: '2026-01-11', severity: 2 }, { amount: '3/4 cup' }, { amount: '1 cup' }],
      },
    ],
  });

  it('includes the prompt, context and focus', () => {
    expect(text).toContain('## Instructions');
    expect(text).toContain('Why am I bloated at night?');
    expect(text).toContain('Elimination, started 2026-01-01 (day 12)');
    expect(text).toContain('Lactose with Milk');
  });

  it('logs each day chronologically with FODMAP details', () => {
    expect(text).toMatch(/^### .*\(2026-01-10\)$/m);
    expect(text).toContain('Avocado, 1/4 avocado (60g) [moderate: sorbitol; GL 0]');
    expect(text).toContain('Corn, sweet (cob), 1/2 cob (60g) [moderate: sorbitol; GL 10 per 1 medium cob]');
    expect(text).toContain('Meal load: sorbitol 2 (stacking: sorbitol)');
    expect(text).toContain('stress 7/10');
    expect(text).toContain('on period');
    expect(text).toContain('bloating 6, pain 2, gas 3, nausea 0 (worst 6)');
    expect(text).toContain('Bristol 6');
    expect(text).toContain('Challenge dose: Lactose, dose 1 = 1/2 cup of Milk');
    expect(text.indexOf('12:30 Lunch')).toBeLessThan(text.indexOf('20:00 Symptoms'));
  });

  it('excludes data outside the range and notes empty days', () => {
    expect(text).not.toContain('Apple');
    expect(text).toContain('1 day(s) in the range had nothing logged');
  });

  it('includes psyllium husk as a low-FODMAP food', () => {
    expect(foods.get('psyllium-husk')?.servings[0].level).toBe('low');
  });
});
