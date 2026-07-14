-- ============================================================================
-- KAAM — Supabase database schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run: it uses "if not exists" / "or replace" throughout.
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

-- ── Customers ───────────────────────────────────────────────────────────────
-- One row per signed-up customer. Linked to Supabase Auth via auth_id.
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  auth_id     uuid references auth.users on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  city        text default 'Kochi',
  created_at  timestamptz not null default now()
);

-- ── Worker applications (KYC onboarding queue) ──────────────────────────────
create table if not exists public.worker_applications (
  id                uuid primary key default gen_random_uuid(),
  auth_id           uuid references auth.users on delete set null,
  name              text not null,
  phone             text not null,
  city              text not null,
  category_id       text not null,
  experience_years  int  not null default 0,
  bio               text,
  social            jsonb default '{}'::jsonb,   -- {instagram, youtube, facebook, website}
  docs              jsonb default '{}'::jsonb,   -- storage paths to KYC files
  media             jsonb default '[]'::jsonb,   -- [{kind, path}] work proof
  status            application_status not null default 'pending',
  reject_reason     text,
  submitted_at      timestamptz not null default now(),
  reviewed_at       timestamptz
);

-- ── Approved workers (the live roster customers can book) ───────────────────
create table if not exists public.workers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references public.worker_applications on delete set null,
  name           text not null,
  category_id    text not null,
  city           text not null,
  rate           numeric not null,
  unit           text not null default 'visit',
  bio            text,
  skills         text[] default '{}',
  badges         text[] default '{}',
  social         jsonb  default '{}'::jsonb,
  rating         numeric default 5.0,
  review_count   int default 0,
  jobs_done      int default 0,
  accept_rate    numeric default 1.0,
  is_online      boolean default false,
  verified       boolean default true,
  created_at     timestamptz not null default now()
);

-- ── Bookings ────────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.customers on delete set null,
  worker_id      uuid references public.workers on delete set null,
  worker_name    text not null,
  category_id    text not null,
  sub_service    text not null,
  tenure_id      text not null,
  address        text,
  schedule       jsonb,                 -- {when:'asap'} | {when:'scheduled',date,time}
  quote          jsonb not null,        -- frozen price breakdown
  payment_method text,
  status         booking_status not null default 'requested',
  start_code     text,
  rating         int,
  created_at     timestamptz not null default now()
);

create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_worker_idx   on public.bookings(worker_id);

-- ── Chat messages (one thread per booking, plus enquiry-<workerId> threads) ─
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  thread_id     text not null,          -- booking id, or "enquiry-<workerId>"
  sender        chat_sender not null,
  kind          text not null default 'text',   -- text | image | video
  body          text,
  media_path    text,                   -- Storage path for image/video
  read_by_user  boolean default false,
  read_by_worker boolean default false,
  created_at    timestamptz not null default now()
);

create index if not exists chat_thread_idx on public.chat_messages(thread_id, created_at);

-- ── Realtime: broadcast row changes so every device updates instantly ───────
do $$ begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.workers;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security (RLS)
-- Start permissive so the demo works end-to-end, then tighten per role.
-- Every table has RLS ON; policies below define who can do what.
-- ============================================================================
alter table public.customers           enable row level security;
alter table public.worker_applications enable row level security;
alter table public.workers             enable row level security;
alter table public.bookings            enable row level security;
alter table public.chat_messages       enable row level security;

-- Public read of the approved worker roster (like browsing Swiggy restaurants)
drop policy if exists workers_read on public.workers;
create policy workers_read on public.workers for select using (true);

-- Anyone can submit a worker application (signup is open)
drop policy if exists applications_insert on public.worker_applications;
create policy applications_insert on public.worker_applications for insert with check (true);

-- A customer row is owned by the authenticated user who created it
drop policy if exists customers_self on public.customers;
create policy customers_self on public.customers
  for all using (auth.uid() = auth_id) with check (auth.uid() = auth_id);

-- Bookings & chat: readable/writable by signed-in users.
-- NOTE: these are launch-grade starter policies. Before going live at scale,
-- scope bookings to (customer_id = my customer row) and chat to threads the
-- user is part of. See SUPABASE_SETUP.md § Hardening.
drop policy if exists bookings_rw on public.bookings;
create policy bookings_rw on public.bookings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists chat_rw on public.chat_messages;
create policy chat_rw on public.chat_messages
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================================
-- Storage buckets for KYC documents and work/chat media
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('kyc', 'kyc', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('media', 'media', true)
  on conflict (id) do nothing;

-- Signed-in users can upload; media bucket is publicly readable, kyc is not.
drop policy if exists media_upload on storage.objects;
create policy media_upload on storage.objects for insert
  with check (bucket_id in ('kyc','media') and auth.role() = 'authenticated');

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select
  using (bucket_id = 'media' or auth.role() = 'authenticated');

-- ============================================================================
-- Done. Next: copy your Project URL + anon key into Vercel env vars
-- (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) and redeploy.
-- ============================================================================
