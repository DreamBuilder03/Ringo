-- Migration: 20260415_subscription_status.sql
-- Purpose: Track Stripe subscription lifecycle on restaurants so we can
-- gate dashboard access on payment failures and show the renewal date.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS subscription_status TEXT
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
  ));

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Helpful index for dunning emails / status checks
CREATE INDEX IF NOT EXISTS idx_restaurants_subscription_status
  ON public.restaurants(subscription_status);
