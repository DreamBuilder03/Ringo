-- Build 2 — Automatic Call-Failure Alerts
-- Creates the alerts_log table used by src/lib/alerts.ts for dedupe + audit,
-- and adds the per-restaurant alerts_enabled toggle so demo/staging restaurants
-- can be excluded from founder alerts.
--
-- failure_type enum (loose text — keeping extensible without ALTER TYPE churn):
--   'retell_call_error'     — call_status=error or disconnection_reason in error set
--   'premature_hangup'      — call_duration < 5s with no order created
--   'tool_call_failure'     — one of /api/tools/* hit an error branch
--   'payment_link_failure'  — Square Payment Link API returned non-2xx inside finalize-payment
--   'silent_line'           — restaurant received zero calls in the expected window
--   'silent_line_summary'   — 6th+ alert in an hour, degraded to summary
--   'tool_failure_summary'  — same, for tool failures on a single restaurant

create extension if not exists "pgcrypto";

create table if not exists public.alerts_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  failure_type text not null,
  short_reason text not null,
  retell_call_id text,
  dedupe_key text not null,
  sent_via text check (sent_via in ('sms','email','both','none')) default 'none',
  sms_provider text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Dedupe lookup: "has this exact alert fired in the last 5 minutes?"
create index if not exists alerts_log_dedupe_idx
  on public.alerts_log (dedupe_key, created_at desc);

-- Per-restaurant rate limit: "how many alerts for this restaurant in the last hour?"
create index if not exists alerts_log_restaurant_time_idx
  on public.alerts_log (restaurant_id, created_at desc);

-- For /admin/health "Active alerts" section (last 50, sortable by severity)
create index if not exists alerts_log_recent_idx
  on public.alerts_log (created_at desc);

-- For drill-down from a specific call
create index if not exists alerts_log_retell_call_idx
  on public.alerts_log (retell_call_id)
  where retell_call_id is not null;

-- Per-restaurant toggle for alerts (demo/staging off, production on)
alter table public.restaurants
  add column if not exists alerts_enabled boolean not null default true;

-- RLS: alerts_log only readable via service role. No tenant-scoped policy yet —
-- founder alerts are internal. Pre-pilot security audit (Task #61) will revisit.
alter table public.alerts_log enable row level security;

-- Explicit lockout policy so anon/authenticated keys see nothing even if RLS is
-- toggled off elsewhere. Service-role client (used by alerts.ts + /admin) bypasses RLS.
drop policy if exists alerts_log_service_role_only on public.alerts_log;
create policy alerts_log_service_role_only on public.alerts_log
  for all
  to authenticated, anon
  using (false)
  with check (false);
