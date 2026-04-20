-- V9 seed patch for Sal's Brick Oven Pizzeria (restaurant_id a0000000-0000-0000-0000-000000005a15).
--
-- Applies the "one row per variation" rule to Drinks and renames Wings to match
-- the V9 Retell prompt's worked-example format ("10 Piece Wings").
--
-- Written 2026-04-20 by Brain to fix the V8 failure where "2L Coke" / "2 liter Coke"
-- did not resolve to any menu row. See ~/Desktop/Brain Agent/v9_prompt_spec.md.
--
-- Idempotent — safe to re-run. Scopes all deletes to restaurant_id +
-- category = 'Wings' or 'Drinks', so other categories are untouched.
--
-- Wings modeling: Option B from v9_prompt_spec.md — one row per COUNT,
-- flavor as $0 modifier. Memory rule "one row per variation" is satisfied
-- by count; flavor is a POS-style modifier on the line item.
--
-- Drinks modeling: Option strict one-row-per-variation (each 2L flavor
-- and each Fountain flavor is its own row). Still-waters (Pellegrino,
-- San Pellegrino flavors, bottled water) keep their existing single rows.

BEGIN;

-- ---------------------------------------------------------------
-- WINGS — replace 4 old rows with 4 renamed rows (same structure)
-- Old names: "Wings 6 piece" / "Wings 10 piece" / "Wings 20 piece" / "Wings 50 piece Party"
-- New names: "6 Piece Wings" / "10 Piece Wings" / "20 Piece Wings" / "50 Piece Party Wings"
-- ---------------------------------------------------------------

DELETE FROM public.menu_items
WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15'
  AND category = 'Wings';

INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers, available) VALUES
  ('a0000000-0000-0000-0000-000000005a15', '6 Piece Wings',  'Wings',  9.00, 'Bone-in or boneless; pick one sauce',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '10 Piece Wings', 'Wings', 14.00, 'Bone-in or boneless; pick one sauce',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '20 Piece Wings', 'Wings', 25.00, 'Bone-in or boneless; up to 2 sauces',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '50 Piece Party Wings', 'Wings', 55.00, 'Bone-in or boneless; up to 3 sauces',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true);


-- ---------------------------------------------------------------
-- DRINKS — replace 2 modifier-as-flavor rows (Fountain Drink 16oz, 2L Bottle)
-- with one row per flavor. Leave all other Drinks rows (Pellegrino 500mL,
-- San Pellegrino Aranciata/Limonata, Bottled Water) untouched.
-- ---------------------------------------------------------------

DELETE FROM public.menu_items
WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15'
  AND name IN ('Fountain Drink 16oz', '2L Bottle');

-- 2L bottles — 5 rows at $5.00 each
INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers, available) VALUES
  ('a0000000-0000-0000-0000-000000005a15', '2L Coke',        'Drinks', 5.00, '2-liter bottle',           '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '2L Diet Coke',   'Drinks', 5.00, '2-liter bottle',           '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '2L Sprite',      'Drinks', 5.00, '2-liter bottle',           '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '2L Dr Pepper',   'Drinks', 5.00, '2-liter bottle',           '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '2L Root Beer',   'Drinks', 5.00, '2-liter bottle',           '[]'::jsonb, true);

-- Fountain 16oz — 7 rows at $3.00 each
INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers, available) VALUES
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Coke 16oz',       'Drinks', 3.00, 'Fountain soda',  '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Diet Coke 16oz',  'Drinks', 3.00, 'Fountain soda',  '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Sprite 16oz',     'Drinks', 3.00, 'Fountain soda',  '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Dr Pepper 16oz',  'Drinks', 3.00, 'Fountain soda',  '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Root Beer 16oz',  'Drinks', 3.00, 'Fountain soda',  '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Lemonade 16oz',   'Drinks', 3.00, 'Fountain drink', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Iced Tea 16oz',   'Drinks', 3.00, 'Fountain drink', '[]'::jsonb, true);

COMMIT;

-- Post-run verification (manual):
--   SELECT name, price FROM public.menu_items
--    WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15'
--      AND category IN ('Wings','Drinks')
--    ORDER BY category, price DESC, name;
--
-- Expected: 4 Wings rows + 16 Drinks rows (5 2L + 7 Fountain + 4 still waters = 16).
