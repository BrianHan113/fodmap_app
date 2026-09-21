import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from '../db/db';
import { useFoods } from '../db/hooks';
import { matchesQuery } from '../lib/foods';
import type { Food } from '../types';
import { Icon } from './Icon';
import { LevelDot, groupsText } from './ui';

export function FoodPicker({ onPick, onClose }: { onPick: (food: Food, servingIndex: number) => void; onClose: () => void }) {
  const { list, map } = useFoods();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const recentIds = useLiveQuery(async () => {
    const meals = await db.meals.orderBy('date').reverse().limit(40).toArray();
    const ids: string[] = [];
    for (const m of meals) for (const i of m.items) if (!ids.includes(i.foodId)) ids.push(i.foodId);
    return ids.slice(0, 12);
  }, []);

  const results = useMemo(() => {
    if (!q) return (recentIds ?? []).map((id) => map.get(id)).filter((f): f is Food => !!f && !f.hidden);
    return list.filter((f) => matchesQuery(f, q)).slice(0, 60);
  }, [q, list, map, recentIds]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add food">
        <div className="sheet-head">
          <div className="search">
            <Icon name="search" size={18} />
            <input autoFocus placeholder="Search foods…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">
          {!q && <p className="muted small">{results.length ? 'Recent foods' : 'Type to search the food guide.'}</p>}
          {q && !results.length && <p className="muted small">No match. You can add custom foods in Settings.</p>}
          <ul className="list">
            {results.map((f) => (
              <li key={f.id}>
                <button className="row" onClick={() => setOpen(open === f.id ? null : f.id)}>
                  <LevelDot level={f.servings[0].level} />
                  <span className="grow">{f.name}</span>
                  <span className="muted small">{f.category}</span>
                </button>
                {open === f.id && (
                  <div className="serving-choices">
                    {f.servings.map((s, i) => (
                      <button key={i} className={`serving-choice sc-${s.level}`} onClick={() => onPick(f, i)}>
                        <LevelDot level={s.level} />
                        <span className="grow">{s.label}</span>
                        {s.level !== 'low' && <span className="small">{groupsText(s)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
