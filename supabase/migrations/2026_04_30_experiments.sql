-- ──────────────────────────────────────────────────────────────────────────────
-- A/B testing framework — C-3 of the AI smarter arc.
--
-- Three tables:
--   experiments               — definition (slug, scope, status, success metric)
--   experiment_variants       — A/B/C/... arms with weights and override patches
--   experiment_assignments    — call_id → variant, the source of truth for stats
--
-- How it works at runtime (full design in docs/handoff/ab-testing-framework.md):
--   1. /api/retell/inbound looks up active experiments for this restaurant.
--   2. For each, hashes (from_number, experiment.id) → variant deterministically
--      (same caller always lands on the same variant for a given experiment).
--   3. Merges variant.overrides_patch into prompt_overrides served to Retell.
--   4. Injects exp_<experiment_slug>=<variant_slug> as a dynamic variable so
--      the prompt can branch by name if it wants to.
--   5. Fire-and-forget INSERT into experiment_assignments — never blocks the
--      live call.
--
-- Stats are computed by joining experiment_assignments → calls → orders.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS, CREATE
-- POLICY guarded by DO blocks where Postgres lacks IF NOT EXISTS for policies.
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. experiments table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Slug identifies the experiment in prompt placeholders ({{exp_<slug>}}).
  -- Lowercase alphanumeric + underscore, kept short so prompts stay readable.
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_]{0,39}$'),

  -- NULL = experiment applies to all restaurants (global). Otherwise scoped.
  -- (Most experiments will be global at this stage; per-restaurant experiments
  -- are useful once we have multiple paying customers.)
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Lifecycle:
  --   draft    — defined but not picking variants yet
  --   running  — webhook assigns callers to variants
  --   stopped  — frozen; existing assignments preserved, no new assignments
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'stopped')),

  -- What outcome are we measuring? Documented in the handoff doc; this column
  -- is informational for the analyst, not enforced in code.
  --   order_placed       — boolean per call (calls.call_outcome = 'order_placed')
  --   order_total        — average order total per call
  --   call_duration      — average call duration
  --   custom             — analyst defines ad-hoc query
  success_metric TEXT NOT NULL DEFAULT 'order_placed'
    CHECK (success_metric IN ('order_placed', 'order_total', 'call_duration', 'custom')),

  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A slug must be unique within its scope. Two restaurants can both run
-- "greeting_v1"; one global experiment "greeting_v1" cannot coexist with
-- another. Coalesce restaurant_id to a sentinel so NULL is treated as a value.
CREATE UNIQUE INDEX IF NOT EXISTS experiments_slug_scope_unique
  ON public.experiments (slug, COALESCE(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Hot path: webhook reads "all running experiments for this restaurant".
CREATE INDEX IF NOT EXISTS experiments_running_idx
  ON public.experiments (restaurant_id, status)
  WHERE status = 'running';

CREATE INDEX IF NOT EXISTS experiments_running_global_idx
  ON public.experiments (status)
  WHERE status = 'running' AND restaurant_id IS NULL;

COMMENT ON TABLE public.experiments IS
  'A/B test definition. Edit via SQL — no dashboard yet. See docs/handoff/ab-testing-framework.md for SQL recipes and the analysis playbook.';

-- ─── 2. experiment_variants table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.experiment_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,

  -- Variant slug shows up in dynamic_variables as exp_<exp.slug>=<variant.slug>.
  -- Convention: control, treatment, treatment_a, treatment_b, ...
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z][a-z0-9_]{0,39}$'),

  -- Relative weight. {control: 50, treatment: 50} is even split.
  -- {control: 90, canary: 10} is a 10% canary. Integers only — keep it simple.
  weight INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 1000),

  -- Same shape as restaurants.prompt_overrides. Sanitization happens on read,
  -- not write — the webhook applies the same rules (string-only, 500-char cap,
  -- safe key regex) before serving to Retell.
  overrides_patch JSONB NOT NULL DEFAULT '{}'::jsonb,

  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (experiment_id, slug)
);

CREATE INDEX IF NOT EXISTS experiment_variants_experiment_idx
  ON public.experiment_variants (experiment_id);

COMMENT ON TABLE public.experiment_variants IS
  'A/B variants for an experiment. weights determine split; overrides_patch is merged into prompt_overrides at call time. See docs/handoff/ab-testing-framework.md.';

-- ─── 3. experiment_assignments table ─────────────────────────────────────────
-- One row per (call_id, experiment_id). Multiple experiments can run on the
-- same call (each writes its own row). Fire-and-forget from the webhook so
-- assignment writes never block the live call.
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  call_id UUID NOT NULL,
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.experiment_variants(id) ON DELETE CASCADE,
  from_number TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (call_id, experiment_id)
);

-- Note: no FK on call_id → calls(id). The Retell inbound webhook fires BEFORE
-- the call is connected, and the calls row is written later by the call_started
-- webhook. We don't want to block assignment on the calls row existing yet.
-- The stats query uses a LEFT JOIN to tolerate orphan assignments (rare; happens
-- when an inbound webhook fires but the caller hangs up before connecting).

CREATE INDEX IF NOT EXISTS experiment_assignments_experiment_idx
  ON public.experiment_assignments (experiment_id, variant_id);

CREATE INDEX IF NOT EXISTS experiment_assignments_assigned_at_idx
  ON public.experiment_assignments (assigned_at DESC);

COMMENT ON TABLE public.experiment_assignments IS
  'Call → variant assignment record. Source of truth for A/B stats. Joined with calls + orders to compute per-variant outcome rates.';

-- ─── 4. RLS — service-role only on all three ─────────────────────────────────
-- Tight by default. The dashboard never touches these directly (admin reads
-- via service-role API endpoints). Service role bypasses RLS, so no explicit
-- policy is needed for it.

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;

-- Block authenticated/anon from reading or writing. (Admins read via API
-- routes that use createServiceRoleClient + check role server-side.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'experiments_no_direct_access' AND tablename = 'experiments') THEN
    CREATE POLICY "experiments_no_direct_access" ON public.experiments
      FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'experiment_variants_no_direct_access' AND tablename = 'experiment_variants') THEN
    CREATE POLICY "experiment_variants_no_direct_access" ON public.experiment_variants
      FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'experiment_assignments_no_direct_access' AND tablename = 'experiment_assignments') THEN
    CREATE POLICY "experiment_assignments_no_direct_access" ON public.experiment_assignments
      FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
  END IF;
END $$;

-- ─── 5. updated_at trigger on experiments ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_experiments_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS experiments_set_updated_at ON public.experiments;
CREATE TRIGGER experiments_set_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_experiments_set_updated_at();
