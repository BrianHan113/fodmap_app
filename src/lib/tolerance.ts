import { CHALLENGE_BY_GROUP } from '../data/challenges';
import type { Challenge, ChallengeGroup, Food, Group, Outcome } from '../types';

export type ToleranceMap = Partial<Record<ChallengeGroup, Challenge>>;

/** Latest completed challenge per group. */
export function toleranceMap(challenges: Challenge[]): ToleranceMap {
  const out: ToleranceMap = {};
  for (const c of challenges) {
    if (c.status !== 'done' || !c.outcome) continue;
    const prev = out[c.group];
    if (!prev || c.startDate >= prev.startDate) out[c.group] = c;
  }
  return out;
}

export type Verdict = 'ok' | 'limit' | 'avoid' | 'untested';

const RANK: Record<Verdict, number> = { ok: 0, untested: 1, limit: 2, avoid: 3 };
const FROM_OUTCOME: Record<Outcome, Verdict> = { tolerated: 'ok', partial: 'limit', 'not-tolerated': 'avoid' };

function groupVerdict(group: Group, food: Food, tol: ToleranceMap): Verdict {
  if (group === 'fructan') {
    if (food.fructanSource) {
      const c = tol[`fructan-${food.fructanSource}` as ChallengeGroup];
      return c?.outcome ? FROM_OUTCOME[c.outcome] : 'untested';
    }
    // Unknown fructan source: be conservative and use the worst tested fructan result.
    const results = (['fructan-wheat', 'fructan-onion', 'fructan-garlic'] as const)
      .map((g) => tol[g]?.outcome)
      .filter((o): o is Outcome => !!o)
      .map((o) => FROM_OUTCOME[o]);
    if (!results.length) return 'untested';
    return results.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
  }
  const key = (Object.keys(CHALLENGE_BY_GROUP) as ChallengeGroup[]).find((g) => CHALLENGE_BY_GROUP[g].fodmap === group);
  const c = key ? tol[key] : undefined;
  return c?.outcome ? FROM_OUTCOME[c.outcome] : 'untested';
}

/** Personal verdict for a food based on your reintroduction results. Undefined for low-FODMAP foods. */
export function personalVerdict(food: Food, tol: ToleranceMap): Verdict | undefined {
  const groups = new Set<Group>();
  for (const s of food.servings) for (const g of Object.keys(s.groups) as Group[]) groups.add(g);
  if (!groups.size) return undefined;
  let worst: Verdict = 'ok';
  for (const g of groups) {
    const v = groupVerdict(g, food, tol);
    if (RANK[v] > RANK[worst]) worst = v;
  }
  return worst;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  ok: 'OK for you',
  limit: 'Small amounts OK',
  avoid: 'Avoid for now',
  untested: 'Not yet tested',
};
