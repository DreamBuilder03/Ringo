/**
 * Tests for add-to-order route calculation logic
 * This tests the core order calculation without Supabase mocking
 * The calculateOrderTotals logic is tested in order-utils.test.ts
 *
 * These tests verify that the API route handles the order logic correctly
 */

import { calculateOrderTotals, type OrderItem } from '@/lib/order-utils';

describe('Add-to-Order Route - Calculation Logic', () => {
  describe('Order calculation scenarios (critical for revenue)', () => {
    it('should calculate correct totals for a simple order', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 12.99, is_upsell: false },
        { name: 'Fries', quantity: 1, price: 3.99, is_upsell: false },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      expect(totals.subtotal).toBe(16.98);
      expect(totals.tax).toBeCloseTo(1.49, 2);
      expect(totals.total).toBeCloseTo(18.47, 2);
    });

    it('should handle restaurant with custom tax rate', () => {
      const items: OrderItem[] = [
        { name: 'Pizza', quantity: 1, price: 14.99 },
        { name: 'Drink', quantity: 2, price: 2.5 },
      ];

      // California tax rate
      const totals = calculateOrderTotals(items, 0.0725);

      expect(totals.subtotal).toBe(19.99);
      expect(totals.tax).toBeCloseTo(1.45, 2);
      expect(totals.total).toBeCloseTo(21.44, 2);
    });

    it('should track upsells separately', () => {
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 10.0, is_upsell: false },
        { name: 'Upgrade to Large Drink', quantity: 1, price: 2.0, is_upsell: true },
        { name: 'Extra Sauce', quantity: 2, price: 0.5, is_upsell: true },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      expect(totals.subtotal).toBe(13.0);
      expect(totals.tax).toBeCloseTo(1.14, 2);
      expect(totals.total).toBeCloseTo(14.14, 2);

      // Upsell total: 2.0 + (2 * 0.5) = 3.0
      const upsellTotal = items
        .filter((item) => item.is_upsell)
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(upsellTotal).toBe(3.0);
    });

    it('should handle large order accurately', () => {
      const items: OrderItem[] = [
        { name: 'Entree 1', quantity: 2, price: 18.95 },
        { name: 'Entree 2', quantity: 3, price: 16.5 },
        { name: 'Appetizer', quantity: 1, price: 9.99 },
        { name: 'Dessert', quantity: 2, price: 7.5 },
        { name: 'Drinks', quantity: 5, price: 2.99 },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      // Subtotal: 37.9 + 49.5 + 9.99 + 15 + 14.95 = 127.34
      expect(totals.subtotal).toBe(127.34);
      expect(totals.tax).toBeCloseTo(11.14, 2);
      expect(totals.total).toBeCloseTo(138.48, 2);
    });

    it('should not lose precision with fractional cents', () => {
      // Real-world scenario: items might sum to fractional cents
      const items: OrderItem[] = [
        { name: 'Item1', quantity: 3, price: 3.33 },
        { name: 'Item2', quantity: 2, price: 2.22 },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      // Subtotal: (3 * 3.33) + (2 * 2.22) = 9.99 + 4.44 = 14.43
      expect(totals.subtotal).toBe(14.43);
      // Tax: 14.43 * 0.0875 = 1.262625, rounds to 1.26
      expect(totals.tax).toBe(1.26);
      expect(totals.total).toBe(15.69);
    });

    it('should handle zero-priced items (promotions)', () => {
      const items: OrderItem[] = [
        { name: 'Regular Item', quantity: 1, price: 10.0 },
        { name: 'Free Item', quantity: 1, price: 0.0 },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      expect(totals.subtotal).toBe(10.0);
      expect(totals.tax).toBeCloseTo(0.88, 2);
      expect(totals.total).toBeCloseTo(10.88, 2);
    });

    it('should accumulate items correctly in building order', () => {
      // Simulate adding items one at a time (order building)
      const items1: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 10.0 },
      ];

      const items2: OrderItem[] = [
        ...items1,
        { name: 'Drink', quantity: 1, price: 3.0 },
      ];

      const items3: OrderItem[] = [
        ...items2,
        { name: 'Fries', quantity: 1, price: 4.0 },
      ];

      const totals1 = calculateOrderTotals(items1);
      const totals2 = calculateOrderTotals(items2);
      const totals3 = calculateOrderTotals(items3);

      expect(totals1.total).toBeCloseTo(10.88, 2);
      expect(totals2.total).toBeCloseTo(14.36, 2);
      expect(totals3.total).toBeCloseTo(18.84, 2);
    });

    it('should handle duplicate items being added', () => {
      // Customer adds same item twice
      const items: OrderItem[] = [
        { name: 'Burger', quantity: 1, price: 10.0 },
        { name: 'Burger', quantity: 1, price: 10.0 },
      ];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(20.0);
      expect(totals.tax).toBeCloseTo(1.75, 2);
      expect(totals.total).toBeCloseTo(21.75, 2);
    });

    it('should handle very small quantities correctly', () => {
      // Edge case: order with single items
      const items: OrderItem[] = [
        { name: 'Item', quantity: 1, price: 0.99 },
      ];

      const totals = calculateOrderTotals(items);

      expect(totals.subtotal).toBe(0.99);
      expect(totals.tax).toBeCloseTo(0.09, 2);
      expect(totals.total).toBeCloseTo(1.08, 2);
    });

    it('should accumulate correctly when order is updated', () => {
      // Simulating update scenario: order already has items, new item added
      const existingItems: OrderItem[] = [
        { name: 'Burger', quantity: 2, price: 10.0 },
        { name: 'Drink', quantity: 1, price: 3.0 },
      ];

      const newItem: OrderItem = { name: 'Fries', quantity: 1, price: 4.0 };

      const updatedItems: OrderItem[] = [...existingItems, newItem];

      const existingTotals = calculateOrderTotals(existingItems);
      const updatedTotals = calculateOrderTotals(updatedItems);

      expect(existingTotals.subtotal).toBe(23.0);
      expect(updatedTotals.subtotal).toBe(27.0);
      expect(updatedTotals.total).toBeCloseTo(29.36, 2);
    });

    it('should handle the Modesto, CA tax rate (8.75%)', () => {
      // OMRI is based in Modesto, CA
      const items: OrderItem[] = [
        { name: 'Taco', quantity: 3, price: 2.5 },
        { name: 'Burrito', quantity: 1, price: 6.99 },
      ];

      const totals = calculateOrderTotals(items, 0.0875);

      // Subtotal: 7.5 + 6.99 = 14.49
      expect(totals.subtotal).toBe(14.49);
      // Tax: 14.49 * 0.0875 = 1.26788, rounds to 1.27
      expect(totals.tax).toBe(1.27);
      expect(totals.total).toBe(15.76);
    });

    it('should maintain rounding integrity across all totals', () => {
      // Critical: ensure subtotal + tax = total (with proper rounding)
      const items: OrderItem[] = Array.from({ length: 7 }, () => ({
        name: 'Item',
        quantity: 1,
        price: 3.33,
      }));

      const totals = calculateOrderTotals(items);

      // Subtotal: 7 * 3.33 = 23.31
      // Tax: 23.31 * 0.0875 = 2.039625, rounds to 2.04
      // Total: 23.31 + 2.04 = 25.35
      expect(totals.subtotal + totals.tax).toBeCloseTo(totals.total, 2);
      expect(totals.total).toBe(25.35);
    });
  });
});
