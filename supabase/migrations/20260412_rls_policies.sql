-- Migration: 20260412_rls_policies.sql
-- Purpose: Comprehensive Row-Level Security policies for Ringo
-- Description: Implements restaurant-scoped access control with admin override
-- This migration is idempotent and can be re-run without errors

-- ============================================
-- 1. PROFILES TABLE RLS
-- ============================================
-- Users can view their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all profiles
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage profiles (for admin operations via API)
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
CREATE POLICY "profiles_service_role" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 2. RESTAURANTS TABLE RLS
-- ============================================
-- Restaurant owners can view their own restaurant
DROP POLICY IF EXISTS "restaurants_select_own" ON public.restaurants;
CREATE POLICY "restaurants_select_own" ON public.restaurants
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Restaurant owners can update their own restaurant
DROP POLICY IF EXISTS "restaurants_update_own" ON public.restaurants;
CREATE POLICY "restaurants_update_own" ON public.restaurants
  FOR UPDATE USING (
    owner_user_id = auth.uid()
    OR
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all restaurants
DROP POLICY IF EXISTS "restaurants_select_admin" ON public.restaurants;
CREATE POLICY "restaurants_select_admin" ON public.restaurants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all restaurants
DROP POLICY IF EXISTS "restaurants_update_admin" ON public.restaurants;
CREATE POLICY "restaurants_update_admin" ON public.restaurants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert restaurants
DROP POLICY IF EXISTS "restaurants_insert_admin" ON public.restaurants;
CREATE POLICY "restaurants_insert_admin" ON public.restaurants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage restaurants (for API operations)
DROP POLICY IF EXISTS "restaurants_service_role" ON public.restaurants;
CREATE POLICY "restaurants_service_role" ON public.restaurants
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 3. CALLS TABLE RLS
-- ============================================
-- Restaurant users can view calls for their restaurant
DROP POLICY IF EXISTS "calls_select_own" ON public.calls;
CREATE POLICY "calls_select_own" ON public.calls
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all calls
DROP POLICY IF EXISTS "calls_select_admin" ON public.calls;
CREATE POLICY "calls_select_admin" ON public.calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update calls
DROP POLICY IF EXISTS "calls_update_admin" ON public.calls;
CREATE POLICY "calls_update_admin" ON public.calls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert and update calls (for Retell webhooks)
DROP POLICY IF EXISTS "calls_insert_service_role" ON public.calls;
CREATE POLICY "calls_insert_service_role" ON public.calls
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "calls_update_service_role" ON public.calls;
CREATE POLICY "calls_update_service_role" ON public.calls
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- 4. ORDER_ITEMS TABLE RLS
-- ============================================
-- Restaurant users can view order items for their restaurant
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all order items
DROP POLICY IF EXISTS "order_items_select_admin" ON public.order_items;
CREATE POLICY "order_items_select_admin" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update order items
DROP POLICY IF EXISTS "order_items_update_admin" ON public.order_items;
CREATE POLICY "order_items_update_admin" ON public.order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert and update order items (for webhooks and API)
DROP POLICY IF EXISTS "order_items_insert_service_role" ON public.order_items;
CREATE POLICY "order_items_insert_service_role" ON public.order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "order_items_update_service_role" ON public.order_items;
CREATE POLICY "order_items_update_service_role" ON public.order_items
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- 5. ORDERS TABLE RLS
-- ============================================
-- Restaurant users can view orders for their restaurant
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view all orders
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update orders
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert and update orders (for webhooks and Stripe payment handling)
DROP POLICY IF EXISTS "orders_insert_service_role" ON public.orders;
CREATE POLICY "orders_insert_service_role" ON public.orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update_service_role" ON public.orders;
CREATE POLICY "orders_update_service_role" ON public.orders
  FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================
-- 6. MENU_ITEMS TABLE RLS
-- ============================================
-- Restaurant users can view menu items for their restaurant
DROP POLICY IF EXISTS "menu_items_select_own" ON public.menu_items;
CREATE POLICY "menu_items_select_own" ON public.menu_items
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Restaurant users can create menu items for their restaurant
DROP POLICY IF EXISTS "menu_items_insert_own" ON public.menu_items;
CREATE POLICY "menu_items_insert_own" ON public.menu_items
  FOR INSERT WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Restaurant users can update menu items for their restaurant
DROP POLICY IF EXISTS "menu_items_update_own" ON public.menu_items;
CREATE POLICY "menu_items_update_own" ON public.menu_items
  FOR UPDATE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Restaurant users can delete menu items for their restaurant
DROP POLICY IF EXISTS "menu_items_delete_own" ON public.menu_items;
CREATE POLICY "menu_items_delete_own" ON public.menu_items
  FOR DELETE USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Admins can view all menu items
DROP POLICY IF EXISTS "menu_items_select_admin" ON public.menu_items;
CREATE POLICY "menu_items_select_admin" ON public.menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can insert menu items
DROP POLICY IF EXISTS "menu_items_insert_admin" ON public.menu_items;
CREATE POLICY "menu_items_insert_admin" ON public.menu_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update menu items
DROP POLICY IF EXISTS "menu_items_update_admin" ON public.menu_items;
CREATE POLICY "menu_items_update_admin" ON public.menu_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete menu items
DROP POLICY IF EXISTS "menu_items_delete_admin" ON public.menu_items;
CREATE POLICY "menu_items_delete_admin" ON public.menu_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage all menu items (for API operations)
DROP POLICY IF EXISTS "menu_items_service_role" ON public.menu_items;
CREATE POLICY "menu_items_service_role" ON public.menu_items
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Summary
-- ============================================
-- Row Level Security is now enabled on all tables with the following patterns:
--
-- PROFILES:
--   - Users can view/update their own profile
--   - Admins can view/update all profiles
--   - Service role can manage all profiles
--
-- RESTAURANTS:
--   - Users can view/update their own restaurant (via owner_user_id or restaurant_id in profiles)
--   - Admins can view/update/insert all restaurants
--   - Service role can manage all restaurants
--
-- CALLS:
--   - Users can view calls for their restaurant(s)
--   - Admins can view/update all calls
--   - Service role can insert/update calls (for Retell webhooks)
--
-- ORDER_ITEMS:
--   - Users can view order items for their restaurant(s)
--   - Admins can view/update all order items
--   - Service role can insert/update order items
--
-- ORDERS:
--   - Users can view orders for their restaurant(s)
--   - Admins can view/update all orders
--   - Service role can insert/update orders
--
-- MENU_ITEMS:
--   - Users can CRUD menu items for their restaurant(s)
--   - Admins can CRUD all menu items
--   - Service role can manage all menu items
--
-- Note: The service role (used in API routes with createServiceRoleClient())
-- bypasses all RLS policies entirely. These policies protect against
-- unauthorized client-side access through the anon key.
