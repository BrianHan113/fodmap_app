import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, Segmented } from '../components/ui';
import { BRISTOL } from '../data/bristol';
import { db } from '../db/db';
import { nowTime, today } from '../lib/dates';

export default function BowelForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isNew = id === 'new';

  const [date, setDate] = useState(params.get('date') ?? today());
  const [time, setTime] = useState(nowTime());
  const [bristol, setBristol] = useState(4);
  const [urgency, setUrgency] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isNew) return;
    db.bowel.get(Number(id)).then((b) => {
      if (!b) return;
      setDate(b.date);
      setTime(b.time);
      setBristol(b.bristol);
      setUrgency(b.urgency);
      setNote(b.note ?? '');
    });
  }, [id, isNew]);

  const save = async () => {
    const entry = { date, time, bristol, urgency, note: note.trim() || undefined };
    if (isNew) await db.bowel.add(entry);
    else await db.bowel.update(Number(id), entry);
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this entry?')) return;
    await db.bowel.delete(Number(id));
    nav(-1);
  };

  return (
    <>
      <Header
        title="Bowel movement"
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
        <h2>Bristol stool type</h2>
        <div className="bristol">
          {BRISTOL.map((b) => (
            <button key={b.type} className={`bristol-opt b${b.type} ${bristol === b.type ? 'on' : ''}`} onClick={() => setBristol(b.type)}>
              <span className="bristol-num">{b.type}</span>
              <span className="grow">
                <span className="row-title">{b.short}</span>
                <span className="row-sub">{b.note}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>Urgency</h2>
        <Segmented
          value={urgency}
          onChange={setUrgency}
          options={[
            { value: 0, label: 'None' },
            { value: 1, label: 'Mild' },
            { value: 2, label: 'Strong' },
            { value: 3, label: 'Urgent' },
          ]}
        />
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Incomplete emptying, straining, mucus…" />
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
