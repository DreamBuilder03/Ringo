-- ──────────────────────────────────────────────────────────────────────────────
-- Per-restaurant prompt overrides — C-2 of the AI smarter arc.
--
-- Adds a single JSONB column to the restaurants table that holds arbitrary
-- key→string overrides. The /api/retell/inbound webhook reads these on every
-- inbound call and injects them as Retell dynamic variables, so the agent
-- prompt can use {{key}} placeholders without code changes per restaurant.
--
-- Conventional keys (documented in docs/handoff/per-restaurant-prompt-overrides.md):
--   greeting_addition  — extra line appended after default greeting
--   upsell_focus       — what to push today ("the new garlic knots")
--   special_notice     — temporary notice ("closed for renovations Apr 30")
--   tone_modifier      — personality adjustment ("extra warm and chatty")
--   brand_signoff      — closing line ("Thank you for choosing Sal's!")
--   dialect_notes      — pronunciation guidance ("say 'Cae-sars' not 'See-zers'")
--
-- Restaurants can use any key they want — these are conventions, not constraints.
-- The webhook caps total size + sanitizes (string-only values, 500-char max each,
-- max 20 keys) before serving to Retell.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS — safe to re-run.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS prompt_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.restaurants.prompt_overrides IS
  'Per-restaurant key→string overrides injected into the Retell prompt as dynamic variables on every inbound call. Conventional keys: greeting_addition, upsell_focus, special_notice, tone_modifier, brand_signoff, dialect_notes. Webhook sanitizes (strings only, 500-char max, 20 keys max). See docs/handoff/per-restaurant-prompt-overrides.md.';
