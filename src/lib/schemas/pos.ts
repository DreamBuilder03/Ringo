// Schemas for /api/pos/* routes (POS push-to-kitchen + OAuth callbacks).
// These are called by our own backend (Square webhook → /api/pos/{provider})
// or by the provider (OAuth code exchange). Strict validation either way.

import { z } from 'zod';
import { uuid, shortText, dollars, orderItem } from './common';

// ─── Generic POS push (used by Square/Clover/Toast/SpotOn POST) ───────────────
export const posPushSchema = z.object({
  restaurant_id: uuid,
  order_id: uuid,
  items: z.array(orderItem).min(1).max(50),
  total: dollars,
  customer_name: shortText.optional(),
  customer_phone: shortText.optional(),
  notes: shortText.optional(),
}).strict();

// ─── OAuth callback query string (Square/Clover/Toast/SpotOn GET) ─────────────
export const posOAuthCallbackQuery = z.object({
  code: z.string().trim().min(10).max(2000),
  state: z.string().trim().min(1).max(500).optional(),
  merchant_id: shortText.optional(),
  realm_id: shortText.optional(),
}).strict();

// ─── /api/pos/{provider}/authorize — initiate OAuth ───────────────────────────
export const posAuthorizeQuery = z.object({
  restaurant_id: uuid,
  return_url: shortText.optional(),
}).strict();
