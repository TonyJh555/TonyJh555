# KAAM — Security

This documents KAAM's security posture and the exact steps to harden it for a
real launch. It's written to be honest about what is safe today and what still
needs your Supabase project to switch on.

## What's already in place

- **Admin panel** is gated by an owner login; the session is a signed,
  `httpOnly`, `SameSite=Lax`, `Secure`-in-production cookie (HMAC-SHA256). Set
  `ADMIN_USER` / `ADMIN_PASSWORD` / `ADMIN_SECRET` in Vercel — don't ship the
  defaults.
- **Security headers** on every response (see `next.config.ts`): HSTS,
  `X-Frame-Options: DENY` (anti-clickjacking), `nosniff`, a strict
  `Referrer-Policy`, and a `Permissions-Policy` that turns off camera/mic/
  payment APIs while keeping geolocation for nearest-first search.
- **Secrets** (`ANTHROPIC_API_KEY`, `RAZORPAY_*`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`) are read server-side only and never sent to the
  browser. The Supabase **publishable** key is public by design and safe to
  ship; the **service-role** key must never be committed or exposed with a
  `NEXT_PUBLIC_` prefix.

## The known gap — demo-grade database access

`supabase/schema.sql` ships **public (anon) Row Level Security** so the app
works instantly with just the publishable key. That means anyone with that
public key can currently read the tables — including worker KYC documents,
customer PII, and the `admin_users` table. **Fix this before real users.**

The hardening is staged in `supabase/hardening.sql`:

### Stage 1 — lock the crown jewels (KYC + admin) · recommended first

1. In Vercel → **Settings → Environment Variables**, add
   `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API →
   service_role). Redeploy.
2. The admin verification desk is already wired to the server route
   `/api/admin/applications` (service role, admin-only): it reads KYC through
   it on load and persists approve/reject decisions through it, falling back
   to the public path only while the key isn't set. Nothing to change here.
3. Run `supabase/hardening.sql` **Stage 1** in the Supabase SQL editor. This
   removes public access to `admin_users` and to reading `worker_applications`
   (workers can still submit), and makes the `kyc` storage bucket private.

After Stage 1, KYC documents, PII in applications, and admin password hashes
are no longer readable with the public key — the biggest exposure is closed,
and the customer/worker app keeps working unchanged.

### Stage 2 — per-user data isolation · needs Supabase Auth

To guarantee one customer can never read another's data, the app must
authenticate users with **Supabase Auth** (so requests carry `auth.uid()`), and
RLS must scope every row to its owner.

**The app code for this is already written** and ships switched off. Customer
login in `src/lib/auth.ts` runs in two modes sharing one UI: a demo on-screen
OTP (default) and real Supabase Phone/Email OTP. The mode is chosen by the
`NEXT_PUBLIC_SUPABASE_AUTH` env var — set it to `1` to switch on real auth.
When on, a customer's profile id **is** their `auth.uid()`, so every booking,
address and subscription they write already carries `customer_id = auth.uid()`
(the stores send `customer.id` unchanged). Unset, nothing changes — the demo
flow is byte-for-byte what it was, so previews and the shared project keep
working with zero setup.

Because a wrong policy can lock users out of their own data, **always test on a
preview deploy first.**

#### Stage 2 is split by which side of a row is authenticated

- **2a — customer-owned tables** (`customers`, `addresses`): each row belongs to
  one authenticated customer, so it can be locked to `auth.uid()` as soon as
  customer auth is on. Ready to enable (on a preview first).
- **2b — shared customer+worker tables** (`bookings`, `chat_messages`,
  `subscriptions`, `reviews`): each row is read by both a customer **and** a
  worker. Workers still sign in through the seed-demo picker (no `auth.uid()`),
  so locking these to `auth.uid()` would hide the worker portal's own jobs.
  **Do not enable 2b until worker login is also on Supabase Auth.** The 2b
  policies are left commented in `hardening.sql` on purpose.

#### Migration runbook (do this on a preview deploy, in order)

1. **Enable Stage 1 first** (service-role for KYC/admin, above) and confirm the
   app still works — it should, unchanged.
2. **Turn on a Supabase Auth provider.** In Supabase → Authentication →
   Providers, enable Phone OTP (via an SMS provider) and/or Email OTP.
3. **Flip the flag on the preview deploy.** Set `NEXT_PUBLIC_SUPABASE_AUTH=1`
   in the preview's environment variables and redeploy. The OTP screens are the
   same; the code is now texted/emailed and verified by Supabase, and the
   session comes from `supabase.auth` (with a localStorage mirror for offline).
4. **Sanity-check login before touching RLS.** Sign up a fresh customer, log
   out, log back in. Confirm the profile row in `customers` has `id` equal to
   the user's id under Supabase → Authentication → Users.
5. **Backfill (only if you have real rows).** Map any existing pre-auth
   `customer_id`s to the new auth uids before enabling policies, or the owner
   will lose access to their old rows.
6. **Enable Stage 2a** by uncommenting the 2a block in `hardening.sql` and
   running it on the preview.
7. **Verify with two accounts.** Log in as customer A, then customer B, and
   confirm neither can see the other's addresses/profile (the network tab should
   return only your own rows).
8. **Only then point production at it.** Set the flag + run 2a in production.
   Roll back instantly by re-applying the public policies from `schema.sql` if
   anything locks out.

**Worker auth (unlocks 2b) is a separate future step.** Today the worker portal
is a seed-data picker, not a real login, so per-worker isolation on the shared
tables isn't ready. When workers get real accounts (their `worker_id` becomes
their auth uid), enable the 2b block the same way. The admin panel already uses
its own signed-cookie login and the service role, so it is unaffected throughout.

## Reporting

Found a vulnerability? Email the address in the repo owner's profile rather
than opening a public issue.
