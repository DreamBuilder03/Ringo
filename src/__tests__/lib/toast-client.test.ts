// Regression coverage for the mock-first Toast client (B1) and B4 guest sync.
// All tests run in MOCK mode — TOAST_MODE and TOAST_CLIENT_ID env vars stay
// unset, which the client uses to gate the MOCK→LIVE switch.

import {
  getToastMode,
  getMenu,
  createOrder,
  upsertGuest,
  isOpenNow as toastIsOpenNow,
  isItemAvailable,
} from '@/lib/toast/toast-client';

describe('toast-client mode detection', () => {
  it('defaults to mock when TOAST_MODE is unset', () => {
    delete process.env.TOAST_MODE;
    delete process.env.TOAST_CLIENT_ID;
    delete process.env.TOAST_CLIENT_SECRET;
    expect(getToastMode()).toBe('mock');
  });

  it('falls back to mock when TOAST_MODE=live but credentials missing', () => {
    process.env.TOAST_MODE = 'live';
    delete process.env.TOAST_CLIENT_ID;
    delete process.env.TOAST_CLIENT_SECRET;
    expect(getToastMode()).toBe('mock');
    delete process.env.TOAST_MODE;
  });

  it('returns live when TOAST_MODE=live and credentials are set', () => {
    process.env.TOAST_MODE = 'live';
    process.env.TOAST_CLIENT_ID = 'test-id';
    process.env.TOAST_CLIENT_SECRET = 'test-secret';
    expect(getToastMode()).toBe('live');
    delete process.env.TOAST_MODE;
    delete process.env.TOAST_CLIENT_ID;
    delete process.env.TOAST_CLIENT_SECRET;
  });
});

describe('getMenu (mock)', () => {
  it('returns the canned pizza-shop menu with 10 items and 3 modifier groups', async () => {
    const snap = await getMenu('any-guid');
    expect(snap.items.length).toBe(10);
    expect(snap.modifierGroups.length).toBe(3);
  });

  it('marks Cannoli as 86d (the test fixture for decline-path testing)', async () => {
    const snap = await getMenu('any-guid');
    const cannoli = snap.items.find((i) => i.name === 'Cannoli');
    expect(cannoli).toBeDefined();
    expect(cannoli!.available).toBe(false);
  });

  it('includes hours for every day of the week', async () => {
    const snap = await getMenu('any-guid');
    expect(snap.hours.length).toBe(7);
    const days = new Set(snap.hours.map((h) => h.dayOfWeek));
    expect(days.size).toBe(7);
  });

  it('stamps fetchedAt with the current time', async () => {
    const before = Date.now();
    const snap = await getMenu('any-guid');
    const fetchedAt = new Date(snap.fetchedAt).getTime();
    expect(fetchedAt).toBeGreaterThanOrEqual(before);
    expect(fetchedAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('createOrder (mock) — idempotency on externalOrderId', () => {
  it('returns a deterministic order GUID derived from externalOrderId', async () => {
    const result = await createOrder({
      restaurantGuid: 'rest-1',
      externalOrderId: 'order-abc-123',
      scheduledPickupAt: null,
      items: [{ menuItemGuid: 'mock-item-pepperoni-12', quantity: 1 }],
    });
    expect(result.toastOrderGuid).toBe('mock-order-order-abc-123');
  });

  it('computes total in cents with 8.25% CA sales tax', async () => {
    // 2 × $14.99 pepperoni = $29.98 → +8.25% tax = $32.45
    const result = await createOrder({
      restaurantGuid: 'rest-1',
      externalOrderId: 'tax-test',
      scheduledPickupAt: null,
      items: [{ menuItemGuid: 'mock-item-pepperoni-12', quantity: 2 }],
    });
    // 2 × 1499 = 2998 cents subtotal → 2998 * 1.0825 = 3245.335 → 3245
    expect(result.totalCents).toBe(3245);
  });

  it('includes modifier pricing in the total', async () => {
    // 1 × $14.99 pepperoni + $2.00 extra cheese = $16.99 → +8.25% = $18.39
    const result = await createOrder({
      restaurantGuid: 'rest-1',
      externalOrderId: 'mod-test',
      scheduledPickupAt: null,
      items: [
        {
          menuItemGuid: 'mock-item-pepperoni-12',
          quantity: 1,
          modifierOptionGuids: ['mock-mod-extra-cheese'],
        },
      ],
    });
    // 1699 * 1.0825 = 1839.1675 → 1839
    expect(result.totalCents).toBe(1839);
  });

  it('returns an estimatedReadyAt about 20 minutes in the future', async () => {
    const before = Date.now();
    const result = await createOrder({
      restaurantGuid: 'rest-1',
      externalOrderId: 'eta-test',
      scheduledPickupAt: null,
      items: [{ menuItemGuid: 'mock-item-pepperoni-12', quantity: 1 }],
    });
    const eta = new Date(result.estimatedReadyAt).getTime();
    // 20 minutes (± a few seconds for test timing slack)
    expect(eta).toBeGreaterThanOrEqual(before + 19 * 60 * 1000);
    expect(eta).toBeLessThanOrEqual(Date.now() + 21 * 60 * 1000);
  });
});

describe('upsertGuest (mock) — B4 idempotency', () => {
  it('returns the same guest GUID for the same phone number', async () => {
    const phone = '+12095551111';
    const r1 = await upsertGuest({ restaurantGuid: 'rest-1', phone, firstName: 'Maria' });
    const r2 = await upsertGuest({ restaurantGuid: 'rest-1', phone, firstName: 'Maria', lastName: 'Lopez' });
    expect(r1.guestGuid).toBe(r2.guestGuid);
    expect(r1.guestGuid).toBe('mock-guest-12095551111');
  });

  it('treats phone numbers ending in 00 as returning customers', async () => {
    const result = await upsertGuest({
      restaurantGuid: 'rest-1',
      phone: '+12095553300',
    });
    expect(result.matched).toBe(true);
  });

  it('treats other phone numbers as new customers', async () => {
    const result = await upsertGuest({
      restaurantGuid: 'rest-1',
      phone: '+12095554444',
    });
    expect(result.matched).toBe(false);
  });

  it('accepts phone-only sync (no name)', async () => {
    const result = await upsertGuest({
      restaurantGuid: 'rest-1',
      phone: '+12095555555',
    });
    expect(result.guestGuid).toBeDefined();
  });
});

describe('isOpenNow + isItemAvailable convenience helpers', () => {
  it('isOpenNow respects business hours from the snapshot', async () => {
    // Wednesday 1pm — inside default mock hours (Mon-Thu 11am-10pm)
    const wedNoon = new Date('2026-05-13T13:00:00.000');
    const open = await toastIsOpenNow('any-guid', wedNoon);
    expect(open).toBe(true);

    // Wednesday 3am — closed
    const wedEarly = new Date('2026-05-13T03:00:00.000');
    const closed = await toastIsOpenNow('any-guid', wedEarly);
    expect(closed).toBe(false);
  });

  it('isItemAvailable detects the 86d cannoli', async () => {
    const result = await isItemAvailable('any-guid', 'cannoli');
    expect(result.available).toBe(false);
    expect(result.matched?.name).toBe('Cannoli');
  });

  it('isItemAvailable accepts available items', async () => {
    const result = await isItemAvailable('any-guid', 'pepperoni pizza');
    expect(result.available).toBe(true);
  });
});
