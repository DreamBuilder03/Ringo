// Schemas for /api/demo/* and /api/demo-* routes (public marketing demo flow).

import { z } from 'zod';
import { shortText, mediumText, personName, email, phone } from './common';

// ─── /api/demo-request — restaurant lead capture ──────────────────────────────
// Note: live form uses camelCase keys; do not "snake_case-ify" without updating
// the form simultaneously. This is what the production landing page sends.
export const demoRequestSchema = z.object({
  restaurantName: shortText,
  email,
  name: personName.optional(),
  phone: phone.optional(),
  city: shortText.optional(),
  notes: mediumText.optional(),
  source: shortText.optional(),
  utm_source: shortText.optional(),
  utm_medium: shortText.optional(),
  utm_campaign: shortText.optional(),
}).strict();

// ─── /api/demo/create-session — start a demo voice session ────────────────────
export const createDemoSessionSchema = z.object({
  place_id: shortText.optional(),
  restaurant_name: shortText.optional(),
  cuisine: shortText.optional(),
  city: shortText.optional(),
  caller_name: personName.optional(),
  caller_phone: phone.optional(),
}).strict();

// ─── /api/demo/create-phone-call — outbound call to caller ────────────────────
export const createDemoPhoneCallSchema = z.object({
  to_phone: phone,
  restaurant_name: shortText.optional(),
  caller_name: personName.optional(),
  session_id: shortText.optional(),
}).strict();

// ─── /api/demo-call — Retell web-call entry ──────────────────────────────────
export const demoCallSchema = z.object({
  restaurant_id: shortText.optional(),
  restaurant_name: shortText.optional(),
  session_id: shortText.optional(),
}).strict();

// ─── /api/demo/places/autocomplete (query string) ─────────────────────────────
export const placesAutocompleteQuery = z.object({
  q: z.string().trim().min(2).max(120),
  city: shortText.optional(),
}).strict();

// ─── /api/demo/places/details (query string) ──────────────────────────────────
export const placesDetailsQuery = z.object({
  place_id: z.string().trim().min(1).max(200),
}).strict();

// ─── /api/demo/places/photo (query string) ────────────────────────────────────
export const placesPhotoQuery = z.object({
  ref: z.string().trim().min(1).max(500),
  maxwidth: z.coerce.number().int().min(40).max(1600).optional(),
}).strict();

// ─── /api/demo/leads (admin read) ─────────────────────────────────────────────
export const demoLeadsListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
}).strict();
