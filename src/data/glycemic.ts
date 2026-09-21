/*
 * Estimated glycaemic load (GL) per typical serving, by food id.
 * GL = GI × available carbohydrate (g) ÷ 100. Bands: low ≤10, medium 11–19, high ≥20.
 * Values are rounded estimates from published GI tables (e.g. University of Sydney GI
 * database) and typical carbohydrate content. GL varies with ripeness, cooking, brand and
 * portion, so treat these as a guide. The serving here is a typical portion, which is not
 * always the same as the food's low-FODMAP serving.
 */

/** [GL, serving it applies to] */
export type GlEntry = [gl: number, serving: string];

// Essentially no carbohydrate: GL 0.
const NONE = `
beef-plain chicken-plain pork-plain lamb-plain turkey-plain fish-fresh-salmon-cod-etc tuna-canned-in-oil-or-water
shrimp-prawns eggs bacon ham-deli
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

// Non-starchy foods with a little carbohydrate: GL about 1 per typical serving.
const TRACE = `
artichoke-hearts-canned asparagus bamboo-shoots bean-sprouts bok-choy broccoli-heads broccoli-stalks broccolini
cabbage-green-or-red cabbage-napa-chinese cabbage-savoy cauliflower collard-greens eggplant-aubergine fennel-bulb
green-beans kale leek-bulb-white leek-leaves-green okra peas-snow peas-sugar-snap bell-pepper-green bell-pepper-red
shallots squash-yellow-pattypan tomato-common tomato-cherry zucchini-courgette cauliflower-rice onion-pickled
black-garlic mung-bean-sprouts rhubarb lemon-lime-juice
peanuts peanut-butter pistachios mixed-nuts soybeans-boiled hummus edamame
tofu-firm tofu-silken quorn-mince cheese-cottage cheese-ricotta cheese-sauce-bechamel coconut-milk-canned
milk-almond milk-macadamia yogurt-greek
oyster-sauce worcestershire-sauce vinegar-balsamic miso-paste salsa-with-onion stock-bouillon-regular kimchi
tzatziki cashew-pistachio-dip-or-pesto french-onion-dip curry-paste-with-onion-garlic
wine-red-white-sparkling protein-powder-whey-concentrate celery-juice coffee-substitute-chicory-based
cocoa-powder sugar-alcohols-sorbitol-mannitol-xylitol-maltitol nutritional-yeast oat-bran psyllium-husk wheat-bran
flour-almond-meal soy-flour
`;

const EXPLICIT: Record<string, GlEntry> = {
  // Vegetables
  'artichoke-globe': [3, '1 medium'],
  beetroot: [5, '1/2 cup (85g)'],
  'brussels-sprouts': [2, '1 cup'],
  'butternut-squash': [5, '1 cup'],
  carrot: [2, '1 medium'],
  'cassava-yuca': [17, '1/2 cup (100g)'],
  celeriac: [2, '1/2 cup'],
  'corn-baby-canned': [2, '1/2 cup'],
  'corn-sweet-cob': [10, '1 medium cob'],
  'onion-brown-white-red': [2, '1/2 onion'],
  'onion-caramelised': [3, '2 tbsp'],
  parsnip: [6, '1/2 cup (80g)'],
  'peas-green': [5, '1/2 cup'],
  'potato-white': [21, '1 medium (150g), boiled'],
  'pumpkin-kent-japanese': [5, '1 cup'],
  'sweet-potato': [17, '1 medium (150g)'],
  taro: [12, '1/2 cup (100g)'],
  'tomato-canned': [2, '1/2 cup'],
  'tomato-sun-dried': [2, '5 pieces'],
  turnip: [2, '1/2 cup'],
  'water-chestnuts': [4, '1/2 cup'],
  'jerusalem-artichoke-sunchoke': [3, '1/2 cup'],

  // Fruit
  apple: [6, '1 medium'],
  'apricot-fresh': [3, '2 apricots'],
  'apricot-dried': [5, '30g'],
  'banana-firm-just-yellow': [10, '1 medium'],
  'banana-ripe-spotty': [13, '1 medium'],
  blackberries: [4, '1 cup'],
  blueberries: [7, '1 cup (125g)'],
  boysenberries: [3, '1/2 cup'],
  'cantaloupe-rockmelon': [4, '1 cup'],
  cherries: [5, '1 cup'],
  clementine: [3, '1 medium'],
  'coconut-fresh-flesh': [2, '1/2 cup'],
  'coconut-dried-shredded': [2, '1/4 cup'],
  'cranberries-dried': [20, '1/4 cup (40g), sweetened'],
  'dates-dried': [15, '2 medjool dates'],
  'dragon-fruit': [5, '1 medium'],
  'figs-dried-or-fresh': [9, '2 dried figs'],
  grapefruit: [3, '1/2 fruit'],
  grapes: [9, '1 cup (150g)'],
  'guava-ripe': [2, '1 fruit'],
  'honeydew-melon': [6, '1 cup'],
  'kiwifruit-green-or-gold': [7, '2 small'],
  lychee: [4, '5 lychees'],
  mandarin: [3, '1 medium'],
  mango: [11, '1 cup (165g)'],
  nectarine: [4, '1 medium'],
  orange: [5, '1 medium'],
  'papaya-pawpaw': [7, '1 cup'],
  passionfruit: [2, '2 fruits'],
  peach: [4, '1 medium'],
  pear: [6, '1 medium'],
  'pineapple-fresh': [8, '1 cup'],
  'pineapple-dried': [12, '30g'],
  plum: [2, '1 plum'],
  'pomegranate-seeds': [6, '1/2 cup'],
  prunes: [7, '5 prunes (40g)'],
  raisins: [19, '1/4 cup (40g)'],
  raspberries: [3, '1 cup'],
  strawberries: [3, '1 cup'],
  watermelon: [5, '1 cup'],
  'apple-sauce': [7, '1/2 cup'],
  'canned-fruit-in-pear-apple-juice': [6, '1/2 cup'],
  'mango-dried': [15, '30g'],
  'peach-canned': [5, '1/2 cup in juice (more in syrup)'],
  persimmon: [13, '1 fruit'],
  tamarillo: [2, '1 fruit'],

  // Grains & bread
  'bread-white-wheat': [10, '1 slice (30g)'],
  'bread-wholemeal-wheat': [9, '1 slice'],
  'bread-sourdough-white-wheat-traditional': [9, '1 slice (40g)'],
  'bread-sourdough-spelt': [8, '1 slice'],
  'bread-gluten-free': [10, '1 slice'],
  'bread-rye': [8, '1 slice'],
  'bagel-wheat': [25, '1 bagel'],
  croissant: [17, '1 croissant'],
  'tortilla-corn': [11, '2 small'],
  'tortilla-wheat-flour': [8, '1 large'],
  'pasta-wheat-cooked': [20, '1 cup cooked (180g)'],
  'pasta-gluten-free-cooked': [22, '1 cup cooked'],
  'noodles-rice-cooked': [21, '1 cup cooked'],
  'noodles-soba-100-buckwheat': [20, '1 cup cooked'],
  'noodles-udon-wheat': [24, '1 cup cooked'],
  'noodles-egg-wheat-cooked': [16, '1 cup cooked'],
  'rice-white-basmati-jasmine': [32, '1 cup cooked (basmati lower, jasmine higher)'],
  'rice-brown': [24, '1 cup cooked'],
  quinoa: [16, '1 cup cooked'],
  'oats-rolled': [13, '1/2 cup dry, as porridge'],
  'oats-quick': [17, '1/2 cup dry, as porridge'],
  millet: [25, '1 cup cooked'],
  'buckwheat-groats': [15, '1 cup cooked'],
  'polenta-cornmeal': [18, '1 cup cooked'],
  sorghum: [13, '1/2 cup cooked'],
  'amaranth-puffed': [5, '1/4 cup'],
  'couscous-wheat': [23, '1 cup cooked'],
  bulgur: [14, '1 cup cooked'],
  'barley-pearl': [12, '1 cup cooked'],
  cornflakes: [21, '1 cup (30g)'],
  'rice-cereal-rice-krispies': [21, '1 cup (30g)'],
  'muesli-granola-wheat-based': [17, '1/2 cup (60g)'],
  'rice-cakes': [12, '2 cakes'],
  'rice-crackers-plain': [20, '15 crackers (30g)'],
  'corn-thins-corn-cakes': [8, '2 thins'],
  'saltine-water-crackers': [8, '5 crackers'],
  'flour-wheat-plain': [15, '1/4 cup (30g)'],
  'flour-spelt': [13, '1/4 cup (30g)'],
  'flour-rice-corn-tapioca-potato-starch': [22, '1/4 cup (30g)'],
  'flour-buckwheat': [12, '1/4 cup (30g)'],
  'flour-chickpea-besan': [5, '1/4 cup'],
  'flour-coconut': [3, '1/4 cup'],
  'pancakes-wheat': [16, '2 small'],
  'pizza-base-wheat': [14, '1 slice'],
  'pita-bread-wheat': [20, '1 pita (60g)'],
  'naan-wheat': [30, '1 naan'],
  'bread-roll-burger-bun-white-wheat': [17, '1 roll'],
  'english-muffin-wheat': [18, '1 muffin'],
  crumpet: [14, '1 crumpet'],
  'muffin-wheat-bakery': [28, '1 muffin'],
  'pastry-pie-crust-wheat': [12, '1 serve (40g)'],
  'breadcrumbs-panko-wheat': [12, '1/4 cup'],
  'crackers-wholemeal-wheat': [9, '4 crackers'],
  'wheat-biscuit-cereal-weet-bix-shredded-wheat': [14, '2 biscuits (30g)'],
  'bran-flakes-all-bran': [7, '1/2 cup (30g)'],
  'wheat-germ': [2, '2 tbsp'],
  semolina: [9, '1/2 cup cooked'],
  freekeh: [8, '1/2 cup cooked'],
  'spelt-pasta-cooked': [18, '1 cup cooked'],
  'rye-crispbread': [8, '2 crispbreads'],
  pumpernickel: [7, '1 slice'],
  'dumplings-gyoza-wheat-wrapper': [12, '4 dumplings'],
  'instant-ramen-noodles-with-flavour-sachet': [25, '1 packet'],
  'garlic-bread': [10, '1 slice'],
  'pizza-takeaway-cheese': [30, '2 slices'],
  lasagne: [17, '1 serve (250g)'],
  'mac-and-cheese': [28, '1 cup'],
  'burrito-beans-onion-wheat-tortilla': [30, '1 burrito'],
  'fried-rice-takeaway': [28, '1 cup'],
  'spaghetti-bolognese': [25, '1 serve (300g)'],
  'sandwich-wheat-bread-typical-deli': [20, '1 sandwich'],

  // Dairy & alternatives
  'milk-cow-regular': [4, '1 cup (250ml)'],
  'milk-lactose-free': [5, '1 cup (250ml)'],
  'milk-soy-from-soy-protein': [3, '1 cup'],
  'milk-soy-from-whole-soybeans': [3, '1 cup'],
  'milk-oat': [11, '1 cup'],
  'milk-rice': [20, '1 cup'],
  'coconut-milk-beverage-carton': [2, '1 cup'],
  'yogurt-regular-dairy': [4, '1 cup plain (flavoured is higher)'],
  'yogurt-lactose-free': [3, '3/4 cup plain'],
  'yogurt-coconut': [3, '1/2 cup'],
  'ice-cream-dairy': [8, '1/2 cup'],
  'ice-cream-lactose-free': [9, '1/2 cup'],
  kefir: [4, '1 cup'],
  'evaporated-condensed-milk': [15, '2 tbsp sweetened condensed (evaporated is much lower)'],
  'milk-goat': [4, '1 cup'],
  buttermilk: [5, '1 cup'],
  custard: [9, '1/2 cup'],
  'rice-pudding-dairy': [15, '1/2 cup'],
  'instant-pudding-made-with-milk': [11, '1/2 cup'],
  'frozen-yogurt': [10, '1/2 cup'],
  'gelato-milk-based': [16, '2 scoops'],
  'milk-powder': [3, '2 tbsp'],

  // Protein
  sausages: [2, '1 sausage'],
  tempeh: [1, '100g'],
  'hamburger-bun-onion-sauce': [18, '1 burger'],
  'curry-restaurant-butter-chicken-korma': [4, '1 cup, without rice'],
  'stir-fry-takeaway-with-sauce': [6, '1 cup, without rice'],
  'chicken-nuggets-crumbed-chicken': [7, '6 nuggets'],
  'meat-pie': [18, '1 pie'],

  // Legumes
  'chickpeas-canned-rinsed': [5, '1/2 cup'],
  'lentils-canned-rinsed': [5, '1/2 cup'],
  'lentils-boiled-red-or-green': [6, '1/2 cup'],
  'black-beans-canned': [6, '1/2 cup'],
  'kidney-beans': [6, '1/2 cup'],
  'butter-lima-beans-canned': [5, '1/2 cup'],
  'baked-beans': [8, '1/2 cup'],
  'split-peas': [6, '1/2 cup'],
  'cannellini-beans-canned': [6, '1/2 cup'],
  'borlotti-beans-canned': [6, '1/2 cup'],
  'navy-haricot-beans': [9, '1/2 cup'],
  'pinto-beans': [7, '1/2 cup'],
  'black-eyed-peas': [7, '1/2 cup'],
  'broad-fava-beans': [9, '1/2 cup'],
  'adzuki-beans': [9, '1/2 cup'],
  'mung-beans-whole-boiled': [6, '1/2 cup'],
  'refried-beans': [8, '1/2 cup'],
  falafel: [5, '3 falafel'],
  'dahl-lentil-curry': [6, '1/2 cup, without rice'],
  'bean-chili-with-onion': [10, '1 cup'],

  // Nuts & seeds
  cashews: [2, '30g'],
  'cashew-butter': [2, '1 tbsp'],

  // Condiments & sauces
  'ketchup-tomato-sauce': [2, '1 tbsp'],
  'barbecue-sauce': [6, '2 tbsp'],
  'sweet-chili-sauce': [5, '1 tbsp'],
  'gravy-packet': [2, '1/4 cup'],
  'tomato-pasta-sauce-jarred-onion-garlic': [4, '1/2 cup'],
  'chutney-relish': [5, '1 tbsp'],
  'mushroom-soup-cream-of': [5, '1 cup'],
  'soup-packet-or-canned-most': [4, '1 cup (noodle soups higher)'],

  // Sweets & sweeteners
  'sugar-white-brown-raw': [8, '1 tbsp'],
  'maple-syrup': [15, '2 tbsp'],
  honey: [10, '1 tbsp'],
  'agave-syrup': [2, '1 tbsp'],
  'golden-syrup': [11, '1 tbsp'],
  'rice-malt-syrup': [20, '1 tbsp'],
  'high-fructose-corn-syrup': [9, '1 tbsp'],
  'jam-strawberry': [7, '1 tbsp'],
  marmalade: [6, '1 tbsp'],
  'chocolate-dark': [3, '30g'],
  'chocolate-milk': [8, '30g'],
  'chocolate-white': [8, '30g'],
  'cookies-shortbread-wheat': [10, '2 cookies'],
  'fructose-fruit-sugar': [2, '1 tbsp'],
  'fruit-juice-concentrate-as-sweetener': [6, '1 tbsp'],
  'sugar-free-chocolate-lollies': [3, '25g'],
  'cake-wheat-flour-plain-sponge': [16, '1 slice (60g)'],
  doughnut: [17, '1 doughnut'],
  'biscuits-cookies-wheat': [10, '2 biscuits'],

  // Drinks
  beer: [8, '1 can (375ml)'],
  'coconut-water': [5, '1 cup'],
  'orange-juice-fresh': [13, '1 cup (250ml)'],
  'apple-juice': [12, '1 cup (250ml)'],
  'cranberry-juice': [22, '1 cup, juice drink'],
  kombucha: [3, '1 cup'],
  'soft-drink-sugar-sweetened': [25, '1 can (375ml)'],
  'soft-drink-high-fructose-corn-syrup': [23, '1 can (375ml)'],
  'sports-drink': [28, '1 bottle (600ml)'],
  'fruit-smoothie-mango-apple-based': [15, '1 cup'],
  'pear-juice': [13, '1 cup'],
  'mango-juice-nectar': [18, '1 cup'],
  'cider-apple-alcoholic': [10, '1 can (375ml)'],
  'dessert-wine-port-sherry': [4, '60ml'],
  'latte-cappuccino-regular-milk': [4, 'regular (250ml), unsweetened'],
  'hot-chocolate-made-with-milk': [11, '1 cup'],
  'chai-latte-regular-milk': [14, '1 cup, sweetened'],
  milkshake: [15, '1 cup'],
  'lassi-yogurt-drink': [9, '1 cup, sweet'],
  'prune-juice': [17, '1 cup'],

  // Snacks
  'popcorn-plain': [11, '3 cups (25g)'],
  'potato-chips-plain-salted': [12, '1 bag (50g)'],
  'tortilla-chips-corn': [17, '50g'],
  'pretzels-wheat': [16, '30g'],
  'french-fries': [20, '1 serve (100g)'],
  'granola-bar-typical': [12, '1 bar'],
  'protein-bar-with-polyols': [5, '1 bar'],
  'sweet-potato-fries': [15, '1 cup'],
  'onion-rings-battered': [12, '4 rings'],
  'dried-fruit-mix-trail-mix': [8, '1/4 cup'],
};

function build(): Record<string, GlEntry> {
  const out: Record<string, GlEntry> = {};
  const add = (id: string, e: GlEntry) => {
    if (out[id]) throw new Error(`Duplicate GL entry for ${id}`);
    out[id] = e;
  };
  for (const id of NONE.split(/\s+/).filter(Boolean)) add(id, [0, 'negligible carbohydrate']);
  for (const id of TRACE.split(/\s+/).filter(Boolean)) add(id, [1, 'typical serving']);
  for (const [id, e] of Object.entries(EXPLICIT)) add(id, e);
  return out;
}

export const GL_DATA: Record<string, GlEntry> = build();
