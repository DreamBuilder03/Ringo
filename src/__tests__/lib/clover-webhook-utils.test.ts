// Regression coverage for the pure-function pieces of /api/webhooks/clover.
// Clover varies event-type spellings and field placement across its
// Ecommerce / Hosted Checkout product surfaces; these tests pin down
// every variant we've observed in the docs.

import {
  isPaymentClearedEvent,
  extractCheckoutSessionId,
  type CloverWebhookEnvelope,
} from '@/lib/clover/webhook-utils';

describe('isPaymentClearedEvent', () => {
  it('accepts the canonical CHECKOUT.COMPLETED', () => {
    expect(isPaymentClearedEvent('CHECKOUT.COMPLETED')).toBe(true);
  });

  it('accepts PAYMENT.SUCCEEDED', () => {
    expect(isPaymentClearedEvent('PAYMENT.SUCCEEDED')).toBe(true);
  });

  it('accepts PAYMENT.COMPLETED', () => {
    expect(isPaymentClearedEvent('PAYMENT.COMPLETED')).toBe(true);
  });

  it('accepts the underscore variants used by some Ecommerce events', () => {
    expect(isPaymentClearedEvent('CHECKOUT_COMPLETED')).toBe(true);
    expect(isPaymentClearedEvent('PAYMENT_SUCCEEDED')).toBe(true);
  });

  it('is case-insensitive (matches lowercase Clover payloads)', () => {
    expect(isPaymentClearedEvent('checkout.completed')).toBe(true);
    expect(isPaymentClearedEvent('payment.succeeded')).toBe(true);
  });

  it('rejects unrelated event types', () => {
    expect(isPaymentClearedEvent('PAYMENT.FAILED')).toBe(false);
    expect(isPaymentClearedEvent('CHECKOUT.CANCELED')).toBe(false);
    expect(isPaymentClearedEvent('ORDER.CREATED')).toBe(false);
    expect(isPaymentClearedEvent('REFUND.SUCCEEDED')).toBe(false);
  });

  it('rejects empty / null inputs without throwing', () => {
    expect(isPaymentClearedEvent(undefined)).toBe(false);
    expect(isPaymentClearedEvent(null)).toBe(false);
    expect(isPaymentClearedEvent('')).toBe(false);
  });
});

describe('extractCheckoutSessionId — field-placement variants', () => {
  it('reads top-level checkoutSessionId (Hosted Checkout standard shape)', () => {
    const event: CloverWebhookEnvelope = {
      type: 'CHECKOUT.COMPLETED',
      checkoutSessionId: 'ck_top_level_123',
    };
    expect(extractCheckoutSessionId(event)).toBe('ck_top_level_123');
  });

  it('falls back to paymentId when checkoutSessionId is missing', () => {
    const event: CloverWebhookEnvelope = {
      type: 'PAYMENT.SUCCEEDED',
      paymentId: 'pay_legacy_456',
    };
    expect(extractCheckoutSessionId(event)).toBe('pay_legacy_456');
  });

  it('digs into data.checkoutSessionId (V2 webhook flavor)', () => {
    const event: CloverWebhookEnvelope = {
      type: 'CHECKOUT.COMPLETED',
      data: { checkoutSessionId: 'ck_nested_data_789' },
    };
    expect(extractCheckoutSessionId(event)).toBe('ck_nested_data_789');
  });

  it('digs into payment.checkoutSessionId (Ecommerce flavor)', () => {
    const event: CloverWebhookEnvelope = {
      type: 'PAYMENT.SUCCEEDED',
      payment: { checkoutSessionId: 'ck_payment_obj_abc' },
    };
    expect(extractCheckoutSessionId(event)).toBe('ck_payment_obj_abc');
  });

  it('falls back to payment.id when payment.checkoutSessionId is missing', () => {
    const event: CloverWebhookEnvelope = {
      type: 'PAYMENT.SUCCEEDED',
      payment: { id: 'pay_only_id_xyz' },
    };
    expect(extractCheckoutSessionId(event)).toBe('pay_only_id_xyz');
  });

  it('returns null when no recognizable ID anywhere', () => {
    const event: CloverWebhookEnvelope = {
      type: 'CHECKOUT.COMPLETED',
      data: { unrelatedField: 'value' },
    };
    expect(extractCheckoutSessionId(event)).toBe(null);
  });

  it('prefers top-level over nested when both present', () => {
    const event: CloverWebhookEnvelope = {
      type: 'CHECKOUT.COMPLETED',
      checkoutSessionId: 'ck_top_wins',
      data: { checkoutSessionId: 'ck_nested_loses' },
    };
    expect(extractCheckoutSessionId(event)).toBe('ck_top_wins');
  });

  it('handles a completely empty envelope without throwing', () => {
    expect(extractCheckoutSessionId({})).toBe(null);
  });
});
