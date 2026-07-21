# Before real workers join — the 10-minute security checklist

**Plain-language version.** You (or any developer) can follow this top to bottom.
It has nothing to do with writing code — it's clicking in two websites:
**Supabase** (your database) and **Vercel** (where the app is hosted).

## When to do this

Do it **shortly before real workers start signing up and uploading real ID
documents** (Aadhaar, certificates). Until then the app runs on demo data and
there is nothing sensitive to protect, so there is no rush.

## What it does, in one sentence

It stops the app's *public* key from being able to read worker ID documents,
customer personal details, and admin passwords — moving those behind a *secret*
key that only the server (never the browser) can use.

---

## The steps

### 1. Copy the secret key from Supabase
- Open **supabase.com/dashboard** → your KAAM project.
- Gear icon (**Project Settings**) → **API**.
- Under **Project API keys**, find the row labelled **`service_role`** (marked
  *secret*). Click **Reveal**, then **Copy**.
- ⚠️ This key is like a master password. Never put it in code, never share it,
  never paste it anywhere public.

### 2. Give the key to Vercel and redeploy
- Open **vercel.com** → your KAAM project → **Settings** → **Environment
  Variables**.
- Add one:
  - Name: `SUPABASE_SERVICE_ROLE_KEY`
  - Value: paste the key from step 1
  - Tick **Production** (and **Preview** to test there first).
- **Save**.
- Go to **Deployments** → newest one → **⋯** → **Redeploy**. Wait for green.

> Nothing has changed for users yet. You've only *added* the private path.

### 3. Check the admin desk still works
- Open your live site → **/admin** → log in → open the worker verification /
  KYC desk. The applications should still show. (This proves the private path
  is live.)

### 4. Run the one SQL paste
- In **Supabase** → **SQL Editor** → **New query**.
- Open the file `supabase/hardening.sql` from the code, copy the **whole file**,
  paste it in, click **Run**.
- Expect: **"Success. No rows returned."**

### 5. Confirm
- Refresh **/admin** → KYC desk → applications should **still load** (good — the
  server uses the secret key).
- Done: the public key can no longer read ID documents, personal data, or admin
  passwords.

---

## If something looks wrong (rollback)

Open `supabase/schema.sql`, find the two policies named `applications_public`
and `admin_users_public`, and re-run just those two `create policy …` statements
in the Supabase SQL Editor. That instantly puts things back. No data is ever
lost by any step here.

---

## What this does NOT cover (a later, bigger step)

Making sure one customer can never read another customer's bookings needs a
real login system (Supabase Auth). That code is already written and switched
off by a flag — see **SECURITY.md** for the full runbook. It's a supervised
step to do on a test (Preview) deploy first, because a wrong setting there can
lock people out of their own data. Don't rush it; do it with a developer or
with step-by-step help.
