-- Orders table for pay-before-prep flow
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) NOT NULL,
  call_id UUID REFERENCES public.calls(id),
  customer_phone TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'payment_sent', 'paid', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_intent_id TEXT,
  payment_link_sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  pos_order_id TEXT,
  pos_pushed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_call ON public.orders(call_id);

-- RLS policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Restaurant owners can view their orders
CREATE POLICY "Restaurant owners can view their orders"
  ON public.orders FOR SELECT
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
    )
  );

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert/update orders (for webhooks and API)
CREATE POLICY "Service role can manage orders"
  ON public.orders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Public can view their own order by ID (for payment page - no auth required)
-- This is handled by the service role client in the API, not RLS
