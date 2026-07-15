# KAAM 🔨 — Kerala's own services marketplace

**Verified local workers at your door in 18 minutes.** Electricians, plumbers, nurses, violinists, baby sitters and 25 more services across Kerala — police-verified, transparently priced, and workers keep 85% of every rupee.

A production-structured Next.js 16 + TypeScript + Tailwind 4 app with three surfaces (customer app, worker portal, admin console), a fully-tested pricing/tax engine, live maps, chat, an AI Advisor, and a growth/retention layer modelled on the best of Uber, Swiggy, Zomato and Urban Company.

![Landing](docs/screenshots/shot6-landing-kerala.png)

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # domain unit tests (vitest)
npm run build      # production build
```

Demo login: any 10-digit mobile or email, OTP code **`4321`**.
Admin console (`/admin`): `admin` / `kaam2026` (change via env vars).

## Surfaces

| Route | Who | Highlights |
| --- | --- | --- |
| `/` | Marketing | Kerala-green kasavu-gold hero, Malayalam wordmark, sector grid |
| `/app` | **Customer** | Sign-up (mobile/email + OTP), 30 services in 6 sectors, AI Advisor (text + voice), search, booking, live tracking, chat, wallet, referrals, favorites |
| `/worker` | **Worker** | Online/offline toggle, Uber-style job offers with location + accept timer, live customer map + navigate, earnings, chat, enquiries |
| `/worker/signup` | **Worker onboarding** | 3-step KYC wizard: profile → Aadhaar docs → work photos/videos + social links → 24h review status |
| `/admin` | **Owner team** | Password-gated verification desk (24h SLA, approve/reject), GMV/GST/TDS KPIs, live booking ledger, worker roster |

## Feature map

**Discovery & booking**
- 30 services across 6 sectors (Maintenance, Care & Health, Art & Music, Hospitality, Beauty & Wellness, Everyday)
- Smart worker ranking (proximity + rating + accept-rate + volume; online first)
- 3-step booking: service → schedule (ASAP or date/time) → payment
- Saved addresses (Home/Office/Other) as one-tap chips
- Fixed customer pricing: service + GST only — the 15% commission is hidden and settled behind the scenes

**Scheduling & fulfilment**
- Customer picks ASAP or a date/time slot; worker confirms or "can't make it" → customer re-proposes
- Live status timeline (Domino's-style stepper): placed → confirmed → in progress → completed
- Live map tracking (Leaflet + OpenStreetMap, no API key): worker glides toward the customer with live ETA + km
- Worker sees the customer's location on a map with a 🧭 Navigate deep-link

**Trust & safety**
- Worker KYC onboarding + admin verification with a 24-hour SLA
- OTP to start a job; police-verified badges
- 🛡️ SOS Safety Center on active bookings: call 112, share live GPS, call the KAAM safety desk
- In-app chat only (no phone numbers exchanged)

**Communication**
- Per-booking chat with photo/video/link sharing, quick replies, read receipts, system status messages
- Pre-booking enquiry chat from any worker profile
- Voice-first AI Advisor in Malayalam & English (speak your problem, hear the answer)

**Growth & retention**
- KAAM Cash wallet: ₹100 welcome bonus, usable at checkout
- Referral program ("Give ₹100, Get ₹100") with shareable codes
- Ratings + photo reviews on worker profiles
- Post-job tipping (100% to the worker)
- Favorite workers + one-tap rebook from the home screen

**Platform**
- English + Malayalam (i18n), Kerala-only launch
- Installable PWA (add to home screen, offline-capable shell)
- AI Advisor via Claude API (`claude-opus-4-8`) with a keyword-matcher fallback
- Supabase-ready: schema, RLS, storage, and realtime in `supabase/` — see `SUPABASE_SETUP.md`

## Business logic (unit-tested)

The engine in [`src/lib/pricing.ts`](src/lib/pricing.ts) implements the build guide's money flow:

```
Customer pays = service amount + GST @18%   (commission hidden)
Worker gets   = service amount − 15% platform fee − 1% TDS (Sec 194-O)
```

Tenure multipliers (Hourly ×1 … 3-Months ×480), 1.2× surge, and a state-cess engine (Kerala 0% today, retained for expansion). Tests in `src/lib/__tests__/` verify the canonical example to the rupee: a ₹500/visit Daily booking → customer pays **₹4,130**, worker takes home **₹2,940**.

## Architecture

```
src/
├── app/
│   ├── page.tsx            # marketing landing (Kerala identity)
│   ├── app/                # customer app (login, account, search, book, bookings, chat, advisor)
│   ├── worker/             # worker portal + /worker/signup KYC wizard
│   ├── admin/              # password-gated owner console + /admin/login
│   └── api/                # advisor, admin auth, (Supabase-ready)
├── components/             # ui, worker-card, chat-panel, live-map, status-timeline, sos-button…
├── data/                   # Kerala categories + demo worker roster
├── lib/                    # framework-free domain + client stores
│   ├── pricing / matching / geo          # tax engine, ranking, maps (unit-tested)
│   ├── auth / wallet / addresses         # customer identity + growth
│   ├── bookings / chat / reviews / favorites / applications
│   ├── i18n / advisor / media / admin-auth
│   └── supabase.ts         # cloud switch (auto-activates when keys present)
├── proxy.ts                # Next 16 proxy guarding /admin
supabase/schema.sql         # full Postgres schema + RLS + storage + realtime
```

The domain layer (`src/lib`, `src/data`) has **zero framework dependencies** — designed to lift into the production Node API and a future React Native app. Client stores use `localStorage` today and switch to Supabase automatically once configured.

## Path to production

| Concern | Demo today | Production |
| --- | --- | --- |
| Data & realtime | localStorage stores | Supabase (schema + RLS shipped) — add keys, redeploy |
| Payments | simulated Razorpay + KAAM Cash | Razorpay Route auto-split (85% worker) |
| OTP auth | on-screen demo code | MSG91 SMS / email via Supabase Auth |
| GPS tracking | simulated glide + ETA | live device GPS over Supabase Realtime |
| KYC | uploads in browser | HyperVerge + DigiLocker + police check |
| Maps | Leaflet + OSM (free) | keep OSM or Google Maps Platform |

---

© 2026 KAAM Technologies Pvt. Ltd. · കേരളത്തിന്റെ സ്വന്തം സേവന ആപ്പ് · Made in Kerala 🌴
