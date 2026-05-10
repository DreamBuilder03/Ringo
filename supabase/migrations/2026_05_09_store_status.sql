-- ──────────────────────────────────────────────────────────────────────────────
-- store_status — Per-restaurant real-time availability flags.
--
-- CLOSES Multi-Test scenario 28 (Category 4 — LC-specific):
--   Today, OMRI confidently confirms Hot-N-Ready availability at peak dinner
--   rush even when the store has zero ready. This is a customer-facing false
--   promise on LC's flagship item.
--
-- DESIGN:
--   One row per restaurant (PK = restaurant_id). Boolean flags + a free-form
--   list of unavailable items for the day (admin types item names; agent
--   declines them).
--
-- WHO WRITES THIS:
--   - Staff via the admin dashboard (Phase 2 — UI not built tonight; SQL works
--     via Supabase dashboard for first LC pilot)
--   - Future: kitchen tablet "out of HnR" button → POST /api/store-status
--
-- WHO READS THIS:
--   - lookup_item route (cached via restaurant-cache.ts? — NO. This is real-
--     time availability; we do NOT cache it. Direct Supabase read on every
--     check. The cost is one extra read per lookup_item call; a small price
--     to pay for not lying to callers.)
--
-- STALENESS GUARDRAIL:
--   hnr_updated_at TIMESTAMPTZ — if older than 1 hour, treat as unknown and
--   default to TRUE (assume available). Prevents a stale "off" flag from
--   shutting down orders for the rest of the day if staff forgets to flip
--   it back on.
--
-- Idempotent.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.store_status (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- LC-specific. true = Hot-N-Ready stock available; false = sold out for now
  hnr_available BOOLEAN NOT NULL DEFAULT true,
  hnr_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Free-form list of menu_item names unavailable today. Admin types them in
  -- exactly as they appear in menu_items.name. lookup_item case-insensitive
  -- match-out before returning the item.
  --
  -- Examples: ARRAY['Crazy Combo (Bread + Sauce)', 'Caesar Wings BBQ (16 piece)']
  items_unavailable_today TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  items_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Optional: estimated wait time in minutes, displayed by agent on order
  -- confirmation. Default null = use the restaurant's standard ETA.
  current_wait_minutes INTEGER CHECK (current_wait_minutes IS NULL OR (current_wait_minutes BETWEEN 0 AND 180)),

  -- Forensic
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.store_status IS
  'Real-time availability flags per restaurant. Read by lookup_item to prevent confirming items the store has run out of. Closes Multi-Test scenario 28 (LC HnR availability false promise).';

COMMENT ON COLUMN public.store_status.hnr_available IS
  'Hot-N-Ready availability. Default true. Set false when the kitchen runs out. Stale > 1 hour → treated as unknown, defaults back to true (prevents forgotten flag from killing orders all day).';

COMMENT ON COLUMN public.store_status.items_unavailable_today IS
  'Item names (matching menu_items.name exactly) that are sold out for today. Case-insensitive match in lookup_item.';

-- Index for the hot path: lookup_item reads this on every call
CREATE INDEX IF NOT EXISTS store_status_updated_idx
  ON public.store_status (restaurant_id, hnr_updated_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.store_status ENABLE ROW LEVEL SECURITY;

-- Read: restaurant owner + admins can see status; service role bypasses.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'store_status_read_own' AND tablename = 'store_status') THEN
    CREATE POLICY "store_status_read_own" ON public.store_status
      FOR SELECT
      TO authenticated
      USING (
        restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Update: same scope. Owner toggles availability from their dashboard.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'store_status_update_own' AND tablename = 'store_status') THEN
    CREATE POLICY "store_status_update_own" ON public.store_status
      FOR UPDATE
      TO authenticated
      USING (
        restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Insert: same scope (owner creates their store_status row when setting it for the first time).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'store_status_insert_own' AND tablename = 'store_status') THEN
    CREATE POLICY "store_status_insert_own" ON public.store_status
      FOR INSERT
      TO authenticated
      WITH CHECK (
        restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Delete: blocked. We don't delete history; UPDATE the booleans instead.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'store_status_no_delete' AND tablename = 'store_status') THEN
    CREATE POLICY "store_status_no_delete" ON public.store_status
      FOR DELETE
      TO authenticated, anon
      USING (false);
  END IF;
END $$;
