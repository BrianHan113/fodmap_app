import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Header, Segmented } from '../components/ui';
import { db } from '../db/db';
import { useFoods } from '../db/hooks';
import { seedFood } from '../lib/foods';
import { CATEGORIES, GROUPS, GROUP_LABEL, type Food, type FructanSource, type Level, type Serving } from '../types';

const LEVELS: { value: Level; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
];

export default function FoodEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { map } = useFoods();
  const isNew = id === 'new';
  const seed = !isNew && id ? seedFood(id) : undefined;
  const [food, setFood] = useState<Food | null>(null);

  useEffect(() => {
    if (food) return;
    if (isNew) {
      setFood({ id: `custom-${Date.now()}`, name: '', category: 'Snacks', servings: [{ label: '', level: 'low', groups: {} }], custom: true });
    } else if (id) {
      // Include hidden foods: look in the overrides table first.
      db.foods.get(id).then((o) => {
        const f = o ?? map.get(id);
        if (f) setFood(structuredClone(f));
      });
    }
  }, [id, isNew, map, food]);

  if (!food) return <Header title="Edit food" back />;

  const setServing = (i: number, patch: Partial<Serving>) =>
    setFood({ ...food, servings: food.servings.map((s, j) => (j === i ? { ...s, ...patch } : s)) });

  const toggleGroup = (i: number, g: (typeof GROUPS)[number]) => {
    const s = food.servings[i];
    const groups = { ...s.groups };
    if (groups[g]) delete groups[g];
    else groups[g] = s.level === 'low' ? 'moderate' : s.level;
    setServing(i, { groups });
  };

  const valid = food.name.trim() && food.servings.length && food.servings.every((s) => s.label.trim());

  const save = async () => {
    const servings = food.servings.map((s) => ({
      label: s.label.trim(),
      level: s.level,
      // A low serving has no driving groups; otherwise groups take the serving's level.
      groups: s.level === 'low' ? {} : Object.fromEntries(Object.keys(s.groups).map((g) => [g, s.level])),
    }));
    await db.foods.put({
      ...food,
      name: food.name.trim(),
      servings,
      notes: food.notes?.trim() || undefined,
      glServing: food.gl === undefined ? undefined : food.glServing?.trim() || 'typical serving',
      glAmount: food.gl === undefined ? undefined : food.glAmount || undefined,
      glUnit: food.gl === undefined || !food.glAmount ? undefined : food.glUnit ?? 'g',
    });
    nav(-1);
  };

  return (
    <>
      <Header title={isNew ? 'New food' : 'Edit food'} back />
      <section className="card">
        <label className="field">
          <span>Name</span>
          <input value={food.name} onChange={(e) => setFood({ ...food, name: e.target.value })} placeholder="e.g. My usual granola" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={food.category} onChange={(e) => setFood({ ...food, category: e.target.value as Food['category'] })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={!!food.fodmapFree} onChange={(e) => setFood({ ...food, fodmapFree: e.target.checked || undefined })} />
          <span>Contains no FODMAPs (no portion limit)</span>
        </label>
        <label className="field">
          <span>Fructan source (used to apply your challenge results)</span>
          <select value={food.fructanSource ?? ''} onChange={(e) => setFood({ ...food, fructanSource: (e.target.value || undefined) as FructanSource | undefined })}>
            <option value="">None / unknown</option>
            <option value="wheat">Wheat / grains</option>
            <option value="onion">Onion family</option>
            <option value="garlic">Garlic</option>
          </select>
        </label>
        <div className="row-fields">
          <label className="field">
            <span>Glycaemic load (optional)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={food.gl ?? ''}
              onChange={(e) => setFood({ ...food, gl: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
              placeholder="e.g. 12"
            />
          </label>
          <label className="field">
            <span>GL is per</span>
            <input value={food.glServing ?? ''} onChange={(e) => setFood({ ...food, glServing: e.target.value })} placeholder="e.g. 1 cup cooked" />
          </label>
        </div>
        <div className="row-fields">
          <label className="field">
            <span>That serving weighs</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={food.glAmount ?? ''}
              onChange={(e) => setFood({ ...food, glAmount: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)) })}
              placeholder="e.g. 180"
            />
          </label>
          <label className="field">
            <span>Unit</span>
            <select value={food.glUnit ?? 'g'} onChange={(e) => setFood({ ...food, glUnit: e.target.value as 'g' | 'ml' })}>
              <option value="g">grams (as eaten)</option>
              <option value="ml">ml (drinks)</option>
            </select>
          </label>
        </div>
        <p className="muted small">The weight lets the app compare GL per 100g, so small servings don't look misleadingly low.</p>
      </section>

      <section className="card">
        <h2>Serving tiers</h2>
        <p className="muted small">List servings from smallest to largest. For moderate/high servings, tick which FODMAPs cause it.</p>
        {food.servings.map((s, i) => (
          <div key={i} className="tier-edit">
            <div className="tier-edit-head">
              <input value={s.label} onChange={(e) => setServing(i, { label: e.target.value })} placeholder="e.g. 1/2 cup (75g)" />
              {food.servings.length > 1 && (
                <button className="icon-btn" onClick={() => setFood({ ...food, servings: food.servings.filter((_, j) => j !== i) })} aria-label="Remove tier">
                  <Icon name="close" size={18} />
                </button>
              )}
            </div>
            <Segmented value={s.level} onChange={(level) => setServing(i, { level })} options={LEVELS} />
            {s.level !== 'low' && (
              <div className="chips">
                {GROUPS.map((g) => (
                  <button key={g} type="button" className={`chip ${s.groups[g] ? 'on' : ''}`} onClick={() => toggleGroup(i, g)}>
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <button className="btn block" onClick={() => setFood({ ...food, servings: [...food.servings, { label: '', level: 'moderate', groups: {} }] })}>
          <Icon name="plus" size={18} /> Add tier
        </button>
      </section>

      <section className="card">
        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={food.notes ?? ''} onChange={(e) => setFood({ ...food, notes: e.target.value })} />
        </label>
      </section>

      <div className="actions">
        <button className="btn primary block" disabled={!valid} onClick={save}>
          Save food
        </button>
        {seed && (
          <div className="btn-row">
            <button
              className="btn"
              onClick={async () => {
                await db.foods.delete(seed.id);
                nav(-1);
              }}
            >
              Reset to built-in
            </button>
            <button
              className="btn"
              onClick={async () => {
                await db.foods.put({ ...food, hidden: !food.hidden });
                nav(food.hidden ? -1 : -2);
              }}
            >
              {food.hidden ? 'Unhide' : 'Hide from guide'}
            </button>
          </div>
        )}
        {food.custom && !isNew && (
          <button
            className="btn danger block"
            onClick={async () => {
              if (!confirm('Delete this food? It disappears from the guide; past meals that used it still show it.')) return;
              await db.foods.put({ ...food, hidden: true });
              nav(-1);
            }}
          >
            Delete food
          </button>
        )}
      </div>
    </>
  );
}
