import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, Slider } from '../components/ui';
import { CHALLENGE_BY_GROUP } from '../data/challenges';
import { db } from '../db/db';
import { OUTCOME_LABEL, evaluateChallenge, isReaction, reactionThreshold } from '../lib/challengeOutcome';
import { addDays, formatDate, today } from '../lib/dates';
import { washoutEnd } from '../lib/phase';
import { average, dailyScores } from '../lib/symptoms';
import type { Challenge } from '../types';

export default function ChallengePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const challenge = useLiveQuery(() => db.challenges.get(Number(id)), [id]);
  const symptoms = useLiveQuery(() => db.symptoms.toArray(), []) ?? [];

  if (challenge === undefined) return <Header title="Challenge" back />;
  const def = CHALLENGE_BY_GROUP[challenge.group];
  const scores = dailyScores(symptoms);

  // Baseline: average worst symptom over the 7 days before the challenge started.
  const baselineDays = [...scores.entries()].filter(([d]) => d < challenge.startDate && d >= addDays(challenge.startDate, -7)).map(([, s]) => s);
  const baseline = average(baselineDays) ?? 0;
  const threshold = reactionThreshold(baseline);
  const ev = evaluateChallenge(challenge.doses, baseline);
  const nextDose = challenge.status === 'active' ? challenge.doses.findIndex((d) => d.severity === undefined) : -1;

  // Planned date of each dose: the day after the previous dose was actually taken.
  const plannedDate = (i: number): string => {
    if (i === 0) return challenge.startDate;
    const prev = challenge.doses[i - 1].date;
    return prev ? addDays(prev, 1) : addDays(plannedDate(i - 1), 1);
  };

  const recordDose = async (idx: number, date: string, severity: number, notes: string) => {
    const doses = challenge.doses.map((d, i) => (i === idx ? { ...d, severity, notes: notes.trim() || undefined, date } : d));
    const result = evaluateChallenge(doses, baseline);
    const patch: Partial<Challenge> = { doses };
    if (result.finished) {
      patch.status = 'done';
      patch.outcome = result.outcome;
      patch.toleratedDose = result.toleratedDose;
      patch.washoutUntil = washoutEnd(doses[idx].date!);
    }
    await db.challenges.update(challenge.id!, patch);
  };

  const remove = async () => {
    if (!confirm('Delete this challenge and its results?')) return;
    await db.challenges.delete(challenge.id!);
    nav('/reintro', { replace: true });
  };

  return (
    <>
      <Header
        title={def.label}
        back
        right={
          <button className="icon-btn danger" onClick={remove} aria-label="Delete challenge">
            <Icon name="trash" />
          </button>
        }
      />
      <section className="card">
        <div className="phase-label">Test food</div>
        <h2>{challenge.food}</h2>
        <p className="muted small">
          Started {formatDate(challenge.startDate)}. Baseline symptoms {baseline.toFixed(1)}/10, so a reaction means a worst symptom of{' '}
          <b>{threshold}+</b>.
        </p>
      </section>

      {challenge.status === 'done' && challenge.outcome && (
        <section className={`card result outcome-card-${challenge.outcome}`}>
          <div className="phase-label">Result</div>
          <h2>{OUTCOME_LABEL[challenge.outcome]}</h2>
          <p>
            {challenge.outcome === 'tolerated' &&
              `You handled the full dose (${challenge.doses[2]?.amount}). You can bring ${def.label.toLowerCase()} foods back after reintroduction.`}
            {challenge.outcome === 'partial' &&
              `You tolerated up to ${challenge.doses[challenge.toleratedDose ?? 0]?.amount}. Keep ${def.label.toLowerCase()} foods to about that amount.`}
            {challenge.outcome === 'not-tolerated' &&
              `Even the smallest dose caused symptoms. Keep avoiding ${def.label.toLowerCase()} foods for now and retest in 2–3 months.`}
          </p>
          {challenge.washoutUntil && (
            <p className="muted small">
              Washout: strict low-FODMAP until {formatDate(challenge.washoutUntil)} (longer if symptoms haven't settled).
            </p>
          )}
          <div className="btn-row">
            {challenge.washoutUntil && (
              <button className="btn" onClick={() => db.challenges.update(challenge.id!, { washoutUntil: addDays(challenge.washoutUntil!, 1) })}>
                Extend washout 1 day
              </button>
            )}
            <button
              className="btn"
              onClick={async () => {
                const newId = await db.challenges.add({
                  group: challenge.group,
                  food: challenge.food,
                  startDate: today(),
                  doses: challenge.doses.map((d) => ({ amount: d.amount })),
                  status: 'active',
                });
                nav(`/reintro/${newId}`, { replace: true });
              }}
            >
              Retest
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>Doses</h2>
        <ol className="doses">
          {challenge.doses.map((d, i) => {
            const status =
              d.severity !== undefined
                ? isReaction(d.severity, baseline)
                  ? 'reacted'
                  : 'ok'
                : i === nextDose
                  ? 'current'
                  : challenge.status === 'done'
                    ? 'skipped'
                    : 'upcoming';
            return (
              <li key={i} className={`dose dose-${status}`}>
                <div className="dose-head">
                  <span className="dose-num">{i + 1}</span>
                  <span className="grow">
                    <span className="row-title">{d.amount}</span>
                    <span className="row-sub">
                      {d.date ? formatDate(d.date) : `Planned ${formatDate(plannedDate(i))}`}
                      {d.severity !== undefined && ` · worst symptom ${d.severity}/10`}
                      {status === 'skipped' && ' · skipped'}
                    </span>
                  </span>
                  {status === 'ok' && <span className="badge outcome-tolerated">OK</span>}
                  {status === 'reacted' && <span className="badge outcome-not-tolerated">Reaction</span>}
                </div>
                {d.notes && <p className="muted small">{d.notes}</p>}
                {status === 'current' && (
                  <DoseForm
                    key={i}
                    dose={d.amount}
                    food={challenge.food}
                    defaultDate={plannedDate(i) < today() ? plannedDate(i) : today()}
                    scores={scores}
                    threshold={threshold}
                    onSave={(date, sev, notes) => recordDose(i, date, sev, notes)}
                  />
                )}
              </li>
            );
          })}
        </ol>
        {challenge.status === 'active' && ev.toleratedDose >= 0 && (
          <p className="muted small">So far you've tolerated {challenge.doses[ev.toleratedDose].amount}.</p>
        )}
      </section>

      <Notes challenge={challenge} />
    </>
  );
}

function DoseForm({
  dose,
  food,
  defaultDate,
  scores,
  threshold,
  onSave,
}: {
  dose: string;
  food: string;
  defaultDate: string;
  scores: Map<string, number>;
  threshold: number;
  onSave: (date: string, severity: number, notes: string) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  // Suggest the worst logged symptom on the dose day and the following morning.
  const suggested = Math.max(scores.get(date) ?? 0, scores.get(addDays(date, 1)) ?? 0);
  const [sev, setSev] = useState(suggested);
  const [notes, setNotes] = useState('');
  useEffect(() => setSev(suggested), [suggested]);
  const reacting = sev >= threshold;

  return (
    <div className="dose-form">
      <p>
        Eat <b>{dose}</b> of {food} with a meal. Keep the rest of the day low-FODMAP. Record the result that night or the next morning.
      </p>
      <label className="field">
        <span>Dose taken on</span>
        <input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <Slider label="Worst symptom after this dose" value={sev} onChange={setSev} lowText="none" highText="severe" />
      {suggested > 0 && <p className="muted small">Pre-filled from your symptom log ({suggested}/10).</p>}
      <label className="field">
        <span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. bloating 3h after, loose stool next morning" />
      </label>
      {reacting && (
        <div className="callout warn-callout">
          That counts as a reaction. The challenge will stop here and you'll start a washout.
        </div>
      )}
      <button className="btn primary block" onClick={() => onSave(date, sev, notes)}>
        {reacting ? 'Record reaction & stop' : 'Record & continue'}
      </button>
    </div>
  );
}

function Notes({ challenge }: { challenge: Challenge }) {
  const [text, setText] = useState(challenge.notes ?? '');
  return (
    <section className="card">
      <label className="field">
        <span>Challenge notes</span>
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => db.challenges.update(challenge.id!, { notes: text.trim() || undefined })}
          placeholder="Anything that might have affected the result (stress, illness, travel)…"
        />
      </label>
    </section>
  );
}
