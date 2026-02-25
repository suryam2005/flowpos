// Tag generation utility for products

// VEGETABLES
const VEGETABLE_KEYWORDS = {
  onion: ['vegetable', 'fresh', 'cooking'],
  tomato: ['vegetable', 'fresh', 'salad'],
  potato: ['vegetable', 'staple', 'cooking'],
  carrot: ['vegetable', 'fresh', 'healthy'],
  cabbage: ['vegetable', 'fresh', 'salad'],
  spinach: ['vegetable', 'leafy', 'healthy'],
  brinjal: ['vegetable', 'cooking'],
  eggplant: ['vegetable', 'cooking'],
  capsicum: ['vegetable', 'fresh', 'cooking'],
  pepper: ['vegetable', 'spice', 'cooking'],
  cucumber: ['vegetable', 'fresh', 'salad'],
  cauliflower: ['vegetable', 'fresh', 'cooking'],
  broccoli: ['vegetable', 'healthy', 'green'],
  beans: ['vegetable', 'fresh', 'protein'],
  peas: ['vegetable', 'fresh', 'green'],
  corn: ['vegetable', 'grain', 'sweet'],
  mushroom: ['vegetable', 'protein', 'cooking'],
  garlic: ['vegetable', 'spice', 'cooking'],
  ginger: ['vegetable', 'spice', 'cooking'],
  lettuce: ['vegetable', 'leafy', 'salad'],
  beetroot: ['vegetable', 'healthy', 'fresh'],
  radish: ['vegetable', 'fresh', 'salad'],
  ladyfinger: ['vegetable', 'cooking'],
  okra: ['vegetable', 'cooking'],
  gourd: ['vegetable', 'cooking'],
  pumpkin: ['vegetable', 'cooking', 'sweet'],
  zucchini: ['vegetable', 'healthy', 'cooking'],
  celery: ['vegetable', 'healthy', 'salad'],
  asparagus: ['vegetable', 'healthy', 'premium'],
};

// FRUITS
const FRUIT_KEYWORDS = {
  apple: ['fruit', 'fresh', 'healthy'],
  banana: ['fruit', 'fresh', 'energy'],
  orange: ['fruit', 'citrus', 'vitamin-c'],
  mango: ['fruit', 'tropical', 'sweet'],
  grapes: ['fruit', 'fresh', 'sweet'],
  watermelon: ['fruit', 'summer', 'refreshing'],
  papaya: ['fruit', 'tropical', 'healthy'],
  pineapple: ['fruit', 'tropical', 'sweet'],
  pomegranate: ['fruit', 'healthy', 'antioxidant'],
  guava: ['fruit', 'tropical', 'vitamin-c'],
  strawberry: ['fruit', 'berry', 'sweet'],
  blueberry: ['fruit', 'berry', 'antioxidant'],
  cherry: ['fruit', 'berry', 'sweet'],
  lemon: ['fruit', 'citrus', 'sour'],
  lime: ['fruit', 'citrus', 'sour'],
  coconut: ['fruit', 'tropical', 'healthy'],
  kiwi: ['fruit', 'exotic', 'vitamin-c'],
  peach: ['fruit', 'sweet', 'summer'],
  plum: ['fruit', 'sweet', 'fresh'],
  pear: ['fruit', 'fresh', 'sweet'],
  fig: ['fruit', 'dried', 'sweet'],
  dates: ['fruit', 'dried', 'energy'],
  jackfruit: ['fruit', 'tropical', 'large'],
  litchi: ['fruit', 'tropical', 'sweet'],
  custardapple: ['fruit', 'tropical', 'sweet'],
};

// DAIRY
const DAIRY_KEYWORDS = {
  milk: ['dairy', 'fresh', 'protein'],
  curd: ['dairy', 'probiotic', 'fresh'],
  yogurt: ['dairy', 'probiotic', 'healthy'],
  cheese: ['dairy', 'protein', 'calcium'],
  butter: ['dairy', 'fat', 'cooking'],
  ghee: ['dairy', 'indian', 'cooking'],
  paneer: ['dairy', 'protein', 'vegetarian'],
  cream: ['dairy', 'fat', 'dessert'],
  buttermilk: ['dairy', 'probiotic', 'refreshing'],
  icecream: ['dairy', 'dessert', 'cold'],
};

