import { BRISTOL } from '../data/bristol';
import { CHALLENGE_BY_GROUP } from '../data/challenges';
import { GROUPS, GROUP_LABEL, type BowelEntry, type Challenge, type DayLog, type Food, type Group, type Meal, type Settings, type SymptomEntry } from '../types';
import { OUTCOME_LABEL } from './challengeOutcome';
import { dateRange, formatDate } from './dates';
import { computeLoad, stackingWarnings } from './fodmapLoad';
import { eliminationDay } from './phase';
import { average, entryScore } from './symptoms';

export interface LlmExportInput {
  start: string;
  end: string;
  today: string;
  settings: Settings;
  meals: Meal[];
  symptoms: SymptomEntry[];
  bowel: BowelEntry[];
  days: DayLog[];
  challenges: Challenge[];
  foods: Map<string, Food>;
  /** Optional extra question or focus from the user. */
  focus?: string;
}

const PHASE_LABEL = { elimination: 'Elimination', reintroduction: 'Reintroduction', personalization: 'Personalization' };
const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

const INSTRUCTIONS = `You are helping me follow the low-FODMAP diet for IBS-type gut symptoms, using the Monash University approach: elimination (2–6 weeks) → reintroduction (one FODMAP group at a time, 3 increasing doses over 3 days, then a washout) → personalization. Below is my own diary exported from a tracking app for the date range shown.

Please analyse it and give me:

1. **Summary.** A short overview of how this period went: symptom levels and trend, stool pattern, and how consistently I logged.
2. **Patterns.** Links between symptoms and specific foods, FODMAP groups, portion sizes, meal timing or stacking (several moderate servings of the same FODMAP in one sitting). Symptoms usually follow a trigger by roughly 2–24 hours, sometimes up to 48. Also weigh non-food factors: stress, sleep, exercise, hydration and menstrual cycle. Cite specific dates. Separate strong patterns from weak or coincidental ones, and don't overstate causation from small samples.
3. **Protocol check.** Where I am in the protocol and whether it's going to plan. In elimination: is it working, am I accidentally eating high-FODMAP foods or portions, and am I ready to start reintroduction? In reintroduction: interpret my challenge results, check they weren't confounded, and say what to test next and how.
4. **Suggested adjustments** for the next 1–2 weeks. Be concrete: foods to swap, portion changes, meals to restructure, what to log differently.
5. **Red flags.** Anything that suggests I should see a doctor or dietitian (e.g. persistent severe symptoms, blood in stool, unintended weight loss, night-time symptoms, no improvement after 6 weeks of elimination).
6. **Data gaps.** What's missing or unclear that would make the next analysis better.

Food ratings in the data (low / moderate / high, and which FODMAP groups) come from the app's database, which is approximate. Correct them where you know better. Finish with any clarifying questions you have for me.`;

const SCALES = `- Symptoms: bloating, abdominal pain, gas, nausea, each 0–10 (0 = none, 10 = worst). "Worst" = the highest of the four.
- Bowel movements: Bristol stool type 1–7 (3–4 ideal, 1–2 constipated, 6–7 diarrhoea); urgency 0–3.
- Daily check-in: overall gut day 0–10 (10 = great), mood 1–5, stress 0–10, sleep hours and quality 1–5, exercise minutes, water glasses.
- Meal FODMAP load per group: each moderate serving adds 1, each high serving adds 2 (≥2 in one meal = high load).
- GL = estimated glycaemic load per the typical serving stated (low ≤10, medium 11–19, high ≥20). It is separate from the FODMAP rating.`;

function fmtNum(n: number | undefined, digits = 1): string {
  return n === undefined ? 'n/a' : n.toFixed(digits);
}

function loadText(meal: Meal, foods: Map<string, Food>): string | undefined {
  const load = computeLoad(meal.items, foods);
  const parts = GROUPS.filter((g) => load[g] > 0).map((g) => `${GROUP_LABEL[g].toLowerCase()} ${load[g]}`);
  if (!parts.length) return undefined;
  const stacked = stackingWarnings(meal.items, foods).map((w) => GROUP_LABEL[w.group].toLowerCase());
  return `load: ${parts.join(', ')}${stacked.length ? ` (stacking: ${stacked.join(', ')})` : ''}`;
}

