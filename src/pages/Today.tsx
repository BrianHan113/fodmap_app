import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router-dom';
import { DayTimeline } from '../components/DayTimeline';
import { Icon } from '../components/Icon';
import { LastMeal } from '../components/LastMeal';
import { Header } from '../components/ui';
import { CHALLENGE_BY_GROUP, CHALLENGES } from '../data/challenges';
import { db } from '../db/db';
import { saveSettings, useChallenges, useSettings } from '../db/hooks';
import { formatDate, today } from '../lib/dates';
import { ELIM_MAX_DAYS, ELIM_MIN_DAYS, reintroReadiness, reintroState } from '../lib/phase';
import { dailyScores } from '../lib/symptoms';
import type { Settings } from '../types';

export default function Today() {
  const date = today();
  const settings = useSettings();

  return (
    <>
      <Header
        title={formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
        right={
          <Link to="/settings" className="icon-btn" aria-label="Settings">
            <Icon name="gear" />
          </Link>
        }
      />
      <PhaseCard settings={settings} />
      <LastMeal />
      <div className="quick">
        <Link to={`/meal/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🍽️</span>Meal
        </Link>
        <Link to={`/symptoms/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🌡️</span>Symptoms
        </Link>
        <Link to={`/bowel/new?date=${date}`} className="quick-btn">
          <span className="quick-icon">🚽</span>Bowel
        </Link>
        <Link to={`/day/${date}`} className="quick-btn">
          <span className="quick-icon">📝</span>Check-in
        </Link>
      </div>
      <DayTimeline date={date} />
    </>
  );
}

function PhaseCard({ settings }: { settings: Settings }) {
  const nav = useNavigate();
  const date = today();
  const symptoms = useLiveQuery(() => db.symptoms.toArray(), []) ?? [];
  const challenges = useChallenges();

  if (settings.phase === 'elimination') {
    const r = reintroReadiness(settings.elimStart, date, dailyScores(symptoms));
    const pct = Math.min(100, (r.day / ELIM_MAX_DAYS) * 100);
    return (
      <section className="card phase-card phase-elimination">
        <div className="phase-label">Phase 1 · Elimination</div>
        <div className="phase-big">Day {Math.max(r.day, 1)}</div>
        <div className="progress">
          <span style={{ width: `${pct}%` }} />
          <i style={{ left: `${(ELIM_MIN_DAYS / ELIM_MAX_DAYS) * 100}%` }} title="2 weeks" />
        </div>
        <div className="progress-legend">
          <span>Start</span>
          <span>2 wks</span>
          <span>6 wks</span>
        </div>
        <p>{r.message}</p>
        {r.ready && (
          <button
            className="btn primary"
            onClick={async () => {
              await saveSettings({ phase: 'reintroduction' });
              nav('/reintro');
            }}
          >
            Start reintroduction
          </button>
        )}
      </section>
    );
  }

  if (settings.phase === 'reintroduction') {
    const s = reintroState(challenges, date);
    let body: React.ReactNode;
    if (s.active && s.nextDose !== undefined) {
      const def = CHALLENGE_BY_GROUP[s.active.group];
      const dose = s.active.doses[s.nextDose];
      body = (
        <>
          <div className="phase-big">
            {def.label}: dose {s.nextDose + 1} of 3
          </div>
          <p>
            Today: <b>{dose?.amount}</b> of {s.active.food}. Keep everything else low-FODMAP, then log how you feel.
          </p>
          <Link to={`/reintro/${s.active.id}`} className="btn primary">
            Open challenge
          </Link>
        </>
      );
    } else if (s.inWashout) {
      body = (
        <>
          <div className="phase-big">Washout</div>
          <p>
            Back to strict low-FODMAP until <b>{formatDate(s.washoutUntil!)}</b>. Start the next challenge once you've had
            3 symptom-free days.
          </p>
        </>
      );
    } else if (s.remaining.length) {
      body = (
        <>
          <div className="phase-big">
            {s.completed.length} of {CHALLENGES.length} groups tested
          </div>
          <p>You're ready for the next challenge.</p>
          <Link to="/reintro" className="btn primary">
            Choose next challenge
          </Link>
        </>
      );
    } else {
      body = (
        <>
          <div className="phase-big">All groups tested 🎉</div>
          <p>Move on to personalization: the food guide will show foods based on your results.</p>
          <button className="btn primary" onClick={() => saveSettings({ phase: 'personalization' })}>
            Start personalization
          </button>
        </>
      );
    }
    return (
      <section className="card phase-card phase-reintroduction">
        <div className="phase-label">Phase 2 · Reintroduction</div>
        {body}
      </section>
    );
  }

  return (
    <section className="card phase-card phase-personalization">
      <div className="phase-label">Phase 3 · Personalization</div>
      <div className="phase-big">Your own FODMAP diet</div>
      <p>
        Eat freely from groups you tolerate, keep limited groups to your tested dose, and retest the rest every few months.
        Tolerance often improves over time.
      </p>
      <Link to="/foods" className="btn">
        Open food guide
      </Link>
    </section>
  );
}
