-- =====================================================================
-- Sal's Brick Oven Pizzeria — Modesto demo restaurant.
-- Idempotent: re-running does not create duplicates.
--
-- Seeds:
--   1 row in public.restaurants (fixed UUID a0000000-0000-0000-0000-000000005a15)
--   85 rows in public.menu_items across 10 categories
--
-- Square credentials below are SANDBOX only — they are tied to the
-- "OMRI — Sal's Demo" Square Developer sandbox app. No real money.
-- Swap to production credentials when the first paying client onboards.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Restaurant row
-- ---------------------------------------------------------------------
INSERT INTO public.restaurants (
  id,
  name,
  address,
  phone,
  pos_type,
  pos_connected,
  retell_agent_id,
  retell_agent_id_es,
  preferred_language,
  stripe_subscription_id,
  stripe_customer_id,
  plan_tier,
  square_access_token,
  square_location_id,
  tax_rate,
  owner_user_id
) VALUES (
  'a0000000-0000-0000-0000-000000005a15',
  'Sal''s Brick Oven Pizzeria',
  '1847 McHenry Ave, Modesto, CA 95350',
  '+12097393549',
  'square',
  true,
  'agent_2a06fef4b4adf81ffd9b8a72e2',
  NULL,
  'en',
  NULL, NULL, NULL,
  'EAAAl0bTmb0bNJzu7uGTlBenSqFmXA-LIXT5hhGhla0mM2SYUnxs68uXKPNvoOYY',
  'LK2EBHPA1Q6GC',
  0.0875,
  (SELECT id FROM public.profiles WHERE email = 'rodriguezriverm@gmail.com' LIMIT 1)
) ON CONFLICT (id) DO UPDATE SET
  name                  = EXCLUDED.name,
  address               = EXCLUDED.address,
  phone                 = EXCLUDED.phone,
  pos_type              = EXCLUDED.pos_type,
  pos_connected         = EXCLUDED.pos_connected,
  retell_agent_id       = EXCLUDED.retell_agent_id,
  square_access_token   = EXCLUDED.square_access_token,
  square_location_id    = EXCLUDED.square_location_id,
  tax_rate              = EXCLUDED.tax_rate;

-- ---------------------------------------------------------------------
-- 2. Menu items (idempotent: full delete + reinsert per run)
-- ---------------------------------------------------------------------
DELETE FROM public.menu_items WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15';

INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers, available) VALUES

  ---------------------------------------------------------------
  -- SIGNATURE PIZZAS (32 rows: 8 pizzas x 4 sizes)
  -- Sizes: 10" / 14" / 18" / 24"
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'The Don 10-inch',                   'Signature Pizza', 14.00, 'San Marzano, fresh mozz, basil, olive oil, sea salt', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'The Don 14-inch',                   'Signature Pizza', 18.00, 'San Marzano, fresh mozz, basil, olive oil, sea salt', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'The Don 18-inch',                   'Signature Pizza', 24.00, 'San Marzano, fresh mozz, basil, olive oil, sea salt', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'The Don 24-inch',                   'Signature Pizza', 36.00, 'San Marzano, fresh mozz, basil, olive oil, sea salt', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'Nonna''s Pepperoni 10-inch',         'Signature Pizza', 15.00, 'Double pepperoni, mozz, oregano, parm', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Nonna''s Pepperoni 14-inch',         'Signature Pizza', 19.00, 'Double pepperoni, mozz, oregano, parm', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Nonna''s Pepperoni 18-inch',         'Signature Pizza', 26.00, 'Double pepperoni, mozz, oregano, parm', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Nonna''s Pepperoni 24-inch',         'Signature Pizza', 38.00, 'Double pepperoni, mozz, oregano, parm', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'Wood-Fired Supreme 10-inch',         'Signature Pizza', 17.00, 'Pepperoni, sausage, mushroom, bell pepper, red onion, black olive', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wood-Fired Supreme 14-inch',         'Signature Pizza', 22.00, 'Pepperoni, sausage, mushroom, bell pepper, red onion, black olive', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wood-Fired Supreme 18-inch',         'Signature Pizza', 29.00, 'Pepperoni, sausage, mushroom, bell pepper, red onion, black olive', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wood-Fired Supreme 24-inch',         'Signature Pizza', 42.00, 'Pepperoni, sausage, mushroom, bell pepper, red onion, black olive', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'Sal''s Meat Mountain 10-inch',       'Signature Pizza', 18.00, 'Pepperoni, sausage, ham, bacon, meatball', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Sal''s Meat Mountain 14-inch',       'Signature Pizza', 23.00, 'Pepperoni, sausage, ham, bacon, meatball', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Sal''s Meat Mountain 18-inch',       'Signature Pizza', 30.00, 'Pepperoni, sausage, ham, bacon, meatball', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Sal''s Meat Mountain 24-inch',       'Signature Pizza', 44.00, 'Pepperoni, sausage, ham, bacon, meatball', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'Hot Honey Soppressata 10-inch',      'Signature Pizza', 17.00, 'Spicy soppressata, fresh mozz, hot honey, chili flake', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Hot Honey Soppressata 14-inch',      'Signature Pizza', 22.00, 'Spicy soppressata, fresh mozz, hot honey, chili flake', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Hot Honey Soppressata 18-inch',      'Signature Pizza', 28.00, 'Spicy soppressata, fresh mozz, hot honey, chili flake', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Hot Honey Soppressata 24-inch',      'Signature Pizza', 40.00, 'Spicy soppressata, fresh mozz, hot honey, chili flake', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'Garden Harvest 10-inch',             'Signature Pizza', 16.00, 'Mushroom, spinach, red onion, bell pepper, tomato, olive, fresh mozz', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Garden Harvest 14-inch',             'Signature Pizza', 20.00, 'Mushroom, spinach, red onion, bell pepper, tomato, olive, fresh mozz', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Garden Harvest 18-inch',             'Signature Pizza', 27.00, 'Mushroom, spinach, red onion, bell pepper, tomato, olive, fresh mozz', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Garden Harvest 24-inch',             'Signature Pizza', 40.00, 'Mushroom, spinach, red onion, bell pepper, tomato, olive, fresh mozz', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'BBQ Chicken Ranch 10-inch',          'Signature Pizza', 17.00, 'Grilled chicken, red onion, BBQ base, ranch drizzle, cilantro', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'BBQ Chicken Ranch 14-inch',          'Signature Pizza', 21.00, 'Grilled chicken, red onion, BBQ base, ranch drizzle, cilantro', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'BBQ Chicken Ranch 18-inch',          'Signature Pizza', 28.00, 'Grilled chicken, red onion, BBQ base, ranch drizzle, cilantro', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'BBQ Chicken Ranch 24-inch',          'Signature Pizza', 41.00, 'Grilled chicken, red onion, BBQ base, ranch drizzle, cilantro', '[]'::jsonb, true),

  ('a0000000-0000-0000-0000-000000005a15', 'White Truffle 10-inch',              'Signature Pizza', 18.00, 'Mozz, ricotta, garlic, caramelized onion, truffle oil, arugula', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'White Truffle 14-inch',              'Signature Pizza', 23.00, 'Mozz, ricotta, garlic, caramelized onion, truffle oil, arugula', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'White Truffle 18-inch',              'Signature Pizza', 30.00, 'Mozz, ricotta, garlic, caramelized onion, truffle oil, arugula', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'White Truffle 24-inch',              'Signature Pizza', 44.00, 'Mozz, ricotta, garlic, caramelized onion, truffle oil, arugula', '[]'::jsonb, true),

  ---------------------------------------------------------------
  -- BUILD-YOUR-OWN (4 base rows: 10/14/18/24 inch)
  -- Topping prices differ per size; modifiers encode that per row.
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Cheese Pizza 10-inch', 'Build Your Own', 10.00, 'Base cheese pizza; toppings at $1.50 each, premium toppings +$1',
   '[{"name":"GF crust","price":3},{"name":"Extra cheese","price":2},{"name":"Vegan mozz","price":3},{"name":"Topping (meat or veg)","price":1.50},{"name":"Premium topping","price":2.50}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Cheese Pizza 14-inch', 'Build Your Own', 13.00, 'Base cheese pizza; toppings at $2 each, premium toppings +$1',
   '[{"name":"GF crust","price":3},{"name":"Extra cheese","price":2},{"name":"Vegan mozz","price":3},{"name":"Topping (meat or veg)","price":2},{"name":"Premium topping","price":3}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Cheese Pizza 18-inch', 'Build Your Own', 17.00, 'Base cheese pizza; toppings at $2.50 each, premium toppings +$1',
   '[{"name":"GF crust","price":3},{"name":"Extra cheese","price":2},{"name":"Vegan mozz","price":3},{"name":"Topping (meat or veg)","price":2.50},{"name":"Premium topping","price":3.50}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Cheese Pizza 24-inch', 'Build Your Own', 26.00, 'Base cheese pizza; toppings at $3.50 each, premium toppings +$1',
   '[{"name":"GF crust","price":3},{"name":"Extra cheese","price":2},{"name":"Vegan mozz","price":3},{"name":"Topping (meat or veg)","price":3.50},{"name":"Premium topping","price":4.50}]'::jsonb, true),

  ---------------------------------------------------------------
  -- WINGS (4 rows: 6/10/20/50 piece)
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Wings 6 piece',  'Wings',  9.00, 'Bone-in or boneless; pick one sauce',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wings 10 piece', 'Wings', 14.00, 'Bone-in or boneless; pick one sauce',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wings 20 piece', 'Wings', 25.00, 'Bone-in or boneless; up to 2 sauces',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Wings 50 piece Party', 'Wings', 55.00, 'Bone-in or boneless; up to 3 sauces',
   '[{"name":"Buffalo mild","price":0},{"name":"Buffalo medium","price":0},{"name":"Buffalo hot","price":0},{"name":"Buffalo nuclear","price":0},{"name":"Lemon Pepper Dry Rub","price":0},{"name":"BBQ","price":0},{"name":"Honey Garlic","price":0},{"name":"Sal''s Hot Honey","price":0},{"name":"Garlic Parmesan","price":0},{"name":"Extra ranch","price":0.75},{"name":"Extra blue cheese","price":0.75},{"name":"Celery & carrot","price":2}]'::jsonb, true),

  ---------------------------------------------------------------
  -- PASTA (includes garlic bread)
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Spaghetti & Meatballs', 'Pasta', 15.00, 'Includes garlic bread',
   '[{"name":"Add chicken","price":4},{"name":"Add 2 meatballs","price":4},{"name":"GF pasta","price":3}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fettuccine Alfredo',    'Pasta', 14.00, 'Includes garlic bread',
   '[{"name":"Add chicken","price":4},{"name":"Add 2 meatballs","price":4},{"name":"GF pasta","price":3}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Chicken Parm over Penne', 'Pasta', 18.00, 'Includes garlic bread',
   '[{"name":"GF pasta","price":3}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Eggplant Parm over Penne', 'Pasta', 17.00, 'Includes garlic bread',
   '[{"name":"GF pasta","price":3}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Baked Ziti',            'Pasta', 14.00, 'Includes garlic bread',
   '[{"name":"Add chicken","price":4},{"name":"Add 2 meatballs","price":4},{"name":"GF pasta","price":3}]'::jsonb, true),

  ---------------------------------------------------------------
  -- SUBS (12 rows: 6 sandwiches x 2 sizes, 8" and 12")
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Italian Sub 8-inch',           'Subs', 11.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Italian Sub 12-inch',          'Subs', 15.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Meatball Parm Sub 8-inch',     'Subs', 11.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Meatball Parm Sub 12-inch',    'Subs', 15.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Chicken Parm Sub 8-inch',      'Subs', 12.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Chicken Parm Sub 12-inch',     'Subs', 16.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Eggplant Parm Sub 8-inch',     'Subs', 11.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Eggplant Parm Sub 12-inch',    'Subs', 15.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Sausage & Peppers Sub 8-inch', 'Subs', 12.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Sausage & Peppers Sub 12-inch','Subs', 16.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Philly Cheesesteak Sub 8-inch','Subs', 13.00, 'Hot Italian roll', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Philly Cheesesteak Sub 12-inch','Subs', 17.00, 'Hot Italian roll', '[]'::jsonb, true),

  ---------------------------------------------------------------
  -- SALADS (8 rows: 4 salads x 2 sizes, small/large)
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Caesar Salad Small',    'Salads',  8.00, 'Romaine, parm, croutons, caesar',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Caesar Salad Large',    'Salads', 12.00, 'Romaine, parm, croutons, caesar',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'House Salad Small',     'Salads',  8.00, 'Mixed greens, tomato, onion, cucumber, vinaigrette',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'House Salad Large',     'Salads', 12.00, 'Mixed greens, tomato, onion, cucumber, vinaigrette',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Antipasto Salad Small', 'Salads', 11.00, 'Cured meats, cheeses, olives, pepperoncini, greens',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Antipasto Salad Large', 'Salads', 15.00, 'Cured meats, cheeses, olives, pepperoncini, greens',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Caprese Salad Small',   'Salads', 10.00, 'Tomato, fresh mozz, basil, olive oil, balsamic',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Caprese Salad Large',   'Salads', 14.00, 'Tomato, fresh mozz, basil, olive oil, balsamic',
   '[{"name":"Add grilled chicken","price":4}]'::jsonb, true),

  ---------------------------------------------------------------
  -- SIDES
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Garlic Bread 6 piece',              'Sides',  5.00, 'Six-piece',               '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Garlic Bread with Cheese',          'Sides',  7.00, 'Six-piece with mozz',    '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Cheese Sticks 8 piece',             'Sides',  9.00, 'Eight mozzarella sticks', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Fried Calamari',                    'Sides', 13.00, 'Marinara',                '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Bruschetta 4 piece',                'Sides',  9.00, 'Tomato, basil, olive oil','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Meatballs with Marinara (4)',       'Sides', 10.00, 'Four meatballs, marinara','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Extra Sauce',                       'Sides',  0.75, 'Marinara, ranch, or blue cheese','[]'::jsonb, true),

  ---------------------------------------------------------------
  -- DESSERTS
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'NY Cheesecake',       'Desserts', 7.00, 'Classic New York style',     '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Tiramisu',            'Desserts', 8.00, 'Espresso, mascarpone, cocoa','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Cannoli (2 piece)',   'Desserts', 7.00, 'Ricotta-filled, chocolate dipped','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Brownie Sundae',      'Desserts', 9.00, 'Brownie, vanilla ice cream, chocolate sauce','[]'::jsonb, true),

  ---------------------------------------------------------------
  -- DRINKS
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Fountain Drink 16oz',             'Drinks', 3.00, 'Coke, Diet Coke, Sprite, Dr Pepper, Root Beer, Lemonade, or Iced Tea',
   '[{"name":"Coke","price":0},{"name":"Diet Coke","price":0},{"name":"Sprite","price":0},{"name":"Dr Pepper","price":0},{"name":"Root Beer","price":0},{"name":"Lemonade","price":0},{"name":"Iced Tea","price":0}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', '2L Bottle',                       'Drinks', 5.00, 'Coke, Diet Coke, Sprite, Dr Pepper, or Root Beer',
   '[{"name":"Coke","price":0},{"name":"Diet Coke","price":0},{"name":"Sprite","price":0},{"name":"Dr Pepper","price":0},{"name":"Root Beer","price":0}]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Pellegrino 500mL',                'Drinks', 4.00, 'Sparkling mineral water','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'San Pellegrino Aranciata',        'Drinks', 4.00, 'Italian blood-orange soda','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'San Pellegrino Limonata',         'Drinks', 4.00, 'Italian lemon soda','[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Bottled Water',                   'Drinks', 2.00, '16oz','[]'::jsonb, true),

  ---------------------------------------------------------------
  -- COMBOS
  ---------------------------------------------------------------
  ('a0000000-0000-0000-0000-000000005a15', 'Combo A - Family Feast',    'Combos', 42.99, '18-inch signature pizza + 10 wings + garlic bread + 2L soda', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Combo B - Pizza + Wings',   'Combos', 24.99, '14-inch signature pizza + 6 wings + 2 fountain drinks',        '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Combo C - Weekday Lunch',   'Combos', 13.99, '8-inch sub + small salad + fountain drink (Mon-Fri 11am-2pm)', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000005a15', 'Combo D - Date Night',      'Combos', 34.99, '14-inch signature pizza + caprese salad + 2 cannoli + 2 fountain drinks', '[]'::jsonb, true);

-- ---------------------------------------------------------------------
-- 3. Verification queries (run manually after seed)
-- ---------------------------------------------------------------------
-- SELECT id, name, retell_agent_id FROM public.restaurants WHERE phone = '+12097393549';
-- SELECT count(*) FROM public.menu_items WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15';  -- expect 85
-- SELECT name, price FROM public.menu_items WHERE restaurant_id = 'a0000000-0000-0000-0000-000000005a15' AND name ILIKE '%Nonna%18%';
