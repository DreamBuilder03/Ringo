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

/**
 * Tokenize a menu/query string into a comparable bag of tokens.
 * Normalizes: case, curly quotes, sizes ("18-inch" / "18 in" → "18inch").
 */
export function tokenizeMenuName(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[\u2018\u2019'"']/g, '')
    .replace(/[-_/]/g, ' ')
    .replace(/\binches?\b/g, 'inch')
    .replace(/\b(\d+)\s*in\b/g, '$1inch')
    .replace(/\b(\d+)\s*inch\b/g, '$1inch')
    .replace(/\b2\s*l(?:iter)?\b/g, '2l')
    .replace(/\b(\d+)\s*pc\b/g, '$1pc')
    .replace(/\b(\d+)\s*piece\b/g, '$1pc')
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
