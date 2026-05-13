// ──────────────────────────────────────────────────────────────────────────────
// Toast availability guards — B3 of the Ryno demo sprint.
//
// Three pure functions on top of a ToastMenuSnapshot. The voice tool routes
// (lookup-item, add-to-order, and eventually confirm-order / finalize-payment)
// call these BEFORE returning success to the agent, so the agent never
// confirms an order the restaurant can't actually fulfill.
//
// Why pure-function module:
//   - Easy to unit test (in/out, no I/O)
//   - Tool routes pass the cached menu snapshot in (saves a Toast API call
//     per voice turn — the cache layer above is the I/O boundary)
//   - Same shape regardless of MOCK vs LIVE — Toast's response format is
//     mirrored exactly by the mock client
//
// What's NOT in here (deferred):
//   - Time-slot capacity (Toast Online Ordering can rate-limit pickup
//     windows). Toast's published Orders API doesn't expose slot capacity
//     in a stable way as of partner-application time; revisit after we
//     have sandbox credentials and can see real responses.
//   - Lead-time-per-item (a 20-min ribeye vs a 5-min coffee). Toast does
//     expose preparation times; B3 lumps everything at "ASAP". Slot-aware
//     prep-time handling is a v2 enhancement.
// ──────────────────────────────────────────────────────────────────────────────

import type { ToastMenuSnapshot, ToastMenuItem } from './toast-client';

// ─── Hours / open-now ──────────────────────────────────────────────────────────