// GROCERY & STAPLES
const GROCERY_KEYWORDS = {
  rice: ['grain', 'staple', 'carbs'],
  wheat: ['grain', 'staple', 'flour'],
  flour: ['grain', 'baking', 'cooking'],
  atta: ['grain', 'indian', 'bread'],
  maida: ['grain', 'baking', 'refined'],
  sugar: ['sweetener', 'staple', 'baking'],
  salt: ['seasoning', 'staple', 'essential'],
  oil: ['cooking', 'fat', 'essential'],
  dal: ['lentils', 'protein', 'indian'],
  lentils: ['protein', 'healthy', 'cooking'],
  pulses: ['protein', 'healthy', 'staple'],
  chickpeas: ['protein', 'legume', 'healthy'],
  rajma: ['protein', 'legume', 'indian'],
  chana: ['protein', 'legume', 'indian'],
  moong: ['protein', 'legume', 'healthy'],
  masoor: ['protein', 'legume', 'indian'],
  urad: ['protein', 'legume', 'indian'],
  oats: ['grain', 'healthy', 'breakfast'],
  cornflakes: ['cereal', 'breakfast', 'quick'],
  muesli: ['cereal', 'healthy', 'breakfast'],
  noodles: ['pasta', 'quick', 'asian'],
  pasta: ['italian', 'carbs', 'quick'],
  bread: ['bakery', 'staple', 'breakfast'],
  biscuit: ['snack', 'bakery', 'tea-time'],
  cookies: ['snack', 'bakery', 'sweet'],
};

// SPICES & CONDIMENTS
const SPICE_KEYWORDS = {
  turmeric: ['spice', 'indian', 'healthy'],
  haldi: ['spice', 'indian', 'healthy'],
  cumin: ['spice', 'indian', 'aromatic'],
  jeera: ['spice', 'indian', 'aromatic'],
  coriander: ['spice', 'indian', 'aromatic'],
  chilli: ['spice', 'hot', 'indian'],
  mirchi: ['spice', 'hot', 'indian'],
  cardamom: ['spice', 'aromatic', 'premium'],
  elaichi: ['spice', 'aromatic', 'premium'],
  cinnamon: ['spice', 'aromatic', 'sweet'],
  clove: ['spice', 'aromatic', 'strong'],
  mustard: ['spice', 'indian', 'cooking'],
  fenugreek: ['spice', 'indian', 'healthy'],
  methi: ['spice', 'indian', 'healthy'],
  asafoetida: ['spice', 'indian', 'aromatic'],
  hing: ['spice', 'indian', 'aromatic'],
  saffron: ['spice', 'premium', 'aromatic'],
  kesar: ['spice', 'premium', 'aromatic'],
  pepper: ['spice', 'hot', 'aromatic'],
  masala: ['spice', 'indian', 'blend'],
};

// MEAT & SEAFOOD
const MEAT_KEYWORDS = {
  chicken: ['meat', 'protein', 'poultry'],
  mutton: ['meat', 'protein', 'red-meat'],
  lamb: ['meat', 'protein', 'red-meat'],
  beef: ['meat', 'protein', 'red-meat'],
  pork: ['meat', 'protein', 'red-meat'],
  fish: ['seafood', 'protein', 'omega-3'],
  prawn: ['seafood', 'protein', 'shellfish'],
  shrimp: ['seafood', 'protein', 'shellfish'],
  crab: ['seafood', 'protein', 'shellfish'],
  lobster: ['seafood', 'premium', 'shellfish'],
  egg: ['protein', 'breakfast', 'versatile'],
  bacon: ['meat', 'breakfast', 'pork'],
  sausage: ['meat', 'processed', 'breakfast'],
  ham: ['meat', 'processed', 'pork'],
  salami: ['meat', 'processed', 'italian'],
};

