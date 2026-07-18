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
-- Prereq: migrate customer & worker login to Supabase Auth so requests carry
-- auth.uid(), and store that uid in customer_id / worker_id. Then replace the
-- blanket public policies with owner-scoped ones. Uncomment when ready:
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
-- drop policy if exists customers_public on public.customers;
-- create policy customers_self on public.customers for all
--   using (id = auth.uid()::text) with check (id = auth.uid()::text);
--
-- drop policy if exists addresses_public on public.addresses;
-- create policy addresses_owner on public.addresses for all
--   using (customer_id = auth.uid()::text) with check (customer_id = auth.uid()::text);
--
-- drop policy if exists subscriptions_public on public.subscriptions;
-- create policy subscriptions_owner on public.subscriptions for all
--   using (customer_id = auth.uid()::text or worker_id = auth.uid()::text)
--   with check (customer_id = auth.uid()::text);
--
-- reviews: keep public SELECT (they're shown on worker profiles) but restrict
-- writes to the authenticated author:
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
