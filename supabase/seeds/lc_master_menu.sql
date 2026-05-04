-- ──────────────────────────────────────────────────────────────────────────────
-- Little Caesars master menu (B2 of LC Readiness Sprint).
--
-- Pattern:
--   1. Create one canonical lc_master_menu table with the LC catalog.
--   2. New LC-brand restaurants pre-seed their menu_items by copying every row
--      with their restaurant_id (see docs/handoff/lc-onboarding-menu.md).
--   3. Per-location price deviations are UPDATEs after the copy.
--
-- Prices reflect publicly-advertised LC defaults as of 2026-05-04. Franchisees
-- can deviate up or down per location.
--
-- Idempotent. Safe to re-run; uses INSERT ... ON CONFLICT (name) DO UPDATE on
-- the master table, and OVERWRITES seeded rows (so fixing a price in this file
-- and re-running propagates to NEW restaurants going forward — existing
-- restaurants keep their per-location overrides).
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lc_master_menu (
  name TEXT PRIMARY KEY,
  price NUMERIC(7, 2) NOT NULL,
  category TEXT NOT NULL,
  size TEXT,             -- 'small'/'medium'/'large'/'detroit', NULL when n/a
  description TEXT,
  modifiers JSONB DEFAULT '[]'::jsonb,
  notes TEXT             -- internal notes for the agent (not spoken)
);

-- Service-role only — this is a master template restaurants COPY from, not a
-- per-restaurant menu themselves use directly.
ALTER TABLE public.lc_master_menu ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lc_master_menu_no_direct_access' AND tablename = 'lc_master_menu') THEN
    CREATE POLICY "lc_master_menu_no_direct_access" ON public.lc_master_menu
      FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
  END IF;
END $$;

-- ─── HOT-N-READY ──────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Hot-N-Ready Pepperoni',                  6.99,  'pizza',  'large',   'Classic round, 8 slices, ready in store'),
  ('Hot-N-Ready Cheese',                     6.99,  'pizza',  'large',   '8 slices'),
  ('Hot-N-Ready Sausage',                    6.99,  'pizza',  'large',   '8 slices'),
  ('Hot-N-Ready 5 Meat Feast',               9.99,  'pizza',  'large',   'Pepperoni, ham, bacon, beef, sausage'),
  ('Hot-N-Ready ExtraMostBestest Pepperoni', 8.99,  'pizza',  'large',   'Extra cheese, extra pepperoni'),
  ('Hot-N-Ready ExtraMostBestest Cheese',    8.99,  'pizza',  'large',   'Extra cheese'),
  ('Hot-N-Ready Detroit-Style Pepperoni',   12.99,  'pizza',  'detroit', '8-corner pan')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price, description = EXCLUDED.description;