// BEVERAGES
const BEVERAGE_KEYWORDS = {
  coffee: ['beverage', 'hot', 'caffeine'],
  tea: ['beverage', 'hot', 'refreshing'],
  chai: ['beverage', 'indian', 'hot'],
  juice: ['beverage', 'fresh', 'healthy'],
  smoothie: ['beverage', 'healthy', 'blended'],
  milkshake: ['beverage', 'sweet', 'cold'],
  soda: ['beverage', 'cold', 'fizzy'],
  cola: ['beverage', 'cold', 'fizzy'],
  lassi: ['beverage', 'indian', 'dairy'],
  water: ['beverage', 'essential', 'hydration'],
  lemonade: ['beverage', 'refreshing', 'summer'],
  coconutwater: ['beverage', 'natural', 'healthy'],
  energydrink: ['beverage', 'energy', 'caffeine'],
};

// SNACKS
const SNACK_KEYWORDS = {
  chips: ['snack', 'crispy', 'salty'],
  namkeen: ['snack', 'indian', 'salty'],
  bhujia: ['snack', 'indian', 'crispy'],
  mixture: ['snack', 'indian', 'salty'],
  popcorn: ['snack', 'crispy', 'movie'],
  nuts: ['snack', 'healthy', 'protein'],
  almonds: ['snack', 'healthy', 'nuts'],
  cashew: ['snack', 'nuts', 'premium'],
  peanuts: ['snack', 'nuts', 'protein'],
  raisins: ['snack', 'dried', 'sweet'],
  chocolate: ['snack', 'sweet', 'dessert'],
  candy: ['snack', 'sweet', 'kids'],
  samosa: ['snack', 'indian', 'fried'],
  pakora: ['snack', 'indian', 'fried'],
  vada: ['snack', 'indian', 'fried'],
  bhaji: ['snack', 'indian', 'fried'],
};

// FOOD ITEMS (prepared/restaurant)
const FOOD_KEYWORDS = {
  biryani: ['indian', 'rice', 'spicy'],
  curry: ['indian', 'spicy', 'gravy'],
  roti: ['indian', 'bread', 'staple'],
  naan: ['indian', 'bread', 'tandoor'],
  dosa: ['south-indian', 'breakfast', 'crispy'],
  idli: ['south-indian', 'breakfast', 'steamed'],
  burger: ['fast-food', 'american', 'quick'],
  pizza: ['italian', 'fast-food', 'cheese'],
  sandwich: ['quick-bite', 'lunch', 'bread'],
  fries: ['fast-food', 'crispy', 'potato'],
  momos: ['tibetan', 'dumpling', 'steamed'],
  thali: ['indian', 'meal', 'complete'],
  paratha: ['indian', 'bread', 'stuffed'],
  pulao: ['indian', 'rice', 'aromatic'],
  khichdi: ['indian', 'rice', 'comfort'],
  soup: ['starter', 'healthy', 'warm'],
  salad: ['healthy', 'fresh', 'diet'],
  wrap: ['quick', 'lunch', 'portable'],
  roll: ['quick', 'indian', 'street-food'],
};

// DESSERTS
const DESSERT_KEYWORDS = {
  cake: ['dessert', 'sweet', 'celebration'],
  pastry: ['dessert', 'bakery', 'sweet'],
  brownie: ['dessert', 'chocolate', 'baked'],
  gulabjamun: ['dessert', 'indian', 'sweet'],
  jalebi: ['dessert', 'indian', 'fried'],
  rasgulla: ['dessert', 'indian', 'bengali'],
  barfi: ['dessert', 'indian', 'mithai'],
  ladoo: ['dessert', 'indian', 'mithai'],
  halwa: ['dessert', 'indian', 'warm'],
  kheer: ['dessert', 'indian', 'rice'],
  pudding: ['dessert', 'creamy', 'sweet'],
  custard: ['dessert', 'creamy', 'sweet'],
  mousse: ['dessert', 'chocolate', 'creamy'],
  donut: ['dessert', 'bakery', 'fried'],
  muffin: ['dessert', 'bakery', 'breakfast'],
  cupcake: ['dessert', 'bakery', 'celebration'],
};

