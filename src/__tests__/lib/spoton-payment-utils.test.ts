// Regression coverage for the pure pieces of the SpotOn finalize-payment branch.
// Tests the dollars-to-cents math, the multi-source credential resolver, the
// response field-extraction helpers, and the API base. Mirrors the Clover
// payment-utils test file so the two POS branches stay disciplined together.

import {
  toSpotOnLineItems,
  resolveSpotOnCredentials,
  extractSpotOnOrderId,
  extractSpotOnCheckoutUrl,
  spotOnApiBase,
} from '@/lib/spoton/payment-utils';

describe('toSpotOnLineItems — dollars to cents conversion', () => {
  it('converts a single item correctly', () => {
    const result = toSpotOnLineItems([{ name: 'Pepperoni', quantity: 1, price: 14.99 }]);
    expect(result).toEqual([{ name: 'Pepperoni', quantity: 1, price: 1499 }]);
  });

  it('rounds cents correctly (defends against floating-point drift)', () => {
    // 1.495 * 100 = 149.5 — could land at 149 or 150 depending on FP. Math.round → 150.
    const result = toSpotOnLineItems([{ name: 'X', quantity: 1, price: 1.495 }]);
    expect(result[0].price).toBe(150);
  });

  it('preserves quantity (does not multiply price by qty)', () => {
    const result = toSpotOnLineItems([{ name: 'Wings', quantity: 3, price: 11.99 }]);
    expect(result[0].quantity).toBe(3);
    expect(result[0].price).toBe(1199); // unit price stays the same
  });

  it('defaults to quantity 1 when missing or invalid', () => {
    const result = toSpotOnLineItems([
      { name: 'A', quantity: 0, price: 5 },
      { name: 'B', quantity: -2, price: 5 } as unknown as { name: string; quantity: number; price: number },
    ]);
    expect(result[0].quantity).toBe(1);
    expect(result[1].quantity).toBe(1);
  });

  it('defaults to price 0 when NaN', () => {
    const result = toSpotOnLineItems([
      { name: 'Free side', quantity: 1, price: NaN } as unknown as {
        name: string;
        quantity: number;
        price: number;
      },
    ]);
    expect(result[0].price).toBe(0);
  });

  it('truncates names longer than 127 chars', () => {
    const longName = 'x'.repeat(200);
    const result = toSpotOnLineItems([{ name: longName, quantity: 1, price: 5 }]);
    expect(result[0].name.length).toBe(127);
  });

  it('defaults empty name to "Item"', () => {
    const result = toSpotOnLineItems([{ name: '', quantity: 1, price: 5 }]);
    expect(result[0].name).toBe('Item');
  });

  it('handles empty input array', () => {
    expect(toSpotOnLineItems([])).toEqual([]);
  });

  it('uses `quantity` field (not `unitQty` like Clover)', () => {
    // Explicit parity-divergence test — SpotOn and Clover use different
    // field names for the same concept. This test would catch a copy-paste
    // bug where someone Cloverized SpotOn's payload by accident.
    const result = toSpotOnLineItems([{ name: 'A', quantity: 2, price: 5 }]);
    expect(result[0]).toHaveProperty('quantity', 2);
    expect(result[0]).not.toHaveProperty('unitQty');
  });
});

describe('resolveSpotOnCredentials — multi-source priority', () => {
  it('uses per-restaurant credentials when both fields are present', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { apiKey: 'rest-key', locationId: 'rest-loc' },
      envFallback: { apiKey: 'env-key', locationId: 'env-loc' },
    });
    expect(result?.apiKey).toBe('rest-key');
    expect(result?.locationId).toBe('rest-loc');
    expect(result?.source).toBe('per-restaurant');
  });

  it('falls back to env when per-restaurant is empty', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: {},
      envFallback: { apiKey: 'env-key', locationId: 'env-loc' },
    });
    expect(result?.apiKey).toBe('env-key');
    expect(result?.source).toBe('env');
  });

  it('mixes sources when per-restaurant has only one field', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { apiKey: 'rest-key' },
      envFallback: { apiKey: 'env-key', locationId: 'env-loc' },
    });
    expect(result?.apiKey).toBe('rest-key'); // per-restaurant wins
    expect(result?.locationId).toBe('env-loc'); // env fills the gap
    expect(result?.source).toBe('mixed');
  });

  it('returns null when API key is missing from both sources', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { locationId: 'rest-loc' },
      envFallback: { locationId: 'env-loc' },
    });
    expect(result).toBe(null);
  });

  it('returns null when location ID is missing from both sources', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { apiKey: 'rest-key' },
      envFallback: { apiKey: 'env-key' },
    });
    expect(result).toBe(null);
  });

  it('handles null-valued inputs without throwing', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { apiKey: null, locationId: null },
      envFallback: { apiKey: null, locationId: null },
    });
    expect(result).toBe(null);
  });

  it('treats empty strings as missing (falsy fallthrough)', () => {
    const result = resolveSpotOnCredentials({
      perRestaurant: { apiKey: '', locationId: '' },
      envFallback: { apiKey: 'env-key', locationId: 'env-loc' },
    });
    expect(result?.apiKey).toBe('env-key');
    expect(result?.source).toBe('env');
  });
});

describe('extractSpotOnOrderId — response field tolerance', () => {
  it('prefers `id` field when both id and externalId are set', () => {
    expect(extractSpotOnOrderId({ id: 'so_123', externalId: 'ext_456' })).toBe('so_123');
  });

  it('falls back to externalId when id missing', () => {
    expect(extractSpotOnOrderId({ externalId: 'ext_456' })).toBe('ext_456');
  });

  it('returns null when both missing', () => {
    expect(extractSpotOnOrderId({})).toBe(null);
  });

  it('returns null for null/undefined input', () => {
    expect(extractSpotOnOrderId(null)).toBe(null);
    expect(extractSpotOnOrderId(undefined)).toBe(null);
  });

  it('returns null when id is explicitly null', () => {
    expect(extractSpotOnOrderId({ id: null, externalId: null })).toBe(null);
  });
});

describe('extractSpotOnCheckoutUrl — response field tolerance', () => {
  it('prefers checkoutUrl when both set', () => {
    expect(
      extractSpotOnCheckoutUrl({
        checkoutUrl: 'https://pay.spoton.com/a',
        paymentUrl: 'https://pay.spoton.com/b',
      })
    ).toBe('https://pay.spoton.com/a');
  });

  it('falls back to paymentUrl when checkoutUrl missing', () => {
    expect(extractSpotOnCheckoutUrl({ paymentUrl: 'https://pay.spoton.com/b' })).toBe(
      'https://pay.spoton.com/b'
    );
  });

  it('returns null when neither field is set', () => {
    expect(extractSpotOnCheckoutUrl({})).toBe(null);
  });

  it('returns null for null/undefined input', () => {
    expect(extractSpotOnCheckoutUrl(null)).toBe(null);
    expect(extractSpotOnCheckoutUrl(undefined)).toBe(null);
  });
});

describe('spotOnApiBase — environment routing', () => {
  const originalEnv = process.env.SPOTON_API_BASE;
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.SPOTON_API_BASE;
    else process.env.SPOTON_API_BASE = originalEnv;
  });

  it('defaults to the production base URL', () => {
    delete process.env.SPOTON_API_BASE;
    expect(spotOnApiBase()).toBe('https://api.spoton.com');
  });

  it('honors SPOTON_API_BASE env override (for partner sandbox testing)', () => {
    process.env.SPOTON_API_BASE = 'https://sandbox.spoton.com';
    expect(spotOnApiBase()).toBe('https://sandbox.spoton.com');
  });
});
