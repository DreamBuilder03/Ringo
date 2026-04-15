-- Migration: 20260414_clover_integration.sql
-- Purpose: Per-restaurant Clover POS credentials + order-push support.
-- Previously only Square had per-restaurant columns; Clover was stubbed out.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS clover_access_token TEXT;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS clover_merchant_id TEXT;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS clover_environment TEXT
  CHECK (clover_environment IS NULL OR clover_environment IN ('sandbox', 'production'));

-- pos_order_id / pos_pushed_at already exist on orders (see 20260410_option_b_schema.sql).
-- No new columns needed on orders — Clover order ID slots into pos_order_id just like Square.