-- ─── STUFFED CRUST ────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Stuffed Crust Pepperoni 14"',            10.99, 'pizza',  '14-inch', 'Stuffed crust, classic round'),
  ('Stuffed Crust Pepperoni 16"',            12.99, 'pizza',  '16-inch', 'Stuffed crust, classic round'),
  ('Stuffed Crust Cheese 14"',                9.99, 'pizza',  '14-inch', 'Stuffed crust, classic round'),
  ('Stuffed Crust Cheese 16"',               11.99, 'pizza',  '16-inch', 'Stuffed crust, classic round')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── DEEP DISH / DETROIT ──────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Deep Dish Pepperoni',                     8.99,  'pizza',  'medium',  'Deep dish round'),
  ('Deep Dish Cheese',                        8.99,  'pizza',  'medium',  'Deep dish round')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── SLICES-N-STIX ────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Slices-N-Stix',                           6.49,  'pizza',  null,      '4 slices of pepperoni pizza + 4 cheesy bread sticks')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── CRAZY BREAD + SAUCES ─────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Crazy Bread (8 sticks)',                  3.99,  'side',   null,      'Buttery garlic bread sticks with parmesan'),
  ('Crazy Combo (Bread + Sauce)',             4.99,  'side',   null,      '8 Crazy Bread sticks + Crazy Sauce'),
  ('Stuffed Crazy Bread',                     5.99,  'side',   null,      'Crazy Bread stuffed with mozzarella + cheddar'),
  ('Italian Cheese Bread (10 pieces)',        5.49,  'side',   null,      'Mozzarella, garlic butter, Italian seasoning'),
  ('Pepperoni Cheese Bread',                  6.49,  'side',   null,      'Italian Cheese Bread topped with pepperoni'),
  ('Crazy Sauce',                             0.59,  'side',   null,      'Marinara dipping sauce'),
  ('Buffalo Ranch',                           0.59,  'side',   null,      'Buffalo ranch dipping sauce'),
  ('Garlic White Sauce',                      0.59,  'side',   null,      'Garlic white dipping sauce')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── WINGS ────────────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Caesar Wings BBQ (8 piece)',              7.99,  'wings',  '8',       'Bone-in BBQ wings'),
  ('Caesar Wings Buffalo (8 piece)',          7.99,  'wings',  '8',       'Bone-in Buffalo wings'),
  ('Caesar Wings Garlic Parm (8 piece)',      7.99,  'wings',  '8',       'Bone-in Garlic Parmesan wings'),
  ('Caesar Wings Oven Roasted (8 piece)',     7.99,  'wings',  '8',       'Bone-in oven-roasted, no sauce'),
  ('Caesar Wings BBQ (16 piece)',            14.99,  'wings',  '16',      'Bone-in BBQ wings'),
  ('Caesar Wings Buffalo (16 piece)',        14.99,  'wings',  '16',      'Bone-in Buffalo wings'),
  ('Caesar Wings Garlic Parm (16 piece)',    14.99,  'wings',  '16',      'Bone-in Garlic Parmesan wings')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── DESSERTS ─────────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Soft Pretzel Crust Pepperoni Pizza',      8.99,  'pizza',  'large',   'Soft pretzel crust + pepperoni')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── DRINKS ───────────────────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Pepsi 2-Liter',                           3.49,  'drink',  '2L',      null),
  ('Diet Pepsi 2-Liter',                      3.49,  'drink',  '2L',      null),
  ('Mountain Dew 2-Liter',                    3.49,  'drink',  '2L',      null),
  ('Sierra Mist 2-Liter',                     3.49,  'drink',  '2L',      null),
  ('Pepsi 20oz Bottle',                       2.29,  'drink',  '20oz',    null),
  ('Diet Pepsi 20oz Bottle',                  2.29,  'drink',  '20oz',    null),
  ('Mountain Dew 20oz Bottle',                2.29,  'drink',  '20oz',    null),
  ('Aquafina Water 16.9oz',                   1.99,  'drink',  '16.9oz',  null)
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── COMBOS / FAMILY DEALS ────────────────────────────────────────────────────
INSERT INTO lc_master_menu (name, price, category, size, description) VALUES
  ('Family Meal Deal',                       19.99, 'combo',   null,      '2 large Hot-N-Ready pepperoni + Crazy Combo + 2L Pepsi'),
  ('Game Day Meal',                          24.99, 'combo',   null,      '2 large Hot-N-Ready + Italian Cheese Bread + 16-piece wings'),
  ('Single Pizza Combo',                     11.99, 'combo',   null,      '1 large Hot-N-Ready + Crazy Combo + 2L Pepsi')
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- ─── HELPER FUNCTION: bootstrap a new LC location's menu ──────────────────────
-- Usage:
--   SELECT clone_lc_master_menu_to('<restaurant_uuid>');
-- Returns count of rows copied.
-- After calling, do per-location price/availability UPDATEs for any deviations.

CREATE OR REPLACE FUNCTION public.clone_lc_master_menu_to(p_restaurant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Only run for restaurants on the little_caesars brand. Fail loud otherwise
  -- so we never accidentally seed the LC menu onto a Domino's location.
  IF NOT EXISTS (
    SELECT 1 FROM public.restaurants
     WHERE id = p_restaurant_id AND brand = 'little_caesars'
  ) THEN
    RAISE EXCEPTION 'Restaurant % is not branded little_caesars; aborting LC menu seed.', p_restaurant_id;
  END IF;

  -- Idempotent: skip rows that already exist for this restaurant by name.
  INSERT INTO public.menu_items (restaurant_id, name, price, modifiers, available)
  SELECT
    p_restaurant_id,
    m.name,
    m.price,
    m.modifiers,
    true
  FROM public.lc_master_menu m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.menu_items mi
     WHERE mi.restaurant_id = p_restaurant_id AND mi.name = m.name
  );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.clone_lc_master_menu_to(UUID) IS
  'Pre-seed an LC location''s menu_items from the lc_master_menu template. Returns count of rows copied. See docs/handoff/lc-onboarding-menu.md.';
