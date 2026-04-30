-- ──────────────────────────────────────────────────────────────────────────────
-- Confidence-based human handoff — C-4 of the AI smarter arc.
--
-- When the agent isn't sure it can handle a call (menu confusion, allergy,
-- complaint, refund, caller asks for a manager, repeated tool failures), it
-- calls /api/tools/request-handoff. That route inserts a row here and pages
-- the founder/owner via the existing alerts.ts SMS+email pipeline, so the
-- restaurant can call the customer back.
--
-- The agent's spoken response on success: "Got it — I'll have someone reach
-- out to you in a few minutes." Caller is never stranded.
--
-- Idempotent. RLS-locked: service-role writes; restaurant owner reads their
-- own rows.
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.handoff_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Restaurant scope. CASCADE so deleting a restaurant cleans up its history.
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Retell call_id at the time of escalation. Not an FK — the calls row may
  -- not exist yet if the agent escalates very early in the conversation.
  retell_call_id TEXT,

  -- Caller's number — useful for callback even if the calls row never lands.
  from_number TEXT,

  -- Categorical reason. Drives downstream UX (e.g., owner dashboard filters,
  -- which staff member to alert). Free-form 'other' allowed for cases the
  -- taxonomy doesn't cover yet — write what fits in summary.
  reason TEXT NOT NULL CHECK (reason IN (
    'menu_confusion',       -- repeated lookup_item failures, can't disambiguate
    'allergy_request',      -- caller mentions allergy / dietary restriction
    'complaint',            -- caller is upset about food, service, prior order
    'refund_request',       -- caller wants money back
    'caller_request',       -- caller explicitly asked to speak to a person
    'large_order',          -- catering / unusually large quantity
    'agent_uncertainty',    -- agent's own confidence flag
    'other'
  )),

  -- One-line agent-written summary (max 500 chars by app-side check). Goes
  -- into the SMS/email body so the owner can decide whether to call back now.
  summary TEXT NOT NULL,

  -- Optional: agent self-rated confidence 0..1 (Retell exposes this through
  -- the LLM's tool-call shape on some models). NULL when not provided.
  agent_uncertainty_score NUMERIC(3, 2)
    CHECK (agent_uncertainty_score IS NULL OR (agent_uncertainty_score >= 0 AND agent_uncertainty_score <= 1)),

  -- Resolution lifecycle. Owner marks via dashboard (Phase 2) or via SQL.
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.handoff_requests IS
  'Agent escalation events. Inserted by /api/tools/request-handoff. The route also fires an SMS+email pager via src/lib/alerts.ts. See docs/handoff/agent-escalation.md.';

-- Hot path: owner dashboard "show me unresolved handoffs for my restaurant".
CREATE INDEX IF NOT EXISTS handoff_requests_restaurant_unresolved_idx
  ON public.handoff_requests (restaurant_id, created_at DESC)
  WHERE resolved_at IS NULL;

-- Recent-list query (admin /admin/health page would surface across all).
CREATE INDEX IF NOT EXISTS handoff_requests_created_idx
  ON public.handoff_requests (created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.handoff_requests ENABLE ROW LEVEL SECURITY;

-- Read: restaurant's own users (and admins). Mirrors the calls/orders pattern.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_requests_read_own' AND tablename = 'handoff_requests') THEN
    CREATE POLICY "handoff_requests_read_own" ON public.handoff_requests
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

-- Update (mark resolved): same scope as read.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_requests_update_resolved' AND tablename = 'handoff_requests') THEN
    CREATE POLICY "handoff_requests_update_resolved" ON public.handoff_requests
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

-- Insert: service-role only (the tool route uses createServiceRoleClient).
-- Block authenticated/anon from forging escalations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_requests_insert_service_only' AND tablename = 'handoff_requests') THEN
    CREATE POLICY "handoff_requests_insert_service_only" ON public.handoff_requests
      FOR INSERT
      TO authenticated, anon
      WITH CHECK (false);
  END IF;
END $$;

-- Delete: blocked. History is forensic — use resolved_at.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'handoff_requests_no_delete' AND tablename = 'handoff_requests') THEN
    CREATE POLICY "handoff_requests_no_delete" ON public.handoff_requests
      FOR DELETE
      TO authenticated, anon
      USING (false);
  END IF;
END $$;
