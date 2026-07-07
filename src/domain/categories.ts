export const CATEGORY_IDS = [
  'food',
  'groceries',
  'transport',
  'lodging',
  'entertainment',
  'utilities',
  'rent',
  'shopping',
  'travel',
  'health',
  'gifts',
  'other',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
}

export const CATEGORIES: Readonly<Record<CategoryId, Category>> = {
  food: { id: 'food', label: 'Food & drink', emoji: '🍽️' },
  groceries: { id: 'groceries', label: 'Groceries', emoji: '🛒' },
  transport: { id: 'transport', label: 'Transport', emoji: '🚕' },
  lodging: { id: 'lodging', label: 'Lodging', emoji: '🏨' },
  entertainment: { id: 'entertainment', label: 'Entertainment', emoji: '🎟️' },
  utilities: { id: 'utilities', label: 'Utilities', emoji: '💡' },
  rent: { id: 'rent', label: 'Rent', emoji: '🏠' },
  shopping: { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  travel: { id: 'travel', label: 'Flights & travel', emoji: '✈️' },
  health: { id: 'health', label: 'Health', emoji: '💊' },
  gifts: { id: 'gifts', label: 'Gifts', emoji: '🎁' },
  other: { id: 'other', label: 'Other', emoji: '🧾' },
};

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

export function categoryOf(value: string): Category {
  return isCategoryId(value) ? CATEGORIES[value] : CATEGORIES.other;
}

const KEYWORDS: readonly [CategoryId, RegExp][] = [
  ['groceries', /\b(grocer|supermarket|market|aldi|lidl|tesco|costco|walmart)/i],
  ['food', /\b(dinner|lunch|breakfast|brunch|coffee|cafe|restaurant|pizza|sushi|drinks?|bar|beer)/i],
  ['transport', /\b(taxi|uber|lyft|bolt|train|bus|metro|fuel|petrol|gas station|parking|toll)/i],
  ['lodging', /\b(hotel|hostel|airbnb|booking|motel|cabin)/i],
  ['travel', /\b(flight|airline|airport|ferry|visa)/i],
  ['entertainment', /\b(cinema|movie|concert|tickets?|museum|show|netflix|spotify)/i],
  ['utilities', /\b(electric|water bill|internet|wifi|phone bill|gas bill)/i],
  ['rent', /\b(rent|deposit|landlord)/i],
  ['health', /\b(pharmacy|doctor|dentist|medicine)/i],
  ['gifts', /\b(gift|present|birthday)/i],
  ['shopping', /\b(amazon|clothes|shoes|ikea|store)/i],
];

/** Suggests a category from free-text descriptions such as "Sushi with Ana". */
export function suggestCategory(description: string): CategoryId | null {
  for (const [category, pattern] of KEYWORDS) {
    if (pattern.test(description)) return category;
  }
  return null;
}
