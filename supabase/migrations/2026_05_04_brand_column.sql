-- ──────────────────────────────────────────────────────────────────────────────
-- restaurants.brand — picker key for the LC + future franchise master-menu seeds.
--
-- Used by:
--   - /admin/fleet page filter
--   - /onboarding brand picker (B2 of LC Readiness Sprint)
--   - LC master menu seed bootstrap (lc_master_menu copies are filtered by brand)
--
-- Conventional values: 'little_caesars', 'dominos', 'pizza_hut', 'papa_johns',
-- 'jets_pizza', 'wingstop', 'independent' (default for non-franchise restaurants).
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT 'independent';

COMMENT ON COLUMN public.restaurants.brand IS
  'Franchise brand key for menu pre-seeding + fleet filtering. Conventional: little_caesars, dominos, pizza_hut, papa_johns, jets_pizza, wingstop, independent. See docs/handoff/lc-onboarding-menu.md.';

CREATE INDEX IF NOT EXISTS restaurants_brand_idx ON public.restaurants (brand);
