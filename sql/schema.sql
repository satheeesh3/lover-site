-- QR Keychain Loversite — Supabase schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "pgcrypto";

-- ===== customers =====
-- Private: order/customer records. No anonymous access at all.
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  couple_name text not null,
  email text not null,
  phone text,
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  expiry_date date,
  photo_url text,
  message text,
  created_at timestamptz not null default now()
);

-- ===== pages =====
-- Public-facing loversite content. Anonymous SELECT is allowed (the couple's
-- page must load with just the anon key); writes require an authenticated admin.
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  slug text not null unique,
  couple_name text not null,
  start_date date,
  photo_url text,
  message text,
  theme text not null default 'romantic',
  qr_code text,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

-- ===== payments =====
-- Private: payment records. No anonymous access at all.
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  amount integer not null,
  plan text not null check (plan in ('monthly', 'yearly', 'lifetime')),
  status text not null check (status in ('success', 'failed', 'pending')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

-- ===== Row Level Security =====
alter table customers enable row level security;
alter table pages enable row level security;
alter table payments enable row level security;

-- customers: authenticated (admin) only. No anonymous policy is created,
-- so anon-key requests are denied by default. The order/payment Functions
-- write here using the Supabase service role key, which bypasses RLS.
create policy "customers_admin_all" on customers
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- pages: anyone can read (needed for the public loversite page);
-- only an authenticated admin session can write.
create policy "pages_public_select" on pages
  for select
  using (true);

create policy "pages_admin_write" on pages
  for insert
  with check (auth.role() = 'authenticated');

create policy "pages_admin_update" on pages
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "pages_admin_delete" on pages
  for delete
  using (auth.role() = 'authenticated');

-- payments: authenticated (admin) only, same reasoning as customers.
create policy "payments_admin_all" on payments
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ===== Helper functions =====
-- Called via the service role key from functions/api/track-view.js so the
-- anon key never needs write access to pages.
create or replace function increment_page_views(page_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update pages set views = views + 1 where slug = page_slug;
$$;

-- ===== Storage =====
-- Create a bucket named "photos" in Supabase Storage (public, insert-only
-- for anon so the order form can upload without an admin session):
--   1. Storage -> New bucket -> name: photos -> Public bucket: ON
--   2. Storage -> photos -> Policies -> New policy:
--      - Allow INSERT for anon/authenticated (order form uploads)
--      - Allow SELECT for anon (photos need to display publicly)
--      - Do NOT allow UPDATE/DELETE for anon