function mealLine(meal: Meal, foods: Map<string, Food>): string {
  const items = meal.items.map((i) => {
    const f = foods.get(i.foodId);
    const s = f?.servings[i.servingIndex];
    const qty = i.qty !== 1 ? `${i.qty}× ` : '';
    const groups = s ? (Object.keys(s.groups) as Group[]).map((g) => GROUP_LABEL[g].toLowerCase()).join(', ') : '';
    const gl = f?.gl === undefined ? '' : f.gl === 0 ? '; GL 0' : `; GL ${f.gl} per ${f.glServing}`;
    const level = f?.fodmapFree ? 'no FODMAPs' : s?.level;
    const rating = s ? ` [${level}${groups ? `: ${groups}` : ''}${gl}]` : '';
    return `${f?.name ?? 'Unknown food'}, ${qty}${s?.label ?? '?'}${rating}`;
  });
  const load = loadText(meal, foods);
  return `- ${meal.time} ${MEAL_LABEL[meal.type]}: ${items.join('; ')}${load ? `. Meal ${load}` : ''}${meal.note ? `. Note: ${meal.note}` : ''}`;
}

function checkinLine(d: DayLog): string {
  const parts = [
    d.overall !== undefined && `overall ${d.overall}/10`,
    d.mood !== undefined && `mood ${d.mood}/5`,
    d.stress !== undefined && `stress ${d.stress}/10`,
    d.sleepHours !== undefined && `sleep ${d.sleepHours}h${d.sleepQuality !== undefined ? ` (quality ${d.sleepQuality}/5)` : ''}`,
    d.exerciseMin !== undefined && `exercise ${d.exerciseMin} min`,
    d.water !== undefined && `water ${d.water} glasses`,
    d.period && 'on period',
  ].filter(Boolean);
  return `- Check-in: ${parts.join(', ')}${d.notes ? `. Notes: ${d.notes}` : ''}`;
}

function challengeSummary(c: Challenge): string {
  const def = CHALLENGE_BY_GROUP[c.group];
  const doses = c.doses
    .map((d, i) => `dose ${i + 1} ${d.amount}${d.severity !== undefined ? ` → worst symptom ${d.severity}/10${d.date ? ` on ${d.date}` : ''}` : ' (not taken)'}`)
    .join('; ');
  const result =
    c.status === 'done' && c.outcome
      ? `${OUTCOME_LABEL[c.outcome]}${c.outcome === 'partial' ? ` (up to ${c.doses[c.toleratedDose ?? 0]?.amount})` : ''}`
      : 'in progress';
  return `- ${def.label} with ${c.food}, started ${c.startDate}: ${result}. ${doses}.${c.notes ? ` Notes: ${c.notes}` : ''}`;
}

