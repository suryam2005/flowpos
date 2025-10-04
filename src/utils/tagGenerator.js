// Tag generation utility for products based on name and business type

// Common product keywords and their associated tags
const PRODUCT_KEYWORDS = {
  // Food items
  burger: ['fast-food', 'meat', 'sandwich'],
  pizza: ['italian', 'fast-food', 'cheese'],
  pasta: ['italian', 'carbs', 'main-course'],
  salad: ['healthy', 'vegetarian', 'fresh'],
  sandwich: ['quick-bite', 'lunch', 'bread'],
  soup: ['warm', 'comfort-food', 'liquid'],
  rice: ['staple', 'carbs', 'asian'],
  noodles: ['asian', 'carbs', 'quick'],
  chicken: ['meat', 'protein', 'poultry'],
  fish: ['seafood', 'protein', 'healthy'],
  beef: ['meat', 'protein', 'red-meat'],
  pork: ['meat', 'protein', 'red-meat'],
  vegetable: ['healthy', 'vegetarian', 'fresh'],
  fruit: ['healthy', 'sweet', 'fresh'],
  
  // Beverages
  coffee: ['hot', 'caffeine', 'morning'],
  tea: ['hot', 'herbal', 'relaxing'],
  juice: ['fresh', 'healthy', 'vitamin'],
  soda: ['cold', 'fizzy', 'sweet'],
  water: ['hydration', 'essential', 'pure'],
  smoothie: ['healthy', 'blended', 'fresh'],
  milkshake: ['sweet', 'cold', 'dessert'],
  
  // Desserts
  cake: ['sweet', 'dessert', 'celebration'],
  ice: ['cold', 'dessert', 'sweet'],
  chocolate: ['sweet', 'dessert', 'indulgent'],
  cookie: ['sweet', 'snack', 'baked'],
  pastry: ['sweet', 'baked', 'dessert'],
  
  // Retail items
  shirt: ['clothing', 'apparel', 'casual'],
  pants: ['clothing', 'apparel', 'bottom'],
  shoes: ['footwear', 'fashion', 'accessories'],
  bag: ['accessories', 'storage', 'fashion'],
  phone: ['electronics', 'mobile', 'technology'],
  laptop: ['electronics', 'computer', 'technology'],
  book: ['education', 'reading', 'knowledge'],
  
  // Services
  haircut: ['service', 'grooming', 'beauty'],
  massage: ['service', 'wellness', 'relaxation'],
  repair: ['service', 'maintenance', 'fix'],
};

// Business type specific tags
const BUSINESS_TYPE_TAGS = {
  restaurant: ['food', 'dining', 'cuisine'],
  cafe: ['coffee', 'casual', 'beverages'],
  bakery: ['baked', 'fresh', 'sweet'],
  grocery: ['essentials', 'daily-needs', 'fresh'],
  clothing: ['fashion', 'apparel', 'style'],
  electronics: ['technology', 'gadgets', 'modern'],
  pharmacy: ['health', 'medicine', 'wellness'],
  bookstore: ['books', 'education', 'knowledge'],
  salon: ['beauty', 'grooming', 'personal-care'],
  gym: ['fitness', 'health', 'exercise'],
  retail: ['shopping', 'products', 'merchandise'],
  service: ['professional', 'assistance', 'support'],
};

// Generate tags based on product name
export const generateTagsFromName = (productName) => {
  if (!productName || typeof productName !== 'string') {
    return [];
  }

  const name = productName.toLowerCase();
  const generatedTags = new Set();

  // Check each keyword against the product name
  Object.entries(PRODUCT_KEYWORDS).forEach(([keyword, tags]) => {
    if (name.includes(keyword)) {
      tags.forEach(tag => generatedTags.add(tag));
    }
  });

  // Add generic tags based on common patterns
  if (name.includes('hot') || name.includes('warm')) {
    generatedTags.add('hot');
  }
  if (name.includes('cold') || name.includes('ice') || name.includes('frozen')) {
    generatedTags.add('cold');
  }
  if (name.includes('spicy') || name.includes('hot')) {
    generatedTags.add('spicy');
  }
  if (name.includes('sweet') || name.includes('sugar')) {
    generatedTags.add('sweet');
  }
  if (name.includes('fresh') || name.includes('new')) {
    generatedTags.add('fresh');
  }
  if (name.includes('organic') || name.includes('natural')) {
    generatedTags.add('organic');
  }
  if (name.includes('vegan') || name.includes('plant')) {
    generatedTags.add('vegan');
  }
  if (name.includes('gluten') && name.includes('free')) {
    generatedTags.add('gluten-free');
  }

  return Array.from(generatedTags);
};

// Generate tags based on business type
export const generateTagsFromBusinessType = (businessType) => {
  if (!businessType || typeof businessType !== 'string') {
    return [];
  }

  const type = businessType.toLowerCase();
  return BUSINESS_TYPE_TAGS[type] || [];
};

// Combine and deduplicate tags
export const generateProductTags = (productName, businessType, customTags = []) => {
  const nameTags = generateTagsFromName(productName);
  const businessTags = generateTagsFromBusinessType(businessType);
  
  // Combine all tags and remove duplicates
  const allTags = new Set([
    ...nameTags,
    ...businessTags,
    ...customTags.filter(tag => tag && tag.trim())
  ]);

  return Array.from(allTags).slice(0, 10); // Limit to 10 tags max
};

// Get suggested tags for autocomplete
export const getSuggestedTags = (input, existingTags = []) => {
  if (!input || input.length < 2) {
    return [];
  }

  const inputLower = input.toLowerCase();
  const allPossibleTags = new Set();

  // Add tags from keywords
  Object.values(PRODUCT_KEYWORDS).forEach(tags => {
    tags.forEach(tag => allPossibleTags.add(tag));
  });

  // Add tags from business types
  Object.values(BUSINESS_TYPE_TAGS).forEach(tags => {
    tags.forEach(tag => allPossibleTags.add(tag));
  });

  // Filter suggestions based on input and exclude existing tags
  return Array.from(allPossibleTags)
    .filter(tag => 
      tag.includes(inputLower) && 
      !existingTags.includes(tag)
    )
    .slice(0, 5); // Limit suggestions
};

// Validate tag format
export const isValidTag = (tag) => {
  if (!tag || typeof tag !== 'string') {
    return false;
  }
  
  const trimmed = tag.trim();
  return trimmed.length >= 2 && 
         trimmed.length <= 20 && 
         /^[a-zA-Z0-9-_\s]+$/.test(trimmed);
};

// Format tag for display
export const formatTag = (tag) => {
  if (!tag || typeof tag !== 'string') {
    return '';
  }
  
  return tag.trim().toLowerCase().replace(/\s+/g, '-');
};