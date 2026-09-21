import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header } from '../components/ui';
import { CHALLENGES, WASHOUT_DAYS, type ChallengeDef } from '../data/challenges';
import { db } from '../db/db';
import { saveSettings, useChallenges, useSettings } from '../db/hooks';
import { OUTCOME_LABEL } from '../lib/challengeOutcome';
import { formatDate, today } from '../lib/dates';
import { reintroReadiness, reintroState } from '../lib/phase';
import { dailyScores } from '../lib/symptoms';
import { toleranceMap } from '../lib/tolerance';

export default function Reintro() {
  const settings = useSettings();
  const challenges = useChallenges();
  const symptoms = useLiveQuery(() => db.symptoms.toArray(), []) ?? [];
  const [open, setOpen] = useState<string | null>(null);
  const date = today();
  const state = reintroState(challenges, date);
  const tol = useMemo(() => toleranceMap(challenges), [challenges]);

  if (settings.phase === 'elimination') {
    const r = reintroReadiness(settings.elimStart, date, dailyScores(symptoms));
    return (
      <>
        <Header title="Reintroduction" />
        <Protocol />
        <section className="card">
          <h2>{r.ready ? 'Ready when you are' : 'Not yet'}</h2>
          <p>You're on day {r.day} of elimination.</p>
          <p>{r.message}</p>
          <button
            className={`btn ${r.ready ? 'primary' : ''}`}
            onClick={() => {
              if (r.ready || confirm('Your readiness check has not passed yet. Start reintroduction anyway?')) saveSettings({ phase: 'reintroduction' });
            }}
          >
            {r.ready ? 'Start reintroduction' : 'Start anyway'}
          </button>
        </section>
      </>
    );
  }

  return (
    <>
      <Header title="Reintroduction" />
      <Protocol />
      {state.active && (
        <Link to={`/reintro/${state.active.id}`} className="card link-card highlight">
          <div className="grow">
            <div className="phase-label">In progress</div>
            <h2>
              {CHALLENGES.find((c) => c.group === state.active!.group)?.label}: {state.active.food}
            </h2>
            <p className="muted small">Next: dose {(state.nextDose ?? 0) + 1} · {state.active.doses[state.nextDose ?? 0]?.amount}</p>
          </div>
          <Icon name="chevron" />
        </Link>
      )}
      {state.inWashout && (
        <div className="callout">
          <b>Washout until {formatDate(state.washoutUntil!)}.</b> Eat low-FODMAP only. Start the next challenge once you've had {WASHOUT_DAYS} symptom-free days.
        </div>
      )}

      <section className="card flush">
        <ul className="list">
          {CHALLENGES.map((def) => {
            const done = tol[def.group];
            const isActive = state.active?.group === def.group;
            return (
              <li key={def.group}>
                {done ? (
                  <Link to={`/reintro/${done.id}`} className="row">
                    <span className="grow">
                      <span className="row-title">{def.label}</span>
                      <span className="row-sub">{done.food}</span>
                    </span>
                    <span className={`badge outcome-${done.outcome}`}>{OUTCOME_LABEL[done.outcome!]}</span>
                    <Icon name="chevron" size={18} />
                  </Link>
                ) : (
                  <button className="row" onClick={() => setOpen(open === def.group ? null : def.group)} disabled={isActive}>
                    <span className="grow">
                      <span className="row-title">{def.label}</span>
                      <span className="row-sub">{def.blurb}</span>
                    </span>
                    <span className="badge">{isActive ? 'In progress' : 'Not tested'}</span>
                  </button>
                )}
                {open === def.group && !done && !isActive && (
                  <StartChallenge def={def} blocked={!!state.active || state.inWashout} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {settings.phase === 'reintroduction' && (
        <button className="btn block" onClick={() => saveSettings({ phase: 'personalization' })}>
          Finish reintroduction → personalization
        </button>
      )}
      {settings.phase === 'personalization' && (
        <p className="muted small center">You're in personalization. Retest groups every few months: tolerance can improve.</p>
      )}
    </>
  );
}

function Protocol() {
  return (
    <details className="card protocol">
      <summary>How challenges work</summary>
      <ol>
        <li>Test <b>one FODMAP group at a time</b>, keeping the rest of your diet low-FODMAP.</li>
        <li>
          Eat the test food on <b>3 consecutive days</b> with increasing doses (small → medium → large).
        </li>
        <li>Log symptoms that evening and the next morning. Reactions can take up to 24–48h.</li>
        <li>
          If you get clear symptoms, <b>stop</b>. The last dose you handled is your tolerated amount.
        </li>
        <li>
          Then <b>washout</b>: {WASHOUT_DAYS}+ days of strict low-FODMAP, until symptoms settle, before the next group.
        </li>
        <li>Your results stay out of your daily diet until reintroduction is finished, so they don't blur the next test.</li>
      </ol>
    </details>
  );
}

function StartChallenge({ def, blocked }: { def: ChallengeDef; blocked: boolean }) {
  const nav = useNavigate();
  const [opt, setOpt] = useState(0);
  const [food, setFood] = useState(def.options[0].food);
  const [doses, setDoses] = useState<string[]>([...def.options[0].doses]);

  const pick = (i: number) => {
    setOpt(i);
    if (i < def.options.length) {
      setFood(def.options[i].food);
      setDoses([...def.options[i].doses]);
    } else {
      setFood('');
    }
  };

  const start = async () => {
    if (blocked && !confirm('Another challenge or washout is still running. Starting now can blur your results. Start anyway?')) return;
    const id = await db.challenges.add({
      group: def.group,
      food: food.trim() || 'Custom food',
      startDate: today(),
      doses: doses.map((amount) => ({ amount: amount.trim() })),
      status: 'active',
    });
    nav(`/reintro/${id}`);
  };

  return (
    <div className="start-panel">
      <div className="field">
        <span>Test food</span>
        {def.options.map((o, i) => (
          <label key={o.food} className="radio">
            <input type="radio" checked={opt === i} onChange={() => pick(i)} />
            <span>{o.food}</span>
          </label>
        ))}
        <label className="radio">
          <input type="radio" checked={opt === def.options.length} onChange={() => pick(def.options.length)} />
          <span>Another food</span>
        </label>
        {opt === def.options.length && <input placeholder="Food name" value={food} onChange={(e) => setFood(e.target.value)} />}
      </div>
      <div className="field">
        <span>Doses (day 1 → 3)</span>
        {doses.map((d, i) => (
          <input key={i} value={d} onChange={(e) => setDoses(doses.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
      </div>
      <button className="btn primary block" onClick={start} disabled={!food.trim() || doses.some((d) => !d.trim())}>
        Start today
      </button>
    </div>
  );
}
