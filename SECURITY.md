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

To guarantee one customer can never read another's bookings/chat/addresses, the
app must authenticate users with **Supabase Auth** (so requests carry
`auth.uid()`), and RLS must scope every row to its owner. The owner-scoped
policies are written and ready (commented) at the bottom of
`hardening.sql`. This is a login migration — plan to test it on a preview
deploy before enabling in production, because a wrong policy can lock users out
of their own data.

#### Migration runbook (do this on a preview deploy, in order)

Today customer login is a demo model: an on-screen OTP with the session and
accounts held in `localStorage` (`src/lib/auth.ts`), and `customer_id` is a
locally-generated id. Stage 2 replaces the **identity source** with Supabase
Auth so every request carries a real `auth.uid()`, then scopes rows to it.

1. **Turn on a Supabase Auth provider.** In Supabase → Authentication →
   Providers, enable Phone OTP (via an SMS provider) and/or Email OTP. Nothing
   in the app changes yet.
2. **Swap the identity calls, keep the UI.** In `src/lib/auth.ts`, back the
   existing send-code / verify-code steps with `supabase.auth.signInWithOtp()`
   and `supabase.auth.verifyOtp()`. The OTP screens stay; only the source of
   truth moves from localStorage to the Supabase session. Use
   `supabase.auth.getUser()` / `onAuthStateChange` to hydrate `useCustomer()`.
3. **Key the profile by `auth.uid()`.** Store the customer's name/profile in a
   `customers` row whose `id` **is** `auth.uid()`. From then on, write
   `customer_id = auth.uid()` on every booking, address, and subscription
   (the stores already send `customer.id` — it just needs to be the auth uid).
4. **Backfill (only if you have real rows).** Map any existing
   `customer_id`s to the new auth uids before enabling policies, or the owner
   will lose access to their old rows.
5. **Enable Stage 1 first** (service-role for KYC/admin) and confirm the app
   still works — it should, unchanged.
6. **Enable Stage 2 policies** by uncommenting the owner-scoped block in
   `hardening.sql` and running it. Do this on a **preview** project first.
7. **Verify with two accounts.** Log in as customer A, then customer B, and
   confirm neither can see the other's bookings/chat/addresses (check the
   network tab returns only your own rows). Test worker access too.
8. **Only then point production at it.** Roll back instantly by re-applying the
   public policies from `schema.sql` if anything locks out.

Workers authenticate the same way (their `worker_id` becomes their auth uid);
the admin panel already uses its own signed-cookie login and the service role,
so it is unaffected by this migration.

## Reporting

Found a vulnerability? Email the address in the repo owner's profile rather
than opening a public issue.