// RETAIL/GENERAL
const RETAIL_KEYWORDS = {
  phone: ['electronics', 'mobile', 'gadget'],
  laptop: ['electronics', 'computer', 'gadget'],
  tablet: ['electronics', 'mobile', 'gadget'],
  charger: ['electronics', 'accessory', 'mobile'],
  earphone: ['electronics', 'audio', 'accessory'],
  headphone: ['electronics', 'audio', 'accessory'],
  shirt: ['clothing', 'apparel', 'fashion'],
  tshirt: ['clothing', 'casual', 'fashion'],
  jeans: ['clothing', 'denim', 'casual'],
  pants: ['clothing', 'apparel', 'formal'],
  dress: ['clothing', 'women', 'fashion'],
  shoes: ['footwear', 'fashion', 'accessory'],
  sandals: ['footwear', 'casual', 'summer'],
  bag: ['accessory', 'fashion', 'carry'],
  wallet: ['accessory', 'leather', 'essential'],
  watch: ['accessory', 'time', 'fashion'],
  soap: ['personal-care', 'hygiene', 'daily'],
  shampoo: ['personal-care', 'hair', 'hygiene'],
  toothpaste: ['personal-care', 'dental', 'hygiene'],
  detergent: ['household', 'cleaning', 'laundry'],
};

const BUSINESS_TYPE_TAGS = {
  restaurant: ['food', 'dining', 'meals'],
  cafe: ['coffee', 'beverages', 'snacks'],
  bakery: ['baked', 'sweet', 'bread'],
  grocery: ['essentials', 'daily-needs', 'fresh'],
  supermarket: ['essentials', 'variety', 'shopping'],
  vegetable: ['fresh', 'produce', 'healthy'],
  fruit: ['fresh', 'produce', 'healthy'],
  meat: ['protein', 'fresh', 'butcher'],
  dairy: ['fresh', 'milk', 'protein'],
  clothing: ['fashion', 'apparel', 'style'],
  electronics: ['technology', 'gadgets', 'devices'],
  pharmacy: ['medicine', 'health', 'wellness'],
  retail: ['shopping', 'products', 'variety'],
  other: ['general', 'variety', 'products'],
};

const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
};

const getAllKeywords = () => ({
  ...VEGETABLE_KEYWORDS,
  ...FRUIT_KEYWORDS,
  ...DAIRY_KEYWORDS,
  ...GROCERY_KEYWORDS,
  ...SPICE_KEYWORDS,
  ...MEAT_KEYWORDS,
  ...BEVERAGE_KEYWORDS,
  ...SNACK_KEYWORDS,
  ...FOOD_KEYWORDS,
  ...DESSERT_KEYWORDS,
  ...RETAIL_KEYWORDS,
});

