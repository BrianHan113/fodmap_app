export type Group = 'fructose' | 'lactose' | 'mannitol' | 'sorbitol' | 'gos' | 'fructan';
export type Level = 'low' | 'moderate' | 'high';
export type FructanSource = 'wheat' | 'onion' | 'garlic';

export const GROUPS: Group[] = ['fructose', 'lactose', 'mannitol', 'sorbitol', 'gos', 'fructan'];

export const GROUP_LABEL: Record<Group, string> = {
  fructose: 'Fructose',
  lactose: 'Lactose',
  mannitol: 'Mannitol',
  sorbitol: 'Sorbitol',
  gos: 'GOS',
  fructan: 'Fructans',
};

export const CATEGORIES = [
  'Vegetables',
  'Fruit',
  'Grains & bread',
  'Dairy & alternatives',
  'Protein',
  'Legumes',
  'Nuts & seeds',
  'Condiments & sauces',
  'Sweets & sweeteners',
  'Drinks',
  'Snacks',
  'Herbs & spices',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Serving {
  label: string;
  level: Level;
  /** FODMAP groups that drive a moderate/high rating at this serving. */
  groups: Partial<Record<Group, Level>>;
}

export interface Food {
  id: string;
  name: string;
  category: Category;
  servings: Serving[];
  notes?: string;
  fructanSource?: FructanSource;
  /** Contains no FODMAPs at all, so there is no FODMAP limit on portion size. */
  fodmapFree?: boolean;
  /** Estimated glycaemic load per typical serving (glServing). */
  gl?: number;
  glServing?: string;
  /** Weight (g, as eaten) or volume (ml) of glServing, for comparing GL per 100g / per glass. */
  glAmount?: number;
  glUnit?: 'g' | 'ml';
  custom?: boolean;
  hidden?: boolean;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealItem {
  foodId: string;
  servingIndex: number;
  qty: number;
}

export interface Meal {
  id?: number;
  date: string; // YYYY-MM-DD local
  time: string; // HH:MM
  type: MealType;
  items: MealItem[];
  note?: string;
}

export interface SymptomEntry {
  id?: number;
  date: string;
  time: string;
  bloating: number;
  pain: number;
  gas: number;
  nausea: number;
  note?: string;
}

export interface BowelEntry {
  id?: number;
  date: string;
  time: string;
  bristol: number; // 1-7
  urgency: number; // 0-3
  note?: string;
}

export interface DayLog {
  date: string;
  overall?: number; // 0-10, 10 = great
  mood?: number; // 1-5
  stress?: number; // 0-10
  sleepHours?: number;
  sleepQuality?: number; // 1-5
  exerciseMin?: number;
  water?: number; // glasses
  period?: boolean;
  notes?: string;
}

export type Phase = 'elimination' | 'reintroduction' | 'personalization';

export interface Settings {
  key: 'app';
  onboarded: boolean;
  phase: Phase;
  elimStart: string;
  theme: 'system' | 'light' | 'dark';
}

export type ChallengeGroup =
  | 'fructose'
  | 'lactose'
  | 'sorbitol'
  | 'mannitol'
  | 'gos'
  | 'fructan-wheat'
  | 'fructan-onion'
  | 'fructan-garlic';

export interface DoseResult {
  amount: string;
  date?: string;
  severity?: number; // 0-10 worst symptom after dose
  notes?: string;
}

export type Outcome = 'tolerated' | 'partial' | 'not-tolerated';

export interface Challenge {
  id?: number;
  group: ChallengeGroup;
  food: string;
  startDate: string;
  doses: DoseResult[];
  status: 'active' | 'washout' | 'done';
  outcome?: Outcome;
  /** Index of the largest dose tolerated, -1 if none. */
  toleratedDose?: number;
  washoutUntil?: string;
  notes?: string;
}
