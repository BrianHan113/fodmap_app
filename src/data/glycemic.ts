/*
 * Estimated glycaemic load (GL) per typical serving, by food id.
 * GL = GI × available carbohydrate (g) ÷ 100. Standard bands per serving: low ≤10, medium 11–19, high ≥20.
 * Values are rounded estimates from published GI tables (e.g. University of Sydney GI
 * database) and typical carbohydrate content. GL varies with ripeness, cooking, brand and
 * portion, so treat these as a guide.
 *
 * Each entry also gives the weight (g, as eaten) or volume (ml) of that serving, so GL can be
 * compared per 100g (per 250ml glass for drinks). That comparison stops foods looking "low GL"
 * just because their typical serving is small (e.g. 1 tbsp of sugar).
 */

/** [GL, serving it applies to, amount of that serving as eaten: "150g" or "250ml"] */
export type GlEntry = [gl: number, serving: string, amount?: string];

// Essentially no carbohydrate: GL 0 at any amount.
const NONE = `
beef-plain chicken-plain pork-plain lamb-plain turkey-plain fish-fresh-salmon-cod-etc tuna-canned-in-oil-or-water
shrimp-prawns sardines-canned-in-oil-or-water eggs bacon ham-deli
cheese-cheddar cheese-parmesan cheese-swiss-gouda-edam cheese-mozzarella cheese-brie-camembert cheese-feta
cheese-goat-ch-vre cheese-halloumi cheese-cream-cheese cheese-mascarpone butter ghee cream-heavy-whipping sour-cream
olive-oil-vegetable-oils garlic-infused-oil onion-infused-oil soy-sauce tamari fish-sauce mustard-dijon-yellow
mayonnaise sriracha hot-sauce-tabasco-style vinegar-white-red-wine-rice vinegar-apple-cider pesto-with-garlic
sauerkraut-white-cabbage pickles-gherkins-no-garlic capers garlic-butter aioli-garlic-mayonnaise chimichurri
water-sparkling-water coffee-black-espresso coffee-instant tea-black-weak tea-green tea-peppermint tea-chamomile
tea-fennel tea-chai-strong tea-oolong-strong spirits-gin-vodka-whisky rum protein-powder-whey-isolate tea-dandelion-strong
stevia sugar-free-gum-mints chicory-root-inulin-fibre
basil parsley cilantro-coriander mint rosemary-thyme-oregano dill chives spices-cumin-paprika-turmeric-cinnamon-etc
salt-pepper asafoetida-hing onion-powder garlic-powder taco-fajita-seasoning chicken-salt-seasoned-salt garlic-salt
avocado olives lettuce-iceberg-butter-cos-coral cucumber spinach-baby spinach-english swiss-chard-silverbeet endive
arugula-rocket alfalfa-sprouts chili-red-or-green garlic garlic-chives ginger-fresh radish seaweed-nori choy-sum
mushrooms-button mushrooms-canned-champignons mushrooms-oyster mushrooms-shiitake-fresh mushrooms-portobello
onion-spring-green-tops-only onion-spring-white-bulb celery
almonds brazil-nuts hazelnuts macadamias pecans pine-nuts walnuts chia-seeds flaxseed-linseed pumpkin-seeds-pepitas
sunflower-seeds sesame-seeds tahini almond-butter
`;

// Non-starchy foods with a little carbohydrate: GL about 1 per typical serving (~75g).
const TRACE = `
artichoke-hearts-canned asparagus bamboo-shoots bean-sprouts bok-choy broccoli-heads broccoli-stalks broccolini
cabbage-green-or-red cabbage-napa-chinese cabbage-savoy cauliflower collard-greens eggplant-aubergine fennel-bulb
green-beans kale leek-bulb-white leek-leaves-green okra peas-snow peas-sugar-snap bell-pepper-green bell-pepper-red
shallots squash-yellow-pattypan tomato-common tomato-cherry zucchini-courgette cauliflower-rice onion-pickled
black-garlic mung-bean-sprouts rhubarb lemon-lime-juice
peanuts peanut-butter pistachios mixed-nuts soybeans-boiled hummus edamame
tofu-firm tofu-silken quorn-mince cheese-cottage cheese-ricotta cheese-sauce-bechamel coconut-milk-canned yogurt-greek
salsa-with-onion stock-bouillon-regular kimchi tzatziki cashew-pistachio-dip-or-pesto french-onion-dip
curry-paste-with-onion-garlic
`;

