-- ============================================================================
-- KAAM — Supabase database schema  (v2)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
--
-- ⚠️  DEMO-GRADE SECURITY: the policies below allow public (anon) access so
--     the app works with the publishable key before Supabase Auth is wired.
--     Before a real launch, switch to Supabase Auth + per-user RLS
--     (see § Hardening in SUPABASE_SETUP.md).
--
-- SAFE TO RE-RUN, AND SAFE ON A DATABASE WITH REAL DATA IN IT.
-- Every table is `create table if not exists` and every later change is
-- `alter table ... add column if not exists`, so running this twice does
-- nothing the second time and running it on a live database adds only what
-- is missing.
--
-- No table is ever dropped and no row is ever deleted. The eleven
-- `drop policy if exists` lines near the end are the exception that proves
-- it: each is immediately followed by the `create policy` that replaces it,
-- because Postgres has no `create or replace policy`. They rewrite access
-- rules, never data.
--
-- Run this WHOLE file first, before any individual ALTER statements — those
-- assume the tables already exist and will fail with
-- `relation "public.subscriptions" does not exist` on a fresh project.
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
--
-- This file must be safe to paste into the SQL Editor again whenever a new
-- column is added, so it creates only what is missing. It used to DROP this
-- table first, which quietly meant "re-run the schema" was the same sentence
-- as "delete every booking and every chat message" — with a comment four
-- lines below claiming it was safe to re-run.
create table if not exists public.bookings (
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
  customer_rating int,
  cancel_reason  text,
  dispatch       jsonb,
  started_at     timestamptz,
  completed_at   timestamptz,
  banked_ms      bigint,
  paused_at      timestamptz,
  reschedule     jsonb,
  completion     jsonb,
  reschedule_count int,
  tip            int,
  tip_paid_at    timestamptz,
  settlement     jsonb,
  callout_pay    int,
  day_baseline_ms bigint,
  report         jsonb,
  payment        jsonb,
  created_at     timestamptz not null default now()
);
-- Add newer columns to an already-created table (safe to re-run).
alter table public.bookings add column if not exists customer_rating int;
alter table public.bookings add column if not exists cancel_reason text;
alter table public.bookings add column if not exists dispatch jsonb;
alter table public.bookings add column if not exists started_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.bookings add column if not exists settlement jsonb;
alter table public.bookings add column if not exists payment jsonb;
alter table public.bookings add column if not exists banked_ms bigint;
alter table public.bookings add column if not exists paused_at timestamptz;
alter table public.bookings add column if not exists reschedule jsonb;
alter table public.bookings add column if not exists completion jsonb;
alter table public.bookings add column if not exists reschedule_count int;
alter table public.bookings add column if not exists tip int;
alter table public.bookings add column if not exists tip_paid_at timestamptz;
-- ₹ owed to the worker when a job ended before the work was done: they
-- travelled out and gave up the slot. See calloutPayFor in payment-policy.ts.
alter table public.bookings add column if not exists callout_pay int;
-- Worked ms banked before the current billing day began, so a job that spans
-- two days gets a fresh daily-cap allowance on each. See src/lib/metered.ts.
alter table public.bookings add column if not exists day_baseline_ms bigint;
-- What the worker did, what is left, and the photographs. The handover a
-- replacement reads, and either side's evidence. See src/lib/job-report.ts.
alter table public.bookings add column if not exists report jsonb;
-- Health answers for body-work trades; readable only by the assigned worker.
alter table public.bookings add column if not exists intake jsonb;
-- Crew jobs: the roles and headcount the booked worker leads (see lib/crew.ts).
alter table public.bookings add column if not exists crew jsonb;
create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_worker_idx   on public.bookings(worker_id);

