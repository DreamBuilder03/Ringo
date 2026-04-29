// Schemas for /api/admin/* and /api/provisioning/* (authenticated admin ops).

import { z } from 'zod';
import { uuid, shortText, personName, email, phone } from './common';

// ─── /api/admin/restaurants — list query ──────────────────────────────────────
export const adminRestaurantsListQuery = z.object({
  search: shortText.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
  pos_mode: z.enum(['direct_api', 'handoff_tablet']).optional(),
}).strict();

// ─── /api/admin/restaurants POST — create restaurant ──────────────────────────
// Matches the live API contract — snake_case keys, only name/address/phone
// strictly required, the rest set later via dashboard.
export const adminCreateRestaurantSchema = z.object({
  name: shortText,
  address: shortText,
  phone,
  pos_type: z.enum(['square', 'clover', 'toast', 'spoton']).optional(),
  pos_mode: z.enum(['direct_api', 'handoff_tablet']).optional(),
  retell_agent_id: shortText.optional(),
  owner_name: personName.optional(),
  owner_email: email.optional(),
  owner_phone: phone.optional(),
  city: shortText.optional(),
  state: z.string().trim().length(2).optional(),
  ringo_phone_number: phone.optional(),
}).strict();

// ─── /api/admin/health/summary (no body, no query) ────────────────────────────
// Intentionally no schema — pure GET aggregation, auth-guarded.

// ─── /api/provisioning/create — create restaurant + Twilio + Retell ───────────
export const provisioningCreateSchema = z.object({
  restaurant_name: shortText,
  owner_name: personName,
  owner_email: email,
  owner_phone: phone,
  city: shortText,
  state: z.string().trim().length(2),
  area_code: z.string().trim().regex(/^\d{3}$/, 'Area code must be 3 digits.').optional(),
  tier: z.enum(['starter', 'growth', 'pro']),
  pos_type: z.enum(['square', 'clover', 'toast', 'spoton']).optional(),
  pos_mode: z.enum(['direct_api', 'handoff_tablet']).optional(),
}).strict();
