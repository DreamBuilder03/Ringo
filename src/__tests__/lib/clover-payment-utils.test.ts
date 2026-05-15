// Regression coverage for the pure pieces of the Clover finalize-payment branch.
// Tests the dollars-to-cents math, the multi-source credential resolver,
// and the environment routing.

import {
  toCloverLineItems,
  resolveCloverCredentials,
  cloverApiBase,
} from '@/lib/clover/payment-utils';

describe('toCloverLineItems — dollars to cents conversion', () => {
  it('converts a single item correctly', () => {
    const result = toCloverLineItems([{ name: 'Pepperoni', quantity: 1, price: 14.99 }]);
    expect(result).toEqual([{ name: 'Pepperoni', unitQty: 1, price: 1499 }]);
  });

  it('rounds cents correctly (defends against floating-point drift)', () => {
    // 1.495 * 100 = 149.5 — could land at 149 or 150 depending on FP.
    // Math.round → 150.
    const result = toCloverLineItems([{ name: 'X', quantity: 1, price: 1.495 }]);
    expect(result[0].price).toBe(150);
  });

  it('preserves quantity (does not multiply price by qty)', () => {
    const result = toCloverLineItems([{ name: 'Wings', quantity: 3, price: 11.99 }]);
    expect(result[0].unitQty).toBe(3);
    expect(result[0].price).toBe(1199); // unit price stays the same
  });

  it('defaults to quantity 1 when missing or invalid', () => {
    const result = toCloverLineItems([
      { name: 'A', quantity: 0, price: 5 },
      { name: 'B', quantity: -2, price: 5 } as unknown as { name: string; quantity: number; price: number },
    ]);
    expect(result[0].unitQty).toBe(1);
    expect(result[1].unitQty).toBe(1);
  });

  it('defaults to price 0 when missing', () => {
    const result = toCloverLineItems([
      { name: 'Free side', quantity: 1, price: NaN } as unknown as {
        name: string;
        quantity: number;
        price: number;
      },
    ]);
    expect(result[0].price).toBe(0);
  });

  it('truncates names longer than 127 chars (Clover limit)', () => {
    const longName = 'x'.repeat(200);
    const result = toCloverLineItems([{ name: longName, quantity: 1, price: 5 }]);
    expect(result[0].name.length).toBe(127);
  });

  it('defaults empty name to "Item"', () => {
    const result = toCloverLineItems([{ name: '', quantity: 1, price: 5 }]);
    expect(result[0].name).toBe('Item');
  });

  it('handles empty input array', () => {
    expect(toCloverLineItems([])).toEqual([]);
  });
});

describe('resolveCloverCredentials — multi-source priority', () => {
  it('uses per-restaurant credentials when both fields are present', () => {
    const result = resolveCloverCredentials({
      perRestaurant: {
        accessToken: 'rest-token',
        merchantId: 'rest-merchant',
        environment: 'production',
      },
      envFallback: {
        accessToken: 'env-token',
        merchantId: 'env-merchant',
        environment: 'sandbox',
      },
    });
    expect(result?.accessToken).toBe('rest-token');
    expect(result?.merchantId).toBe('rest-merchant');
    expect(result?.environment).toBe('production');
    expect(result?.source).toBe('per-restaurant');
  });

  it('falls back to env when per-restaurant is empty', () => {
    const result = resolveCloverCredentials({
      perRestaurant: {},
      envFallback: {
        accessToken: 'env-token',
        merchantId: 'env-merchant',
        environment: 'sandbox',
      },
    });
    expect(result?.accessToken).toBe('env-token');
    expect(result?.source).toBe('env');
  });

  it('mixes sources when per-restaurant has only one field', () => {
    const result = resolveCloverCredentials({
      perRestaurant: { accessToken: 'rest-token' },
      envFallback: {
        accessToken: 'env-token',
        merchantId: 'env-merchant',
      },
    });
    expect(result?.accessToken).toBe('rest-token'); // per-restaurant wins
    expect(result?.merchantId).toBe('env-merchant'); // env fills the gap
    expect(result?.source).toBe('mixed');
  });

  it('returns null when access token is missing from both sources', () => {
    const result = resolveCloverCredentials({
      perRestaurant: { merchantId: 'rest-merchant' },
      envFallback: { merchantId: 'env-merchant' },
    });
    expect(result).toBe(null);
  });

  it('returns null when merchant ID is missing from both sources', () => {
    const result = resolveCloverCredentials({
      perRestaurant: { accessToken: 'rest-token' },
      envFallback: { accessToken: 'env-token' },
    });
    expect(result).toBe(null);
  });

  it('defaults environment to sandbox when neither source specifies', () => {
    const result = resolveCloverCredentials({
      perRestaurant: { accessToken: 't', merchantId: 'm' },
      envFallback: {},
    });
    expect(result?.environment).toBe('sandbox');
  });

  it('handles null inputs without throwing', () => {
    const result = resolveCloverCredentials({
      perRestaurant: { accessToken: null, merchantId: null, environment: null },
      envFallback: { accessToken: null, merchantId: null, environment: null },
    });
    expect(result).toBe(null);
  });
});

describe('cloverApiBase — environment routing', () => {
  it('returns the production base URL for production environment', () => {
    expect(cloverApiBase('production')).toBe('https://api.clover.com');
  });

  it('returns the sandbox base URL for sandbox environment', () => {
    expect(cloverApiBase('sandbox')).toBe('https://apisandbox.dev.clover.com');
  });
});