-- ── Chat messages (one thread per booking id) ───────────────────────────────
create table if not exists public.chat_messages (
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
-- Add newer columns to an already-created table (safe to re-run).
alter table public.chat_messages add column if not exists kind text not null default 'text';
alter table public.chat_messages add column if not exists media_url text;
alter table public.chat_messages add column if not exists read_by_user boolean default false;
alter table public.chat_messages add column if not exists read_by_worker boolean default false;

create index if not exists chat_thread_idx on public.chat_messages(thread_id, created_at);

-- ── Customer accounts (phone/email signup) ──────────────────────────────────
create table if not exists public.customers (
  id               text primary key,
  name             text not null,
  identifier_type  text not null,          -- 'phone' | 'email'
  identifier_value text not null,
  invoice_email    text,                   -- where job invoices are emailed
  created_at       timestamptz not null default now()
);
alter table public.customers add column if not exists invoice_email text;
create unique index if not exists customers_identifier_idx
  on public.customers(identifier_type, lower(identifier_value));

-- ── Editable site content (banners, offers, home copy) ─────────────────────
-- One row per editable document. The app falls back to its built-in defaults
-- for any key that isn't here, so an empty table is a working app and deleting
-- a row reverts that surface to the default.
create table if not exists public.site_content (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- ── Saved addresses (Home / Office / Other), one row per customer address ────
create table if not exists public.addresses (
  id           text primary key,
  customer_id  text,
  label        text not null default 'Home',
  custom_name  text,
  line         text not null,
  landmark     text,
  coords       jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists addresses_customer_idx on public.addresses(customer_id);

-- ── Worker onboarding applications ──────────────────────────────────────────
create table if not exists public.worker_applications (
  id                text primary key,
  name              text not null,
  phone             text not null,
  email             text,
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
-- Add email to an already-created table (safe to re-run).
alter table public.worker_applications add column if not exists email text;

-- ── Admin team members (privileged sub-users the owner creates) ─────────────
-- role: 'verifier' (KYC desk only) | 'finance' (revenue/reports only).
-- The owner/super-admin logs in with ADMIN_USER/ADMIN_PASSWORD, not this table.
-- ⚠️ DEMO: passwords are SHA-256 hashed but this table is publicly readable via
--    the publishable key. Before production, lock it to service-role only and
--    move admin auth to Supabase Auth.
create table if not exists public.admin_users (
  id            text primary key,
  name          text not null,
  username      text not null unique,
  password_hash text not null,
  role          text not null default 'verifier',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── Subscriptions (recurring Care Plans) ────────────────────────────────────
-- A committed 1/3/6-month plan, paid upfront per term and auto-renewing.
-- The Razorpay webhook (/api/razorpay/webhook) rolls renews_on forward and
-- appends to history on each `subscription.charged` event.
create table if not exists public.subscriptions (
  id             text primary key,
  customer_id    text,
  worker_id      text,
  worker_name    text not null,
  category_id    text not null,
  service        text not null,
  plan_id        text not null,          -- 'm1' | 'm3' | 'm6'
  months         int  not null,
  monthly_amount int  not null,
  term_amount    int  not null,
  monthly_payout int  not null default 0,
  term_payout    int  not null default 0,
  online         boolean default false,
  visits         jsonb,                  -- { days: [1,3,5], time: "16:00" } — the weekly rhythm
  sessions       jsonb default '[]'::jsonb,  -- what actually happened at each visit
  start_date     timestamptz not null default now(),
  renews_on      timestamptz not null,
  auto_renew     boolean not null default true,
  status         text not null default 'active',   -- active | cancelled | expired
  payment_ref    text,                   -- Razorpay subscription id or demo ref
  history        jsonb default '[]'::jsonb,
  created_at     timestamptz not null default now()
);
-- Added later: the weekly rhythm a plan runs on, and what happened at each
-- visit. Safe to re-run on a database created before plans had a schedule.
alter table public.subscriptions add column if not exists visits jsonb;
alter table public.subscriptions add column if not exists sessions jsonb default '[]'::jsonb;

create index if not exists subscriptions_customer_idx on public.subscriptions(customer_id);
create index if not exists subscriptions_ref_idx on public.subscriptions(payment_ref);

-- ── Support tickets (customer/worker disputes, refunds, payment issues) ─────
create table if not exists public.support_tickets (
  id           text primary key,
  raised_by    text not null,          -- 'customer' | 'worker'
  raiser_id    text,
  raiser_name  text not null,
  booking_id   text,
  category     text not null,          -- refund | payment | safety | quality | account | other
  subject      text not null,
  message      text not null,
  status       text not null default 'open',  -- open | in_review | resolved
  replies      jsonb default '[]'::jsonb,
  notes        jsonb default '[]'::jsonb,      -- internal agent notes (private)
  assignee     text,                            -- agent handling the ticket
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);
-- Add newer columns to an already-created table (safe to re-run).
alter table public.support_tickets add column if not exists notes jsonb default '[]'::jsonb;
alter table public.support_tickets add column if not exists assignee text;
create index if not exists support_raiser_idx on public.support_tickets(raiser_id);
create index if not exists support_status_idx on public.support_tickets(status);

-- ── Reviews (star rating + text + photos on completed bookings) ─────────────
create table if not exists public.reviews (
  id            text primary key,
  worker_id     text not null,
  booking_id    text,
  customer_name text,
  rating        int not null,
  text          text,
  tags          jsonb not null default '[]'::jsonb,
  photos        jsonb default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
-- Safe for existing databases created before quick review tags shipped:
alter table public.reviews add column if not exists tags jsonb not null default '[]'::jsonb;
create index if not exists reviews_worker_idx on public.reviews(worker_id);

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
do $$ begin
  alter publication supabase_realtime add table public.customers;
  alter publication supabase_realtime add table public.site_content;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.addresses;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.subscriptions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.support_tickets;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.admin_users;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Row Level Security — DEMO: public access (anon) so the publishable key works.
-- Replace with per-user policies once Supabase Auth is wired.
-- ============================================================================
alter table public.bookings            enable row level security;
alter table public.chat_messages       enable row level security;
alter table public.worker_applications enable row level security;
alter table public.site_content        enable row level security;
alter table public.customers           enable row level security;
alter table public.addresses           enable row level security;
alter table public.reviews             enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.support_tickets     enable row level security;
alter table public.admin_users         enable row level security;

drop policy if exists bookings_public on public.bookings;
create policy bookings_public on public.bookings for all using (true) with check (true);

drop policy if exists chat_public on public.chat_messages;
create policy chat_public on public.chat_messages for all using (true) with check (true);

drop policy if exists applications_public on public.worker_applications;
create policy applications_public on public.worker_applications for all using (true) with check (true);

drop policy if exists site_content_public on public.site_content;
create policy site_content_public on public.site_content for all using (true) with check (true);

drop policy if exists customers_public on public.customers;
create policy customers_public on public.customers for all using (true) with check (true);

drop policy if exists addresses_public on public.addresses;
create policy addresses_public on public.addresses for all using (true) with check (true);

drop policy if exists reviews_public on public.reviews;
create policy reviews_public on public.reviews for all using (true) with check (true);

drop policy if exists subscriptions_public on public.subscriptions;
create policy subscriptions_public on public.subscriptions for all using (true) with check (true);

drop policy if exists support_public on public.support_tickets;
create policy support_public on public.support_tickets for all using (true) with check (true);

drop policy if exists admin_users_public on public.admin_users;
create policy admin_users_public on public.admin_users for all using (true) with check (true);

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
