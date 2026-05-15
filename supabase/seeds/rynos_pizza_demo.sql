-- =====================================================================
-- Ryno's Pizza Demo — Toast-mode demo restaurant for the May 20 demo.
-- Idempotent: re-running does not create duplicates.
--
-- Seeds:
--   1 row in public.restaurants (fixed UUID a0000000-0000-0000-0000-000000007890)
--   ~12 rows in public.menu_items (legacy fallback safety net only)
--
-- Toast configuration:
--   - pos_type='toast' routes every voice tool call through the Toast
--     adapter (src/lib/toast/toast-client.ts) instead of the menu_items
--     fallback path. While TOAST_MODE is unset or 'mock' (which it is
--     today, pending Toast partner approval), Toast calls return canned
--     mock pizza-shop data — same shape, deterministic.
--   - toast_restaurant_guid='rynos-pizza-demo-mock' tells the cache key
--     namespace which "Toast restaurant" this is. The mock client doesn't
--     use the guid for routing; it returns the same canned menu regardless.
--   - When real Toast partner approval lands and Misael sets TOAST_MODE=live
--     in Vercel, this row needs its toast_restaurant_guid updated to the
--     real Toast Restaurant GUID Toast Developer Relations issues.
--
-- Why menu_items are included even though they're unused on Toast path:
--   Defense in depth. If the Toast branch returns null (e.g. cache miss
--   under heavy load), the legacy code path falls through to menu_items
--   so the call doesn't dead-end on the caller. These are minimal
--   placeholders matching the mock Toast menu so the fallback delivers
--   a consistent experience.
--
-- Retell agent: set to NULL initially. After running this seed:
--   1. In Retell dashboard, clone the production agent
--      (agent_2a06fef4b4adf81ffd9b8a72e2) → name "Ryno's Pizza Demo"
--   2. Update this restaurant row's retell_agent_id with the new agent ID
--   3. Provision a Twilio number OR point an existing demo number at the
--      new agent via Retell's phone-number panel
--   4. Test-call → voice agent should answer as "Ryno's Pizza" and
--      respond from the Toast mock menu
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
  -- No Square fields (this is a Toast restaurant)
  square_access_token,
  square_location_id,
  -- Toast configuration
  toast_restaurant_guid,
  toast_management_group_guid,
  tax_rate,
  alerts_enabled,
  owner_user_id
) VALUES (
  'a0000000-0000-0000-0000-000000007890',
  'Ryno''s Pizza Demo',
  'Demo address — Modesto, CA',
  '+15555550100', -- Placeholder (555-0100 reserved per NANP for demo). Replace with real Twilio number once provisioned.
  'toast',
  true,
  NULL, -- Retell agent created post-seed, then update this row
  NULL,
  'en',
  NULL, NULL, NULL,
  NULL, NULL,
  'rynos-pizza-demo-mock', -- mock guid; swap to real Toast GUID when partner approval lands
  NULL,
  0.0825, -- California sales tax
  false,  -- alerts off on demo restaurant so we don't page the founder during dry-runs
  (SELECT id FROM public.profiles WHERE email = 'rodriguezriverm@gmail.com' LIMIT 1)
) ON CONFLICT (id) DO UPDATE SET
  name                       = EXCLUDED.name,
  address                    = EXCLUDED.address,
  pos_type                   = EXCLUDED.pos_type,
  pos_connected              = EXCLUDED.pos_connected,
  preferred_language         = EXCLUDED.preferred_language,
  toast_restaurant_guid      = EXCLUDED.toast_restaurant_guid,
  toast_management_group_guid = EXCLUDED.toast_management_group_guid,
  tax_rate                   = EXCLUDED.tax_rate,
  alerts_enabled             = EXCLUDED.alerts_enabled;

-- ---------------------------------------------------------------------
-- 2. Menu items (idempotent: full delete + reinsert per run)
--    Mirrors the mock Toast snapshot so any legacy-path fallback
--    delivers the same items the Toast branch would.
-- ---------------------------------------------------------------------
DELETE FROM public.menu_items WHERE restaurant_id = 'a0000000-0000-0000-0000-000000007890';

INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers, available) VALUES
  -- Pizzas (4 entries — matches the mock Toast menu)
  ('a0000000-0000-0000-0000-000000007890', 'Pepperoni Pizza (12")',  'Pizza',   14.99, 'Classic pepperoni, mozzarella, marinara', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000007890', 'Pepperoni Pizza (16")',  'Pizza',   19.99, 'Classic pepperoni, mozzarella, marinara', '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000007890', 'Cheese Pizza (12")',     'Pizza',   12.99, 'Fresh mozzarella, marinara, basil',       '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000007890', 'Supreme Pizza (16")',    'Pizza',   23.99, 'Pepperoni, sausage, peppers, onions, olives', '[]'::jsonb, true),

  -- Wings (2 entries)
  ('a0000000-0000-0000-0000-000000007890', '10pc Wings',             'Wings',   11.99, 'Choice of sauce',                                '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000007890', '20pc Wings',             'Wings',   19.99, 'Choice of sauce',                                '[]'::jsonb, true),

  -- Sides
  ('a0000000-0000-0000-0000-000000007890', 'Garlic Knots (6pc)',     'Sides',    5.99, 'Fresh-baked, brushed with garlic butter',         '[]'::jsonb, true),

  -- Dessert (cannoli is intentionally 86d to match the mock — this lets
  -- Misael test the decline path during the dry-run)
  ('a0000000-0000-0000-0000-000000007890', 'Cannoli',                'Dessert',  4.99, 'Crispy shell, sweet ricotta filling',             '[]'::jsonb, false),
  ('a0000000-0000-0000-0000-000000007890', 'Tiramisu',               'Dessert',  5.99, 'Espresso-soaked ladyfingers, mascarpone',         '[]'::jsonb, true),

  -- Drinks
  ('a0000000-0000-0000-0000-000000007890', 'Coke (20oz)',            'Drinks',   2.99, '20oz bottle',                                     '[]'::jsonb, true),
  ('a0000000-0000-0000-0000-000000007890', 'Sprite (20oz)',          'Drinks',   2.99, '20oz bottle',                                     '[]'::jsonb, true);

-- ---------------------------------------------------------------------
-- 3. store_status row (so HnR-style availability checks work too)
-- ---------------------------------------------------------------------
INSERT INTO public.store_status (
  restaurant_id,
  hnr_available,
  items_unavailable_today
) VALUES (
  'a0000000-0000-0000-0000-000000007890',
  true,
  ARRAY[]::TEXT[]
) ON CONFLICT (restaurant_id) DO UPDATE SET
  hnr_available           = EXCLUDED.hnr_available,
  items_unavailable_today = EXCLUDED.items_unavailable_today;

-- =====================================================================
-- Post-seed manual steps (Misael):
--   1. Clone the production Retell agent → "Ryno's Pizza Demo"
--   2. UPDATE this row:
--        UPDATE public.restaurants
--        SET retell_agent_id = '<new agent ID from Retell>',
--            phone           = '<+1xxxxxxxxxx Twilio number>'
--        WHERE id = 'a0000000-0000-0000-0000-000000007890';
--   3. In Retell, attach the Twilio number to the new agent
--   4. Test-call the Twilio number → voice flow should run end-to-end
--      against the mock Toast adapter
-- =====================================================================
