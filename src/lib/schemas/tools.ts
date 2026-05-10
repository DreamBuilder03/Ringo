// Schemas for /api/tools/* routes (called by Retell agents during live calls).
// Demo variants under /api/tools/demo/* reuse these schemas.

import { z } from 'zod';
import { shortText, phone, dollars, quantity, retellCall, orderItem } from './common';

// ─── lookup-item ──────────────────────────────────────────────────────────────
export const lookupItemSchema = z.object({
  args: z.object({
    item_name: shortText,
    // legacy: some Retell agents may still send `query`. Accept both during
    // migration window; backend normalizes.
    query: shortText.optional(),
  }).passthrough(), // Retell may add unrelated fields; tolerate them in args
  call: retellCall,
}).strict();

// ─── add-to-order ─────────────────────────────────────────────────────────────
export const addToOrderSchema = z.object({
  args: z.object({
    item_name: shortText,
    quantity: quantity.optional(),
    modifiers: z.array(shortText).max(10).optional(),
    notes: shortText.optional(),
    is_upsell: z.boolean().optional(),
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── remove-from-order ────────────────────────────────────────────────────────
export const removeFromOrderSchema = z.object({
  args: z.object({
    item_name: shortText,
    quantity: quantity.optional(),
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── get-modifiers ────────────────────────────────────────────────────────────
export const getModifiersSchema = z.object({
  args: z.object({
    item_name: shortText,
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── confirm-order ────────────────────────────────────────────────────────────
export const confirmOrderSchema = z.object({
  args: z.object({
    customer_name: shortText.optional(),
    customer_phone: phone.optional(),
    phone: phone.optional(),
    phone_number: phone.optional(),
    eta_minutes: z.number().int().min(0).max(180).optional(),
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── finalize-payment ─────────────────────────────────────────────────────────
export const finalizePaymentSchema = z.object({
  args: z.object({
    customer_name: shortText.optional(),
    customer_phone: phone.optional(),
    phone: phone.optional(),
    phone_number: phone.optional(),
    total_amount: dollars.optional(),
    items: z.array(orderItem).max(50).optional(),
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── cancel-order (closes Multi-Test scenario 8) ─────────────────────────────
// Caller says "actually never mind" / "cancel that" / "forget it" before
// payment. Marks the in-progress order cancelled, never fires the kitchen.
export const cancelOrderSchema = z.object({
  args: z.object({
    reason: z.string().min(1).max(200).optional(),
  }).passthrough(),
  call: retellCall,
}).strict();

// ─── request-handoff (C-4) ────────────────────────────────────────────────────
// Agent escalation. Reasons are an enum drawn from the migration.
// summary is a short agent-written description that goes into the SMS pager.
export const requestHandoffSchema = z.object({
  args: z.object({
    reason: z.enum([
      'menu_confusion',
      'allergy_request',
      'complaint',
      'refund_request',
      'caller_request',
      'large_order',
      'agent_uncertainty',
      'other',
    ]),
    summary: z.string().min(1).max(500),
    // Optional: agent self-rated confidence 0..1. NULL → store NULL.
    uncertainty_score: z.number().min(0).max(1).optional(),
    // Caller's number — agent may know it from the call object, but accept
    // an explicit override in case the agent has a corrected version.
    callback_phone: phone.optional(),
  }).passthrough(),
  call: retellCall,
}).strict();
