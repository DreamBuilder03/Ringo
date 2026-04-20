/**
 * Menu-item search helpers used by every tool route that maps a spoken
 * item name to a database row.
 *
 * Why not just ilike? Because voice agents say "18-inch Nonna's Pepperoni"
 * and our DB stores it as "Nonna's Pepperoni 18-inch". Substring matching
 * fails on word-order swaps. Token matching is robust to it.
 */

const STOPWORDS = new Set([
  'pizza',
  'a',
  'an',
  'the',
  'one',
  'with',
  'of',
  'and',
  'or',
  'please',
  'that',
  'this',
]);

// Spoken word-numbers we see on real calls. Keep this conservative —
// callers almost never say "thirty-two wings," but "ten wings" is daily.
const WORD_NUMBERS: Record<string, string> = {
  // "one" intentionally left in STOPWORDS instead of being mapped here — it
  // doubles as filler ("one pepperoni"), so normalizing it to "1" would break
  // back-compat on items that have no "1" token.
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  fifteen: '15',
  twenty: '20',
  thirty: '30',
  forty: '40',
  fifty: '50',
};

/**
 * Tokenize a menu/query string into a comparable bag of tokens.
 * Normalizes:
 *   - case, curly quotes
 *   - sizes  "18-inch" / "18 in" → "18inch"
 *   - drinks "2 liter" / "2l"    → "2l"
 *   - counts "10 piece" / "10 pc" / bare "10 wings" → "10pc"
 *   - word-numbers "ten"/"twenty" → "10"/"20" (before the count rules run)
 */
export function tokenizeMenuName(s: string): string[] {
  let normalized = s
    .toLowerCase()
    .replace(/[\u2018\u2019'"']/g, '')
    .replace(/[-_/]/g, ' ');

  // Word-number pass happens FIRST so that "ten wings" feeds into the
  // bare-count-before-wings rule below.
  for (const [word, digit] of Object.entries(WORD_NUMBERS)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  }

  return normalized
    .replace(/\binches?\b/g, 'inch')
    .replace(/\b(\d+)\s*in\b/g, '$1inch')
    .replace(/\b(\d+)\s*inch\b/g, '$1inch')
    .replace(/\b2\s*l(?:iter)?\b/g, '2l')
    .replace(/\b(\d+)\s*pc\b/g, '$1pc')
    .replace(/\b(\d+)\s*pieces?\b/g, '$1pc')
    // Bare count before "wing(s)" → treat as piece-count so "10 wings"
    // matches the DB row "10 Piece Wings" (tokens {10pc, wings}).
    // Safe because this only fires when "wings" is the very next word;
    // it doesn't rewrite "10 of the wings" or similar.
    .replace(/\b(\d+)\s+wings?\b/g, '$1pc wings')
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

/**
 * Rank a list of menu rows against a search query. Returns rows where every
 * non-trivial search token appears in the item name, best match first.
 */
export function rankMenuMatches<T extends { name: string }>(
  menu: T[],
  query: string
): T[] {
  const searchTokens = tokenizeMenuName(query);
  if (searchTokens.length === 0) return [];

  return menu
    .map((item) => {
      const itemTokens = new Set(tokenizeMenuName(item.name));
      const hits = searchTokens.filter((t) => itemTokens.has(t)).length;
      const allHit = hits === searchTokens.length;
      return { item, hits, allHit };
    })
    .filter((r) => r.allHit)
    .sort((a, b) => b.hits - a.hits)
    .map((r) => r.item);
}
