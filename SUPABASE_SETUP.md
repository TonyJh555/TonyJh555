# Turning on cross-device sync (one step, ~2 minutes)

KAAM already works today — it stores data on each device. The **one** thing
that needs your Supabase account is making data travel *between* devices (a
booking on a customer's phone showing up on the worker's phone). The
connection keys are already baked into the app, so there is now just a single
step: create the database tables once.

## The only required step — run the schema

1. Go to **[supabase.com](https://supabase.com)** and sign in (the KAAM project
   is `gdhmyjrkpkysxnibaxqy`).
2. Open your project → click **SQL Editor** in the left sidebar → **New query**.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repo, **copy the
   whole file**, paste it into the query box, and click **Run** (or press
   Ctrl/Cmd + Enter).
4. You should see **"Success. No rows returned."** — that's it. Every table
   (bookings, chat, worker applications) plus security rules, realtime, and
   file storage are now created.

The file is safe to run again anytime — re-running just recreates the empty
tables. Nothing else is needed; the app auto-connects on the next page load.

## Optional — turn on the smartest AI replies

The AI Advisor works without any key (built-in keyword matching). To unlock
full natural conversation in every language, add ONE variable in Vercel:

1. Vercel project → **Settings → Environment Variables**.
2. Add `ANTHROPIC_API_KEY` = your key from
   [console.anthropic.com](https://console.anthropic.com) → **Save**.
3. **Deployments → ⋯ → Redeploy**.

## What you get once the schema is run

- **Cross-device bookings & chat** — a booking a customer makes reaches the
  worker's phone instantly (Supabase Realtime).
- **Real accounts** — the same login works on any phone.
- **Your admin team** approves workers from anywhere.
- **File storage** — KYC docs in a private bucket, work photos/videos in a
  public one.

## Recurring billing for Care Plans (optional)

Care Plans (1/3/6-month subscriptions) work in demo mode with no setup — a plan
is recorded and shown under **My Care Plans**, but nothing is auto-charged. To
turn on real automatic renewals via **Razorpay**, add these secret env vars in
Vercel → **Settings → Environment Variables** (never commit them):

- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — from your Razorpay dashboard.
  With these, each new plan creates a live Razorpay subscription that bills the
  customer automatically every term.
- `RAZORPAY_WEBHOOK_SECRET` — set the same value on a Razorpay webhook pointing
  at `https://<your-app>/api/razorpay/webhook`, subscribed to
  `subscription.charged`, `subscription.cancelled`, `subscription.completed`.
  Renewals then roll the plan forward and update **My Care Plans** in real time.

Run the schema again after this update so the new `subscriptions` table exists.

## Pointing at a different Supabase project (optional)

The KAAM project URL + publishable key are baked into `src/lib/supabase.ts` as
defaults (both are public values, safe to commit). To use a different project,
set these in Vercel → Environment Variables (they override the defaults):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## § Hardening (before scaling up)

The starter security policies in `schema.sql` allow public read/write with the
publishable key — fine for launch and testing, but before large-scale
production, wire Supabase Auth and tighten Row Level Security so bookings and
chat threads are visible only to their participants. These are noted inline in
`schema.sql`. Ping me when you're ready and I'll tighten them against your live
database.
