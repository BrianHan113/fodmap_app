import type { Category, Food, FructanSource, Group, Level, Serving } from '../types';
import { GL_DATA } from './glycemic';

/*
 * Compact food table. Serving thresholds are approximations compiled from publicly
 * available Monash University and FODMAP Friendly information. They are a guide only;
 * the official Monash FODMAP app is the reference. Every entry can be edited in-app.
 *
 * Tier syntax: "label:L" | "label:M codes" | "label:H codes", tiers separated by "|".
 * Codes: fr fructose, la lactose, ma mannitol, so sorbitol, gos GOS, fn fructans,
 *        fw fructans (wheat), fo fructans (onion), fg fructans (garlic).
 * A code takes the tier's level; suffix "~" forces moderate, "!" forces high.
 * Mixed dishes list every FODMAP they typically contain; recipes vary, so treat them as rough guides.
 */

const CAT: Record<string, Category> = {
  veg: 'Vegetables',
  fruit: 'Fruit',
  grain: 'Grains & bread',
  dairy: 'Dairy & alternatives',
  protein: 'Protein',
  legume: 'Legumes',
  nut: 'Nuts & seeds',
  cond: 'Condiments & sauces',
  sweet: 'Sweets & sweeteners',
  drink: 'Drinks',
  snack: 'Snacks',
  herb: 'Herbs & spices',
};

const CODES: Record<string, { group: Group; src?: FructanSource }> = {
  fr: { group: 'fructose' },
  la: { group: 'lactose' },
  ma: { group: 'mannitol' },
  so: { group: 'sorbitol' },
  gos: { group: 'gos' },
  fn: { group: 'fructan' },
  fw: { group: 'fructan', src: 'wheat' },
  fo: { group: 'fructan', src: 'onion' },
  fg: { group: 'fructan', src: 'garlic' },
};

const LEVELS: Record<string, Level> = { L: 'low', M: 'moderate', H: 'high' };

type Row = [name: string, cat: string, tiers: string, notes?: string];

