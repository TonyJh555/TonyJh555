-- ============================================================================
-- KAAM — Production security hardening (run AFTER schema.sql)
--
-- schema.sql ships DEMO-grade public access so the app works instantly with
-- the publishable key. This file tightens it. Apply it in two stages.
--
--   STAGE 1 (safe now): lock the crown jewels — admin password hashes and
--     worker KYC documents/PII — so the public key can no longer read them.
--     Requires SUPABASE_SERVICE_ROLE_KEY set in Vercel and the admin
--     verification desk reading applications through a server route.
--
--   STAGE 2 (needs Supabase Auth): scope each customer's bookings, chat,
--     addresses and subscriptions to their own login, so one user can never
--     read another's data. This requires migrating login to Supabase Auth
--     (auth.uid()); the policies are written below, commented, ready to enable.
--
-- Nothing here is destructive to data — it only replaces access policies.
-- ============================================================================

-- ── STAGE 1 · Lock the crown jewels ─────────────────────────────────────────
-- admin_users: password hashes + roles. No anon access at all; only the
-- service role (server routes) may read/write.
drop policy if exists admin_users_public on public.admin_users;
-- (no replacement policy → RLS denies anon; service role bypasses RLS)

-- worker_applications: workers may still SUBMIT (insert) their application with
-- the public key, but nobody can READ back KYC docs/PII except the service role.
drop policy if exists applications_public on public.worker_applications;
create policy applications_insert on public.worker_applications
  for insert with check (true);
-- select / update / delete: no anon policy → only the service role can read
-- the KYC documents and approve/reject, from a server route.

-- ── STAGE 2 · Per-user isolation (enable after adopting Supabase Auth) ───────
-- Prereq: customer login is migrated to Supabase Auth so requests carry
-- auth.uid(), and the customer's profile row + every row they write uses that
-- uid as its id / customer_id. The app code for this is in src/lib/auth.ts and
-- activates when NEXT_PUBLIC_SUPABASE_AUTH=1 (see SECURITY.md runbook).
--
-- Stage 2 splits by which side of a row is authenticated:
--
--   2a — CUSTOMER-OWNED tables (customers, addresses). These rows belong to one
--        authenticated customer, so they can be locked to auth.uid() as soon as
--        customer auth is on. Safe to enable now (on a preview first).
--
--   2b — SHARED tables (bookings, chat, subscriptions, reviews). Each row is
--        read by BOTH a customer and a worker. Workers still sign in through the
--        seed-demo picker (no auth.uid()), so a policy that also requires the
--        worker to be authenticated would blind the worker portal to its own
--        jobs. DO NOT enable 2b until worker login is also on Supabase Auth and
--        worker_id = the worker's auth uid. Left commented on purpose.

-- ---- STAGE 2a · customer-owned tables (enable with customer auth) -----------
-- Uncomment and run on a preview, then verify with two accounts:
--
-- drop policy if exists customers_public on public.customers;
-- create policy customers_self on public.customers for all
--   using (id = auth.uid()::text) with check (id = auth.uid()::text);
--
-- drop policy if exists addresses_public on public.addresses;
-- create policy addresses_owner on public.addresses for all
--   using (customer_id = auth.uid()::text) with check (customer_id = auth.uid()::text);

-- ---- STAGE 2b · shared customer+worker tables (needs WORKER auth too) -------
-- Enabling any of these while workers are unauthenticated will hide bookings,
-- chat and subscriptions from the worker portal. Keep commented until workers
-- authenticate with Supabase Auth (worker_id = worker's auth.uid()):
--
-- drop policy if exists bookings_public on public.bookings;
-- create policy bookings_owner on public.bookings for all
--   using (customer_id = auth.uid()::text or worker_id = auth.uid()::text)
--   with check (customer_id = auth.uid()::text);
--
-- drop policy if exists chat_public on public.chat_messages;
-- create policy chat_owner on public.chat_messages for all
--   using (
--     exists (select 1 from public.bookings b
--             where b.id = thread_id
--               and (b.customer_id = auth.uid()::text or b.worker_id = auth.uid()::text))
--   );
--
-- drop policy if exists subscriptions_public on public.subscriptions;
-- create policy subscriptions_owner on public.subscriptions for all
--   using (customer_id = auth.uid()::text or worker_id = auth.uid()::text)
--   with check (customer_id = auth.uid()::text);
--
-- reviews: keep public SELECT (they're shown on worker profiles) but restrict
-- writes to any authenticated user:
-- drop policy if exists reviews_public on public.reviews;
-- create policy reviews_read on public.reviews for select using (true);
-- create policy reviews_write on public.reviews for insert
--   with check (auth.uid() is not null);

-- ── Storage · make the KYC bucket private (docs never public) ────────────────
update storage.buckets set public = false where id = 'kyc';
drop policy if exists media_all on storage.objects;
-- Work photos stay public-readable; KYC is service-role only.
create policy media_public_read on storage.objects for select
  using (bucket_id = 'media');
create policy media_write on storage.objects for insert
  with check (bucket_id in ('media', 'kyc'));
-- (reading the private 'kyc' bucket requires the service role / signed URLs)

-- ============================================================================
-- After Stage 1: set SUPABASE_SERVICE_ROLE_KEY in Vercel and deploy the admin
-- server routes, then run this file. The customer/worker app keeps working on
-- the publishable key; only KYC + admin data become private.
-- ============================================================================
