import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../db/db';
import type { Food } from '../types';
import { DEFAULT_FILTERS, FoodBrowser, type FoodFilters } from './FoodBrowser';
import { Icon } from './Icon';

// Remember the picker's sort/filters between opens (e.g. adding several foods to one meal).
let lastFilters: FoodFilters = { ...DEFAULT_FILTERS, recent: true };

export function FoodPicker({ onPick, onClose }: { onPick: (food: Food, servingIndex: number) => void; onClose: () => void }) {
  const [filters, setFilters] = useState<FoodFilters>({ ...lastFilters, q: '' });

  const recentIds = useLiveQuery(async () => {
    const meals = await db.meals.orderBy('date').reverse().limit(40).toArray();
    const ids: string[] = [];
    for (const m of meals) for (const i of m.items) if (!ids.includes(i.foodId)) ids.push(i.foodId);
    return ids.slice(0, 20);
  }, []);

  const onChange = (patch: Partial<FoodFilters>) => {
    const next = { ...filters, ...patch };
    lastFilters = next;
    setFilters(next);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add food">
        <div className="sheet-head">
          <h2 className="grow">Add food</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="sheet-body">
          <FoodBrowser
            filters={filters}
            onChange={onChange}
            onPick={onPick}
            recentIds={recentIds}
            // Only focus search with a mouse; on phones the keyboard would cover the list.
            autoFocus={matchMedia('(pointer: fine)').matches}
          />
        </div>
      </div>
    </div>
  );
}