export function buildLlmExport(input: LlmExportInput): string {
  const { start, end, today, settings, foods } = input;
  const inRange = <T extends { date: string }>(xs: T[]) => xs.filter((x) => x.date >= start && x.date <= end);
  const meals = inRange(input.meals);
  const symptoms = inRange(input.symptoms);
  const bowel = inRange(input.bowel);
  const days = inRange(input.days);

  const out: string[] = [];
  out.push(`# FODMAP diary: ${formatDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} to ${formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`);
  out.push('', '## Instructions', '', INSTRUCTIONS);
  if (input.focus?.trim()) out.push('', `**My specific question / focus:** ${input.focus.trim()}`);

  // Context
  out.push('', '## My context', '');
  let phase = `- Current phase (as of ${today}): ${PHASE_LABEL[settings.phase]}`;
  if (settings.phase === 'elimination') phase += `, started ${settings.elimStart} (day ${eliminationDay(settings.elimStart, today)})`;
  else phase += `. Elimination started ${settings.elimStart}`;
  out.push(phase);
  const challenges = [...input.challenges].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (challenges.length) {
    out.push('- Reintroduction challenges so far:');
    for (const c of challenges) out.push(`  ${challengeSummary(c)}`);
  } else {
    out.push('- No reintroduction challenges yet.');
  }

  out.push('', '## Scales', '', SCALES);

  // Summary stats
  const worstByDay = new Map<string, number>();
  for (const s of symptoms) worstByDay.set(s.date, Math.max(worstByDay.get(s.date) ?? 0, entryScore(s)));
  const allDates = dateRange(start, end);
  const logged = allDates.filter((d) => meals.some((m) => m.date === d) || symptoms.some((s) => s.date === d) || days.some((x) => x.date === d) || bowel.some((b) => b.date === d));
  const worstDay = [...worstByDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const bristolAvg = average(bowel.map((b) => b.bristol));
  out.push('', '## Summary stats', '');
  out.push(`- Days in range: ${allDates.length}; days with any log: ${logged.length}`);
  out.push(`- Meals logged: ${meals.length}; symptom entries: ${symptoms.length} on ${worstByDay.size} days; bowel movements: ${bowel.length}; check-ins: ${days.length}`);
  out.push(`- Average daily worst symptom: ${fmtNum(average([...worstByDay.values()]))}/10${worstDay ? `; worst day ${worstDay[0]} (${worstDay[1]}/10)` : ''}`);
  if (bowel.length) out.push(`- Average Bristol type: ${fmtNum(bristolAvg)} (${(bowel.length / allDates.length).toFixed(1)} per day)`);
  const flagged = new Map<string, number>();
  for (const m of meals)
    for (const i of m.items) {
      const s = foods.get(i.foodId)?.servings[i.servingIndex];
      if (s && s.level !== 'low') flagged.set(i.foodId, (flagged.get(i.foodId) ?? 0) + 1);
    }
  if (flagged.size) {
    const list = [...flagged.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => `${foods.get(id)?.name ?? id} ×${n}`);
    out.push(`- Moderate/high-FODMAP servings eaten: ${list.join(', ')}`);
  }

  // Daily log
  out.push('', '## Daily log');
  const doseByDate = new Map<string, string[]>();
  for (const c of input.challenges)
    c.doses.forEach((d, i) => {
      if (!d.date) return;
      const line = `- Challenge dose: ${CHALLENGE_BY_GROUP[c.group].label}, dose ${i + 1} = ${d.amount} of ${c.food}${d.severity !== undefined ? ` (rated worst symptom ${d.severity}/10)` : ''}${d.notes ? `. Notes: ${d.notes}` : ''}`;
      doseByDate.set(d.date, [...(doseByDate.get(d.date) ?? []), line]);
    });

  let empty = 0;
  for (const date of allDates) {
    const dayMeals = meals.filter((m) => m.date === date);
    const daySym = symptoms.filter((s) => s.date === date);
    const dayBowel = bowel.filter((b) => b.date === date);
    const check = days.find((d) => d.date === date);
    const doses = doseByDate.get(date) ?? [];
    if (!dayMeals.length && !daySym.length && !dayBowel.length && !check && !doses.length) {
      empty++;
      continue;
    }
    out.push('', `### ${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })} (${date})`);
    if (check) out.push(checkinLine(check));
    out.push(...doses);
    type Ev = { time: string; line: string };
    const events: Ev[] = [
      ...dayMeals.map((m) => ({ time: m.time, line: mealLine(m, foods) })),
      ...daySym.map((s) => ({
        time: s.time,
        line: `- ${s.time} Symptoms: bloating ${s.bloating}, pain ${s.pain}, gas ${s.gas}, nausea ${s.nausea} (worst ${entryScore(s)})${s.note ? `. Note: ${s.note}` : ''}`,
      })),
      ...dayBowel.map((b) => ({
        time: b.time,
        line: `- ${b.time} Bowel movement: Bristol ${b.bristol} (${BRISTOL[b.bristol - 1]?.short.toLowerCase()}), urgency ${b.urgency}/3${b.note ? `. Note: ${b.note}` : ''}`,
      })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    out.push(...events.map((e) => e.line));
  }
  if (empty) out.push('', `_${empty} day(s) in the range had nothing logged._`);

  return out.join('\n') + '\n';
}
