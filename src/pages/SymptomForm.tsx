import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, Slider } from '../components/ui';
import { db } from '../db/db';
import { nowTime, today } from '../lib/dates';
import { SYMPTOM_KEYS, SYMPTOM_LABEL, type SymptomKey } from '../lib/symptoms';

export default function SymptomForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isNew = id === 'new';

  const [date, setDate] = useState(params.get('date') ?? today());
  const [time, setTime] = useState(nowTime());
  const [vals, setVals] = useState<Record<SymptomKey, number>>({ bloating: 0, pain: 0, gas: 0, nausea: 0 });
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isNew) return;
    db.symptoms.get(Number(id)).then((s) => {
      if (!s) return;
      setDate(s.date);
      setTime(s.time);
      setVals({ bloating: s.bloating, pain: s.pain, gas: s.gas, nausea: s.nausea });
      setNote(s.note ?? '');
    });
  }, [id, isNew]);

  const save = async () => {
    const entry = { date, time, ...vals, note: note.trim() || undefined };
    if (isNew) await db.symptoms.add(entry);
    else await db.symptoms.update(Number(id), entry);
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this entry?')) return;
    await db.symptoms.delete(Number(id));
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
      <section className="card">
        <div className="row-fields">
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
      </section>
      <section className="card">
        <p className="muted small">0 = none, 10 = worst imaginable. Log whenever symptoms change, or once in the evening.</p>
        {SYMPTOM_KEYS.map((k) => (
          <Slider key={k} label={SYMPTOM_LABEL[k]} value={vals[k]} onChange={(v) => setVals({ ...vals, [k]: v })} lowText="none" highText="severe" />
        ))}
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else? e.g. reflux, fatigue, cramps" />
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
