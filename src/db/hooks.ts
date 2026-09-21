import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useContext, useMemo } from 'react';
import { mergeFoods } from '../lib/foods';
import { today } from '../lib/dates';
import type { Food, Settings } from '../types';
import { db } from './db';

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  onboarded: false,
  phase: 'elimination',
  elimStart: today(),
  theme: 'system',
};

/** Live settings from the DB; undefined while loading. Used once, by the app shell. */
export function useSettingsQuery(): Settings | undefined {
  return useLiveQuery(async () => (await db.settings.get('app')) ?? DEFAULT_SETTINGS);
}

export const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);

/** Current settings, provided by the app shell once loaded. */
export function useSettings(): Settings {
  return useContext(SettingsContext);
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
  await db.settings.put({ ...cur, ...patch, key: 'app' });
}

export function useFoods(): { list: Food[]; map: Map<string, Food>; overrides: Food[] } {
  const overrides = useLiveQuery(() => db.foods.toArray(), []) ?? [];
  return useMemo(() => {
    const list = mergeFoods(overrides);
    // Include hidden foods in the map so old meal logs still resolve.
    const map = new Map(list.map((f) => [f.id, f]));
    for (const o of overrides) if (!map.has(o.id)) map.set(o.id, o);
    return { list, map, overrides };
  }, [overrides]);
}

export function useChallenges() {
  return useLiveQuery(() => db.challenges.toArray(), []) ?? [];
}
