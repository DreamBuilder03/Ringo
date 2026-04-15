-- Migration: 20260415_provisioning.sql
-- Purpose: Track auto-provisioned Twilio number + Retell agent per restaurant.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS ringo_phone_number TEXT;         -- E.164, the number we rent for the restaurant

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS twilio_number_sid TEXT;          -- PN... SID so we can release it on churn

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS retell_phone_number_id TEXT;     -- Retell's internal phone number record

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS provisioning_status TEXT
  CHECK (provisioning_status IS NULL OR provisioning_status IN (
    'pending', 'in_progress', 'succeeded', 'failed'
  ));

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS provisioning_error TEXT;

CREATE INDEX IF NOT EXISTS idx_restaurants_ringo_phone_number
  ON public.restaurants(ringo_phone_number);
