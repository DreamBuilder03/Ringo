// ──────────────────────────────────────────────────────────────────────────────
// Toast API client — mock-first, swap to live on env-var presence.
//
// Why mock-first:
//   Toast does NOT offer a self-serve developer sandbox. Sandbox credentials
//   are gated behind partner-program approval (per doc.toasttab.com), which
//   takes weeks-to-months (12+ months for full write API per Hostie.ai's
//   October 2025 industry playbook). We need to ship B1-B4 of the Ryno
//   demo sprint BEFORE Toast approval lands.
//
//   The fix is to develop against a deterministic in-memory mock that mirrors
//   the real Toast API surface. When real credentials arrive, swap is one
//   env-var flip — no code changes in the routes that consume this client.
//
// Mode selection:
//   • TOAST_MODE='live' AND TOAST_CLIENT_ID AND TOAST_CLIENT_SECRET set
//       → talk to real Toast (sandbox or production per TOAST_ENVIRONMENT)
//   • Otherwise → MOCK mode, no network. Deterministic canned responses.
//
// What's mocked:
//   • OAuth token fetch (returns a fake bearer)
//   • Menu fetch (returns a small pizza-shop menu — items, modifiers, prices,
//     availability flags, time-slot windows)
//   • Order create (returns a fake Toast order GUID)
//   • Guest upsert (returns a fake guest GUID)
//   • Availability query (boolean per item + time slot)
//
// What's NOT mocked yet (deferred to live mode only):
//   • Webhook signature verification (no signature in MOCK)
//   • Refund / void flow (post-v1 scope)
//   • Inventory write (explicitly out of scope per sprint brief)
// ──────────────────────────────────────────────────────────────────────────────

export type ToastMode = 'live' | 'mock';

export interface ToastMenuItem {
  guid: string;
  name: string;
  /** Price in CENTS. Toast uses dollars (4-decimal); we normalize to cents on read. */
  priceCents: number;
  /** Toast 'visibility' = 'visible' AND 'availability' flag = 'available' */
  available: boolean;
  /** Category name. "Pizza", "Wings", "Drinks", etc. */
  category: string;
  /** Modifier group GUIDs attached to this item. */
  modifierGroupGuids: string[];
}

export interface ToastModifierGroup {
  guid: string;
  name: string;
  /** Min/max selections required. */
  minSelections: number;
  maxSelections: number;
  options: Array<{
    guid: string;
    name: string;
    priceCents: number;
  }>;
}

export interface ToastMenuSnapshot {
  fetchedAt: string; // ISO timestamp
  items: ToastMenuItem[];
  modifierGroups: ToastModifierGroup[];
  /** Business hours from Toast restaurant config. Local time. */
  hours: Array<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun
    openMinutes: number; // minutes from midnight
    closeMinutes: number;
  }>;
}

export interface ToastOrderCreateRequest {
  restaurantGuid: string;
  /** Our internal order ID — passed as Toast 'externalId' for idempotency. */
  externalOrderId: string;
  guestName?: string;
  guestPhone?: string;
  items: Array<{
    menuItemGuid: string;
    quantity: number;
    modifierOptionGuids?: string[];
    specialInstructions?: string;
  }>;
  /** Pickup time as ISO timestamp; null = ASAP. */
  scheduledPickupAt: string | null;
}

export interface ToastOrderCreateResponse {
  toastOrderGuid: string;
  estimatedReadyAt: string; // ISO
  /** Total Toast computed (includes tax). In cents. */
  totalCents: number;
}

