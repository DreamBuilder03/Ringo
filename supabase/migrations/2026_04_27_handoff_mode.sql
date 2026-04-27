-- ──────────────────────────────────────────────────────────────────────────────
-- Handoff Mode — Build 1 of LC franchisee pre-pilot prep.
--
-- Adds two things:
--   1. restaurants.pos_mode — branch the post-payment flow between the
--      existing direct_api behavior (Square/Toast/Clover/SpotOn push) and
--      the new handoff_tablet behavior (write to handoff_orders for staff
--      to transcribe into a proprietary POS like Caesar Vision Cloud).
--   2. handoff_orders — table backing the /handoff tablet view. One row per
--      paid order awaiting staff acknowledgment. Realtime-enabled so the
--      tablet UI subscribes via Supabase Realtime.
--
-- This migration is idempotent: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT
-- EXISTS, CREATE POLICY IF NOT EXISTS guarded by DO blocks where Postgres
-- doesn't support IF NOT EXISTS for policies natively.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. restaurants.pos_mode ─────────────────────────────────────────────────
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS pos_mode TEXT NOT NULL DEFAULT 'direct_api'
  CHECK (pos_mode IN ('direct_api', 'handoff_tablet'));

COMMENT ON COLUMN public.restaurants.pos_mode IS
  'Branch the post-payment flow. direct_api = push order ticket directly to a connected POS (Square/Toast/Clover/SpotOn). handoff_tablet = write to handoff_orders for staff to transcribe into a proprietary POS (Caesar Vision Cloud, Domino Pulse, Pizza Hut Brink, etc.). Default direct_api preserves legacy behavior.';

-- ─── 2. handoff_orders table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.handoff_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Snapshot of order data for the tablet. Denormalized so tablet UI doesn't
  -- need to JOIN on every realtime update.
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  eta_minutes INTEGER CHECK (eta_minutes IS NULL OR (eta_minutes >= 0 AND eta_minutes <= 180)),
  notes TEXT,

  -- Lifecycle timestamps
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per order. If the same order is paid twice (shouldn't happen but
  -- defends against webhook double-fire), the second insert is a no-op.
  UNIQUE (order_id)
);

COMMENT ON TABLE public.handoff_orders IS
  'Realtime queue of paid orders waiting for staff to transcribe into a proprietary POS. Backs the /handoff tablet view. One row per order. Supabase Realtime is enabled so tablets receive INSERT events live.';

-- Index on the tablet hot-path query: open orders for a restaurant, oldest first.
CREATE INDEX IF NOT EXISTS handoff_orders_open_idx
  ON public.handoff_orders (restaurant_id, paid_at)
  WHERE completed_at IS NULL;

-- ─── 3. Enable Realtime on handoff_orders ────────────────────────────────────
-- Supabase Realtime fires INSERT/UPDATE/DELETE events to subscribers.
-- The tablet UI uses .channel('handoff:<restaurant_id>') with a filter.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'handoff_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.handoff_orders;
  END IF;
END $$;

-- ─── 4. RLS policies on handoff_orders ───────────────────────────────────────
ALTER TABLE public.handoff_orders ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default — no explicit policy needed for the
-- post-payment Square webhook to INSERT (it uses createServiceRoleClient()).

-- Read: any user whose profiles row is scoped to this restaurant + admins.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_orders_read' AND tablename = 'handoff_orders') THEN
    CREATE POLICY "handoff_orders_read" ON public.handoff_orders
      FOR SELECT
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Update: same scope (staff marking complete).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_orders_update_complete' AND tablename = 'handoff_orders') THEN
    CREATE POLICY "handoff_orders_update_complete" ON public.handoff_orders
      FOR UPDATE
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Insert: service-role only (post-payment writes). authenticated/anon blocked.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_orders_insert_service_only' AND tablename = 'handoff_orders') THEN
    CREATE POLICY "handoff_orders_insert_service_only" ON public.handoff_orders
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (false);
  END IF;
END $$;

-- Delete: blocked entirely. Use completed_at to dismiss.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_orders_no_delete' AND tablename = 'handoff_orders') THEN
    CREATE POLICY "handoff_orders_no_delete" ON public.handoff_orders
      FOR DELETE
      TO authenticated, anon
      USING (false);
  END IF;
END $$;
