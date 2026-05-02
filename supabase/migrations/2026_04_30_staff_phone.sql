-- ──────────────────────────────────────────────────────────────────────────────
-- staff_phone_number — destination for hard-handoff call transfers (C-4 hybrid).
--
-- Set this to the line that should ring when the agent invokes transfer_call.
-- Typically the kitchen phone or owner cell. Format: any input — webhook
-- normalizes to E.164 (+1xxxxxxxxxx) before injecting as a Retell dynamic
-- variable.
--
-- NULL = no transfer destination configured. Agent skips transfer_call and
-- goes straight to request_handoff (the SMS pager) instead.
--
-- Idempotent. RLS already covers the restaurants table from prior migrations.
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS staff_phone_number TEXT;

COMMENT ON COLUMN public.restaurants.staff_phone_number IS
  'E.164 phone number where transfer_call sends the bridged caller (typically kitchen or owner cell). NULL → agent skips transfer and uses request_handoff fallback. See docs/handoff/agent-escalation.md.';
