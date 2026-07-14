# Connecting KAAM to Supabase (goes live across all devices)

Right now KAAM stores everything in each visitor's browser, so it's perfect
for demos but bookings/chat/logins don't travel between phones. Connecting
Supabase gives KAAM one shared cloud database — the step that turns the demo
into a real multi-user product. It's free to start and takes about 10 minutes.

## Step 1 — Create the project (5 min, only you can do this)

1. Go to **[supabase.com](https://supabase.com)** → **Start your project** → sign
   in with GitHub.
2. **New project** → Name it `kaam` → **Region: Mumbai (ap-south-1)** (closest
   to Kerala) → set a database password (save it somewhere) → **Create**.
3. Wait ~2 minutes for it to provision.

## Step 2 — Create the tables (2 min)

1. In your project, open **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the
   whole file, paste it in, and click **Run**.
3. You should see "Success." This creates every table (customers, workers,
   applications, bookings, chat) with security rules and file storage.

## Step 3 — Get your two keys (1 min)

1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key. (Both are safe to put
   in the browser — that's what the anon key is for; the SQL security rules are
   what protect the data.)

## Step 4 — Add the keys to Vercel (2 min)

1. In your Vercel project: **Settings → Environment Variables**.
2. Add two variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
3. **Save**, then **Deployments → ⋯ → Redeploy**.

That's it. The app auto-detects the keys (`isSupabaseConfigured()`) and switches
from browser storage to the shared database — no code change needed.

## What you get once connected

- **Real accounts** — log in on any phone and your bookings are there.
- **Cross-device bookings & chat** — a booking a customer makes reaches the
  worker's phone instantly (Supabase Realtime).
- **Real KYC uploads** — documents stored in a private `kyc` bucket; work
  photos/videos in a public `media` bucket.
- **Your admin team** approves workers from anywhere.

## For local development (optional)

Copy `.env.example` to `.env.local`, paste the same two keys, and run
`npm run dev`.

## § Hardening (before scaling up)

The starter security policies in `schema.sql` let any signed-in user read/write
bookings and chat — fine for launch and testing, but before large-scale
production, tighten them so:
- bookings are visible only to the customer who made them and the assigned
  worker;
- a chat thread is readable only by its two participants;
- worker OTP login is wired to Supabase Auth phone provider (MSG91).

These are noted inline in `schema.sql`. Ping me when you've added the keys and
I'll flip the app's data layer over and tighten the policies against your live
database.
