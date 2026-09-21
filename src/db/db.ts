import Dexie, { type EntityTable } from 'dexie';
import type { BowelEntry, Challenge, DayLog, Food, Meal, Settings, SymptomEntry } from '../types';

export class FodmapDB extends Dexie {
  meals!: EntityTable<Meal, 'id'>;
  symptoms!: EntityTable<SymptomEntry, 'id'>;
  bowel!: EntityTable<BowelEntry, 'id'>;
  days!: EntityTable<DayLog, 'date'>;
  challenges!: EntityTable<Challenge, 'id'>;
  /** Custom foods and user edits to seed foods (same id overrides the seed). */
  foods!: EntityTable<Food, 'id'>;
  settings!: EntityTable<Settings, 'key'>;
  /** Starred food ids. */
  favourites!: EntityTable<{ id: string }, 'id'>;

  constructor(name = 'fodmap-helper') {
    super(name);
    this.version(1).stores({
      meals: '++id, date',
      symptoms: '++id, date',
      bowel: '++id, date',
      days: 'date',
      challenges: '++id, group, status',
      foods: 'id',
      settings: 'key',
    });
    this.version(2).stores({ favourites: 'id' });
  }
}

export const db = new FodmapDB();

export const TABLES = ['meals', 'symptoms', 'bowel', 'days', 'challenges', 'foods', 'settings', 'favourites'] as const;
