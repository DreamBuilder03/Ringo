-- ──────────────────────────────────────────────────────────────────────────────
-- SpotOn POS integration — per-restaurant credential columns.
--
-- Brings SpotOn to architectural parity with Square + Clover + Toast: each
-- restaurant carries its own credentials on the restaurants row instead of
-- the integration relying on a single global env var (which only supports
-- one SpotOn restaurant at a time — a hard ceiling on the SpotOn channel).
--
-- pos_type='spoton' is already accepted by the schema check constraint
-- (see supabase/schema.sql line 46). This migration only adds the
-- credential storage.
--
-- Idempotent. RLS already covers the restaurants table from prior migrations.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS spoton_api_key TEXT,
  ADD COLUMN IF NOT EXISTS spoton_location_id TEXT;

COMMENT ON COLUMN public.restaurants.spoton_api_key IS
  'SpotOn API key for this restaurant. NULL when restaurant is not on SpotOn or has not connected yet. Stored encrypted at rest by Supabase by default.';

COMMENT ON COLUMN public.restaurants.spoton_location_id IS
  'SpotOn Location ID this restaurant maps to. NULL when not on SpotOn. Required for any SpotOn API call — passed in the X-Location-Id header.';