const ROWS: Row[] = [
  // ── Vegetables ──────────────────────────────────────────────
  ['Alfalfa sprouts', 'veg', '1/2 cup (15g):L'],
  ['Artichoke hearts, canned', 'veg', '1/8 cup (30g):L|1/4 cup (60g):H fn'],
  ['Artichoke, globe', 'veg', '1/2 heart (75g):H fn'],
  ['Arugula / rocket', 'veg', '1 cup (30g):L', 'Low at generous servings.'],
  ['Asparagus', 'veg', '1 spear (15g):L|3 spears (45g):H fr fn ma~'],
  ['Avocado', 'veg', '1/8 avocado (30g):L|1/4 avocado (60g):M so|1/2 avocado (80g):H so'],
  ['Bamboo shoots', 'veg', '1 cup (155g):L'],
  ['Bean sprouts', 'veg', '1 cup (75g):L'],
  ['Beetroot', 'veg', '2 slices (20g):L|4 slices (40g):M gos fn|1 cup (100g):H gos fn'],
  ['Bok choy', 'veg', '1 cup (75g):L|3 cups (225g):M so'],
  ['Broccoli, heads', 'veg', '3/4 cup (75g):L|1.5 cups (150g):M fr'],
  ['Broccoli, stalks', 'veg', '1/3 cup (45g):L|1 cup (100g):H fr'],
  ['Broccolini', 'veg', '1/2 cup (45g):L|1 cup (90g):M fr'],
  ['Brussels sprouts', 'veg', '2 sprouts (38g):L|6 sprouts (110g):M fn'],
  ['Butternut squash', 'veg', '1/3 cup (45g):L|2/3 cup (90g):M ma gos'],
  ['Cabbage, green or red', 'veg', '3/4 cup (75g):L|1.5 cups (150g):M so'],
  ['Cabbage, napa / Chinese', 'veg', '1 cup (75g):L', 'Low at large servings.'],
  ['Cabbage, savoy', 'veg', '1/2 cup (40g):L|1 cup (80g):M fn'],
  ['Carrot', 'veg', '1 medium (75g):L', 'Low at any reasonable serving.'],
  ['Cassava / yuca', 'veg', '1/2 cup (75g):L'],
  ['Cauliflower', 'veg', 'small handful (15g):L|1/2 cup (75g):H ma'],
  ['Celeriac', 'veg', '1/2 cup (75g):L'],
  ['Celery', 'veg', '1/4 stalk (10g):L|1/2 stalk (20g):M ma|1 stalk (40g):H ma'],
  ['Chili, red or green', 'veg', '1 medium (28g):L|2 medium:M fn'],
  ['Choy sum', 'veg', '1 cup (85g):L'],
  ['Collard greens', 'veg', '1 cup (40g):L'],
  ['Corn, baby (canned)', 'veg', '1/2 cup (75g):L'],
  ['Corn, sweet (cob)', 'veg', '1/3 cob (38g):L|1/2 cob (60g):M so|1 cob:H so gos'],
  ['Cucumber', 'veg', '1/2 cup (75g):L'],
  ['Eggplant / aubergine', 'veg', '1 cup (75g):L|1.5 cups (110g):M so'],
  ['Endive', 'veg', '4 leaves (25g):L'],
  ['Fennel bulb', 'veg', '1/2 cup (48g):L|1 cup (90g):M fn'],
  ['Garlic', 'veg', '1/4 clove:M fg|1 clove (3g):H fg', 'Use garlic-infused oil instead — fructans don\'t dissolve into oil.'],
  ['Garlic chives', 'veg', '1 tbsp (5g):L'],
  ['Ginger, fresh', 'veg', '1 tsp (5g):L'],
  ['Green beans', 'veg', '15 beans (75g):L|1.5 cups (125g):M so'],
  ['Kale', 'veg', '1 cup (75g):L'],
  ['Leek, bulb (white)', 'veg', '1/4 bulb (25g):H fo'],
  ['Leek, leaves (green)', 'veg', '1/2 cup (55g):L'],
  ['Lettuce (iceberg, butter, cos, coral)', 'veg', '1 cup (75g):L'],
  ['Mushrooms, button', 'veg', '1 mushroom (8g):L|1/2 cup (75g):H ma'],
  ['Mushrooms, canned champignons', 'veg', '1/2 cup (75g):L'],
  ['Mushrooms, oyster', 'veg', '1 cup (75g):L'],
  ['Mushrooms, shiitake (fresh)', 'veg', '1 mushroom (15g):L|1/2 cup (40g):H ma'],
  ['Okra', 'veg', '6 pods (75g):L|12 pods (150g):H fn'],
  ['Olives', 'veg', '15 small (60g):L'],
  ['Onion (brown, white, red)', 'veg', '1 tbsp chopped (10g):M fo|1/4 onion (40g):H fo', 'One of the most common triggers. Includes shallots, onion powder.'],
  ['Onion, spring (green tops only)', 'veg', '1/2 cup (20g):L', 'Only the green part — the white bulb is high in fructans.'],
  ['Parsnip', 'veg', '1/2 cup (75g):L'],
  ['Peas, green', 'veg', '1 tbsp (15g):L|1/4 cup (38g):M gos|1/3 cup (50g):H gos fn'],
  ['Peas, snow', 'veg', '5 pods (15g):L|10 pods (30g):H ma fn'],
  ['Peas, sugar snap', 'veg', '3 pods (14g):L|1/2 cup (35g):H fr ma'],
  ['Bell pepper, green', 'veg', '1/2 cup (75g):L'],
  ['Bell pepper, red', 'veg', '1/3 cup (43g):L|1 cup (100g):M fr'],
  ['Potato, white', 'veg', '1 medium (150g):L', 'Low at any reasonable serving.'],
  ['Pumpkin (kent / Japanese)', 'veg', '1/2 cup (75g):L'],
  ['Radish', 'veg', '2 radishes (70g):L'],
  ['Seaweed, nori', 'veg', '2 sheets (5g):L'],
  ['Shallots', 'veg', '1 tbsp (10g):H fo'],
  ['Spinach, baby', 'veg', '1.5 cups (45g):L'],
  ['Spinach, English', 'veg', '1 cup (75g):L'],
  ['Squash, yellow / pattypan', 'veg', '2 squash (75g):L'],
  ['Sweet potato', 'veg', '1/2 cup (75g):L|1 cup (150g):M ma'],
  ['Swiss chard / silverbeet', 'veg', '1 cup (35g):L'],
  ['Taro', 'veg', '1/2 cup (75g):L'],
  ['Tomato, common', 'veg', '1 small (65g):L|1 large (150g):M fr'],
  ['Tomato, cherry', 'veg', '5 tomatoes (65g):L|8 tomatoes (100g):M fr'],
  ['Tomato, canned', 'veg', '1/2 cup (92g):L'],
  ['Tomato, sun-dried', 'veg', '2 pieces (14g):L|5 pieces (35g):H fr'],
  ['Turnip', 'veg', '1/2 cup (75g):L'],
  ['Water chestnuts', 'veg', '1/2 cup (75g):L'],
  ['Zucchini / courgette', 'veg', '1/3 cup (65g):L|1 cup (130g):H fn'],

  // ── Fruit ───────────────────────────────────────────────────
  ['Apple', 'fruit', '1 medium (150g):H fr so', 'High in both fructose and sorbitol.'],
  ['Apricot, fresh', 'fruit', '1 apricot (40g):H so'],
  ['Apricot, dried', 'fruit', '2 halves (15g):H so fn'],
  ['Banana, firm (just yellow)', 'fruit', '1 medium (100g):L'],
  ['Banana, ripe (spotty)', 'fruit', '1/3 medium (35g):L|1 medium (100g):H fn'],
  ['Blackberries', 'fruit', '3 berries (15g):L|1/2 cup (75g):H so'],
  ['Blueberries', 'fruit', '1 cup (125g):L|1.5 cups (190g):M fn'],
  ['Boysenberries', 'fruit', '1/2 cup (75g):H fr'],
  ['Cantaloupe / rockmelon', 'fruit', '3/4 cup (120g):L|1 cup (150g):M fn'],
  ['Cherries', 'fruit', '3 cherries (21g):L|5 cherries (35g):M so|10 cherries:H fr so'],
  ['Clementine', 'fruit', '1 medium (75g):L'],
  ['Coconut, fresh flesh', 'fruit', '1/2 cup (43g):L'],
  ['Coconut, dried shredded', 'fruit', '1/4 cup (18g):L|1/2 cup (36g):M so'],
  ['Cranberries, dried', 'fruit', '1 tbsp (13g):L|1/4 cup (40g):H fr fn'],
  ['Dates, dried', 'fruit', '1 date (7g):M fn|2 dates:H fn'],
  ['Dragon fruit', 'fruit', '1 medium (230g):L'],
  ['Figs, dried or fresh', 'fruit', '1 fig (40g):H fr fn'],
  ['Grapefruit', 'fruit', '1/2 small (80g):L|1/2 medium (120g):M fn'],
  ['Grapes', 'fruit', '1 cup (150g):L|2 cups:M fr'],
  ['Guava, ripe', 'fruit', '2 guavas (180g):L'],
  ['Honeydew melon', 'fruit', '1/2 cup (90g):L|1 cup (180g):M fn'],
  ['Kiwifruit (green or gold)', 'fruit', '2 small (150g):L'],
  ['Lemon / lime juice', 'fruit', '1/4 cup (60ml):L'],
  ['Lychee', 'fruit', '2 lychees (20g):L|5 lychees (50g):H so'],
  ['Mandarin', 'fruit', '1 medium (90g):L'],
  ['Mango', 'fruit', '1/4 cup (40g):L|1/2 cup (80g):H fr'],
  ['Nectarine', 'fruit', '1/8 nectarine (15g):L|1 medium:H so fn'],
  ['Orange', 'fruit', '1 medium (130g):L'],
  ['Papaya / pawpaw', 'fruit', '1 cup (140g):L'],
  ['Passionfruit', 'fruit', '2 fruits (46g):L'],
  ['Peach', 'fruit', '1/4 peach (30g):L|1 medium:H so ma'],
  ['Pear', 'fruit', '1 medium (170g):H fr so'],
  ['Pineapple, fresh', 'fruit', '1 cup (140g):L'],
  ['Pineapple, dried', 'fruit', '2 pieces (30g):H fn'],
  ['Plum', 'fruit', '1 plum (65g):H so'],
  ['Pomegranate seeds', 'fruit', '1/4 cup (38g):L|1/2 cup (76g):M fn'],
  ['Prunes', 'fruit', '2 prunes (15g):H so fn'],
  ['Raisins', 'fruit', '1 tbsp (13g):L|1/4 cup (40g):H fn fr'],
  ['Raspberries', 'fruit', '1/3 cup (60g):L|1 cup (125g):M fr'],
  ['Rhubarb', 'fruit', '1 cup (150g):L'],
  ['Strawberries', 'fruit', '5 medium (65g):L|10 medium (130g):M fr'],
  ['Watermelon', 'fruit', '1 small cube (15g):L|1 cup (150g):H fr ma fn'],

  // ── Grains & bread ──────────────────────────────────────────
  ['Bread, white wheat', 'grain', '1 slice (26g):L|2 slices (52g):M fw'],
  ['Bread, wholemeal wheat', 'grain', '1 slice (24g):L|2 slices (48g):H fw'],
  ['Bread, sourdough (white wheat, traditional)', 'grain', '2 slices (109g):L', 'Long fermentation breaks down fructans. Must be traditionally fermented.'],
  ['Bread, sourdough (spelt)', 'grain', '2 slices (52g):L'],
  ['Bread, gluten-free', 'grain', '2 slices (70g):L', 'Check labels — some contain inulin, soy flour or honey.'],
  ['Bread, rye', 'grain', '1 slice (26g):H fn'],
  ['Bagel, wheat', 'grain', '1/2 bagel (35g):H fw'],
  ['Croissant', 'grain', '1/2 croissant (30g):M fw|1 croissant:H fw'],
  ['Tortilla, corn', 'grain', '2 tortillas (50g):L'],
  ['Tortilla, wheat flour', 'grain', '1 small (35g):L|2 small:H fw'],
  ['Pasta, wheat (cooked)', 'grain', '1/2 cup (74g):L|1 cup (145g):H fw'],
  ['Pasta, gluten-free (cooked)', 'grain', '1 cup (145g):L'],
  ['Noodles, rice (cooked)', 'grain', '1 cup (190g):L'],
  ['Noodles, soba (100% buckwheat)', 'grain', '1/3 cup cooked (90g):L', 'Many soba noodles contain wheat — check labels.'],
  ['Noodles, udon (wheat)', 'grain', '1 cup (180g):H fw'],
  ['Noodles, egg (wheat, cooked)', 'grain', '1/2 cup (70g):L|1 cup:H fw'],
  ['Rice, white / basmati / jasmine', 'grain', '1 cup cooked (190g):L'],
  ['Rice, brown', 'grain', '1 cup cooked (190g):L'],
  ['Quinoa', 'grain', '1 cup cooked (155g):L'],
  ['Oats, rolled', 'grain', '1/2 cup dry (52g):L|1 cup dry:M fn gos'],
  ['Oats, quick', 'grain', '1/4 cup dry (23g):L|1/2 cup:M fn'],
  ['Oat bran', 'grain', '2 tbsp (22g):L'],
  ['Psyllium husk', 'grain', '1 tbsp (5g):L', 'Soluble fibre that can help both constipation and loose stools in IBS. Start with 1 tsp and build up slowly, with plenty of water.'],
  ['Millet', 'grain', '1 cup cooked (174g):L'],
  ['Buckwheat groats', 'grain', '3/4 cup cooked (135g):L'],
  ['Polenta / cornmeal', 'grain', '1 cup cooked (240g):L'],
  ['Sorghum', 'grain', '1/2 cup cooked (65g):L'],
  ['Amaranth, puffed', 'grain', '1/4 cup (7g):L|1/2 cup:M gos fn'],
  ['Couscous, wheat', 'grain', '1/4 cup cooked (40g):L|1 cup:H fw'],
  ['Bulgur', 'grain', '1/4 cup cooked (44g):L|1/2 cup:H fw'],
  ['Barley, pearl', 'grain', '1/4 cup cooked (40g):M fn|1/2 cup:H fn'],
  ['Cornflakes', 'grain', '1/2 cup (15g):L|1 cup (30g):M fn'],
  ['Rice cereal (Rice Krispies)', 'grain', '1 cup (30g):L'],
  ['Muesli / granola (wheat-based)', 'grain', '1/2 cup (60g):H fw fr'],
  ['Rice cakes', 'grain', '2 cakes (13g):L'],
  ['Rice crackers, plain', 'grain', '15 crackers (30g):L'],
  ['Corn thins / corn cakes', 'grain', '2 thins (12g):L'],
  ['Saltine / water crackers', 'grain', '5 crackers (20g):L|10 crackers:M fw'],
  ['Flour, wheat (plain)', 'grain', '2/3 cup (100g):H fw', 'Small amounts (e.g. thickening a sauce) are usually fine.'],
  ['Flour, spelt', 'grain', '2/3 cup (100g):L'],
  ['Flour, rice / corn / tapioca / potato starch', 'grain', '2/3 cup (100g):L'],
  ['Flour, buckwheat', 'grain', '2/3 cup (100g):L'],
  ['Flour, almond meal', 'grain', '1/4 cup (24g):L|1/2 cup (48g):H gos'],
  ['Flour, chickpea / besan', 'grain', '1/4 cup (25g):M gos|1/2 cup:H gos'],
  ['Flour, coconut', 'grain', '1/4 cup (30g):H fn so'],
  ['Pancakes, wheat', 'grain', '1 small pancake (40g):L|2 pancakes:M fw'],
  ['Pizza base, wheat', 'grain', '1 slice:M fw|2 slices:H fw', 'Also check toppings for onion/garlic.'],

  // ── Dairy & alternatives ────────────────────────────────────
  ['Milk, cow (regular)', 'dairy', '1 tbsp (15ml):L|1/4 cup (60ml):M la|1 cup (250ml):H la'],
  ['Milk, lactose-free', 'dairy', '1 cup (250ml):L'],
  ['Milk, almond', 'dairy', '1 cup (250ml):L'],
  ['Milk, soy (from soy protein)', 'dairy', '1 cup (250ml):L'],
  ['Milk, soy (from whole soybeans)', 'dairy', '1 cup (250ml):H gos fn'],
  ['Milk, oat', 'dairy', '1/2 cup (104ml):L|1 cup:M fn'],
  ['Milk, rice', 'dairy', '3/4 cup (200ml):L|1 cup+:M fn'],
  ['Milk, macadamia', 'dairy', '1 cup (250ml):L'],
  ['Coconut milk, canned', 'dairy', '1/4 cup (60ml):L|1/2 cup:M so'],
  ['Coconut milk, beverage (carton)', 'dairy', '1/2 cup (125ml):L'],
  ['Yogurt, regular dairy', 'dairy', '1 tbsp (20g):L|1/2 cup (120g):H la'],
  ['Yogurt, Greek', 'dairy', '3 tbsp (60g):L|3/4 cup:M la'],
  ['Yogurt, lactose-free', 'dairy', '3/4 cup (170g):L'],
  ['Yogurt, coconut', 'dairy', '1/4 cup (60g):L|1/2 cup:M so'],
  ['Cheese, cheddar', 'dairy', '2 slices (40g):L', 'Hard and aged cheeses are naturally very low in lactose.'],
  ['Cheese, parmesan', 'dairy', '1/3 cup grated (40g):L'],
  ['Cheese, Swiss / gouda / edam', 'dairy', '2 slices (40g):L'],
  ['Cheese, mozzarella', 'dairy', '1/3 cup (40g):L'],
  ['Cheese, brie / camembert', 'dairy', '2 wedges (40g):L'],
  ['Cheese, feta', 'dairy', '1/2 cup (40g):L'],
  ['Cheese, goat (chèvre)', 'dairy', '1/4 cup (40g):L'],
  ['Cheese, halloumi', 'dairy', '2 slices (50g):L'],
  ['Cheese, cottage', 'dairy', '2 tbsp (40g):L|1/2 cup (110g):M la'],
  ['Cheese, ricotta', 'dairy', '2 tbsp (40g):L|1/2 cup:H la'],
  ['Cheese, cream cheese', 'dairy', '2 tbsp (40g):L|1/4 cup:M la'],
  ['Butter', 'dairy', '1 tbsp (19g):L'],
  ['Ghee', 'dairy', '1 tbsp (15g):L'],
  ['Cream, heavy / whipping', 'dairy', '1/4 cup (60ml):L|1/2 cup:M la'],
  ['Sour cream', 'dairy', '2 tbsp (40g):L|1/4 cup:M la'],
  ['Ice cream, dairy', 'dairy', '1/4 cup (40g):L|1/2 cup (75g):H la'],
  ['Ice cream, lactose-free', 'dairy', '1/2 cup (75g):L'],
  ['Kefir', 'dairy', '1 cup (250ml):H la'],
  ['Evaporated / condensed milk', 'dairy', '1/4 cup (60ml):H la'],

  // ── Protein ─────────────────────────────────────────────────
  ['Beef (plain)', 'protein', '1 serve (150g):L', 'Plain meat is FODMAP-free. Watch marinades, rubs and sauces.'],
  ['Chicken (plain)', 'protein', '1 serve (150g):L', 'Plain meat is FODMAP-free. Watch marinades, rubs and sauces.'],
  ['Pork (plain)', 'protein', '1 serve (150g):L'],
  ['Lamb (plain)', 'protein', '1 serve (150g):L'],
  ['Turkey (plain)', 'protein', '1 serve (150g):L'],
  ['Fish, fresh (salmon, cod, etc.)', 'protein', '1 fillet (150g):L'],
  ['Tuna, canned (in oil or water)', 'protein', '1 can (95g):L'],
  ['Shrimp / prawns', 'protein', '1 serve (100g):L'],
  ['Eggs', 'protein', '2 eggs (100g):L'],
  ['Bacon', 'protein', '2 rashers (50g):L'],
  ['Ham, deli', 'protein', '2 slices (40g):L', 'Check labels for onion, garlic or honey glaze.'],
  ['Sausages', 'protein', '1 sausage (75g):H fo fg', 'Most contain onion/garlic and wheat. Look for low-FODMAP certified ones.'],
  ['Tofu, firm', 'protein', '2/3 cup (170g):L', 'Pressing drains away GOS.'],
  ['Tofu, silken', 'protein', '1/2 cup (120g):H gos fn'],
  ['Tempeh', 'protein', '1 serve (100g):L'],
  ['Quorn mince', 'protein', '1/2 cup (75g):L|1 cup:M fn'],

  // ── Legumes ─────────────────────────────────────────────────
  ['Chickpeas, canned (rinsed)', 'legume', '1/4 cup (42g):L|1/2 cup (84g):H gos'],
  ['Lentils, canned (rinsed)', 'legume', '1/2 cup (46g):L|1 cup:H gos'],
  ['Lentils, boiled (red or green)', 'legume', '1/4 cup (23g):L|1/2 cup:H gos'],
  ['Black beans, canned', 'legume', '1/4 cup (40g):L|1/2 cup:H gos'],
  ['Kidney beans', 'legume', '1/4 cup (40g):H gos'],
  ['Butter / lima beans, canned', 'legume', '1/4 cup (38g):L|1/2 cup:H gos'],
  ['Baked beans', 'legume', '1/2 cup (130g):H gos fn'],
  ['Edamame', 'legume', '1 cup (90g):L'],
  ['Mung bean sprouts', 'legume', '1 cup (75g):L'],
  ['Split peas', 'legume', '1/4 cup (45g):H gos'],
  ['Soybeans, boiled', 'legume', '1/2 cup (86g):H gos fn'],
  ['Hummus', 'legume', '1 tbsp (20g):M gos|2 tbsp:H gos fg', 'Most store hummus contains garlic.'],

  // ── Nuts & seeds ────────────────────────────────────────────
  ['Almonds', 'nut', '10 nuts (12g):L|20 nuts (24g):H gos'],
  ['Brazil nuts', 'nut', '10 nuts (40g):L'],
  ['Cashews', 'nut', '10 nuts (15g):H gos fn'],
  ['Hazelnuts', 'nut', '10 nuts (15g):L|20 nuts:M gos fn'],
  ['Macadamias', 'nut', '20 nuts (40g):L'],
  ['Peanuts', 'nut', '32 nuts (28g):L'],
  ['Pecans', 'nut', '10 halves (20g):L'],
  ['Pine nuts', 'nut', '1 tbsp (14g):L|1/4 cup:M fn'],
  ['Pistachios', 'nut', '15 nuts (15g):H gos fn'],
  ['Walnuts', 'nut', '10 halves (30g):L'],
  ['Peanut butter', 'nut', '2 tbsp (32g):L'],
  ['Almond butter', 'nut', '1 tbsp (20g):L|2 tbsp:M gos'],
  ['Chia seeds', 'nut', '2 tbsp (24g):L'],
  ['Flaxseed / linseed', 'nut', '1 tbsp (15g):L'],
  ['Pumpkin seeds / pepitas', 'nut', '2 tbsp (23g):L'],
  ['Sunflower seeds', 'nut', '2 tsp (6g):L|1/4 cup:M fn'],
  ['Sesame seeds', 'nut', '1 tbsp (11g):L'],
  ['Tahini', 'nut', '1 tbsp (20g):L'],

  // ── Condiments & sauces ─────────────────────────────────────
  ['Olive oil / vegetable oils', 'cond', '1 tbsp (15ml):L'],
  ['Garlic-infused oil', 'cond', '1 tbsp (15ml):L', 'Great way to get garlic flavor without fructans.'],
  ['Onion-infused oil', 'cond', '1 tbsp (15ml):L'],
  ['Soy sauce', 'cond', '2 tbsp (42g):L'],
  ['Tamari', 'cond', '2 tbsp (42g):L'],
  ['Fish sauce', 'cond', '1 tbsp (15ml):L'],
  ['Oyster sauce', 'cond', '1 tbsp (20g):L'],
  ['Mustard (Dijon / yellow)', 'cond', '1 tbsp (15g):L'],
  ['Mayonnaise', 'cond', '2 tbsp (40g):L', 'Check for garlic in flavored mayo.'],
  ['Ketchup / tomato sauce', 'cond', '1 tbsp (13g):L|3 tbsp:M fn fr'],
  ['Barbecue sauce', 'cond', '2 tbsp (40g):H fr fo'],
  ['Sweet chili sauce', 'cond', '1 tbsp (20g):L|2 tbsp:M fn'],
  ['Sriracha', 'cond', '1 tsp (5g):L|1 tbsp:M fg'],
  ['Hot sauce (Tabasco-style)', 'cond', '1 tsp (5ml):L'],
  ['Worcestershire sauce', 'cond', '2 tbsp (42g):L'],
  ['Vinegar (white, red wine, rice)', 'cond', '2 tbsp (42g):L'],
  ['Vinegar, balsamic', 'cond', '1 tbsp (21g):L|2 tbsp:M fr'],
  ['Vinegar, apple cider', 'cond', '2 tbsp (42g):L'],
  ['Miso paste', 'cond', '2 tsp (12g):L|1 tbsp+:M fn'],
  ['Pesto (with garlic)', 'cond', '1 tbsp (20g):M fg|2 tbsp:H fg'],
  ['Salsa (with onion)', 'cond', '2 tbsp (40g):H fo'],
  ['Stock / bouillon (regular)', 'cond', '1 cup (250ml):H fo fg', 'Use low-FODMAP certified stock or homemade.'],
  ['Gravy (packet)', 'cond', '1/4 cup (60ml):H fo fw'],
  ['Kimchi', 'cond', '1/2 cup (75g):H fg fo'],
  ['Sauerkraut, white cabbage', 'cond', '1 tbsp (15g):L|1/2 cup:H ma'],
  ['Pickles / gherkins (no garlic)', 'cond', '2 pickles (75g):L'],
  ['Capers', 'cond', '1 tbsp (8g):L'],

  // ── Sweets & sweeteners ─────────────────────────────────────
  ['Sugar (white, brown, raw)', 'sweet', '1 tbsp (12g):L'],
  ['Maple syrup', 'sweet', '2 tbsp (50g):L'],
  ['Honey', 'sweet', '1 tsp (7g):L|1 tbsp (21g):H fr'],
  ['Agave syrup', 'sweet', '1 tsp (7g):H fr'],
  ['Golden syrup', 'sweet', '1 tbsp (21g):L'],
  ['Rice malt syrup', 'sweet', '1 tbsp (25g):L'],
  ['High-fructose corn syrup', 'sweet', '1 tbsp (20g):H fr'],
  ['Stevia', 'sweet', '1 tsp:L'],
  ['Sugar alcohols (sorbitol, mannitol, xylitol, maltitol)', 'sweet', 'any:H so ma', 'Common in sugar-free gum, mints and "diet" sweets. Ingredients ending in -ol.'],
  ['Jam, strawberry', 'sweet', '2 tbsp (40g):L'],
  ['Marmalade', 'sweet', '2 tbsp (40g):L'],
  ['Chocolate, dark', 'sweet', '5 squares (30g):L'],
  ['Chocolate, milk', 'sweet', '4 squares (20g):L|1/2 bar:M la'],
  ['Chocolate, white', 'sweet', '4 squares (25g):L|1/2 bar:M la'],
  ['Cocoa powder', 'sweet', '2 tbsp (8g):L'],
  ['Cookies, shortbread (wheat)', 'sweet', '1 cookie (13g):L|3 cookies:M fw'],

  // ── Drinks ──────────────────────────────────────────────────
  ['Water / sparkling water', 'drink', '1 glass (250ml):L'],
  ['Coffee, black / espresso', 'drink', '1 cup (250ml):L', 'Caffeine can be a gut irritant separate from FODMAPs.'],
  ['Coffee, instant', 'drink', '2 tsp (3g):L'],
  ['Tea, black (weak)', 'drink', '1 cup (250ml):L|strong brew:M fn'],
  ['Tea, green', 'drink', '1 cup (250ml):L'],
  ['Tea, peppermint', 'drink', '1 cup (250ml):L', 'Peppermint may help ease IBS symptoms.'],
  ['Tea, chamomile', 'drink', '1 cup (250ml):H fn'],
  ['Tea, fennel', 'drink', '1 cup (250ml):H fn'],
  ['Tea, chai (strong)', 'drink', '1 cup (250ml):H fn'],
  ['Tea, oolong (strong)', 'drink', '1 cup (250ml):H fn'],
  ['Beer', 'drink', '1 can (375ml):L', 'Alcohol can irritate the gut regardless of FODMAPs.'],
  ['Wine, red / white / sparkling', 'drink', '1 glass (150ml):L'],
  ['Spirits (gin, vodka, whisky)', 'drink', '1 shot (30ml):L'],
  ['Rum', 'drink', '1 shot (30ml):H fr'],
  ['Coconut water', 'drink', '1/2 cup (100ml):L|1 cup:M so'],
  ['Orange juice, fresh', 'drink', '1/2 cup (125ml):L|1 cup:M fr'],
  ['Apple juice', 'drink', '1/2 cup (125ml):H fr so'],
  ['Cranberry juice', 'drink', '1/2 cup (125ml):L'],
  ['Kombucha', 'drink', '1/2 cup (180ml):L|1 cup:M fr'],
  ['Soft drink (sugar-sweetened)', 'drink', '1 can (375ml):L'],
  ['Soft drink (high-fructose corn syrup)', 'drink', '1 can (375ml):H fr'],
  ['Sports drink', 'drink', '1 bottle (600ml):L'],
  ['Protein powder, whey isolate', 'drink', '1 scoop (30g):L'],
  ['Protein powder, whey concentrate', 'drink', '1 scoop (30g):M la'],

  // ── Snacks ──────────────────────────────────────────────────
  ['Popcorn, plain', 'snack', '7 cups popped (120g):L'],
  ['Potato chips, plain salted', 'snack', '1 bag (50g):L', 'Flavored chips often contain onion/garlic powder.'],
  ['Tortilla chips, corn', 'snack', '1 handful (50g):L'],
  ['Pretzels, wheat', 'snack', '1/2 cup (20g):L|1 cup:M fw'],
  ['French fries', 'snack', '1 serve (100g):L'],
  ['Granola bar (typical)', 'snack', '1 bar (30g):H fw fr', 'Many contain honey, inulin/chicory root or dried fruit.'],

  // ── Herbs & spices ──────────────────────────────────────────
  ['Basil', 'herb', '1 cup leaves (20g):L'],
  ['Parsley', 'herb', '1 cup (20g):L'],
  ['Cilantro / coriander', 'herb', '1 cup (20g):L'],
  ['Mint', 'herb', '1 cup (20g):L'],
  ['Rosemary / thyme / oregano', 'herb', '1 tbsp (2g):L'],
  ['Dill', 'herb', '1 tbsp (2g):L'],
  ['Chives', 'herb', '1 tbsp (3g):L'],
  ['Spices (cumin, paprika, turmeric, cinnamon, etc.)', 'herb', '1 tsp (2g):L'],
  ['Salt & pepper', 'herb', 'any:L'],
  ['Asafoetida (hing)', 'herb', 'pinch:L', 'Gives an onion/garlic-like flavor. Use gluten-free versions.'],
  ['Onion powder', 'herb', '1 tsp (2g):H fo'],
  ['Garlic powder', 'herb', '1 tsp (2g):H fg'],
  ['Nutritional yeast', 'herb', '2 tbsp (10g):L'],

  // ── More moderate / high foods (useful during reintroduction) ──
  // Fructose
  ['Apple sauce', 'fruit', '1 tbsp (20g):M fr so|1/2 cup (125g):H fr so'],
  ['Canned fruit in pear/apple juice', 'fruit', '1/2 cup (120g):H fr so'],
  ['Mango, dried', 'fruit', '2 pieces (20g):H fr'],
  ['Fruit smoothie (mango/apple based)', 'drink', '1 cup (250ml):H fr so'],
  ['Pear juice', 'drink', '1/2 cup (125ml):H fr so'],
  ['Mango juice / nectar', 'drink', '1/2 cup (125ml):H fr'],
  ['Cider, apple (alcoholic)', 'drink', '1 can (375ml):H fr so'],
  ['Dessert wine / port / sherry', 'drink', '1 small glass (60ml):H fr'],
  ['Fructose (fruit sugar)', 'sweet', '1 tsp (4g):M fr|1 tbsp:H fr'],
  ['Fruit juice concentrate (as sweetener)', 'sweet', '1 tbsp (20g):H fr'],
  ['Tomato pasta sauce, jarred (onion/garlic)', 'cond', '1/4 cup (60g):M fo fg|1/2 cup (125g):H fo fg fr~'],
  ['Chutney / relish', 'cond', '1 tbsp (20g):M fo fr|2 tbsp:H fo fr'],

  // Lactose
  ['Milk, goat', 'dairy', '1/4 cup (60ml):M la|1 cup (250ml):H la'],
  ['Buttermilk', 'dairy', '1/4 cup (60ml):M la|1 cup (250ml):H la'],
  ['Latte / cappuccino (regular milk)', 'drink', 'small (180ml):M la|large (350ml):H la', 'Ask for lactose-free milk to keep it low.'],
  ['Hot chocolate (made with milk)', 'drink', '1 cup (250ml):H la'],
  ['Chai latte (regular milk)', 'drink', '1 cup (250ml):H la fn'],
  ['Milkshake', 'drink', '1 cup (250ml):H la'],
  ['Lassi / yogurt drink', 'drink', '1 cup (250ml):H la'],
  ['Custard', 'dairy', '1/4 cup (60g):M la|1/2 cup (125g):H la'],
  ['Rice pudding (dairy)', 'dairy', '1/2 cup (125g):H la'],
  ['Instant pudding (made with milk)', 'dairy', '1/2 cup (125g):H la'],
  ['Frozen yogurt', 'dairy', '1/2 cup (75g):H la'],
  ['Gelato (milk-based)', 'dairy', '1 scoop (60g):M la|2 scoops:H la'],
  ['Cheese, mascarpone', 'dairy', '2 tbsp (30g):L|1/4 cup (60g):M la'],
  ['Cheese sauce / bechamel', 'dairy', '1/4 cup (60g):H la'],
  ['Milk powder', 'dairy', '2 tbsp (15g):H la'],
  ['Tzatziki', 'cond', '2 tbsp (40g):H la fg'],

  // Sorbitol
  ['Peach, canned', 'fruit', '1/2 cup (120g):H so'],
  ['Prune juice', 'drink', '1/2 cup (125ml):H so fn'],
  ['Sugar-free gum / mints', 'sweet', '2 pieces:H so ma', 'Check for sorbitol, mannitol, xylitol, maltitol, isomalt.'],
  ['Sugar-free chocolate / lollies', 'sweet', '1 serve (25g):H so ma'],
  ['Protein bar (with polyols)', 'snack', '1 bar (60g):H so ma fn', 'Many contain maltitol, sorbitol or chicory root. Check labels.'],

  // Mannitol
  ['Mushrooms, portobello', 'veg', '1/2 mushroom (40g):M ma|1 mushroom (80g):H ma'],
  ['Mushroom soup (cream of)', 'cond', '1 cup (250ml):H ma fo la'],
  ['Cauliflower rice', 'veg', '1/2 cup (75g):H ma'],
  ['Celery juice', 'drink', '1 cup (250ml):H ma'],
  ['Sweet potato fries', 'snack', '1 cup (75g):L|1 large serve (150g):M ma'],

  // GOS
  ['Cannellini beans, canned', 'legume', '1/4 cup (40g):M gos|1/2 cup (85g):H gos'],
  ['Borlotti beans, canned', 'legume', '1/4 cup (40g):H gos'],
  ['Navy / haricot beans', 'legume', '1/4 cup (40g):H gos'],
  ['Pinto beans', 'legume', '1/4 cup (40g):H gos'],
  ['Black-eyed peas', 'legume', '1/4 cup (40g):H gos'],
  ['Broad / fava beans', 'legume', '1/4 cup (40g):H gos fn'],
  ['Adzuki beans', 'legume', '1/4 cup (40g):H gos'],
  ['Mung beans, whole (boiled)', 'legume', '1/4 cup (40g):M gos|1/2 cup:H gos'],
  ['Refried beans', 'legume', '1/4 cup (60g):H gos fo'],
  ['Falafel', 'legume', '2 falafel (60g):H gos fo fg'],
  ['Dahl / lentil curry', 'legume', '1/2 cup (125g):H gos fo fg'],
  ['Bean chili (with onion)', 'legume', '1 cup (250g):H gos fo fg'],
  ['Soy flour', 'grain', '2 tbsp (15g):H gos fn'],
  ['Cashew butter', 'nut', '1 tbsp (16g):H gos fn'],
  ['Mixed nuts', 'nut', '1 small handful (20g):M gos fn|1/2 cup:H gos fn'],
  ['Cashew / pistachio dip or pesto', 'cond', '2 tbsp (30g):H gos fn fg'],

  // Fructans: wheat and other grains
  ['Pita bread, wheat', 'grain', '1/2 pita (30g):M fw|1 pita (60g):H fw'],
  ['Naan, wheat', 'grain', '1/4 naan (30g):M fw|1 naan:H fw'],
  ['Bread roll / burger bun, white wheat', 'grain', '1 roll (60g):M fw'],
  ['English muffin, wheat', 'grain', '1 muffin (60g):M fw'],
  ['Crumpet', 'grain', '1 crumpet (50g):M fw'],
  ['Muffin, wheat (bakery)', 'grain', '1/2 muffin (60g):M fw|1 muffin:H fw fr~'],
  ['Cake, wheat flour (plain sponge)', 'sweet', '1 small slice (40g):M fw|1 large slice:H fw'],
  ['Doughnut', 'sweet', '1 doughnut (60g):H fw'],
  ['Biscuits / cookies, wheat', 'sweet', '2 biscuits (25g):M fw|4 biscuits:H fw'],
  ['Pastry / pie crust, wheat', 'grain', '1/4 cup pastry (40g):M fw|1 pie:H fw'],
  ['Breadcrumbs / panko, wheat', 'grain', '1/4 cup (25g):M fw|1/2 cup:H fw'],
  ['Crackers, wholemeal wheat', 'grain', '4 crackers (20g):M fw|8 crackers:H fw'],
  ['Wheat biscuit cereal (Weet-Bix / shredded wheat)', 'grain', '1 biscuit (15g):M fw|2 biscuits (30g):H fw'],
  ['Bran flakes / All-Bran', 'grain', '1/2 cup (30g):H fw fr~'],
  ['Wheat bran', 'grain', '2 tbsp (10g):H fw'],
  ['Wheat germ', 'grain', '1 tbsp (8g):M fw|2 tbsp:H fw gos~'],
  ['Semolina', 'grain', '1/2 cup cooked (120g):H fw'],
  ['Freekeh', 'grain', '1/4 cup cooked (40g):M fw|1/2 cup:H fw'],
  ['Spelt pasta (cooked)', 'grain', '1 cup (145g):L|1.5 cups:M fw', 'Spelt is lower in fructans than wheat.'],
  ['Rye crispbread', 'grain', '2 crispbreads (20g):M fn|4 crispbreads:H fn'],
  ['Pumpernickel', 'grain', '1 slice (30g):H fn'],
  ['Dumplings / gyoza (wheat wrapper)', 'grain', '4 dumplings (100g):H fw fo fg'],
  ['Instant ramen noodles (with flavour sachet)', 'grain', '1 packet (85g):H fw fo fg'],
  ['Chicory root / inulin fibre', 'grain', 'added fibre:H fn', 'Added to high-fibre yogurts, bars and breads. Also listed as FOS or oligofructose.'],

  // Fructans: onion
  ['Onion, spring (white bulb)', 'veg', '1 tbsp (8g):M fo|1/4 cup:H fo'],
  ['Onion, caramelised', 'veg', '1 tbsp (15g):M fo|1/4 cup:H fo'],
  ['Onion, pickled', 'veg', '2 small (30g):H fo'],
  ['Onion rings (battered)', 'snack', '4 rings (60g):H fo fw'],
  ['French onion dip', 'cond', '2 tbsp (40g):H fo la'],
  ['Soup, packet or canned (most)', 'cond', '1 cup (250ml):H fo fg', 'Nearly all commercial soups contain onion and/or garlic.'],
  ['Curry paste (with onion/garlic)', 'cond', '1 tbsp (15g):H fo fg'],
  ['Taco / fajita seasoning', 'herb', '1 tsp (3g):M fo fg|1 tbsp:H fo fg'],
  ['Chicken salt / seasoned salt', 'herb', '1/2 tsp:M fo fg'],

  // Fructans: garlic
  ['Garlic bread', 'grain', '1 slice (30g):H fg fw'],
  ['Garlic butter', 'cond', '1 tsp (5g):M fg|1 tbsp:H fg'],
  ['Aioli / garlic mayonnaise', 'cond', '1 tbsp (20g):H fg'],
  ['Garlic salt', 'herb', '1/4 tsp:M fg|1 tsp:H fg'],
  ['Chimichurri', 'cond', '1 tbsp (15g):M fg|2 tbsp:H fg'],
  ['Black garlic', 'veg', '1 clove (3g):H fg'],

  // Other fructans
  ['Jerusalem artichoke (sunchoke)', 'veg', '1/2 cup (75g):H fn'],
  ['Dried fruit mix / trail mix', 'snack', '1/4 cup (35g):H fn fr so gos~'],
  ['Persimmon', 'fruit', '1/2 fruit (80g):M fn|1 fruit:H fn'],
  ['Tamarillo', 'fruit', '1 fruit (80g):M fr'],
  ['Tea, dandelion (strong)', 'drink', '1 cup (250ml):H fn'],
  ['Coffee substitute (chicory-based)', 'drink', '1 cup (250ml):H fn'],

  // Mixed meals (typical recipes)
  ['Pizza, takeaway (cheese)', 'grain', '1 slice:M fw la fo~|2 slices:H fw la fo fg'],
  ['Lasagne', 'grain', '1 serve (250g):H fw la fo fg'],
  ['Mac and cheese', 'grain', '1 cup (200g):H fw la'],
  ['Burrito (beans, onion, wheat tortilla)', 'grain', '1 burrito:H fw gos fo fg'],
  ['Hamburger (bun, onion, sauce)', 'protein', '1 burger:H fw fo fr~'],
  ['Curry, restaurant (butter chicken, korma)', 'protein', '1 cup (250g):H fo fg la'],
  ['Fried rice, takeaway', 'grain', '1 cup (200g):H fo fg'],
  ['Stir-fry, takeaway (with sauce)', 'protein', '1 cup (250g):H fo fg'],
  ['Chicken nuggets / crumbed chicken', 'protein', '4 nuggets (70g):M fw fo~|8 nuggets:H fw fo'],
  ['Meat pie', 'protein', '1 pie (175g):H fw fo'],
  ['Spaghetti bolognese', 'grain', '1 serve (300g):H fw fo fg'],
  ['Sandwich, wheat bread (typical deli)', 'grain', '1 sandwich:M fw|with onion/relish:H fw fo'],
];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function parseTier(tier: string): { serving: Serving; srcs: FructanSource[] } {
  const idx = tier.lastIndexOf(':');
  const label = tier.slice(0, idx).trim();
  const [lv, ...codes] = tier.slice(idx + 1).trim().split(/\s+/);
  const level = LEVELS[lv];
  if (!level) throw new Error(`Bad tier "${tier}"`);
  const groups: Serving['groups'] = {};
  const srcs: FructanSource[] = [];
  for (const raw of codes) {
    const force = raw.endsWith('!') ? 'high' : raw.endsWith('~') ? 'moderate' : null;
    const code = raw.replace(/[!~]$/, '');
    const def = CODES[code];
    if (!def) throw new Error(`Bad code "${raw}" in "${tier}"`);
    groups[def.group] = force ?? level;
    if (def.src) srcs.push(def.src);
  }
  return { serving: { label, level, groups }, srcs };
}

