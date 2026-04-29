// Schemas for outbound comms routes — /api/sms, /api/emails/*, /api/menu/import.
// Most are admin-internal. SMS is the only one called from public flows
// (twilio voice fallback hands back to /sms for missed-call SMS auto-reply).

import { z } from 'zod';
import { uuid, shortText, mediumText, longText, phone, email, personName } from './common';

// ─── /api/sms — send a single SMS ─────────────────────────────────────────────
export const smsSendSchema = z.object({
  to: phone,
  body: mediumText,
  restaurant_id: uuid.optional(),
  source: z.enum(['handoff', 'demo', 'pay-link', 'reminder', 'admin']).optional(),
}).strict();

// ─── /api/menu/import — paste-bulk menu import ────────────────────────────────
export const menuImportSchema = z.object({
  restaurant_id: uuid,
  format: z.enum(['csv', 'json', 'paste']),
  payload: longText, // raw CSV / JSON string
  dry_run: z.boolean().optional(),
}).strict();

// ─── /api/emails/welcome ──────────────────────────────────────────────────────
// Note: live API uses camelCase keys — match what the production caller sends.
export const emailWelcomeSchema = z.object({
  restaurantId: uuid,
  restaurantName: shortText,
  ownerName: personName,
  ownerEmail: email,
}).strict();

// ─── Cron-triggered emails — body usually empty, secret-guarded ───────────────
// /api/emails/daily-summary, /api/emails/monthly-roi, /api/cron/silent-line-check
// No body schema needed; CRON_SECRET header guard is the validation.

// ─── /api/twilio/voice-fallback — Twilio webhook ──────────────────────────────
// Twilio posts application/x-www-form-urlencoded, not JSON. Validation
// happens via Twilio signature header verification, not Zod body parse.
