-- Add configurable tax_rate column to restaurants table
-- Defaults to 8.75% (0.0875) if not set
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0.0875;
