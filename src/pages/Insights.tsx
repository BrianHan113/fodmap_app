import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../components/Icon';
import { Header, Segmented } from '../components/ui';
import { CHALLENGES } from '../data/challenges';
import { BRISTOL } from '../data/bristol';
import { db } from '../db/db';
import { useChallenges, useFoods } from '../db/hooks';
import { OUTCOME_LABEL } from '../lib/challengeOutcome';
import { foodSymptomStats } from '../lib/correlations';
import { addDays, dateRange, formatDate, today } from '../lib/dates';
import { average, dailyScores } from '../lib/symptoms';
import { toleranceMap } from '../lib/tolerance';
import type { DayLog } from '../types';

const AXIS = { fontSize: 11, fill: 'var(--muted)' };
const TOOLTIP = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' },
  labelStyle: { color: 'var(--muted)' },
};

export default function Insights() {
  const [range, setRange] = useState(30);
  const end = today();
  const start = addDays(end, -(range - 1));
  const { map } = useFoods();
  const challenges = useChallenges();

  const data = useLiveQuery(async () => {
    const [symptoms, bowel, days, meals] = await Promise.all([
      db.symptoms.where('date').between(start, end, true, true).toArray(),
      db.bowel.where('date').between(start, end, true, true).toArray(),
      db.days.where('date').between(start, end, true, true).toArray(),
      db.meals.where('date').between(start, end, true, true).toArray(),
    ]);
    return { symptoms, bowel, days, meals };
  }, [start, end]);

  const tol = useMemo(() => toleranceMap(challenges), [challenges]);

  const derived = useMemo(() => {
    if (!data) return null;
    const scores = dailyScores(data.symptoms);
    const dayMap = new Map(data.days.map((d) => [d.date, d]));
    const trend = dateRange(start, end).map((d) => ({
      date: formatDate(d, { month: 'short', day: 'numeric' }),
      symptoms: scores.get(d) ?? null,
      stress: dayMap.get(d)?.stress ?? null,
      sleep: dayMap.get(d)?.sleepHours ?? null,
    }));
    const bristol = BRISTOL.map((b) => ({ type: String(b.type), count: data.bowel.filter((x) => x.bristol === b.type).length, label: b.short }));
    const corr = foodSymptomStats(data.meals, data.symptoms, map);

    const days = data.days;
    const split = (pred: (d: DayLog) => boolean) =>
      average(days.filter((d) => pred(d) && scores.has(d.date)).map((d) => scores.get(d.date)!));
    const factors = [
      { label: 'High stress (6+)', a: split((d) => (d.stress ?? 0) >= 6), b: split((d) => d.stress !== undefined && d.stress < 6), bLabel: 'lower stress' },
      { label: 'Short sleep (<6.5h)', a: split((d) => d.sleepHours !== undefined && d.sleepHours < 6.5), b: split((d) => (d.sleepHours ?? 0) >= 6.5), bLabel: 'more sleep' },
      { label: 'Exercised (20+ min)', a: split((d) => (d.exerciseMin ?? 0) >= 20), b: split((d) => d.exerciseMin !== undefined && d.exerciseMin < 20), bLabel: 'less exercise' },
    ].filter((f) => f.a !== undefined && f.b !== undefined);

    return { scores, trend, bristol, corr, factors, avg: average([...scores.values()]) };
  }, [data, map, start, end]);

  return (
    <>
      <Header title="Insights" />
      <Link to="/export" className="card link-card">
        <div className="grow">
          <h2>Export for AI analysis</h2>
          <p className="muted small">Copy your diary for a date range with a ready-made prompt, then paste it into an AI assistant to find patterns.</p>
        </div>
        <Icon name="chevron" />
      </Link>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: 14, label: '2 weeks' },
          { value: 30, label: '30 days' },
          { value: 90, label: '90 days' },
        ]}
      />

      {derived && (
        <>
          <section className="card">
            <h2>Symptoms & stress</h2>
            <p className="muted small">
              Daily worst symptom and stress, both 0–10.
              {derived.avg !== undefined && ` Average worst symptom: ${derived.avg.toFixed(1)}/10 over ${derived.scores.size} logged days.`}
            </p>
            {derived.scores.size ? (
              <div className="chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={derived.trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={AXIS} tickLine={false} axisLine={false} />
                    <Tooltip {...TOOLTIP} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text)' }} />
                    <Line name="Worst symptom" dataKey="symptoms" stroke="var(--c-sym)" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                    <Line name="Stress" dataKey="stress" stroke="var(--c-stress)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="empty">Log symptoms to see your trend.</p>
            )}
          </section>

          {derived.factors.length > 0 && (
            <section className="card">
              <h2>What else affects you</h2>
              <p className="muted small">Average worst symptom on days with each factor vs. without it.</p>
              <table className="table">
                <tbody>
                  {derived.factors.map((f) => (
                    <tr key={f.label}>
                      <td>{f.label}</td>
                      <td className="num">{f.a!.toFixed(1)}</td>
                      <td className="muted small">vs {f.b!.toFixed(1)} with {f.bLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="card">
            <h2>Foods & symptoms</h2>
            <p className="muted small">
              Average worst symptom in the 24h after eating each food (foods eaten 2+ times with a symptom log afterwards). This is a hint, not proof: use
              reintroduction challenges to confirm.
            </p>
            {derived.corr.stats.length ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Food</th>
                    <th className="num">Times</th>
                    <th className="num">After</th>
                    <th className="num">vs avg</th>
                  </tr>
                </thead>
                <tbody>
                  {derived.corr.stats.slice(0, 15).map((s) => (
                    <tr key={s.foodId}>
                      <td>
                        <Link to={`/foods/${s.foodId}`}>{s.name}</Link>
                      </td>
                      <td className="num">{s.times}</td>
                      <td className="num">{s.avgAfter.toFixed(1)}</td>
                      <td className={`num ${s.delta >= 1.5 ? 'text-bad' : s.delta <= -1 ? 'text-good' : ''}`}>
                        {s.delta >= 0 ? '+' : ''}
                        {s.delta.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">Not enough data yet. Keep logging meals and symptoms.</p>
            )}
          </section>

          <section className="card">
            <h2>Stool types</h2>
            {data!.bowel.length ? (
              <div className="chart">
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={derived.bristol} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis dataKey="type" tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                    <Tooltip {...TOOLTIP} cursor={{ fill: 'var(--grid)' }} formatter={(v) => [v, 'Times']} labelFormatter={(t) => `Type ${t}: ${BRISTOL[Number(t) - 1]?.short}`} />
                    <Bar dataKey="count" fill="var(--c-stress)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="muted small">Types 3–4 are ideal; 1–2 lean constipated, 6–7 lean diarrhoea.</p>
              </div>
            ) : (
              <p className="empty">No bowel movements logged in this period.</p>
            )}
          </section>
        </>
      )}

      <section className="card">
        <h2>Your tolerance map</h2>
        <ul className="tolmap">
          {CHALLENGES.map((c) => {
            const r = tol[c.group];
            return (
              <li key={c.group}>
                <span className="grow">{c.label}</span>
                {r?.outcome ? (
                  <span className={`badge outcome-${r.outcome}`}>
                    {OUTCOME_LABEL[r.outcome]}
                    {r.outcome === 'partial' && ` (≤ ${r.doses[r.toleratedDose ?? 0]?.amount})`}
                  </span>
                ) : (
                  <span className="badge">Not tested</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
