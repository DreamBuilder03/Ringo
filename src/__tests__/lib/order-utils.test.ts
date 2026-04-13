import {
  calculateOrderTotals,
  normalizePhone,
  maskPhone,
  formatOrderSummary,
  calculateUpsellTotal,
  type OrderItem,
} from '@/lib/order-utils';

describe('Order Utilities', () => {
  describe('calculateOrderTotals', () => {
    it('should calculate totals for a single item', () => {
      const items: OrderItem[] = [{ name: 'Burger', quantity: 1, price: 10.0 }];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(10.0);
      expect(totals.tax).toBe(0.88); // 10 * 0.0875 = 0.875, rounds to 0.88
      expect(totals.total).toBe(10.88);
    });

    it('should calculate totals for multiple items with same price', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 2, price: 10.0 },
        { name: 'Fries', quantity: 1, price: 5.0 },
      ];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(25.0);
      expect(totals.tax).toBe(2.19); // 25 * 0.0875 = 2.1875, rounds to 2.19
      expect(totals.total).toBe(27.19);
    });

    it('should calculate totals for items with different quantities', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 3, price: 12.5 },
        { name: 'Drink', quantity: 2, price: 3.0 },
      ];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(43.5);
      expect(totals.tax).toBe(3.81); // 43.5 * 0.0875 = 3.80625, rounds to 3.81
      expect(totals.total).toBe(47.31);
    });

    it('should handle empty items array', () => {
      const items: OrderItem[] = [];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(0);
      expect(totals.tax).toBe(0);
      expect(totals.total).toBe(0);
    });

    it('should properly round to 2 decimal places', () => {
      const items: OrderItem[] = [
        { name: 'Item1', quantity: 3, price: 1.23 },
        { name: 'Item2', quantity: 2, price: 4.56 },
      ];

      const totals = calculateOrderTotals(items);

      // Subtotal: 3*1.23 + 2*4.56 = 3.69 + 9.12 = 12.81
      // Tax: 12.81 * 0.0875 = 1.120875, rounds to 1.12
      // Total: 12.81 + 1.12 = 13.93
      expect(totals.subtotal).toBe(12.81);
      expect(totals.tax).toBe(1.12);
      expect(totals.total).toBe(13.93);
    });

    it('should handle custom tax rate', () => {
      const items: OrderItem[] = [{ name: 'Burger', quantity: 1, price: 10.0 }];

      const totals = calculateOrderTotals(items, 0.1); // 10% tax

      expect(totals.subtotal).toBe(10.0);
      expect(totals.tax).toBe(1.0);
      expect(totals.total).toBe(11.0);
    });

    it('should handle zero tax rate', () => {
      const items: OrderItem[] = [{ name: 'Burger', quantity: 1, price: 10.0 }];

      const totals = calculateOrderTotals(items, 0);

      expect(totals.subtotal).toBe(10.0);
      expect(totals.tax).toBe(0);
      expect(totals.total).toBe(10.0);
    });

    it('should handle high-precision prices', () => {
      const items: OrderItem[] = [{ name: 'Item', quantity: 1, price: 9.99 }];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(9.99);
      expect(totals.tax).toBeCloseTo(0.87, 2); // 9.99 * 0.0875 = 0.874125
      expect(totals.total).toBeCloseTo(10.86, 2);
    });

    it('should handle many items', () => {
      const items: OrderItem[] = Array.from({ length: 100 }, (_, i) => ({
        name: `Item ${i}`,
        quantity: 1,
        price: 1.0,
      }));

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(100.0);
      expect(totals.tax).toBe(8.75);
      expect(totals.total).toBe(108.75);
    });
  });

  describe('normalizePhone', () => {
    it('should normalize 10-digit phone number', () => {
      expect(normalizePhone('5551234567')).toBe('+15551234567');
    });

    it('should normalize 10-digit phone with hyphens', () => {
      expect(normalizePhone('555-123-4567')).toBe('+15551234567');
    });

    it('should normalize 10-digit phone with parentheses and spaces', () => {
      expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    });

    it('should normalize 11-digit number starting with 1', () => {
      expect(normalizePhone('15551234567')).toBe('+15551234567');
    });

    it('should handle already normalized E.164 format', () => {
      expect(normalizePhone('+15551234567')).toBe('+15551234567');
    });

    it('should return original for non-standard lengths', () => {
      expect(normalizePhone('555')).toBe('555');
      expect(normalizePhone('123456789')).toBe('123456789');
    });

    it('should handle empty string', () => {
      expect(normalizePhone('')).toBe('');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone to last 4 digits', () => {
      expect(maskPhone('5551234567')).toBe('***-***-4567');
    });

    it('should mask formatted phone number', () => {
      expect(maskPhone('(555) 123-4567')).toBe('***-***-4567');
    });

    it('should mask E.164 format', () => {
      expect(maskPhone('+15551234567')).toBe('***-***-4567');
    });

    it('should return original for short numbers', () => {
      expect(maskPhone('555')).toBe('555');
      expect(maskPhone('123')).toBe('123');
    });

    it('should handle empty string', () => {
      expect(maskPhone('')).toBe('');
    });

    it('should mask 4-digit number', () => {
      expect(maskPhone('1234')).toBe('***-***-1234');
    });
  });

  describe('formatOrderSummary', () => {
    it('should format order with single item', () => {
      const items: OrderItem[] = [{ name: 'Burger', quantity: 1, price: 10.0 }];
      const totals = calculateOrderTotals(items);

      const summary = formatOrderSummary(items, totals);

      expect(summary).toContain('1x Burger ($10.00)');
      expect(summary).toContain('Subtotal: $10.00');
      expect(summary).toContain('Tax: $0.88');
      expect(summary).toContain('Total: $10.88');
    });

    it('should format order with multiple items', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 2, price: 10.0 },
        { name: 'Fries', quantity: 1, price: 5.0 },
      ];
      const totals = calculateOrderTotals(items);

      const summary = formatOrderSummary(items, totals);

      expect(summary).toContain('2x Burger ($20.00)');
      expect(summary).toContain('1x Fries ($5.00)');
      expect(summary).toContain('Subtotal: $25.00');
      expect(summary).toContain('Total: $27.19');
    });

    it('should return empty order message for no items', () => {
      const items: OrderItem[] = [];
      const totals = calculateOrderTotals(items);

      const summary = formatOrderSummary(items, totals);

      expect(summary).toBe('Your order is now empty.');
    });

    it('should format items with decimal prices correctly', () => {
      const items: OrderItem[] = [{ name: 'Combo', quantity: 3, price: 8.99 }];
      const totals = calculateOrderTotals(items);

      const summary = formatOrderSummary(items, totals);

      expect(summary).toContain('3x Combo ($26.97)');
    });

    it('should separate items with commas', () => {
      const items: OrderItem[] = [
        { name: 'Item1', quantity: 1, price: 5.0 },
        { name: 'Item2', quantity: 1, price: 5.0 },
        { name: 'Item3', quantity: 1, price: 5.0 },
      ];
      const totals = calculateOrderTotals(items);

      const summary = formatOrderSummary(items, totals);

      expect(summary).toContain('1x Item1 ($5.00), 1x Item2 ($5.00), 1x Item3 ($5.00)');
    });
  });

  describe('calculateUpsellTotal', () => {
    it('should calculate upsell total from marked items', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 10.0, is_upsell: false },
        { name: 'Drink', quantity: 1, price: 3.0, is_upsell: true },
        { name: 'Fries', quantity: 1, price: 4.0, is_upsell: true },
      ];

      const total = calculateUpsellTotal(items);

      expect(total).toBe(7.0); // 3 + 4
    });

    it('should return 0 when no upsells', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 10.0, is_upsell: false },
        { name: 'Fries', quantity: 1, price: 5.0 },
      ];

      const total = calculateUpsellTotal(items);

      expect(total).toBe(0);
    });

    it('should return 0 for empty items', () => {
      const items: OrderItem[] = [];

      const total = calculateUpsellTotal(items);

      expect(total).toBe(0);
    });

    it('should calculate upsell with quantities', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 2, price: 10.0, is_upsell: true },
        { name: 'Drink', quantity: 3, price: 2.5, is_upsell: true },
      ];

      const total = calculateUpsellTotal(items);

      expect(total).toBe(27.5); // (2 * 10) + (3 * 2.5) = 20 + 7.5
    });

    it('should properly round to 2 decimal places', () => {
      const items: OrderItem[] = [
        { name: 'Item1', quantity: 3, price: 1.23, is_upsell: true },
        { name: 'Item2', quantity: 2, price: 4.56, is_upsell: true },
      ];

      const total = calculateUpsellTotal(items);

      // 3*1.23 + 2*4.56 = 3.69 + 9.12 = 12.81
      expect(total).toBe(12.81);
    });

    it('should ignore items without is_upsell flag', () => {
      const items: OrderItem[] = [
        { name: 'Item1', quantity: 1, price: 5.0, is_upsell: true },
        { name: 'Item2', quantity: 1, price: 5.0 }, // No is_upsell flag
      ];

      const total = calculateUpsellTotal(items);

      expect(total).toBe(5.0); // Only Item1
    });
  });
});
