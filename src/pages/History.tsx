import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header } from '../components/ui';
import { db } from '../db/db';
import { toISODate, today } from '../lib/dates';
import { dailyScores, severityWord } from '../lib/symptoms';

export default function History() {
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const from = toISODate(first);
  const to = toISODate(new Date(ym.y, ym.m + 1, 0));

  const data = useLiveQuery(async () => {
    const [symptoms, meals, days, challenges] = await Promise.all([
      db.symptoms.where('date').between(from, to, true, true).toArray(),
      db.meals.where('date').between(from, to, true, true).toArray(),
      db.days.where('date').between(from, to, true, true).toArray(),
      db.challenges.toArray(),
    ]);
    const doseDays = new Set(challenges.flatMap((c) => c.doses.map((d) => d.date).filter(Boolean)));
    return { scores: dailyScores(symptoms), mealDays: new Set(meals.map((m) => m.date)), checkins: new Set(days.map((d) => d.date)), doseDays };
  }, [from, to]);

  const shift = (n: number) => {
    const d = new Date(ym.y, ym.m + n, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
  };

  const lead = (first.getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(ym.y, ym.m, i + 1)))];
  const t = today();

  return (
    <>
      <Header title="Diary" />
      <section className="card">
        <div className="cal-head">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="back" />
          </button>
          <strong>{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            <Icon name="chevron" />
          </button>
        </div>
        <div className="cal">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="cal-dow">
              {d}
            </span>
          ))}
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const score = data?.scores.get(d);
            const cls = ['cal-day', score !== undefined ? `sev-bg-${severityWord(score)}` : '', d === t ? 'is-today' : '', d > t ? 'future' : ''].join(' ');
            return (
              <Link key={d} to={`/history/${d}`} className={cls}>
                <span>{Number(d.slice(8))}</span>
                <span className="cal-marks">
                  {data?.mealDays.has(d) && <i className="m-meal" />}
                  {data?.checkins.has(d) && <i className="m-check" />}
                  {data?.doseDays.has(d) && <i className="m-dose" />}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="legend small muted">
          Worst symptom: <span className="sw sev-bg-none" /> none <span className="sw sev-bg-mild" /> mild <span className="sw sev-bg-moderate" /> moderate{' '}
          <span className="sw sev-bg-severe" /> severe
        </div>
        <div className="legend small muted">
          <i className="m-meal" /> meals <i className="m-check" /> check-in <i className="m-dose" /> challenge dose
        </div>
      </section>
      <Link to={`/history/${t}`} className="btn block">
        Open today
      </Link>
    </>
  );
}
