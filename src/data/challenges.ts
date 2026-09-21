import type { ChallengeGroup, Group } from '../types';

export interface ChallengeFood {
  food: string;
  doses: [string, string, string];
}

export interface ChallengeDef {
  group: ChallengeGroup;
  label: string;
  fodmap: Group;
  blurb: string;
  options: ChallengeFood[];
}

/**
 * Standard challenge protocol: one FODMAP subgroup at a time, three increasing
 * doses on three consecutive days, then a washout of at least 3 symptom-free days.
 * Test foods are chosen because they contain mainly one FODMAP.
 */
export const CHALLENGES: ChallengeDef[] = [
  {
    group: 'lactose',
    label: 'Lactose',
    fodmap: 'lactose',
    blurb: 'Found in milk, soft cheeses, yogurt and ice cream.',
    options: [
      { food: 'Regular cow milk', doses: ['1/2 cup (125ml)', '3/4 cup (190ml)', '1 cup (250ml)'] },
      { food: 'Regular yogurt', doses: ['1/2 cup (100g)', '3/4 cup (150g)', '1 cup (200g)'] },
    ],
  },
  {
    group: 'fructose',
    label: 'Fructose',
    fodmap: 'fructose',
    blurb: 'Excess fructose: honey, mango, apples, pears, agave.',
    options: [
      { food: 'Honey', doses: ['1 tsp', '1.5 tsp', '1 tbsp'] },
      { food: 'Mango', doses: ['1/4 mango', '1/2 mango', '1 whole mango'] },
    ],
  },
  {
    group: 'sorbitol',
    label: 'Sorbitol',
    fodmap: 'sorbitol',
    blurb: 'A polyol in stone fruits, avocado, blackberries and sugar-free sweets.',
    options: [
      { food: 'Avocado', doses: ['1/4 avocado', '1/2 avocado', '3/4 avocado'] },
      { food: 'Blackberries', doses: ['5 berries', '10 berries', '15 berries'] },
    ],
  },
  {
    group: 'mannitol',
    label: 'Mannitol',
    fodmap: 'mannitol',
    blurb: 'A polyol in mushrooms, cauliflower, celery and sweet potato.',
    options: [
      { food: 'Button mushrooms', doses: ['1/2 cup', '1 cup', '1.5 cups'] },
      { food: 'Cauliflower', doses: ['1/2 cup', '1 cup', '1.5 cups'] },
    ],
  },
  {
    group: 'gos',
    label: 'GOS',
    fodmap: 'gos',
    blurb: 'Galacto-oligosaccharides in legumes, beans and cashews.',
    options: [
      { food: 'Canned chickpeas (rinsed)', doses: ['1/2 cup', '3/4 cup', '1 cup'] },
      { food: 'Canned lentils (rinsed)', doses: ['1/2 cup', '3/4 cup', '1 cup'] },
    ],
  },
  {
    group: 'fructan-wheat',
    label: 'Fructans (wheat)',
    fodmap: 'fructan',
    blurb: 'Wheat, rye and barley products. Tests fructans, not gluten.',
    options: [
      { food: 'White wheat bread', doses: ['2 slices', '3 slices', '4 slices'] },
      { food: 'Wheat pasta (cooked)', doses: ['1 cup', '1.5 cups', '2 cups'] },
    ],
  },
  {
    group: 'fructan-onion',
    label: 'Fructans (onion)',
    fodmap: 'fructan',
    blurb: 'Onion, shallot and the white part of leeks and spring onions.',
    options: [{ food: 'Cooked onion', doses: ['1 tbsp chopped', '1/4 onion', '1/2 onion'] }],
  },
  {
    group: 'fructan-garlic',
    label: 'Fructans (garlic)',
    fodmap: 'fructan',
    blurb: 'Garlic in all its forms (fresh, powder, in sauces).',
    options: [{ food: 'Fresh garlic', doses: ['1/4 clove', '1/2 clove', '1 clove'] }],
  },
];

export const CHALLENGE_BY_GROUP = Object.fromEntries(CHALLENGES.map((c) => [c.group, c])) as Record<
  ChallengeGroup,
  ChallengeDef
>;

export const WASHOUT_DAYS = 3;
