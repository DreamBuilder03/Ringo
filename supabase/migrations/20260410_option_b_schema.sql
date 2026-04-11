-- Migration: 20260410_option_b_schema.sql
-- Purpose: Database schema changes for Ringo Option B architecture
-- Description: Replaces N8N with Ringo-hosted API endpoints for Retell AI voice ordering
-- This migration adds support for menu items, Square integration, and extended order tracking

-- ============================================
-- 1. Add 'building' status to orders table
-- ============================================
-- Add 'building' status to the orders status enum for kitchen workflow
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('building', 'pending', 'payment_sent', 'paid', 'preparing', 'ready', 'completed', 'cancelled'));

-- ============================================
-- 2. Create menu_items table
-- ============================================
-- Stores menu items per restaurant with modifiers/options
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  modifiers JSONB DEFAULT '[]'::jsonb,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id
  ON public.menu_items(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_name
  ON public.menu_items(restaurant_id, name);

-- Enable Row Level Security
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- RLS policy: authenticated users can select items from their restaurant
CREATE POLICY "Users can view menu items from their restaurant"
  ON public.menu_items FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- RLS policy: service role can do everything (for API endpoints)
CREATE POLICY "Service role can manage all menu items"
  ON public.menu_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Add Square integration columns to restaurants
-- ============================================
-- Columns for Square POS integration and payment processing
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS square_access_token TEXT;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS square_location_id TEXT;

-- ============================================
-- 4. Ensure all required columns exist on orders table
-- ============================================
-- These columns should already exist from orders-schema.sql, but this ensures consistency
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES public.calls(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_link_sent_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pos_pushed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pos_order_id TEXT;

-- ============================================
-- 5. Add index on orders(call_id) for call lookups
-- ============================================
-- Used by tool routes to look up orders by call_id
CREATE INDEX IF NOT EXISTS idx_orders_call_id ON public.orders(call_id);

-- ============================================
-- 6. Insert sample menu items for testing
-- ============================================
-- Populates menu for "La Papa Cuisine" test restaurant
INSERT INTO public.menu_items (restaurant_id, name, category, price, description, modifiers)
SELECT r.id, item.name, item.category, item.price, item.description, item.modifiers::jsonb
FROM public.restaurants r
CROSS JOIN (VALUES
  ('Classic Burger', 'Burgers', 12.99, 'Our signature burger with lettuce, tomato, and special sauce', '[{"name":"Extra Cheese","price":1.50},{"name":"Bacon","price":2.00},{"name":"Avocado","price":1.75}]'),
  ('Chicken Wings (8pc)', 'Appetizers', 10.99, 'Crispy wings with your choice of sauce', '[{"name":"Buffalo","price":0},{"name":"BBQ","price":0},{"name":"Garlic Parmesan","price":0}]'),
  ('Caesar Salad', 'Salads', 8.99, 'Fresh romaine with caesar dressing and croutons', '[{"name":"Add Chicken","price":3.00},{"name":"Add Shrimp","price":4.50}]'),
  ('Pepperoni Pizza', 'Pizza', 14.99, 'Hand-tossed with mozzarella and pepperoni', '[{"name":"Extra Cheese","price":2.00},{"name":"Stuffed Crust","price":3.00}]'),
  ('French Fries', 'Sides', 4.99, 'Crispy golden fries', '[{"name":"Cheese Sauce","price":1.50},{"name":"Truffle Oil","price":2.00}]'),
  ('Chocolate Shake', 'Drinks', 6.99, 'Rich chocolate milkshake', '[{"name":"Whipped Cream","price":0.50},{"name":"Extra Thick","price":1.00}]')
) AS item(name, category, price, description, modifiers)
WHERE r.name ILIKE '%La Papa%'
ON CONFLICT DO NOTHING;
