/**
 * Order calculation and formatting utilities
 * Critical path for OMRI revenue — must be accurate
 */

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  is_upsell?: boolean;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  total: number;
}

/**
 * Calculate order totals with tax
 * Ensures proper rounding to 2 decimal places for currency
 */
export function calculateOrderTotals(
  items: OrderItem[],
  taxRate: number = 0.0875
): OrderTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

/**
 * Normalize phone numbers to E.164 format
 * Handles 10-digit and 11-digit US numbers
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}

/**
 * Mask phone number for display (last 4 digits visible)
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `***-***-${digits.slice(-4)}`;
  }
  return phone;
}

/**
 * Mask email for logs (first 2 chars + *** + @domain).
 * Used by Privacy Day 2 log-scrub work so info-level logs never carry full
 * email addresses. Falls back to a generic mask when the input isn't
 * email-shaped — never returns the original.
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const lead = local.slice(0, Math.min(2, local.length));
  return `${lead}***${domain}`;
}

/**
 * Format order summary for voice response
 * Used in Retell voice agent responses to customer
 */
export function formatOrderSummary(
  items: OrderItem[],
  totals: OrderTotals
): string {
  if (items.length === 0) return 'Your order is now empty.';

  const itemsList = items
    .map((item) => `${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})`)
    .join(', ');

  return `Current order: ${itemsList}. Subtotal: $${totals.subtotal.toFixed(2)}, Tax: $${totals.tax.toFixed(2)}, Total: $${totals.total.toFixed(2)}`;
}

/**
 * Calculate upsell total from order items
 * Sums only items marked as upsells
 */
export function calculateUpsellTotal(items: OrderItem[]): number {
  const total = items
    .filter((item) => item.is_upsell === true)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);
  return parseFloat(total.toFixed(2));
}
