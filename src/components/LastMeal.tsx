import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { MIN_MEAL_GAP_HOURS, fmtDuration, mealTitle, neighbourMeals, tooSoon } from '../lib/mealTiming';

/** "Last meal: 2h 15m ago", updating every minute. */
export function LastMeal() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  // Only meals from the last few days matter for "since last meal".
  const recent = useLiveQuery(() => {
    const since = new Date(Date.now() - 7 * 86400000);
    const from = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
    return db.meals.where('date').aboveOrEqual(from).toArray();
  }, []);
  if (!recent) return null;
  const { prev } = neighbourMeals(recent, now);
  if (!prev) return null;
  const gap = now - prev.t;
  const soon = tooSoon(gap);
  const readyAt = new Date(prev.t + MIN_MEAL_GAP_HOURS * 3600000);
  return (
    <div className={`last-meal ${soon ? 'soon' : ''}`}>
      <span>
        Last meal <b>{fmtDuration(gap)} ago</b>
        <span className="muted">
          {' '}
          · {mealTitle(prev.meal)} at {prev.meal.time}
        </span>
      </span>
      {soon && (
        <span className="small">
          Next meal from {readyAt.toTimeString().slice(0, 5)} ({MIN_MEAL_GAP_HOURS}h gap)
        </span>
      )}
    </div>
  );
}
