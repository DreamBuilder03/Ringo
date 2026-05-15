// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers for the SpotOn finalize-payment branch.
//
// Mirror of src/lib/clover/payment-utils.ts. Same shape, same testing
// discipline — keeps the multi-POS code paths from drifting and lets us
// unit-test the dollars-to-cents math, credential resolution, and the
// "what does SpotOn's response actually look like" field-extraction logic
// without spinning up an HTTP request against SpotOn's sandbox.
//
// The route in /api/tools/finalize-payment uses these directly when
// building the SpotOn order-create payload.
// ──────────────────────────────────────────────────────────────────────────────

export interface OrderItemDollars {
  name: string;
  quantity: number;
  price: number; // dollars
}

export interface SpotOnLineItem {
  name: string;
  quantity: number;
  price: number; // cents
}

/**
 * Convert our internal order.items (priced in dollars) to SpotOn's v1
 * Orders API line-item shape (priced in cents).
 *
 * - Defensive defaults: missing quantity → 1, missing price → 0,
 *   missing name → "Item"
 * - Cents conversion uses Math.round to defend against floating-point
 *   drift (price * 100 = 1499.0000001 → 1499, not 1498)
 * - Quantity floor + max(1) so unitQty 0 or negative inputs don't
 *   create free items
 *
 * NB: SpotOn's API uses `quantity` (not `unitQty` like Clover does).
 * That's the only line-item shape difference between Clover and SpotOn.
 */
export function toSpotOnLineItems(items: OrderItemDollars[]): SpotOnLineItem[] {
  return (items || []).map((it) => {
    const raw = Number(it.price ?? 0);
    const safePriceDollars = Number.isFinite(raw) ? raw : 0;
    return {
      name: String(it.name || '').slice(0, 127) || 'Item',
      quantity: Math.max(1, Math.floor(it.quantity ?? 1)),
      price: Math.round(safePriceDollars * 100),
    };
  });
}

export interface SpotOnCredentialSource {
  /** From the restaurants table — preferred. */
  perRestaurant: {
    apiKey?: string | null;
    locationId?: string | null;
  };
  /** Env-var fallback for legacy single-tenant deployments + dev sandbox. */
  envFallback: {
    apiKey?: string | null;
    locationId?: string | null;
  };
}

export interface SpotOnCredentials {
  apiKey: string;
  locationId: string;
  source: 'per-restaurant' | 'env' | 'mixed';
}

/**
 * Resolve SpotOn credentials with per-restaurant priority and env fallback.
 *
 * - Each field falls back independently: per-restaurant apiKey + env
 *   locationId is a valid mixed-source resolution
 * - Returns null when EITHER apiKey or locationId is missing (both
 *   required for any SpotOn API call)
 * - `source` field reports where the credentials came from for logging
 *
 * SpotOn (unlike Clover) has no sandbox/production environment toggle in
 * the API base URL — both flow through api.spoton.com. So no environment
 * field here.
 */
export function resolveSpotOnCredentials(
  src: SpotOnCredentialSource
): SpotOnCredentials | null {
  const apiKey = src.perRestaurant.apiKey || src.envFallback.apiKey || null;
  const locationId = src.perRestaurant.locationId || src.envFallback.locationId || null;
  if (!apiKey || !locationId) return null;

  const apiKeyFromRestaurant = !!src.perRestaurant.apiKey;
  const locationFromRestaurant = !!src.perRestaurant.locationId;
  const allRestaurant = apiKeyFromRestaurant && locationFromRestaurant;
  const allEnv = !apiKeyFromRestaurant && !locationFromRestaurant;
  const source: SpotOnCredentials['source'] = allRestaurant
    ? 'per-restaurant'
    : allEnv
      ? 'env'
      : 'mixed';

  return { apiKey, locationId, source };
}

/**
 * Pull the SpotOn order ID from a v1 Orders create response.
 *
 * SpotOn's response shape isn't fully nailed down in our integration —
 * the underlying field could be `id` or `externalId` depending on which
 * sandbox endpoint we hit. Accept either, prefer `id`.
 *
 * Returns null if neither is present (caller should treat as an
 * unverifiable order — likely the wrong endpoint or a malformed response).
 */
export function extractSpotOnOrderId(
  data: { id?: string | null; externalId?: string | null } | null | undefined
): string | null {
  if (!data) return null;
  return data.id || data.externalId || null;
}

/**
 * Pull the customer-facing checkout URL from a SpotOn order response.
 *
 * SpotOn returns the payment link under one of two field names — accept
 * `checkoutUrl` first, fall back to `paymentUrl`. Both have shown up in
 * partner-doc samples; the actual name in v1 isn't confirmed until we get
 * sandbox access. Until then, accept either.
 *
 * Returns null when neither field is set — the route treats null as a
 * P0 failure (we created the order but can't text the link, so the
 * customer is stuck).
 */
export function extractSpotOnCheckoutUrl(
  data:
    | { checkoutUrl?: string | null; paymentUrl?: string | null }
    | null
    | undefined
): string | null {
  if (!data) return null;
  return data.checkoutUrl || data.paymentUrl || null;
}

/**
 * SpotOn API base URL. Single environment — no sandbox/prod toggle.
 *
 * Exposed as a function (not a const) for parity with cloverApiBase and
 * to leave room for a future SPOTON_API_BASE env override during
 * partner-sandbox testing without touching the route.
 */
export function spotOnApiBase(): string {
  return process.env.SPOTON_API_BASE || 'https://api.spoton.com';
}