export function buildFoods(rows: Row[] = ROWS): Food[] {
  const seen = new Set<string>();
  return rows.map(([name, cat, tiers, notes]) => {
    let id = slug(name);
    while (seen.has(id)) id += '-x';
    seen.add(id);
    const sources = new Set<FructanSource>();
    const servings = tiers.split('|').map((t) => {
      const { serving, srcs } = parseTier(t);
      srcs.forEach((x) => sources.add(x));
      return serving;
    });
    // One known source links the food to that fructan challenge; mixed sources (e.g. garlic
    // bread) stay undefined so the strictest tested fructan result applies.
    const fructanSource = sources.size === 1 ? [...sources][0] : undefined;
    const category = CAT[cat];
    if (!category) throw new Error(`Bad category "${cat}" for ${name}`);
    return { id, name, category, servings, notes, fructanSource };
  });
}

/**
 * Foods with no FODMAPs at all: plain animal protein, pure fats, pure sugars and plain
 * starches. Their serving is just a typical portion, not a FODMAP limit. Deliberately
 * conservative: foods with trace FODMAPs (butter, cheese, herbs, spices) are not listed.
 */
const FODMAP_FREE = new Set(
  `beef-plain chicken-plain pork-plain lamb-plain turkey-plain fish-fresh-salmon-cod-etc tuna-canned-in-oil-or-water
  shrimp-prawns eggs bacon olive-oil-vegetable-oils garlic-infused-oil onion-infused-oil ghee water-sparkling-water
  spirits-gin-vodka-whisky sugar-white-brown-raw stevia rice-white-basmati-jasmine rice-brown potato-white salt-pepper`
    .split(/\s+/)
    .filter(Boolean),
);

export const SEED_FOODS: Food[] = buildFoods().map((f) => {
  const gl = GL_DATA[f.id];
  const amount = gl?.[2]?.match(/^(\d+(?:\.\d+)?)(g|ml)$/);
  return {
    ...f,
    ...(gl && { gl: gl[0], glServing: gl[1] }),
    ...(amount && { glAmount: Number(amount[1]), glUnit: amount[2] as 'g' | 'ml' }),
    ...(FODMAP_FREE.has(f.id) && { fodmapFree: true }),
  };
});

export const FODMAP_FREE_IDS: ReadonlySet<string> = FODMAP_FREE;
