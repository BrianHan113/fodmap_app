import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header, Segmented, Slider } from '../components/ui';
import { db } from '../db/db';
import { formatDate, today } from '../lib/dates';
import type { DayLog } from '../types';

const MOODS = [
  { value: 1, label: '😞' },
  { value: 2, label: '🙁' },
  { value: 3, label: '😐' },
  { value: 4, label: '🙂' },
  { value: 5, label: '😄' },
];

export default function DayForm() {
  const { date = today() } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState<DayLog>({ date, overall: 5, stress: 3, sleepHours: 7, sleepQuality: 3, exerciseMin: 0, water: 6 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    db.days.get(date).then((existing) => {
      if (existing) setD(existing);
      setLoaded(true);
    });
  }, [date]);

  const set = (patch: Partial<DayLog>) => setD({ ...d, ...patch });

  const save = async () => {
    await db.days.put({ ...d, date, notes: d.notes?.trim() || undefined });
    nav(-1);
  };

  if (!loaded) return null;

  return (
    <>
      <Header title={`Check-in · ${formatDate(date)}`} back />
      <section className="card">
        <Slider label="Overall, how was your gut today?" value={d.overall ?? 5} onChange={(v) => set({ overall: v })} lowText="awful" highText="great" />
        <div className="field">
          <span>Mood</span>
          <Segmented value={d.mood} onChange={(v) => set({ mood: v })} options={MOODS} />
        </div>
      </section>
      <section className="card">
        <h2>Lifestyle</h2>
        <p className="muted small">Stress, sleep and exercise affect gut symptoms too. Logging them helps separate food reactions from other causes.</p>
        <Slider label="Stress" value={d.stress ?? 0} onChange={(v) => set({ stress: v })} lowText="calm" highText="very stressed" />
        <Slider label="Sleep (hours)" value={d.sleepHours ?? 7} min={0} max={12} step={0.5} onChange={(v) => set({ sleepHours: v })} />
        <div className="field">
          <span>Sleep quality</span>
          <Segmented
            value={d.sleepQuality}
            onChange={(v) => set({ sleepQuality: v })}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: ['Poor', 'Meh', 'OK', 'Good', 'Great'][n - 1] }))}
          />
        </div>
        <Slider label="Exercise (minutes)" value={d.exerciseMin ?? 0} min={0} max={120} step={5} onChange={(v) => set({ exerciseMin: v })} />
        <Slider label="Water (glasses)" value={d.water ?? 0} min={0} max={15} onChange={(v) => set({ water: v })} />
        <label className="check">
          <input type="checkbox" checked={!!d.period} onChange={(e) => set({ period: e.target.checked })} />
          <span>On my period (hormones can affect gut symptoms)</span>
        </label>
      </section>
      <section className="card">
        <label className="field">
          <span>Notes</span>
          <textarea rows={3} value={d.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="How did you feel? Anything unusual?" />
        </label>
      </section>
      <div className="actions">
        <button className="btn primary block" onClick={save}>
          Save check-in
        </button>
      </div>
    </>
  );
}
