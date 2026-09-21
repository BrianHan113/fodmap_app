import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import { useFoods, useSettings } from '../db/hooks';
import { computeLoad, stackingWarnings } from '../lib/fodmapLoad';
import { mealTitle } from '../lib/mealTiming';
import { macroLine, sumNutrition } from '../lib/nutrition';
import { entryScore, severityWord } from '../lib/symptoms';
import { GROUP_LABEL } from '../types';
import { BRISTOL } from '../data/bristol';
import { Icon } from './Icon';
import { LoadBars } from './LoadBars';
import { NutritionSummary } from './NutritionSummary';
import { Empty, LevelDot } from './ui';

export function DayTimeline({ date }: { date: string }) {
  const { map } = useFoods();
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const [meals, symptoms, bowel, day] = await Promise.all([
      db.meals.where('date').equals(date).toArray(),
      db.symptoms.where('date').equals(date).toArray(),
      db.bowel.where('date').equals(date).toArray(),
      db.days.get(date),
    ]);
    return { meals, symptoms, bowel, day };
  }, [date]);

  if (!data) return null;
  const { meals, symptoms, bowel, day } = data;
  const allItems = meals.flatMap((m) => m.items);
  const dayLoad = computeLoad(allItems, map);
  const dayNutrition = sumNutrition(allItems, map);
  const hasTargets = !!settings.targets && Object.values(settings.targets).some((v) => v);

  type Ev = { time: string; key: string; node: React.ReactNode };
  const events: Ev[] = [
    ...meals.map((m) => {
      const warnings = stackingWarnings(m.items, map);
      return {
        time: m.time,
        key: `m${m.id}`,
        node: (
          <Link to={`/meal/${m.id}`} className="event">
            <span className="event-time">{m.time}</span>
            <div className="grow">
              <div className="event-title">{mealTitle(m)}</div>
              <ul className="event-items">
                {m.items.map((i, idx) => {
                  const f = map.get(i.foodId);
                  const s = f?.servings[i.servingIndex];
                  return (
                    <li key={idx}>
                      {s && <LevelDot level={s.level} />} {i.qty !== 1 && `${i.qty}× `}
                      {f?.name ?? 'Unknown food'} <span className="muted">· {s?.label}</span>
                    </li>
                  );
                })}
              </ul>
              {warnings.map((w) => (
                <div key={w.group} className="warn small">
                  <Icon name="warn" size={14} /> {GROUP_LABEL[w.group]} stacks up in this meal
                </div>
              ))}
              {m.items.length > 0 && <div className="item-macros">{macroLine(sumNutrition(m.items, map).total)}</div>}
              {m.note && <div className="muted small">{m.note}</div>}
            </div>
          </Link>
        ),
      };
    }),
    ...symptoms.map((s) => {
      const score = entryScore(s);
      return {
        time: s.time,
        key: `s${s.id}`,
        node: (
          <Link to={`/symptoms/${s.id}`} className="event">
            <span className="event-time">{s.time}</span>
            <div className="grow">
              <div className="event-title">
                Symptoms: <span className={`sev sev-${severityWord(score)}`}>{score}/10 {severityWord(score)}</span>
              </div>
              <div className="muted small">
                Bloating {s.bloating} · Pain {s.pain} · Gas {s.gas} · Nausea {s.nausea}
              </div>
              {s.note && <div className="muted small">{s.note}</div>}
            </div>
          </Link>
        ),
      };
    }),
    ...bowel.map((b) => ({
      time: b.time,
      key: `b${b.id}`,
      node: (
        <Link to={`/bowel/${b.id}`} className="event">
          <span className="event-time">{b.time}</span>
          <div className="grow">
            <div className="event-title">Bowel movement: type {b.bristol}</div>
            <div className="muted small">
              {BRISTOL[b.bristol - 1]?.short}
              {b.urgency > 0 && ` · urgency ${b.urgency}/3`}
            </div>
          </div>
        </Link>
      ),
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <>
      {(allItems.length > 0 || hasTargets) && (
        <section className="card">
          <h2>Nutrition</h2>
          <NutritionSummary total={dayNutrition.total} missing={dayNutrition.missing} targets={hasTargets ? settings.targets : undefined} />
          {!hasTargets && <p className="muted small">Set daily targets in Settings to see progress bars.</p>}
        </section>
      )}
      {allItems.length > 0 && (
        <section className="card">
          <h2>FODMAP load</h2>
          <LoadBars load={dayLoad} />
          <p className="muted small">Each moderate serving adds 1, each high serving adds 2. Spread moderate foods across meals.</p>
        </section>
      )}
      <section className="card">
        <h2>Log</h2>
        {events.length ? <div className="events">{events.map((e) => <div key={e.key}>{e.node}</div>)}</div> : <Empty>Nothing logged yet.</Empty>}
      </section>
      <Link to={`/day/${date}`} className="card link-card">
        <div className="grow">
          <h2>Daily check-in</h2>
          {day ? (
            <p className="muted small">
              {day.overall !== undefined && `Overall ${day.overall}/10 · `}
              {day.stress !== undefined && `Stress ${day.stress}/10 · `}
              {day.sleepHours !== undefined && `Sleep ${day.sleepHours}h · `}
              {day.water !== undefined && `${day.water} glasses water`}
              {day.notes && <><br />{day.notes}</>}
            </p>
          ) : (
            <p className="muted small">How was your day overall? Stress, sleep, exercise, notes.</p>
          )}
        </div>
        <Icon name="chevron" />
      </Link>
    </>
  );
}
