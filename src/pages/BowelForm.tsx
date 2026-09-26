import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { DraftNotice, Header, Segmented } from '../components/ui';
import { BRISTOL } from '../data/bristol';
import { db } from '../db/db';
import { nowTime, today } from '../lib/dates';
import { useDraft } from '../lib/draft';

interface BowelFields {
  date: string;
  time: string;
  bristol: number;
  urgency: number;
  note: string;
}

export default function BowelForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const isNew = id === 'new';

  const draft = useDraft<BowelFields>(
    `bowel:${id}`,
    () => ({ date: params.get('date') ?? today(), time: nowTime(), bristol: 4, urgency: 0, note: '' }),
    isNew
      ? undefined
      : () => db.bowel.get(Number(id)).then((b) => b && { date: b.date, time: b.time, bristol: b.bristol, urgency: b.urgency, note: b.note ?? '' }),
  );

  if (!draft.value) return null;
  const { date, time, bristol, urgency, note } = draft.value;
  const set = draft.set;

  const save = async () => {
    const entry = { date, time, bristol, urgency, note: note.trim() || undefined };
    if (isNew) await db.bowel.add(entry);
    else await db.bowel.update(Number(id), entry);
    draft.clear();
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this entry?')) return;
    await db.bowel.delete(Number(id));
    draft.clear();
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
        <h2>Bristol stool type</h2>
        <div className="bristol">
          {BRISTOL.map((b) => (
            <button key={b.type} className={`bristol-opt b${b.type} ${bristol === b.type ? 'on' : ''}`} onClick={() => set({ bristol: b.type })}>
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
          onChange={(v) => set({ urgency: v })}
          options={[
            { value: 0, label: 'None' },
            { value: 1, label: 'Mild' },
            { value: 2, label: 'Strong' },
            { value: 3, label: 'Urgent' },
          ]}
        />
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => set({ note: e.target.value })} placeholder="Incomplete emptying, straining, mucus…" />
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
