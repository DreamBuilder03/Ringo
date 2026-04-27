// Schemas for /api/orders/* and /api/checkout (customer + admin order ops).

import { z } from 'zod';
import { uuid, shortText, personName, phone, dollars, orderItem } from './common';

// ─── /api/orders POST — admin creates a manual order ──────────────────────────
export const createOrderSchema = z.object({
  restaurant_id: uuid,
  customer_name: personName.optional(),
  customer_phone: phone.optional(),
  items: z.array(orderItem).min(1).max(50),
  total_amount: dollars,
  notes: shortText.optional(),
  source: z.enum(['phone', 'walk-in', 'web', 'admin']).optional(),
}).strict();

// ─── /api/orders/[orderId]/pay — customer pay-link page submit ────────────────
export const orderPaySchema = z.object({
  payment_method_id: shortText.optional(),
  return_url: shortText.optional(),
}).strict();

// ─── /api/checkout — Stripe checkout for billing tier signup ──────────────────
export const checkoutSchema = z.object({
  price_id: shortText,
  restaurant_id: uuid.optional(),
  success_url: shortText.optional(),
  cancel_url: shortText.optional(),
}).strict();
