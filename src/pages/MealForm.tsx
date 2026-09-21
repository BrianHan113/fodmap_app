import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FoodPicker } from '../components/FoodPicker';
import { Icon } from '../components/Icon';
import { LoadBars } from '../components/LoadBars';
import { Header, LevelDot, Segmented, groupsText } from '../components/ui';
import { db } from '../db/db';
import { useFoods } from '../db/hooks';
import { nowTime, today } from '../lib/dates';
import { computeLoad, stackingWarnings } from '../lib/fodmapLoad';
import { GROUP_LABEL, type MealItem, type MealType } from '../types';

function defaultType(time: string): MealType {
  const h = Number(time.slice(0, 2));
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export default function MealForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { map } = useFoods();
  const isNew = id === 'new';

  const [date, setDate] = useState(params.get('date') ?? today());
  const [time, setTime] = useState(nowTime());
  const [type, setType] = useState<MealType>(defaultType(nowTime()));
  const [items, setItems] = useState<MealItem[]>([]);
  const [note, setNote] = useState('');
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (isNew) return;
    db.meals.get(Number(id)).then((m) => {
      if (!m) return;
      setDate(m.date);
      setTime(m.time);
      setType(m.type);
      setItems(m.items);
      setNote(m.note ?? '');
    });
  }, [id, isNew]);

  const update = (idx: number, patch: Partial<MealItem>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const warnings = stackingWarnings(items, map);
  const load = computeLoad(items, map);

  const save = async () => {
    const meal = { date, time, type, items, note: note.trim() || undefined };
    if (isNew) await db.meals.add(meal);
    else await db.meals.update(Number(id), meal);
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this meal?')) return;
    await db.meals.delete(Number(id));
    nav(-1);
  };

  return (
    <>
      <Header
        title={isNew ? 'Log meal' : 'Edit meal'}
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
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'breakfast', label: 'Breakfast' },
            { value: 'lunch', label: 'Lunch' },
            { value: 'dinner', label: 'Dinner' },
            { value: 'snack', label: 'Snack' },
          ]}
        />
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
        <h2>Foods</h2>
        {items.length === 0 && <p className="muted small">Add what you ate. Pick the serving closest to your portion.</p>}
        <ul className="meal-items">
          {items.map((it, idx) => {
            const f = map.get(it.foodId);
            const s = f?.servings[it.servingIndex];
            return (
              <li key={idx} className="meal-item">
                <div className="meal-item-head">
                  {s && <LevelDot level={s.level} />}
                  <span className="grow">{f?.name ?? 'Unknown food'}</span>
                  <button className="icon-btn" onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove">
                    <Icon name="close" size={18} />
                  </button>
                </div>
                <div className="meal-item-controls">
                  <select value={it.servingIndex} onChange={(e) => update(idx, { servingIndex: Number(e.target.value) })}>
                    {f?.servings.map((sv, i) => (
                      <option key={i} value={i}>
                        {sv.label} ({sv.level})
                      </option>
                    ))}
                  </select>
                  <div className="stepper">
                    <button onClick={() => update(idx, { qty: Math.max(0.5, it.qty - 0.5) })} aria-label="Less">
                      −
                    </button>
                    <span>{it.qty}×</span>
                    <button onClick={() => update(idx, { qty: it.qty + 0.5 })} aria-label="More">
                      +
                    </button>
                  </div>
                </div>
                {s && s.level !== 'low' && (
                  <div className={`hint hint-${s.level}`}>
                    {s.level === 'high' ? 'High' : 'Moderate'} in {groupsText(s)}
                    {f && f.servings[0].level === 'low' && ` · low at ${f.servings[0].label}`}
                  </div>
                )}
                {s && s.level === 'low' && it.qty > 1 && f && f.servings[it.servingIndex + 1] && (
                  <div className="hint hint-moderate">
                    {it.qty}× the low serving may exceed the safe amount. Next tier: {f.servings[it.servingIndex + 1].label} is{' '}
                    {f.servings[it.servingIndex + 1].level}.
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button className="btn block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add food
        </button>
      </section>

      {items.length > 0 && (
        <section className="card">
          <h2>Meal FODMAP load</h2>
          <LoadBars load={load} />
          {warnings.map((w) => (
            <div key={w.group} className="callout warn-callout">
              <b>{GROUP_LABEL[w.group]} is stacking up.</b> {w.foods.join(', ')} together add up to a high {GROUP_LABEL[w.group].toLowerCase()} load.
              Consider a smaller portion or eating one of them at another meal.
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Restaurant, brand, how it was cooked…" />
        </label>
      </section>

      <div className="actions">
        <button className="btn primary block" disabled={!items.length} onClick={save}>
          Save meal
        </button>
      </div>

      {picking && (
        <FoodPicker
          onClose={() => setPicking(false)}
          onPick={(food, servingIndex) => {
            setItems([...items, { foodId: food.id, servingIndex, qty: 1 }]);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