// Same, but eaten in small amounts (~15g): condiments, flours, fibre supplements.
const TRACE_SMALL = `
oyster-sauce worcestershire-sauce vinegar-balsamic miso-paste cocoa-powder
sugar-alcohols-sorbitol-mannitol-xylitol-maltitol nutritional-yeast oat-bran psyllium-husk wheat-bran
flour-almond-meal soy-flour
`;

// Same, but drinks (~250ml).
const TRACE_DRINK = `
wine-red-white-sparkling protein-powder-whey-concentrate celery-juice coffee-substitute-chicory-based milk-almond milk-macadamia
`;

const EXPLICIT: Record<string, GlEntry> = {
  // Vegetables
  'artichoke-globe': [3, '1 medium', '120g'],
  beetroot: [5, '1/2 cup (85g)', '85g'],
  'brussels-sprouts': [2, '1 cup', '90g'],
  'butternut-squash': [5, '1 cup', '140g'],
  carrot: [2, '1 medium', '75g'],
  'cassava-yuca': [17, '1/2 cup (100g)', '100g'],
  celeriac: [2, '1/2 cup', '80g'],
  'corn-baby-canned': [2, '1/2 cup', '75g'],
  'corn-sweet-cob': [10, '1 medium cob', '100g'],
  'onion-brown-white-red': [2, '1/2 onion', '75g'],
  'onion-caramelised': [3, '2 tbsp', '30g'],
  parsnip: [6, '1/2 cup (80g)', '80g'],
  'peas-green': [5, '1/2 cup', '80g'],
  'potato-white': [21, '1 medium (150g), boiled', '150g'],
  'pumpkin-kent-japanese': [5, '1 cup', '120g'],
  'sweet-potato': [17, '1 medium (150g)', '150g'],
  taro: [12, '1/2 cup (100g)', '100g'],
  'tomato-canned': [2, '1/2 cup', '120g'],
  'tomato-sun-dried': [2, '5 pieces', '15g'],
  turnip: [2, '1/2 cup', '80g'],
  'water-chestnuts': [4, '1/2 cup', '75g'],
  'jerusalem-artichoke-sunchoke': [3, '1/2 cup', '75g'],

  // Fruit
  apple: [6, '1 medium', '150g'],
  'apricot-fresh': [3, '2 apricots', '70g'],
  'apricot-dried': [5, '30g', '30g'],
  'banana-firm-just-yellow': [10, '1 medium', '100g'],
  'banana-ripe-spotty': [13, '1 medium', '110g'],
  blackberries: [4, '1 cup', '145g'],
  blueberries: [7, '1 cup (125g)', '125g'],
  boysenberries: [3, '1/2 cup', '70g'],
  'cantaloupe-rockmelon': [4, '1 cup', '160g'],
  cherries: [5, '1 cup', '140g'],
  clementine: [3, '1 medium', '75g'],
  'coconut-fresh-flesh': [2, '1/2 cup', '40g'],
  'coconut-dried-shredded': [2, '1/4 cup', '20g'],
  'cranberries-dried': [20, '1/4 cup (40g), sweetened', '40g'],
  'dates-dried': [15, '2 medjool dates', '48g'],
  'dragon-fruit': [5, '1 medium', '200g'],
  'figs-dried-or-fresh': [9, '2 dried figs', '40g'],
  grapefruit: [3, '1/2 fruit', '120g'],
  grapes: [9, '1 cup (150g)', '150g'],
  'guava-ripe': [2, '1 fruit', '90g'],
  'honeydew-melon': [6, '1 cup', '170g'],
  'kiwifruit-green-or-gold': [7, '2 small', '150g'],
  lychee: [4, '5 lychees', '50g'],
  mandarin: [3, '1 medium', '90g'],
  mango: [11, '1 cup (165g)', '165g'],
  nectarine: [4, '1 medium', '140g'],
  orange: [5, '1 medium', '130g'],
  'papaya-pawpaw': [7, '1 cup', '140g'],
  passionfruit: [2, '2 fruits', '36g'],
  peach: [4, '1 medium', '150g'],
  pear: [6, '1 medium', '170g'],
  'pineapple-fresh': [8, '1 cup', '165g'],
  'pineapple-dried': [12, '30g', '30g'],
  plum: [2, '1 plum', '65g'],
  'pomegranate-seeds': [6, '1/2 cup', '87g'],
  prunes: [7, '5 prunes (40g)', '40g'],
  raisins: [19, '1/4 cup (40g)', '40g'],
  raspberries: [3, '1 cup', '125g'],
  strawberries: [3, '1 cup', '150g'],
  watermelon: [5, '1 cup', '150g'],
  'apple-sauce': [7, '1/2 cup', '125g'],
  'canned-fruit-in-pear-apple-juice': [6, '1/2 cup', '120g'],
  'mango-dried': [15, '30g', '30g'],
  'peach-canned': [5, '1/2 cup in juice (more in syrup)', '120g'],
  persimmon: [13, '1 fruit', '170g'],
  tamarillo: [2, '1 fruit', '80g'],

  // Grains & bread
  'bread-white-wheat': [10, '1 slice (30g)', '30g'],
  'bread-wholemeal-wheat': [9, '1 slice', '30g'],
  'bread-sourdough-white-wheat-traditional': [9, '1 slice (40g)', '40g'],
  'bread-sourdough-spelt': [8, '1 slice', '35g'],
  'bread-gluten-free': [10, '1 slice', '35g'],
  'bread-rye': [8, '1 slice', '30g'],
  'bagel-wheat': [25, '1 bagel', '90g'],
  croissant: [17, '1 croissant', '60g'],
  'tortilla-corn': [11, '2 small', '50g'],
  'tortilla-wheat-flour': [8, '1 large', '60g'],
  'pasta-wheat-cooked': [20, '1 cup cooked (180g)', '180g'],
  'pasta-gluten-free-cooked': [22, '1 cup cooked', '180g'],
  'noodles-rice-cooked': [21, '1 cup cooked', '175g'],
  'noodles-soba-100-buckwheat': [20, '1 cup cooked', '115g'],
  'noodles-udon-wheat': [24, '1 cup cooked', '200g'],
  'noodles-egg-wheat-cooked': [16, '1 cup cooked', '160g'],
  'rice-white-basmati-jasmine': [32, '1 cup cooked (basmati lower, jasmine higher)', '190g'],
  'rice-brown': [24, '1 cup cooked', '195g'],
  quinoa: [16, '1 cup cooked', '185g'],
  'oats-rolled': [13, '1/2 cup dry, as porridge', '250g'],
  'oats-quick': [17, '1/2 cup dry, as porridge', '250g'],
  millet: [25, '1 cup cooked', '175g'],
  'buckwheat-groats': [15, '1 cup cooked', '170g'],
  'polenta-cornmeal': [18, '1 cup cooked', '240g'],
  sorghum: [13, '1/2 cup cooked', '90g'],
  'amaranth-puffed': [5, '1/4 cup', '7g'],
  'couscous-wheat': [23, '1 cup cooked', '160g'],
  bulgur: [14, '1 cup cooked', '180g'],
  'barley-pearl': [12, '1 cup cooked', '160g'],
  cornflakes: [21, '1 cup (30g)', '30g'],
  'rice-cereal-rice-krispies': [21, '1 cup (30g)', '30g'],
  'muesli-granola-wheat-based': [17, '1/2 cup (60g)', '60g'],
  'rice-cakes': [12, '2 cakes', '18g'],
  'rice-crackers-plain': [20, '15 crackers (30g)', '30g'],
  'corn-thins-corn-cakes': [8, '2 thins', '12g'],
  'saltine-water-crackers': [8, '5 crackers', '15g'],
  'flour-wheat-plain': [15, '1/4 cup (30g)', '30g'],
  'flour-spelt': [13, '1/4 cup (30g)', '30g'],
  'flour-rice-corn-tapioca-potato-starch': [22, '1/4 cup (30g)', '30g'],
  'flour-buckwheat': [12, '1/4 cup (30g)', '30g'],
  'flour-chickpea-besan': [5, '1/4 cup', '25g'],
  'flour-coconut': [3, '1/4 cup', '30g'],
  'pancakes-wheat': [16, '2 small', '80g'],
  'pizza-base-wheat': [14, '1 slice', '60g'],
  'pita-bread-wheat': [20, '1 pita (60g)', '60g'],
  'naan-wheat': [30, '1 naan', '90g'],
  'bread-roll-burger-bun-white-wheat': [17, '1 roll', '60g'],
  'english-muffin-wheat': [18, '1 muffin', '60g'],
  crumpet: [14, '1 crumpet', '50g'],
  'muffin-wheat-bakery': [28, '1 muffin', '110g'],
  'pastry-pie-crust-wheat': [12, '1 serve (40g)', '40g'],
  'breadcrumbs-panko-wheat': [12, '1/4 cup', '25g'],
  'crackers-wholemeal-wheat': [9, '4 crackers', '20g'],
  'wheat-biscuit-cereal-weet-bix-shredded-wheat': [14, '2 biscuits (30g)', '30g'],
  'bran-flakes-all-bran': [7, '1/2 cup (30g)', '30g'],
  'wheat-germ': [2, '2 tbsp', '14g'],
  semolina: [9, '1/2 cup cooked', '120g'],
  freekeh: [8, '1/2 cup cooked', '80g'],
  'spelt-pasta-cooked': [18, '1 cup cooked', '180g'],
  'rye-crispbread': [8, '2 crispbreads', '20g'],
  pumpernickel: [7, '1 slice', '30g'],
  'dumplings-gyoza-wheat-wrapper': [12, '4 dumplings', '100g'],
  'instant-ramen-noodles-with-flavour-sachet': [25, '1 packet', '200g'],
  'garlic-bread': [10, '1 slice', '35g'],
  'pizza-takeaway-cheese': [30, '2 slices', '200g'],
  lasagne: [17, '1 serve (250g)', '250g'],
  'mac-and-cheese': [28, '1 cup', '200g'],
  'burrito-beans-onion-wheat-tortilla': [30, '1 burrito', '250g'],
  'fried-rice-takeaway': [28, '1 cup', '170g'],
  'spaghetti-bolognese': [25, '1 serve (300g)', '300g'],
  'sandwich-wheat-bread-typical-deli': [20, '1 sandwich', '150g'],

  // Dairy & alternatives
  'milk-cow-regular': [4, '1 cup (250ml)', '250ml'],
  'milk-lactose-free': [5, '1 cup (250ml)', '250ml'],
  'milk-soy-from-soy-protein': [3, '1 cup', '250ml'],
  'milk-soy-from-whole-soybeans': [3, '1 cup', '250ml'],
  'milk-oat': [11, '1 cup', '250ml'],
  'milk-rice': [20, '1 cup', '250ml'],
  'coconut-milk-beverage-carton': [2, '1 cup', '250ml'],
  'yogurt-regular-dairy': [4, '1 cup plain (flavoured is higher)', '245g'],
  'yogurt-lactose-free': [3, '3/4 cup plain', '170g'],
  'yogurt-coconut': [3, '1/2 cup', '120g'],
  'ice-cream-dairy': [8, '1/2 cup', '70g'],
  'ice-cream-lactose-free': [9, '1/2 cup', '70g'],
  kefir: [4, '1 cup', '250ml'],
  'evaporated-condensed-milk': [15, '2 tbsp sweetened condensed (evaporated is much lower)', '40g'],
  'milk-goat': [4, '1 cup', '250ml'],
  buttermilk: [5, '1 cup', '250ml'],
  custard: [9, '1/2 cup', '125g'],
  'rice-pudding-dairy': [15, '1/2 cup', '125g'],
  'instant-pudding-made-with-milk': [11, '1/2 cup', '125g'],
  'frozen-yogurt': [10, '1/2 cup', '75g'],
  'gelato-milk-based': [16, '2 scoops', '120g'],
  'milk-powder': [3, '2 tbsp', '15g'],

  // Protein
  sausages: [2, '1 sausage', '75g'],
  tempeh: [1, '100g', '100g'],
  'hamburger-bun-onion-sauce': [18, '1 burger', '220g'],
  'curry-restaurant-butter-chicken-korma': [4, '1 cup, without rice', '250g'],
  'stir-fry-takeaway-with-sauce': [6, '1 cup, without rice', '250g'],
  'chicken-nuggets-crumbed-chicken': [7, '6 nuggets', '100g'],
  'meat-pie': [18, '1 pie', '175g'],

  // Legumes
  'chickpeas-canned-rinsed': [5, '1/2 cup', '85g'],
  'lentils-canned-rinsed': [5, '1/2 cup', '100g'],
  'lentils-boiled-red-or-green': [6, '1/2 cup', '100g'],
  'black-beans-canned': [6, '1/2 cup', '86g'],
  'kidney-beans': [6, '1/2 cup', '88g'],
  'butter-lima-beans-canned': [5, '1/2 cup', '90g'],
  'baked-beans': [8, '1/2 cup', '130g'],
  'split-peas': [6, '1/2 cup', '100g'],
  'cannellini-beans-canned': [6, '1/2 cup', '90g'],
  'borlotti-beans-canned': [6, '1/2 cup', '90g'],
  'navy-haricot-beans': [9, '1/2 cup', '90g'],
  'pinto-beans': [7, '1/2 cup', '85g'],
  'black-eyed-peas': [7, '1/2 cup', '85g'],
  'broad-fava-beans': [9, '1/2 cup', '85g'],
  'adzuki-beans': [9, '1/2 cup', '115g'],
  'mung-beans-whole-boiled': [6, '1/2 cup', '100g'],
  'refried-beans': [8, '1/2 cup', '120g'],
  falafel: [5, '3 falafel', '50g'],
  'dahl-lentil-curry': [6, '1/2 cup, without rice', '125g'],
  'bean-chili-with-onion': [10, '1 cup', '250g'],

  // Nuts & seeds
  cashews: [2, '30g', '30g'],
  'cashew-butter': [1, '1 tbsp', '16g'],

  // Condiments & sauces
  'ketchup-tomato-sauce': [2, '1 tbsp', '17g'],
  'barbecue-sauce': [6, '2 tbsp', '36g'],
  'sweet-chili-sauce': [5, '1 tbsp', '20g'],
  'gravy-packet': [2, '1/4 cup', '60g'],
  'tomato-pasta-sauce-jarred-onion-garlic': [4, '1/2 cup', '125g'],
  'chutney-relish': [5, '1 tbsp', '20g'],
  'mushroom-soup-cream-of': [5, '1 cup', '250g'],
  'soup-packet-or-canned-most': [4, '1 cup (noodle soups higher)', '250g'],

  // Sweets & sweeteners
  'sugar-white-brown-raw': [8, '1 tbsp', '12g'],
  'maple-syrup': [15, '2 tbsp', '40g'],
  honey: [10, '1 tbsp', '21g'],
  'agave-syrup': [2, '1 tbsp', '21g'],
  'golden-syrup': [11, '1 tbsp', '21g'],
  'rice-malt-syrup': [20, '1 tbsp', '25g'],
  'high-fructose-corn-syrup': [9, '1 tbsp', '20g'],
  'jam-strawberry': [7, '1 tbsp', '20g'],
  marmalade: [6, '1 tbsp', '20g'],
  'chocolate-dark': [3, '30g', '30g'],
  'chocolate-milk': [8, '30g', '30g'],
  'chocolate-white': [8, '30g', '30g'],
  'cookies-shortbread-wheat': [10, '2 cookies', '26g'],
  'fructose-fruit-sugar': [2, '1 tbsp', '12g'],
  'fruit-juice-concentrate-as-sweetener': [6, '1 tbsp', '20g'],
  'sugar-free-chocolate-lollies': [3, '25g', '25g'],
  'cake-wheat-flour-plain-sponge': [16, '1 slice (60g)', '60g'],
  doughnut: [17, '1 doughnut', '60g'],
  'biscuits-cookies-wheat': [10, '2 biscuits', '25g'],

  // Drinks
  beer: [8, '1 can (375ml)', '375ml'],
  'coconut-water': [5, '1 cup', '250ml'],
  'orange-juice-fresh': [13, '1 cup (250ml)', '250ml'],
  'apple-juice': [12, '1 cup (250ml)', '250ml'],
  'cranberry-juice': [22, '1 cup, juice drink', '250ml'],
  kombucha: [3, '1 cup', '250ml'],
  'soft-drink-sugar-sweetened': [25, '1 can (375ml)', '375ml'],
  'soft-drink-high-fructose-corn-syrup': [23, '1 can (375ml)', '375ml'],
  'sports-drink': [28, '1 bottle (600ml)', '600ml'],
  'fruit-smoothie-mango-apple-based': [15, '1 cup', '250ml'],
  'pear-juice': [13, '1 cup', '250ml'],
  'mango-juice-nectar': [18, '1 cup', '250ml'],
  'cider-apple-alcoholic': [10, '1 can (375ml)', '375ml'],
  'dessert-wine-port-sherry': [4, '60ml', '60ml'],
  'latte-cappuccino-regular-milk': [4, 'regular (250ml), unsweetened', '250ml'],
  'hot-chocolate-made-with-milk': [11, '1 cup', '250ml'],
  'chai-latte-regular-milk': [14, '1 cup, sweetened', '250ml'],
  milkshake: [15, '1 cup', '250ml'],
  'lassi-yogurt-drink': [9, '1 cup, sweet', '250ml'],
  'prune-juice': [17, '1 cup', '250ml'],

  // Snacks
  'popcorn-plain': [11, '3 cups (25g)', '25g'],
  'potato-chips-plain-salted': [12, '1 bag (50g)', '50g'],
  'tortilla-chips-corn': [17, '50g', '50g'],
  'pretzels-wheat': [16, '30g', '30g'],
  'french-fries': [20, '1 serve (100g)', '100g'],
  'granola-bar-typical': [12, '1 bar', '30g'],
  'protein-bar-with-polyols': [5, '1 bar', '60g'],
  'sweet-potato-fries': [15, '1 cup', '100g'],
  'onion-rings-battered': [12, '4 rings', '60g'],
  'dried-fruit-mix-trail-mix': [8, '1/4 cup', '35g'],
};

function build(): Record<string, GlEntry> {
  const out: Record<string, GlEntry> = {};
  const add = (id: string, e: GlEntry) => {
    if (out[id]) throw new Error(`Duplicate GL entry for ${id}`);
    out[id] = e;
  };
  const ids = (s: string) => s.split(/\s+/).filter(Boolean);
  for (const id of ids(NONE)) add(id, [0, 'negligible carbohydrate']);
  for (const id of ids(TRACE)) add(id, [1, 'typical serving', '75g']);
  for (const id of ids(TRACE_SMALL)) add(id, [1, 'typical serving', '15g']);
  for (const id of ids(TRACE_DRINK)) add(id, [1, 'typical serving', '250ml']);
  for (const [id, e] of Object.entries(EXPLICIT)) add(id, e);
  return out;
}

export const GL_DATA: Record<string, GlEntry> = build();