// formatTag must be defined BEFORE functions that use it
export const formatTag = (tag) => {
  if (!tag) return '';
  return tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

export const isValidTag = (tag) => {
  if (!tag || typeof tag !== 'string') return false;
  return tag.trim().length >= 1 && tag.trim().length <= 30;
};

export const generateTagsFromName = (productName) => {
  if (!productName) return [];
  const tags = new Set();
  const normalizedName = normalizeText(productName);
  const words = normalizedName.split(/\s+/);
  const allKeywords = getAllKeywords();
  
  // Check each word against keywords
  words.forEach(word => {
    if (word.length < 2) return;
    
    // Check for exact or partial matches in keywords
    for (const [keyword, relatedTags] of Object.entries(allKeywords)) {
      if (word === keyword || keyword.includes(word) || word.includes(keyword)) {
        tags.add(keyword);
        relatedTags.forEach(tag => tags.add(tag));
      }
    }
  });
  
  // Also check the full name for compound matches
  for (const [keyword, relatedTags] of Object.entries(allKeywords)) {
    if (normalizedName.includes(keyword)) {
      tags.add(keyword);
      relatedTags.forEach(tag => tags.add(tag));
    }
  }
  
  return Array.from(tags).slice(0, 15);
};

export const generateTagsFromBusinessType = (businessType) => {
  if (!businessType) return [];
  const normalizedType = normalizeText(businessType);
  const tags = new Set();
  for (const [type, typeTags] of Object.entries(BUSINESS_TYPE_TAGS)) {
    if (normalizedType === type || normalizedType.includes(type)) {
      tags.add(type);
      typeTags.forEach(tag => tags.add(tag));
    }
  }
  return Array.from(tags);
};

export const generateProductTags = (productName, businessType = '', customTags = []) => {
  const allTags = new Set();
  
  // Generate tags from product name
  if (productName && typeof productName === 'string') {
    generateTagsFromName(productName).forEach(tag => {
      if (tag && tag.trim()) allTags.add(tag);
    });
  }
  
  // Generate tags from business type
  if (businessType && typeof businessType === 'string') {
    generateTagsFromBusinessType(businessType).forEach(tag => {
      if (tag && tag.trim()) allTags.add(tag);
    });
  }
  
  // Add custom tags
  if (Array.isArray(customTags)) {
    customTags.forEach(tag => {
      if (tag && typeof tag === 'string') {
        const formatted = formatTag(tag);
        if (formatted && formatted.length >= 1) allTags.add(formatted);
      }
    });
  }
  
  // Convert to array, format, filter, and limit
  return Array.from(allTags)
    .map(formatTag)
    .filter(t => t && t.length >= 1 && t.length <= 30)
    .slice(0, 20);
};

export const getSuggestedTags = (input, limit = 10) => {
  if (!input || input.length < 2) return [];
  const inputLower = input.toLowerCase();
  const suggestions = new Set();
  const allKeywords = getAllKeywords();
  
  for (const [keyword, relatedTags] of Object.entries(allKeywords)) {
    if (keyword.startsWith(inputLower) || keyword.includes(inputLower)) {
      suggestions.add(keyword);
      relatedTags.forEach(tag => {
        if (tag.includes(inputLower)) suggestions.add(tag);
      });
    }
  }
  for (const [type, tags] of Object.entries(BUSINESS_TYPE_TAGS)) {
    if (type.includes(inputLower)) suggestions.add(type);
    tags.forEach(tag => {
      if (tag.includes(inputLower)) suggestions.add(tag);
    });
  }
  return Array.from(suggestions).slice(0, limit);
};

export const getPopularTagsByCategory = (category) => {
  const categoryMap = {
    vegetables: Object.keys(VEGETABLE_KEYWORDS),
    fruits: Object.keys(FRUIT_KEYWORDS),
    dairy: Object.keys(DAIRY_KEYWORDS),
    grocery: Object.keys(GROCERY_KEYWORDS),
    spices: Object.keys(SPICE_KEYWORDS),
    meat: Object.keys(MEAT_KEYWORDS),
    beverages: Object.keys(BEVERAGE_KEYWORDS),
    snacks: Object.keys(SNACK_KEYWORDS),
    food: Object.keys(FOOD_KEYWORDS),
    desserts: Object.keys(DESSERT_KEYWORDS),
    retail: Object.keys(RETAIL_KEYWORDS),
  };
  const normalizedCategory = normalizeText(category);
  for (const [cat, tags] of Object.entries(categoryMap)) {
    if (normalizedCategory.includes(cat)) return tags.slice(0, 20);
  }
  return [];
};

export default {
  generateTagsFromName,
  generateTagsFromBusinessType,
  generateProductTags,
  getSuggestedTags,
  isValidTag,
  formatTag,
  getPopularTagsByCategory,
};
