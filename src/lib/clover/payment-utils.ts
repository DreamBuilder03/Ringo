// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers for the Clover finalize-payment branch.
//
// Extracted so they can be unit-tested without spinning up an HTTP request
// against Clover's sandbox. The route in /api/tools/finalize-payment uses
// these directly when building the Clover Hosted Checkout payload.
// ──────────────────────────────────────────────────────────────────────────────

export interface OrderItemDollars {
  name: string;
  quantity: number;
  price: number; // dollars
}

export interface CloverLineItem {
  name: string;
  unitQty: number;
  price: number; // cents
}

/**
 * Convert our internal order.items (priced in dollars) to Clover's
 * Hosted Checkout shoppingCart.lineItems shape (priced in cents).
 *
 * - Each line item carries unitQty so Clover's checkout page renders
 *   "3x Pepperoni" instead of three identical line items.
 * - Cents conversion uses Math.round to defend against floating-point
 *   drift (price * 100 = 1499.0000001 → 1499, not 1498).
 * - Defensive defaults: missing quantity → 1, missing price → 0,
 *   missing name → "Item".
 */
export function toCloverLineItems(items: OrderItemDollars[]): CloverLineItem[] {
  return (items || []).map((it) => {
    const raw = Number(it.price ?? 0);
    const safePriceDollars = Number.isFinite(raw) ? raw : 0;
    return {
      name: String(it.name || '').slice(0, 127) || 'Item',
      unitQty: Math.max(1, Math.floor(it.quantity ?? 1)),
      price: Math.round(safePriceDollars * 100),
    };
  });
}

export interface CloverCredentialSource {
  /** From the restaurants table — preferred. */
  perRestaurant: {
    accessToken?: string | null;
    merchantId?: string | null;
    environment?: 'sandbox' | 'production' | null;
  };
  /** Env-var fallback for legacy single-tenant deployments + dev sandbox. */
  envFallback: {
    accessToken?: string | null;
    merchantId?: string | null;
    environment?: 'sandbox' | 'production' | null;
  };
}

export interface CloverCredentials {
  accessToken: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  source: 'per-restaurant' | 'env' | 'mixed';
}

/**
 * Resolve Clover credentials with per-restaurant priority and env fallback.
 *
 * - Each field falls back independently: per-restaurant access token + env
 *   merchant ID is a valid mixed-source resolution
 * - Returns null when EITHER access token or merchant ID is missing
 *   (both required for any Clover API call)
 * - Environment defaults to 'sandbox' when neither source provides one
 *   (safer default — never accidentally hit production)
 * - `source` field reports where the credentials came from for logging
 */
export function resolveCloverCredentials(
  src: CloverCredentialSource
): CloverCredentials | null {
  const accessToken = src.perRestaurant.accessToken || src.envFallback.accessToken || null;
  const merchantId = src.perRestaurant.merchantId || src.envFallback.merchantId || null;
  if (!accessToken || !merchantId) return null;

  const environment =
    src.perRestaurant.environment ||
    src.envFallback.environment ||
    'sandbox';

  // Tag which source(s) the credentials came from so the calling route can
  // log it. "mixed" when fields are pulled from different sources.
  const tokenFromRestaurant = !!src.perRestaurant.accessToken;
  const merchantFromRestaurant = !!src.perRestaurant.merchantId;
  const allRestaurant = tokenFromRestaurant && merchantFromRestaurant;
  const allEnv = !tokenFromRestaurant && !merchantFromRestaurant;
  const source: CloverCredentials['source'] = allRestaurant
    ? 'per-restaurant'
    : allEnv
      ? 'env'
      : 'mixed';

  return { accessToken, merchantId, environment, source };
}

/**
 * Clover API base URL for the given environment.
 */
export function cloverApiBase(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://api.clover.com'
    : 'https://apisandbox.dev.clover.com';
}
