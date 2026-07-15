-- ============================================================================
-- KAAM — Supabase database schema  (v2)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
--
-- ⚠️  DEMO-GRADE SECURITY: the policies below allow public (anon) access so
--     the app works with the publishable key before Supabase Auth is wired.
--     Before a real launch, switch to Supabase Auth + per-user RLS
--     (see § Hardening in SUPABASE_SETUP.md).
--
-- Safe to re-run. If you ran an earlier version, the DROPs below recreate the
-- bookings/chat tables with the corrected column types (no real data yet).
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type booking_status as enum
    ('requested','accepted','in_progress','completed','cancelled','reschedule');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type chat_sender as enum ('user','worker','system');
exception when duplicate_object then null; end $$;

-- ── Bookings ────────────────────────────────────────────────────────────────
-- customer_id / worker_id are TEXT (the app uses ids like "w1", not UUIDs).
drop table if exists public.bookings cascade;
create table public.bookings (
  id             text primary key,
  customer_id    text,
  worker_id      text,
  worker_name    text not null,
  category_id    text not null,
  sub_service    text not null,
  tenure_id      text not null,
  address        text,
  coords         jsonb,
  schedule       jsonb,
  quote          jsonb not null,
  payment_method text,
  status         booking_status not null default 'requested',
  start_code     text,
  rating         int,
  created_at     timestamptz not null default now()
);
create index bookings_customer_idx on public.bookings(customer_id);
create index bookings_worker_idx   on public.bookings(worker_id);

-- ── Chat messages (one thread per booking id) ───────────────────────────────
drop table if exists public.chat_messages cascade;
create table public.chat_messages (
  id             text primary key,
  thread_id      text not null,
  sender         chat_sender not null,
  kind           text not null default 'text',
  body           text,
  media_url      text,
  read_by_user   boolean default false,
  read_by_worker boolean default false,
  created_at     timestamptz not null default now()
);
create index chat_thread_idx on public.chat_messages(thread_id, created_at);

-- ── Worker onboarding applications ──────────────────────────────────────────
create table if not exists public.worker_applications (
  id                text primary key,
  name              text not null,
  phone             text not null,
  city              text not null,
  category_id       text not null,
  experience_years  int  not null default 0,
  bio               text,
  social            jsonb default '{}'::jsonb,
  docs              jsonb default '{}'::jsonb,
  media             jsonb default '[]'::jsonb,
  status            application_status not null default 'pending',
  reject_reason     text,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz
);

-- ── Realtime: broadcast row changes so every device updates instantly ───────
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.worker_applications;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security — DEMO: public access (anon) so the publishable key works.
-- Replace with per-user policies once Supabase Auth is wired.
-- ============================================================================
alter table public.bookings            enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.worker_applications enable row level security;

drop policy if exists bookings_public on public.bookings;
create policy bookings_public on public.bookings for all using (true) with check (true);

drop policy if exists chat_public on public.chat_messages;
create policy chat_public on public.chat_messages for all using (true) with check (true);

drop policy if exists applications_public on public.worker_applications;
create policy applications_public on public.worker_applications for all using (true) with check (true);

-- ============================================================================
-- Storage buckets for KYC documents and work/chat media
-- ============================================================================
insert into storage.buckets (id, name, public) values ('media','media',true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('kyc','kyc',false)
  on conflict (id) do nothing;

drop policy if exists media_all on storage.objects;
create policy media_all on storage.objects for all
  using (bucket_id in ('media','kyc')) with check (bucket_id in ('media','kyc'));

-- ============================================================================
-- Done. Ensure NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
-- are set in Vercel → Settings → Environment Variables, then redeploy.
-- ============================================================================
