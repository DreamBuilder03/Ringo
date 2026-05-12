-- ──────────────────────────────────────────────────────────────────────────────
-- Toast POS integration — restaurants table extensions.
--
-- B1 of the Toast sprint (Ryno's demo May 20). pos_type='toast' is already
-- accepted by the schema check constraint (see schema.sql line 46), but the
-- restaurants table has no Toast-specific identifier columns yet. This
-- migration adds them.
--
-- Auth model (partner OAuth, NOT per-restaurant API keys):
--   • Client ID and client secret live in env vars (TOAST_CLIENT_ID,
--     TOAST_CLIENT_SECRET). They're issued once per OMRI-as-partner, not
--     once per restaurant. Toast's prior per-restaurant API key model is
--     deprecated for new integrations.
--   • toast_restaurant_guid is the per-location identifier we pass in every
--     API call via the "Toast-Restaurant-External-ID" header.
--   • toast_management_group_guid is the optional parent group identifier
--     (used when a restaurant chain has multiple locations under one Toast
--     account; null for single-location operators like Ryno's).
--
-- Idempotent. RLS already covers the restaurants table from prior migrations.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS toast_restaurant_guid TEXT,
  ADD COLUMN IF NOT EXISTS toast_management_group_guid TEXT,
  ADD COLUMN IF NOT EXISTS toast_external_id TEXT,
  -- When was the Toast menu last successfully synced to our Upstash cache?
  -- Used by /admin/health to surface stale-menu warnings.
  ADD COLUMN IF NOT EXISTS toast_menu_last_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.restaurants.toast_restaurant_guid IS
  'Toast location identifier. Passed in Toast-Restaurant-External-ID header on every API call. UUID format. NULL until restaurant is onboarded to Toast integration.';

COMMENT ON COLUMN public.restaurants.toast_management_group_guid IS
  'Optional Toast management group identifier for multi-location chains. NULL for single-location operators.';

COMMENT ON COLUMN public.restaurants.toast_external_id IS
  'Optional human-readable Toast identifier (varies by Toast configuration). Some Toast endpoints accept this as a substitute for the GUID.';

COMMENT ON COLUMN public.restaurants.toast_menu_last_synced_at IS
  'Most recent successful Toast menu sync into Upstash cache. NULL means never synced. Surfaced in /admin/health for stale-cache warnings.';

-- Helpful index for the upcoming /api/toast/menu route which looks up
-- restaurants by toast_restaurant_guid when handling Toast webhooks (menu
-- updated, item 86'd events).
CREATE INDEX IF NOT EXISTS restaurants_toast_restaurant_guid_idx
  ON public.restaurants (toast_restaurant_guid)
  WHERE toast_restaurant_guid IS NOT NULL;
