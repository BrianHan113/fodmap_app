import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { DraftNotice, Header, Slider } from '../components/ui';
import { db } from '../db/db';
import { nowTime, today } from '../lib/dates';
import { useDraft } from '../lib/draft';
import { SYMPTOM_KEYS, SYMPTOM_LABEL, type SymptomKey } from '../lib/symptoms';

interface SymptomFields {
  date: string;
  time: string;
  vals: Record<SymptomKey, number>;
  note: string;
}

export default function SymptomForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isNew = id === 'new';

  const draft = useDraft<SymptomFields>(
    `symptoms:${id}`,
    () => ({ date: params.get('date') ?? today(), time: nowTime(), vals: { bloating: 0, pain: 0, gas: 0, nausea: 0 }, note: '' }),
    isNew
      ? undefined
      : () =>
          db.symptoms.get(Number(id)).then(
            (s) => s && { date: s.date, time: s.time, vals: { bloating: s.bloating, pain: s.pain, gas: s.gas, nausea: s.nausea }, note: s.note ?? '' },
          ),
  );

  if (!draft.value) return null;
  const { date, time, vals, note } = draft.value;
  const set = draft.set;

  const save = async () => {
    const entry = { date, time, ...vals, note: note.trim() || undefined };
    if (isNew) await db.symptoms.add(entry);
    else await db.symptoms.update(Number(id), entry);
    draft.clear();
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this entry?')) return;
    await db.symptoms.delete(Number(id));
    draft.clear();
    nav(-1);
  };

  return (
    <>
      <Header
        title="Symptoms"
        back
        right={
          !isNew && (
            <button className="icon-btn danger" onClick={remove} aria-label="Delete">
              <Icon name="trash" />
            </button>
          )
        }
      />
      {draft.restored && <DraftNotice onDiscard={draft.discard} />}
      <section className="card">
        <div className="row-fields">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => e.target.value && set({ time: e.target.value })} />
          </label>
        </div>
      </section>
      <section className="card">
        <p className="muted small">0 = none, 10 = worst imaginable. Log whenever symptoms change, or once in the evening.</p>
        {SYMPTOM_KEYS.map((k) => (
          <Slider key={k} label={SYMPTOM_LABEL[k]} value={vals[k]} onChange={(v) => set({ vals: { ...vals, [k]: v } })} lowText="none" highText="severe" />
        ))}
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => set({ note: e.target.value })} placeholder="Anything else? e.g. reflux, fatigue, cramps" />
        </label>
      </section>
      <div className="actions">
        <button className="btn primary block" onClick={save}>
          Save
        </button>
      </div>
    </>
  );
}
