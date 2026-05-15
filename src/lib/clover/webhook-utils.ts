// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers for the Clover webhook handler.
//
// Extracted from /api/webhooks/clover/route.ts so they can be unit-tested
// without spinning up an HTTP request. The route file re-exports + uses
// these directly.
// ──────────────────────────────────────────────────────────────────────────────

export interface CloverWebhookEnvelope {
  type?: string;
  checkoutSessionId?: string;
  paymentId?: string;
  merchantId?: string;
  data?: Record<string, unknown>;
  payment?: Record<string, unknown>;
}

/**
 * True when the event type signals that the customer successfully paid.
 * Clover uses several spellings across its Ecommerce / Hosted Checkout
 * product surfaces; we accept all the common ones.
 */
export function isPaymentClearedEvent(type: string | undefined | null): boolean {
  if (!type) return false;
  const t = type.toUpperCase();
  return (
    t === 'CHECKOUT.COMPLETED' ||
    t === 'PAYMENT.SUCCEEDED' ||
    t === 'PAYMENT.COMPLETED' ||
    t === 'CHECKOUT_COMPLETED' ||
    t === 'PAYMENT_SUCCEEDED'
  );
}

/**
 * Pull the checkoutSessionId out of a Clover webhook envelope. Clover's
 * field placement varies by event flavor — we check the obvious top-level
 * fields first, then dig into nested data / payment objects. Returns the
 * first non-empty hit, or null if nothing usable is present.
 */
export function extractCheckoutSessionId(event: CloverWebhookEnvelope): string | null {
  if (event.checkoutSessionId) return event.checkoutSessionId;
  if (event.paymentId) return event.paymentId;
  const fromData = event.data?.checkoutSessionId as string | undefined;
  if (fromData) return fromData;
  const fromPayment =
    (event.payment?.checkoutSessionId as string | undefined) ||
    (event.payment?.id as string | undefined);
  if (fromPayment) return fromPayment;
  return null;
}