export interface HoursStatus {
  isOpen: boolean;
  /** Local-time minutes from midnight (e.g. 11*60 = 11:00am). null when closed all day. */
  opensAtMinutes: number | null;
  closesAtMinutes: number | null;
  /** Human-readable "Mon 11am-10pm" for the day in question. Useful in decline phrasings. */
  todayLabel: string;
  /** When closed and isOpen=false, this is the next opening time spoken-friendly.
   *  e.g. "today at 11 AM" or "Sunday at noon". null when 24/7 (none of our mocks are). */
  nextOpenSpoken: string | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function minutesToSpokenTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  if (m === 0) {
    // Special-case noon and midnight for natural speech.
    if (h === 12) return 'noon';
    if (h === 0) return 'midnight';
    return `${h12} ${period}`;
  }
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function isOpenNow(snapshot: ToastMenuSnapshot, now: Date = new Date()): HoursStatus {
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const todays = snapshot.hours.find((h) => h.dayOfWeek === day);

  if (!todays) {
    // Closed all day. Find the next day with hours and return that.
    let nextDay = day;
    for (let i = 1; i <= 7; i++) {
      nextDay = ((day + i) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const candidate = snapshot.hours.find((h) => h.dayOfWeek === nextDay);
      if (candidate) {
        const dayLabel = i === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
        return {
          isOpen: false,
          opensAtMinutes: null,
          closesAtMinutes: null,
          todayLabel: `${DAY_NAMES[day]} (closed)`,
          nextOpenSpoken: `${dayLabel} at ${minutesToSpokenTime(candidate.openMinutes)}`,
        };
      }
    }
    // Genuinely no hours configured — treat as always-closed.
    return {
      isOpen: false,
      opensAtMinutes: null,
      closesAtMinutes: null,
      todayLabel: 'closed',
      nextOpenSpoken: null,
    };
  }

  const isOpen = minutes >= todays.openMinutes && minutes < todays.closeMinutes;
  const todayLabel = `${DAY_NAMES[day]} ${minutesToSpokenTime(todays.openMinutes)}-${minutesToSpokenTime(todays.closeMinutes)}`;

  if (isOpen) {
    return {
      isOpen: true,
      opensAtMinutes: todays.openMinutes,
      closesAtMinutes: todays.closeMinutes,
      todayLabel,
      nextOpenSpoken: null,
    };
  }

  // Closed right now. Either before open today, or after close today.
  if (minutes < todays.openMinutes) {
    return {
      isOpen: false,
      opensAtMinutes: todays.openMinutes,
      closesAtMinutes: todays.closeMinutes,
      todayLabel,
      nextOpenSpoken: `today at ${minutesToSpokenTime(todays.openMinutes)}`,
    };
  }

  // After close — find tomorrow (or next open day).
  for (let i = 1; i <= 7; i++) {
    const nextDay = ((day + i) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    const candidate = snapshot.hours.find((h) => h.dayOfWeek === nextDay);
    if (candidate) {
      const dayLabel = i === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
      return {
        isOpen: false,
        opensAtMinutes: candidate.openMinutes,
        closesAtMinutes: candidate.closeMinutes,
        todayLabel,
        nextOpenSpoken: `${dayLabel} at ${minutesToSpokenTime(candidate.openMinutes)}`,
      };
    }
  }
  return {
    isOpen: false,
    opensAtMinutes: null,
    closesAtMinutes: null,
    todayLabel,
    nextOpenSpoken: null,
  };
}

// ─── Item availability ─────────────────────────────────────────────────────────

export interface ItemAvailability {
  /** The best-matching item, or null if no menu item resembles the query. */
  matched: ToastMenuItem | null;
  /** Whether the matched item is currently available (false = 86'd today). */
  available: boolean;
  /** Up to 3 in-category alternatives the agent can offer when the matched
   *  item is unavailable. Filtered to items in the same category, currently
   *  available, and not the matched item itself. */
  alternatives: ToastMenuItem[];
  /** All multi-match candidates when the query is ambiguous (e.g. "pizza"
   *  matches Pepperoni, Cheese, Supreme). Empty when matched is a single
   *  clear winner. The caller decides whether to ask the user to pick. */
  ambiguousMatches: ToastMenuItem[];
}

/**
 * Fuzzy-match an item name against the snapshot. Same loose token-matching
 * vibe as src/lib/menu-search.ts for Supabase menus, but operates on Toast
 * item names directly. Case-insensitive substring + token-overlap scoring.
 */
export function findItem(snapshot: ToastMenuSnapshot, itemName: string): ItemAvailability {
  const needle = itemName.trim().toLowerCase();
  if (!needle) {
    return { matched: null, available: false, alternatives: [], ambiguousMatches: [] };
  }

  // Score each menu item by how many query tokens it contains.
  const needleTokens = needle.split(/\s+/).filter((t) => t.length >= 2);
  const scored = snapshot.items.map((item) => {
    const haystack = item.name.toLowerCase();
    // Direct substring is the strongest signal.
    if (haystack.includes(needle)) return { item, score: 1000 + haystack.length };
    // Otherwise count overlapping tokens.
    const overlap = needleTokens.filter((t) => haystack.includes(t)).length;
    return { item, score: overlap > 0 ? overlap * 10 : 0 };
  });

  const candidates = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { matched: null, available: false, alternatives: [], ambiguousMatches: [] };
  }

  const top = candidates[0].item;

  // Determine if the second-place match is close enough to be ambiguous.
  // We treat as ambiguous when the top two share the same score AND there
  // are at least 2 candidates (so the agent can ask "which one?").
  const ambiguous =
    candidates.length > 1 && candidates[1].score === candidates[0].score
      ? candidates.slice(0, 5).map((c) => c.item)
      : [];

  // Find in-category alternatives for the decline path.
  const alternatives = snapshot.items
    .filter((i) => i.guid !== top.guid && i.category === top.category && i.available)
    .slice(0, 3);

  return {
    matched: top,
    available: top.available,
    alternatives,
    ambiguousMatches: ambiguous,
  };
}

// ─── Pickup-time validity ──────────────────────────────────────────────────────

export interface PickupValidity {
  valid: boolean;
  /** Why invalid, if applicable. Spoken-friendly. */
  reason: string | null;
  /** If invalid, the soonest valid pickup time the agent can offer. */
  suggestedSpoken: string | null;
}

/**
 * Validate a requested pickup time against business hours.
 *
 * Inputs:
 *   - snapshot: current Toast menu (carries business hours)
 *   - pickupAt: requested pickup time (Date)
 *   - now: current time (default: Date.now())
 *
 * Rules:
 *   - Pickup must be at least 5 minutes from now (no time-travel orders)
 *   - Pickup must fall within the business-hours window for that day
 *   - Pickup must not be more than 14 days in the future (sanity cap)
 */
export function validatePickupTime(
  snapshot: ToastMenuSnapshot,
  pickupAt: Date,
  now: Date = new Date()
): PickupValidity {
  const MIN_LEAD_MIN = 5;
  const MAX_LEAD_DAYS = 14;

  const diffMs = pickupAt.getTime() - now.getTime();
  if (diffMs < MIN_LEAD_MIN * 60 * 1000) {
    return {
      valid: false,
      reason: 'Pickup time is too soon (need at least 5 minutes).',
      suggestedSpoken: `${MIN_LEAD_MIN} minutes from now`,
    };
  }
  if (diffMs > MAX_LEAD_DAYS * 24 * 60 * 60 * 1000) {
    return {
      valid: false,
      reason: `Pickup time is more than ${MAX_LEAD_DAYS} days out — we can't schedule that far ahead.`,
      suggestedSpoken: 'sometime in the next two weeks',
    };
  }

  const day = pickupAt.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const minutes = pickupAt.getHours() * 60 + pickupAt.getMinutes();
  const todays = snapshot.hours.find((h) => h.dayOfWeek === day);

  if (!todays) {
    // Closed all day on the requested day.
    return {
      valid: false,
      reason: `We're closed on ${DAY_NAMES[day]}.`,
      suggestedSpoken: null,
    };
  }

  if (minutes < todays.openMinutes) {
    return {
      valid: false,
      reason: `We don't open until ${minutesToSpokenTime(todays.openMinutes)} on ${DAY_NAMES[day]}.`,
      suggestedSpoken: `${minutesToSpokenTime(todays.openMinutes)} on ${DAY_NAMES[day]}`,
    };
  }
  if (minutes >= todays.closeMinutes) {
    return {
      valid: false,
      reason: `We close at ${minutesToSpokenTime(todays.closeMinutes)} on ${DAY_NAMES[day]}.`,
      suggestedSpoken: null,
    };
  }

  return { valid: true, reason: null, suggestedSpoken: null };
}
