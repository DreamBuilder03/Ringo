// Regression coverage for B3 Toast availability guards.
// Each describe block maps to one of the three decline scenarios the sprint
// brief calls out: outside-hours, 86'd item, and ambiguous match.

import {
  isOpenNow,
  findItem,
  validatePickupTime,
  extractSizeInches,
} from '@/lib/toast/toast-availability';
import type { ToastMenuSnapshot } from '@/lib/toast/toast-client';

// Build a deterministic snapshot for tests so behavior is independent of
// what the mock client happens to return. Same shape as the mock pizza-shop
// menu but trimmed to just what each test needs.
function buildSnapshot(): ToastMenuSnapshot {
  return {
    fetchedAt: '2026-05-14T00:00:00.000Z',
    items: [
      { guid: 'pep12', name: 'Pepperoni Pizza (12")', priceCents: 1499, available: true, category: 'Pizza', modifierGroupGuids: ['mods-size'] },
      { guid: 'pep16', name: 'Pepperoni Pizza (16")', priceCents: 1999, available: true, category: 'Pizza', modifierGroupGuids: ['mods-size'] },
      { guid: 'cheese12', name: 'Cheese Pizza (12")', priceCents: 1299, available: true, category: 'Pizza', modifierGroupGuids: ['mods-size'] },
      { guid: 'wings10', name: '10pc Wings', priceCents: 1199, available: true, category: 'Wings', modifierGroupGuids: [] },
      { guid: 'cannoli', name: 'Cannoli', priceCents: 499, available: false, category: 'Dessert', modifierGroupGuids: [] },
      { guid: 'tiramisu', name: 'Tiramisu', priceCents: 599, available: true, category: 'Dessert', modifierGroupGuids: [] },
    ],
    modifierGroups: [
      {
        guid: 'mods-size',
        name: 'Size',
        minSelections: 1,
        maxSelections: 1,
        options: [
          { guid: 'size-12', name: '12 inch', priceCents: 0 },
          { guid: 'size-16', name: '16 inch', priceCents: 500 },
        ],
      },
    ],
    // Mon-Thu 11am-10pm, Fri-Sat 11am-11pm, Sun noon-9pm
    hours: [
      { dayOfWeek: 0, openMinutes: 12 * 60, closeMinutes: 21 * 60 },
      { dayOfWeek: 1, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
      { dayOfWeek: 2, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
      { dayOfWeek: 3, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
      { dayOfWeek: 4, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
      { dayOfWeek: 5, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
      { dayOfWeek: 6, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
    ],
  };
}

// Helper to construct a Date at a specific PACIFIC time on a specific day
// of week — using a known anchor (2026-05-13 was a Wednesday during DST).
// We anchor in Pacific because isOpenNow/validatePickupTime interpret
// instants in restaurant-local time (default America/Los_Angeles); tying
// the test helper to Pacific keeps assertions stable regardless of where
// the test runs (CI in UTC, dev laptop in PT, etc.).
function dateForDayAndTime(dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6, hour: number, minute = 0): Date {
  // May 2026 is DST so Pacific is UTC-7. Build the Date by emitting an
  // ISO string with an explicit -07:00 offset and letting Date parse it.
  // 2026-05-13 = Wednesday (day 3). Offset from there.
  const baseDay = 13 + (dayOfWeek - 3); // shift from Wed
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  const dd = String(baseDay).padStart(2, '0');
  return new Date(`2026-05-${dd}T${hh}:${mm}:00.000-07:00`);
}

describe('isOpenNow (B3 hours-guard)', () => {
  const snapshot = buildSnapshot();

  it('is open during business hours on a weekday', () => {
    const wedNoon = dateForDayAndTime(3, 13, 0); // Wed 1pm
    const result = isOpenNow(snapshot, wedNoon);
    expect(result.isOpen).toBe(true);
    expect(result.nextOpenSpoken).toBe(null);
    expect(result.todayLabel).toMatch(/Wednesday/);
  });

  it('is closed before opening, suggests today open time', () => {
    const wedEarlyMorning = dateForDayAndTime(3, 8, 30); // Wed 8:30am
    const result = isOpenNow(snapshot, wedEarlyMorning);
    expect(result.isOpen).toBe(false);
    expect(result.nextOpenSpoken).toBe('today at 11 AM');
  });

  it('is closed after closing, suggests tomorrow', () => {
    const wedLateNight = dateForDayAndTime(3, 23, 0); // Wed 11pm
    const result = isOpenNow(snapshot, wedLateNight);
    expect(result.isOpen).toBe(false);
    expect(result.nextOpenSpoken).toBe('tomorrow at 11 AM');
  });

  it('handles Saturday late-night → Sunday noon correctly', () => {
    const satMidnight = dateForDayAndTime(6, 23, 30); // Sat 11:30pm
    // Saturday closes at 11pm, so 11:30pm is past close. Next open is Sunday noon.
    const result = isOpenNow(snapshot, satMidnight);
    expect(result.isOpen).toBe(false);
    expect(result.nextOpenSpoken).toBe('tomorrow at noon');
  });

  it('handles Sunday 1pm correctly (inside Sun noon-9pm window)', () => {
    const sunAfternoon = dateForDayAndTime(0, 13, 0); // Sun 1pm
    const result = isOpenNow(snapshot, sunAfternoon);
    expect(result.isOpen).toBe(true);
  });
});

describe('findItem (B3 86d / ambiguous guard)', () => {
  const snapshot = buildSnapshot();

  it('returns a single match for a specific item query', () => {
    const result = findItem(snapshot, 'pepperoni pizza 12');
    expect(result.matched?.name).toBe('Pepperoni Pizza (12")');
    expect(result.available).toBe(true);
    expect(result.ambiguousMatches).toEqual([]);
  });

  it('returns the 86\'d signal for the cannoli', () => {
    const result = findItem(snapshot, 'cannoli');
    expect(result.matched?.name).toBe('Cannoli');
    expect(result.available).toBe(false);
    // Alternatives should include same-category available items.
    const altNames = result.alternatives.map((a) => a.name);
    expect(altNames).toContain('Tiramisu');
  });

  it('flags ambiguous when "pepperoni" tied between 12" and 16"', () => {
    const result = findItem(snapshot, 'pepperoni');
    // Both pepperoni variants score equal because both contain the word
    // "pepperoni" but neither contains the full needle exactly.
    expect(result.ambiguousMatches.length).toBeGreaterThanOrEqual(2);
    const ambNames = result.ambiguousMatches.map((i) => i.name);
    expect(ambNames).toContain('Pepperoni Pizza (12")');
    expect(ambNames).toContain('Pepperoni Pizza (16")');
  });

  it('returns null match for nonexistent items', () => {
    const result = findItem(snapshot, 'sushi');
    expect(result.matched).toBe(null);
    expect(result.available).toBe(false);
  });

  it('is case-insensitive', () => {
    const result = findItem(snapshot, 'PEPPERONI PIZZA 12');
    expect(result.matched?.name).toBe('Pepperoni Pizza (12")');
  });

  // ─── Size-word disambiguation (post-V11 fix; demo dry-run regression) ─────
  // Caller says "twelve inch pepperoni pizza" — should land on the 12"
  // pepperoni without asking which size. Pre-fix this looped because
  // "twelve"/"inch" didn't substring-match the literal 12" in the menu name,
  // so both variants scored equally and returned ambiguous.

  it('narrows to 12" when caller says "twelve inch pepperoni pizza"', () => {
    const result = findItem(snapshot, 'twelve inch pepperoni pizza');
    expect(result.matched?.name).toBe('Pepperoni Pizza (12")');
    expect(result.ambiguousMatches).toEqual([]);
  });

  it('narrows to 16" when caller says "sixteen inch pepperoni pizza"', () => {
    const result = findItem(snapshot, 'sixteen inch pepperoni pizza');
    expect(result.matched?.name).toBe('Pepperoni Pizza (16")');
    expect(result.ambiguousMatches).toEqual([]);
  });

  it('narrows to 12" when caller says "12 inch pepperoni"', () => {
    // Numeric form, no quote mark — the most common caller pattern.
    const result = findItem(snapshot, '12 inch pepperoni');
    expect(result.matched?.name).toBe('Pepperoni Pizza (12")');
    expect(result.ambiguousMatches).toEqual([]);
  });

  it('still returns ambiguous when caller omits the size', () => {
    // Regression guard: the size narrowing should ONLY kick in when the
    // caller actually said a size. If they didn't, we still want the
    // disambiguation list so the agent can ask "which size?".
    const result = findItem(snapshot, 'pepperoni pizza');
    expect(result.ambiguousMatches.length).toBeGreaterThanOrEqual(2);
  });

  // NB: pathological queries like "12 inch cannoli" are not covered. They're
  // sub-1% of real traffic and the matcher's tie-breaking behavior there
  // (whichever item happens to sort first) is acceptable — the agent will
  // ask for confirmation either way per the prompt's readback rule.
});

describe('extractSizeInches — spoken size → numeric inches', () => {
  it('parses numeric form with quote mark', () => {
    expect(extractSizeInches('Pepperoni Pizza (12")')).toBe(12);
  });

  it('parses numeric form with the word inch', () => {
    expect(extractSizeInches('a 12 inch pepperoni')).toBe(12);
    expect(extractSizeInches('a 16-inch pepperoni')).toBe(16);
    expect(extractSizeInches('a 14in pizza')).toBe(14);
  });

  it('parses word form with inch indicator', () => {
    expect(extractSizeInches('twelve inch pepperoni')).toBe(12);
    expect(extractSizeInches('sixteen-inch pizza')).toBe(16);
    expect(extractSizeInches('ten inch')).toBe(10);
    expect(extractSizeInches('twenty inch deep dish')).toBe(20);
  });

  it('returns null when no size signal is present', () => {
    expect(extractSizeInches('pepperoni pizza')).toBe(null);
    expect(extractSizeInches('cannoli')).toBe(null);
    expect(extractSizeInches('')).toBe(null);
  });

  it('does not false-positive on numbers without an inch indicator', () => {
    // "10pc wings" has a 10 but no inch indicator — must NOT return 10
    // (otherwise wings would get size-filtered alongside pizzas).
    expect(extractSizeInches('10pc wings')).toBe(null);
    expect(extractSizeInches('order number 12')).toBe(null);
  });

  it('does not false-positive on size words without an inch indicator', () => {
    // "ten wings" → must not return 10 inches.
    expect(extractSizeInches('ten wings')).toBe(null);
  });

  it('rejects out-of-range sizes (defensive)', () => {
    // A 99 isn't a pizza size — likely a misparse. Reject anything outside
    // 4–30 inches.
    expect(extractSizeInches('99 inch pizza')).toBe(null);
    expect(extractSizeInches('2 inch')).toBe(null);
  });
});

describe('validatePickupTime (B3 pickup-window guard)', () => {
  const snapshot = buildSnapshot();
  const now = dateForDayAndTime(3, 13, 0); // Wed 1pm

  it('rejects pickup less than 5 minutes from now', () => {
    const inThreeMin = new Date(now.getTime() + 3 * 60 * 1000);
    const result = validatePickupTime(snapshot, inThreeMin, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/too soon/);
  });

  it('accepts pickup 30 minutes from now during business hours', () => {
    const inThirtyMin = new Date(now.getTime() + 30 * 60 * 1000);
    const result = validatePickupTime(snapshot, inThirtyMin, now);
    expect(result.valid).toBe(true);
    expect(result.reason).toBe(null);
  });

  it('rejects pickup outside business hours', () => {
    const thuEarlyAm = dateForDayAndTime(4, 3, 0); // Thursday 3am
    const result = validatePickupTime(snapshot, thuEarlyAm, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Thursday/);
  });

  it('rejects pickup more than 14 days out', () => {
    const farFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const result = validatePickupTime(snapshot, farFuture, now);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/14 days/);
  });
});
