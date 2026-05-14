// Regression coverage for B3 Toast availability guards.
// Each describe block maps to one of the three decline scenarios the sprint
// brief calls out: outside-hours, 86'd item, and ambiguous match.

import {
  isOpenNow,
  findItem,
  validatePickupTime,
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

// Helper to construct a Date at a specific local time on a specific day of
// week — using a known anchor (2026-05-13 was a Wednesday).
function dateForDayAndTime(dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6, hour: number, minute = 0): Date {
  // 2026-05-13 = Wednesday (day 3). Offset from there.
  const anchorWed = new Date('2026-05-13T12:00:00.000');
  const dayDiff = dayOfWeek - 3; // 3 = Wed
  const d = new Date(anchorWed);
  d.setDate(d.getDate() + dayDiff);
  d.setHours(hour, minute, 0, 0);
  return d;
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
