import { CakeItem } from '../data/cakesData';

export interface SmartSearchSuggestion {
  id: string;
  label: string;
  query: string;
}

export const SMART_SEARCH_SUGGESTIONS: SmartSearchSuggestion[] = [
  { id: 'sug-bento', label: '🔥 Bento Cake', query: 'Bento' },
  { id: 'sug-choc', label: '🍫 Chocolate', query: 'Chocolate' },
  { id: 'sug-straw', label: '🍓 Strawberry', query: 'Strawberry' },
  { id: 'sug-mango', label: '🥭 Mango / আম', query: 'mango' },
  { id: 'sug-sugarfree', label: '🌿 Sugar-Free', query: 'Sugar-Free' },
];

/**
 * Bilingual & Banglish Phonetic Synonym Dictionary.
 * Allows typing English ("mango", "strawberry", "bento", "chocolate", "sugar free"),
 * Banglish ("aam", "pista", "jonmodin"), or Bangla script ("আম", "স্ট্রবেরি", "বেনটো")
 * and matching seamlessly across cake names, categories, descriptions, and ingredients.
 */
const BILINGUAL_SYNONYM_GROUPS: string[][] = [
  ['mango', 'alphonso', 'aam', 'am', 'আম', 'আমের', 'ম্যাঙ্গো', 'আলফানসো'],
  [
    'strawberry',
    'berry',
    'velvet',
    'red velvet',
    'crown',
    'স্ট্রবেরি',
    'বেরি',
    'ভেলভেট',
    'রেড ভেলভেট',
    'ক্রাউন',
  ],
  [
    'chocolate',
    'choc',
    'choco',
    'truffle',
    'dark',
    'fudge',
    'cocoa',
    'belgian',
    'চকলেট',
    'ট্রাফল',
    'ডার্ক',
    'কোকো',
    'ফাজ',
    'বেলজিয়ান',
  ],
  ['bento', 'lunchbox', 'mini', 'small', 'বেনটো', 'মিনি', 'ছোট'],
  [
    'birthday',
    'bday',
    'jonmodin',
    'celebration',
    'বার্থডে',
    'জন্মদিন',
    'সেলিব্রেশন',
  ],
  ['cupcake', 'cupcakes', 'muffin', 'কাপকেক', 'মাফিন'],
  [
    'blueberry',
    'lavender',
    'mist',
    'ব্লুবেরি',
    'ল্যাভেন্ডার',
    'মিস্ট',
  ],
  [
    'pistachio',
    'pista',
    'rose',
    'nut',
    'badam',
    'dates',
    'khejur',
    'পেস্তা',
    'বাদাম',
    'রোজ',
    'গোলাপ',
    'খেজুর',
    'ডিলাইট',
  ],
  [
    'sugar free',
    'sugar-free',
    'sugarfree',
    'diet',
    'keto',
    'healthy',
    'diabetic',
    'সুগার-ফ্রি',
    'সুগার ফ্রি',
    'ডায়েট',
    'স্বাস্থ্যকর',
    'চিনি ছাড়া',
  ],
  [
    'caramel',
    'butterscotch',
    'hazelnut',
    'praline',
    'ক্যারামেল',
    'হ্যাজেলনাট',
    'প্র্যালাইন',
    'ক্লাসিক',
  ],
  ['vanilla', 'sponge', 'cream', 'ভ্যানিলা', 'স্পঞ্জ', 'ক্রিম'],
  ['cake', 'keke', 'কেক'],
];

function expandQueryTokens(rawQuery: string): string[] {
  const normalized = rawQuery.toLowerCase().trim();
  if (!normalized) return [];

  const baseTokens = normalized.split(/[\s,.-]+/).filter(Boolean);
  const expanded = new Set<string>([normalized, ...baseTokens]);

  for (const group of BILINGUAL_SYNONYM_GROUPS) {
    const groupMatched = group.some(
      (term) =>
        normalized.includes(term) ||
        baseTokens.some((tok) => tok.length >= 2 && term.includes(tok))
    );
    if (groupMatched) {
      for (const synonym of group) {
        expanded.add(synonym.toLowerCase());
      }
    }
  }

  return Array.from(expanded);
}

export interface SmartSearchMatch {
  cake: CakeItem;
  matchedBadges: string[];
  score: number;
}

export function smartSearchCakes(
  cakes: CakeItem[],
  rawQuery: string
): SmartSearchMatch[] {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return cakes.map((cake) => ({ cake, matchedBadges: [], score: 1 }));
  }

  const expandedTokens = expandQueryTokens(trimmed);
  const results: SmartSearchMatch[] = [];

  for (const cake of cakes) {
    let score = 0;
    const matchedBadges: string[] = [];

    const nameLower = cake.name.toLowerCase();
    const catLower = cake.category.toLowerCase();
    const shortDescLower = cake.shortDescription.toLowerCase();
    const fullDescLower = cake.fullDescription.toLowerCase();
    const idLower = cake.id.toLowerCase();

    if (
      expandedTokens.some(
        (tok) => nameLower.includes(tok) || idLower.includes(tok)
      )
    ) {
      score += 10;
    }

    if (expandedTokens.some((tok) => catLower.includes(tok))) {
      score += 6;
      matchedBadges.push(cake.category);
    }

    if (
      expandedTokens.some(
        (tok) => shortDescLower.includes(tok) || fullDescLower.includes(tok)
      )
    ) {
      score += 4;
    }

    // Match inside customizer ingredients / toppings
    for (const opt of cake.customizerOptions) {
      const optNameLower = opt.name.toLowerCase();
      if (expandedTokens.some((tok) => optNameLower.includes(tok))) {
        score += 3;
        const badgeText = `Topping: ${opt.name}`;
        if (!matchedBadges.includes(badgeText) && matchedBadges.length < 2) {
          matchedBadges.push(badgeText);
        }
      }
    }

    if (score > 0) {
      results.push({ cake, matchedBadges, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
