// Common Zod primitives used across all route schemas.
// Length limits exist to defend against memory-blow / log-flood attacks.
// If a real client hits one, we adjust here — but the limits are deliberately
// generous for legit traffic and tight on abuse vectors.

import { z } from 'zod';

// E.164-ish phone — permissive enough for international, strict on length.
// We don't enforce + because some Retell-passed numbers come without it.
export const phone = z.string().min(7).max(20).regex(/^\+?[0-9\s\-()]+$/, 'Not a valid phone number.');

// Trimmed text fields with sane caps.
export const shortText = z.string().trim().min(1).max(120);
export const mediumText = z.string().trim().min(1).max(500);
export const longText = z.string().trim().min(1).max(5000);

// Customer-facing name (orders, leads).
export const personName = z.string().trim().min(1).max(80);

// Email with sane cap.
export const email = z.string().trim().toLowerCase().email().max(254);

// UUID — Supabase row id pattern.
export const uuid = z.string().uuid();

// Money in cents. Up to $1M per single charge — anything larger is suspicious.
export const cents = z.number().int().min(0).max(100_000_000);

// Money in dollars (Retell sends decimals). Same cap.
export const dollars = z.number().min(0).max(1_000_000);

// Quantity for an order line. Restaurant orders cap at 100/item — defense
// against typo or speech recognition repeat.
export const quantity = z.number().int().min(1).max(100);

// Common Retell envelope: every tool route receives { args, call }.
// args shape varies per tool; call is set when running on a real PSTN call.
export const retellCall = z
  .object({
    call_id: z.string().max(200).optional(),
    from_number: z.string().max(20).optional(),
    to_number: z.string().max(20).optional(),
    agent_id: z.string().max(200).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .partial()
  .optional();

// Generic order-line item shape used across tools.
export const orderItemModifier = z.object({
  name: shortText,
  price_cents: cents.optional(),
  quantity: quantity.optional(),
}).strict();

export const orderItem = z.object({
  name: shortText,
  quantity: quantity,
  price_cents: cents.optional(),
  unit_price: dollars.optional(),
  modifiers: z.array(orderItemModifier).max(10).optional(),
  notes: mediumText.optional(),
}).strict();