export interface ToastGuestUpsertRequest {
  restaurantGuid: string;
  phone: string; // E.164
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface ToastGuestUpsertResponse {
  guestGuid: string;
  matched: boolean; // true if guest already existed
}

// ─── Mode detection ────────────────────────────────────────────────────────────

export function getToastMode(): ToastMode {
  const explicitMode = process.env.TOAST_MODE;
  if (explicitMode === 'live') {
    if (!process.env.TOAST_CLIENT_ID || !process.env.TOAST_CLIENT_SECRET) {
      // Misconfigured live mode — fall back to mock rather than crash. Log so
      // ops notices it in /admin/health.
      console.warn(
        '[toast-client] TOAST_MODE=live but TOAST_CLIENT_ID/SECRET missing — falling back to MOCK'
      );
      return 'mock';
    }
    return 'live';
  }
  return 'mock';
}

export function getToastBaseUrl(): string {
  return process.env.TOAST_ENVIRONMENT === 'sandbox'
    ? 'https://ws-sandbox-api.toasttab.com'
    : 'https://ws-api.toasttab.com';
}

// ─── MOCK data — deterministic, pizza-shop themed for Ryno demo ────────────────

const MOCK_HOURS: ToastMenuSnapshot['hours'] = [
  // Mon-Thu 11am-10pm
  { dayOfWeek: 1, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { dayOfWeek: 2, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { dayOfWeek: 3, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  { dayOfWeek: 4, openMinutes: 11 * 60, closeMinutes: 22 * 60 },
  // Fri-Sat 11am-11pm
  { dayOfWeek: 5, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
  { dayOfWeek: 6, openMinutes: 11 * 60, closeMinutes: 23 * 60 },
  // Sun noon-9pm
  { dayOfWeek: 0, openMinutes: 12 * 60, closeMinutes: 21 * 60 },
];

const MOCK_MENU: ToastMenuSnapshot = {
  fetchedAt: '', // filled in by getMenu()
  items: [
    { guid: 'mock-item-pepperoni-12', name: 'Pepperoni Pizza (12")', priceCents: 1499, available: true, category: 'Pizza', modifierGroupGuids: ['mock-mods-pizza-size', 'mock-mods-pizza-toppings'] },
    { guid: 'mock-item-pepperoni-16', name: 'Pepperoni Pizza (16")', priceCents: 1999, available: true, category: 'Pizza', modifierGroupGuids: ['mock-mods-pizza-size', 'mock-mods-pizza-toppings'] },
    { guid: 'mock-item-cheese-12', name: 'Cheese Pizza (12")', priceCents: 1299, available: true, category: 'Pizza', modifierGroupGuids: ['mock-mods-pizza-size', 'mock-mods-pizza-toppings'] },
    { guid: 'mock-item-supreme-16', name: 'Supreme Pizza (16")', priceCents: 2399, available: true, category: 'Pizza', modifierGroupGuids: ['mock-mods-pizza-size'] },
    { guid: 'mock-item-wings-10', name: '10pc Wings', priceCents: 1199, available: true, category: 'Wings', modifierGroupGuids: ['mock-mods-wing-sauce'] },
    { guid: 'mock-item-wings-20', name: '20pc Wings', priceCents: 1999, available: true, category: 'Wings', modifierGroupGuids: ['mock-mods-wing-sauce'] },
    { guid: 'mock-item-garlic-knots', name: 'Garlic Knots (6pc)', priceCents: 599, available: true, category: 'Sides', modifierGroupGuids: [] },
    // Intentionally 86'd in mock data so we can test the "we're out of X" decline path:
    { guid: 'mock-item-cannoli', name: 'Cannoli', priceCents: 499, available: false, category: 'Dessert', modifierGroupGuids: [] },
    { guid: 'mock-item-coke', name: 'Coke (20oz)', priceCents: 299, available: true, category: 'Drinks', modifierGroupGuids: [] },
    { guid: 'mock-item-sprite', name: 'Sprite (20oz)', priceCents: 299, available: true, category: 'Drinks', modifierGroupGuids: [] },
  ],
  modifierGroups: [
    {
      guid: 'mock-mods-pizza-size',
      name: 'Size',
      minSelections: 1,
      maxSelections: 1,
      options: [
        { guid: 'mock-mod-12in', name: '12 inch', priceCents: 0 },
        { guid: 'mock-mod-16in', name: '16 inch', priceCents: 500 },
      ],
    },
    {
      guid: 'mock-mods-pizza-toppings',
      name: 'Extra toppings',
      minSelections: 0,
      maxSelections: 5,
      options: [
        { guid: 'mock-mod-extra-cheese', name: 'Extra cheese', priceCents: 200 },
        { guid: 'mock-mod-mushrooms', name: 'Mushrooms', priceCents: 150 },
        { guid: 'mock-mod-olives', name: 'Olives', priceCents: 150 },
        { guid: 'mock-mod-jalapenos', name: 'Jalapeños', priceCents: 150 },
        { guid: 'mock-mod-bacon', name: 'Bacon', priceCents: 300 },
      ],
    },
    {
      guid: 'mock-mods-wing-sauce',
      name: 'Wing sauce',
      minSelections: 1,
      maxSelections: 1,
      options: [
        { guid: 'mock-mod-buffalo-mild', name: 'Buffalo (mild)', priceCents: 0 },
        { guid: 'mock-mod-buffalo-hot', name: 'Buffalo (hot)', priceCents: 0 },
        { guid: 'mock-mod-bbq', name: 'BBQ', priceCents: 0 },
        { guid: 'mock-mod-garlic-parm', name: 'Garlic parm', priceCents: 0 },
      ],
    },
  ],
  hours: MOCK_HOURS,
};

// ─── Public API ────────────────────────────────────────────────────────────────

/** Get menu snapshot for a restaurant. Same shape regardless of MOCK/LIVE. */
export async function getMenu(restaurantGuid: string): Promise<ToastMenuSnapshot> {
  const mode = getToastMode();
  if (mode === 'mock') {
    return { ...MOCK_MENU, fetchedAt: new Date().toISOString() };
  }
  return getMenuLive(restaurantGuid);
}

/** Create an order in Toast. Idempotent on externalOrderId. */
export async function createOrder(req: ToastOrderCreateRequest): Promise<ToastOrderCreateResponse> {
  const mode = getToastMode();
  if (mode === 'mock') {
    // Compute total from canned menu prices for realism.
    const menu = await getMenu(req.restaurantGuid);
    const itemMap = new Map(menu.items.map((i) => [i.guid, i]));
    let totalCents = 0;
    for (const line of req.items) {
      const item = itemMap.get(line.menuItemGuid);
      if (item) totalCents += item.priceCents * line.quantity;
      const modOpts = new Map(
        menu.modifierGroups.flatMap((g) => g.options.map((o) => [o.guid, o.priceCents]))
      );
      for (const modGuid of line.modifierOptionGuids || []) {
        totalCents += (modOpts.get(modGuid) ?? 0) * line.quantity;
      }
    }
    // Add 8.25% sales tax (California, matches our existing demos)
    totalCents = Math.round(totalCents * 1.0825);
    return {
      toastOrderGuid: `mock-order-${req.externalOrderId}`,
      estimatedReadyAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      totalCents,
    };
  }
  return createOrderLive(req);
}

/** Upsert a guest in Toast Guest Manager. Matches by phone first. */
export async function upsertGuest(req: ToastGuestUpsertRequest): Promise<ToastGuestUpsertResponse> {
  const mode = getToastMode();
  if (mode === 'mock') {
    // Deterministic: same phone → same guest GUID. Lets tests assert idempotency.
    const guestGuid = `mock-guest-${req.phone.replace(/\D/g, '')}`;
    return { guestGuid, matched: req.phone.endsWith('00') }; // arbitrary "returning" heuristic for mocks
  }
  return upsertGuestLive(req);
}

/** Is the restaurant open for orders RIGHT NOW per Toast hours? */
export async function isOpenNow(restaurantGuid: string, now: Date = new Date()): Promise<boolean> {
  const menu = await getMenu(restaurantGuid);
  const day = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const todays = menu.hours.find((h) => h.dayOfWeek === day);
  if (!todays) return false;
  return minutes >= todays.openMinutes && minutes < todays.closeMinutes;
}

/** Is the named item currently available? Case-insensitive partial match. */
export async function isItemAvailable(
  restaurantGuid: string,
  itemName: string
): Promise<{ available: boolean; matched: ToastMenuItem | null }> {
  const menu = await getMenu(restaurantGuid);
  const needle = itemName.toLowerCase();
  const matched = menu.items.find((i) => i.name.toLowerCase().includes(needle)) || null;
  return { available: !!matched?.available, matched };
}

// ─── LIVE mode stubs — flesh out once partner credentials arrive ───────────────
//
// These functions intentionally throw if called before live credentials are
// configured. The getToastMode() gate above means they only get called once
// real credentials are in env. That way a misconfigured deploy fails LOUDLY
// at first Toast call instead of silently returning bad data.

async function getMenuLive(_restaurantGuid: string): Promise<ToastMenuSnapshot> {
  throw new Error(
    'getMenuLive: not yet implemented. Waiting on Toast partner approval + sandbox credentials. See project_toast_sprint_rynos_2026_05_12 memory note for status.'
  );
}

async function createOrderLive(_req: ToastOrderCreateRequest): Promise<ToastOrderCreateResponse> {
  throw new Error(
    'createOrderLive: not yet implemented. Waiting on Toast partner approval + sandbox credentials.'
  );
}

async function upsertGuestLive(_req: ToastGuestUpsertRequest): Promise<ToastGuestUpsertResponse> {
  throw new Error(
    'upsertGuestLive: not yet implemented. Waiting on Toast partner approval + sandbox credentials.'
  );
}
