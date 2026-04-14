-- Demo leads captured from the Loman-style live demo on call.useringo.ai / useringo.ai/demo
-- One row per visitor who starts the qualifying form. Updated as they progress.

create table if not exists public.demo_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Google Places data captured at step 2
  place_id text,
  restaurant_name text,
  restaurant_address text,
  restaurant_phone text,
  restaurant_website text,
  cuisine_type text,
  hours jsonb,
  rating numeric,
  photo_url text,

  -- Qualifying form (step 3)
  locations_count text,         -- "1", "2-5", "6-10", "11+"
  pos_system text,              -- "Square", "Toast", "Clover", "Other", "None"
  features_interested text[],   -- ["24/7 answering", "ordering", "reservations", ...]
  full_name text,
  phone text,
  email text,

  -- Demo call telemetry (step 4+)
  retell_web_call_id text,
  demo_language text check (demo_language in ('en','es','multi')) default 'en',
  demo_started_at timestamptz,
  demo_ended_at timestamptz,
  demo_duration_seconds int,
  demo_transcript text,

  -- Lifecycle
  status text not null default 'started'
    check (status in ('started','confirmed','qualified','demo_ready','demo_completed','booked','disqualified')),
  source text default 'website_demo',
  utm jsonb,

  -- Sales handoff
  ghl_contact_id text,
  alerted_at timestamptz
);

create index if not exists demo_leads_created_at_idx on public.demo_leads (created_at desc);
create index if not exists demo_leads_status_idx on public.demo_leads (status);
create index if not exists demo_leads_email_idx on public.demo_leads (lower(email));

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

drop trigger if exists demo_leads_updated_at on public.demo_leads;
create trigger demo_leads_updated_at before update on public.demo_leads
  for each row execute function public.set_updated_at();

-- RLS: service role only. No public writes.
alter table public.demo_leads enable row level security;
create policy "service_role_all_demo_leads" on public.demo_leads
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
