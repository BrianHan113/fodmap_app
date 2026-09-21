import type { SymptomEntry } from '../types';

export const SYMPTOM_KEYS = ['bloating', 'pain', 'gas', 'nausea'] as const;
export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

export const SYMPTOM_LABEL: Record<SymptomKey, string> = {
  bloating: 'Bloating',
  pain: 'Abdominal pain',
  gas: 'Gas / wind',
  nausea: 'Nausea',
};

/** Severity of one entry = its worst symptom (0-10). */
export function entryScore(e: SymptomEntry): number {
  return Math.max(...SYMPTOM_KEYS.map((k) => e[k] ?? 0));
}

/** Worst symptom score per date. Dates with no entries are absent. */
export function dailyScores(entries: SymptomEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) out.set(e.date, Math.max(out.get(e.date) ?? 0, entryScore(e)));
  return out;
}

export function average(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

export function severityWord(n: number): string {
  if (n <= 0) return 'none';
  if (n <= 3) return 'mild';
  if (n <= 6) return 'moderate';
  return 'severe';
}
