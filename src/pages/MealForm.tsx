import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FoodPicker } from '../components/FoodPicker';
import { Icon } from '../components/Icon';
import { LoadBars } from '../components/LoadBars';
import { NutritionSummary } from '../components/NutritionSummary';
import { DraftNotice, Header, LevelDot, groupsText } from '../components/ui';
import { db } from '../db/db';
import { useFoods } from '../db/hooks';
import { nowTime, toTimestamp, today } from '../lib/dates';
import { useDraft } from '../lib/draft';
import { amountText, computeLoad, resolveItem, stackingWarnings } from '../lib/fodmapLoad';
import { orderedServings, safeServing } from '../lib/foods';
import { MIN_MEAL_GAP_HOURS, fmtDuration, mealTitle, neighbourMeals, tooSoon } from '../lib/mealTiming';
import { itemNutrition, macroLine, sumNutrition } from '../lib/nutrition';
import { GROUP_LABEL, type Meal, type MealItem } from '../types';

const NAME_SUGGESTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface MealFields {
  date: string;
  time: string;
  name: string;
  items: MealItem[];
  note: string;
}

const EMPTY: MealFields = { date: '', time: '', name: '', items: [], note: '' };

export default function MealForm() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { map } = useFoods();
  const isNew = id === 'new';
  const mealId = isNew ? undefined : Number(id);

  const draft = useDraft<MealFields>(
    `meal:${id}`,
    () => ({ date: params.get('date') ?? today(), time: nowTime(), name: '', items: [], note: '' }),
    mealId === undefined
      ? undefined
      : () =>
          db.meals.get(mealId).then(
            (m) =>
              m && {
                date: m.date,
                time: m.time,
                // Older logs used a fixed type; carry it over as the name.
                name: m.name ?? (m.type ? mealTitle(m) : ''),
                items: m.items,
                note: m.note ?? '',
              },
          ),
  );
  const { date, time, name, items, note } = draft.value ?? EMPTY;
  const set = draft.set;
  const setItems = (items: MealItem[]) => set({ items });
  const [picking, setPicking] = useState(false);

  const allMeals = useLiveQuery(() => db.meals.toArray(), []) ?? [];

  const update = (idx: number, patch: Partial<MealItem>) => setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const warnings = stackingWarnings(items, map);
  const load = computeLoad(items, map);
  const nutrition = sumNutrition(items, map);

  const usedNames = useMemo(
    () => [...new Set([...NAME_SUGGESTIONS, ...allMeals.map((m) => m.name?.trim()).filter((n): n is string => !!n)])],
    [allMeals],
  );

  // Spacing between this meal and the ones either side of it.
  const at = toTimestamp(date, time);
  const { prev, next } = neighbourMeals(allMeals, at, mealId);
  const prevGap = prev && at - prev.t;
  const nextGap = next && next.t - at;
  const prevTooSoon = prevGap !== undefined && tooSoon(prevGap);
  const nextTooSoon = nextGap !== undefined && tooSoon(nextGap);
  const describe = (m: Meal) => `${mealTitle(m)}${m.date !== date ? ` on ${m.date}` : ''} at ${m.time}`;

  const save = async () => {
    const meal: Meal = { date, time, name: name.trim() || undefined, items, note: note.trim() || undefined };
    if (mealId === undefined) await db.meals.add(meal);
    else await db.meals.put({ ...meal, id: mealId });
    draft.clear();
    nav(-1);
  };

  const remove = async () => {
    if (!confirm('Delete this meal?')) return;
    await db.meals.delete(mealId!);
    draft.clear();
    nav(-1);
  };

  if (!draft.value) return null;

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
      {draft.restored && <DraftNotice onDiscard={draft.discard} />}
      <section className="card">
        <label className="field first">
          <span>Name (optional)</span>
          <input list="meal-names" value={name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Breakfast, post-gym snack" />
          <datalist id="meal-names">
            {usedNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </label>
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
        {(prevTooSoon || nextTooSoon) && (
          <div className="callout warn-callout">
            <Icon name="warn" size={16} />{' '}
            {prevTooSoon && (
              <>
                Only <b>{fmtDuration(prevGap!)}</b> after your last meal ({describe(prev!.meal)}).{' '}
              </>
            )}
            {nextTooSoon && (
              <>
                Only <b>{fmtDuration(nextGap!)}</b> before your next meal ({describe(next!.meal)}).{' '}
              </>
            )}
            Try to leave {MIN_MEAL_GAP_HOURS}–4 hours between meals so FODMAPs from each meal don't add up.
          </div>
        )}
        {!prevTooSoon && !nextTooSoon && prevGap !== undefined && (
          <p className="muted small gap-note">
            {fmtDuration(prevGap)} since your last meal ({describe(prev!.meal)}).
          </p>
        )}
      </section>

      <section className="card">
        <h2>Foods</h2>
        {items.length === 0 && <p className="muted small">Add what you ate. Pick the serving closest to your portion.</p>}
        <ul className="meal-items">
          {items.map((it, idx) => {
            const f = map.get(it.foodId);
            const r = resolveItem(it, map);
            const n = itemNutrition(it, map);
            const safe = f && safeServing(f);
            const eaten = r.grams !== undefined ? amountText(r.grams, f) : undefined;
            return (
              <li key={idx} className="meal-item">
                <div className="meal-item-head">
                  {r.picked && <LevelDot level={r.beyondTested ? 'moderate' : r.level} />}
                  <span className="grow">{f?.name ?? 'Unknown food'}</span>
                  <button className="icon-btn" onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove">
                    <Icon name="close" size={18} />
                  </button>
                </div>
                <div className="meal-item-controls">
                  <select value={it.servingIndex} onChange={(e) => update(idx, { servingIndex: Number(e.target.value) })}>
                    {f &&
                      orderedServings(f).map(({ serving: sv, index: i }) => (
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
                {n && <div className="item-macros">{macroLine(n)}</div>}
                {r.tier && r.level !== 'low' && (
                  <div className={`hint hint-${r.level}`}>
                    {eaten && it.qty !== 1 && `${eaten} in total: `}
                    {r.level === 'high' ? 'High' : 'Moderate'} in {groupsText(r.tier)}
                    {safe && ` · low up to ${safe.label}`}
                  </div>
                )}
                {r.beyondTested && (
                  <div className="hint hint-moderate">
                    {eaten ? `${eaten} is more than` : 'This is more than'} the largest amount tested as low ({r.largestTier?.label}).{' '}
                    {r.nextTier
                      ? `It becomes ${r.nextTier.level} in ${groupsText(r.nextTier)} at ${r.nextTier.label}, so this amount may not be low FODMAP.`
                      : "Larger amounts haven't been tested, so it may not be low FODMAP."}
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
        <>
          <section className="card">
            <h2>Meal FODMAP load</h2>
            <LoadBars load={load} />
            {warnings.map((w) => (
              <div key={w.group} className="callout warn-callout">
                <b>{GROUP_LABEL[w.group]} is stacking up.</b> {w.foods.join(', ')} together add up to a {w.level}{' '}
                {GROUP_LABEL[w.group].toLowerCase()} load{w.allLow && ', even though each is low on its own'}. Consider smaller portions or
                eating some of them at another meal.
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Meal nutrition</h2>
            <NutritionSummary total={nutrition.total} missing={nutrition.missing} />
          </section>
        </>
      )}

      <section className="card">
        <label className="field first">
          <span>Notes</span>
          <textarea rows={2} value={note} onChange={(e) => set({ note: e.target.value })} placeholder="Restaurant, brand, how it was cooked…" />
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
