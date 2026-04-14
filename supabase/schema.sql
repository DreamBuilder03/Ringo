-- Ringo Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- User profiles (extends Supabase Auth)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'restaurant' check (role in ('admin', 'restaurant')),
  restaurant_id uuid,
  full_name text,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- Restaurants
-- ============================================
create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  phone text not null,
  pos_type text not null default 'none' check (pos_type in ('square', 'toast', 'clover', 'none')),
  pos_connected boolean not null default false,
  retell_agent_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  plan_tier text check (plan_tier in ('starter', 'growth', 'pro')),
  created_at timestamptz not null default now(),
  owner_user_id uuid references auth.users on delete set null
);

alter table public.restaurants enable row level security;

-- Restaurant owners can view their own restaurant
create policy "Restaurant owners can view own restaurant"
  on public.restaurants for select
  using (owner_user_id = auth.uid());

-- Restaurant owners can update their own restaurant
create policy "Restaurant owners can update own restaurant"
  on public.restaurants for update
  using (owner_user_id = auth.uid());

-- Admins can do everything with restaurants
create policy "Admins can manage all restaurants"
  on public.restaurants for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Add foreign key from profiles to restaurants
alter table public.profiles
  add constraint profiles_restaurant_id_fkey
  foreign key (restaurant_id) references public.restaurants(id)
  on delete set null;

-- ============================================
-- Calls
-- ============================================
create table public.calls (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants on delete cascade,
  retell_call_id text not null unique,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_seconds integer,
  transcript text,
  call_outcome text not null default 'missed' check (call_outcome in ('order_placed', 'inquiry', 'missed', 'upsell_only')),
  order_total numeric(10,2) not null default 0,
  upsell_total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.calls enable row level security;

-- Restaurant owners can view their own calls
create policy "Restaurant owners can view own calls"
  on public.calls for select
  using (
    restaurant_id in (
      select id from public.restaurants
      where owner_user_id = auth.uid()
    )
  );

-- Admins can view all calls
create policy "Admins can manage all calls"
  on public.calls for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Service role can insert calls (for webhooks)
create policy "Service role can insert calls"
  on public.calls for insert
  with check (true);

-- Index for fast lookups
create index idx_calls_restaurant_id on public.calls(restaurant_id);
create index idx_calls_start_time on public.calls(start_time desc);
create index idx_calls_retell_call_id on public.calls(retell_call_id);

-- ============================================
-- Order Items
-- ============================================
create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls on delete cascade,
  restaurant_id uuid not null references public.restaurants on delete cascade,
  item_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10,2) not null,
  is_upsell boolean not null default false
);

alter table public.order_items enable row level security;

-- Restaurant owners can view their own order items
create policy "Restaurant owners can view own order items"
  on public.order_items for select
  using (
    restaurant_id in (
      select id from public.restaurants
      where owner_user_id = auth.uid()
    )
  );

-- Admins can manage all order items
create policy "Admins can manage all order items"
  on public.order_items for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Service role can insert order items
create policy "Service role can insert order items"
  on public.order_items for insert
  with check (true);

create index idx_order_items_call_id on public.order_items(call_id);

-- ============================================
-- Realtime subscriptions
-- ============================================
alter publication supabase_realtime add table public.calls;

-- ============================================
-- Function: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'restaurant');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Function: Get today's stats for a restaurant
-- ============================================
create or replace function public.get_restaurant_stats(p_restaurant_id uuid)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'total_calls', count(*),
    'orders_taken', count(*) filter (where call_outcome = 'order_placed'),
    'revenue_captured', coalesce(sum(order_total), 0),
    'upsell_revenue', coalesce(sum(upsell_total), 0)
  ) into result
  from public.calls
  where restaurant_id = p_restaurant_id
    and start_time >= current_date;

  return result;
end;
$$ language plpgsql security definer;

