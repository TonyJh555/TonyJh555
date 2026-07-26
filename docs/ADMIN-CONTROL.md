# What the owner controls without a developer

The rule KAAM follows: **anything you'd change on a Tuesday afternoon belongs in
the admin console. Anything that changes money maths or the law belongs in
code, with a test and a review.**

Everything editable goes through one mechanism — a keyed JSON document in the
`site_content` table, read by `useContent(key, fallback)`. The fallback is
always the built-in default, which means three good things:

- an empty table is a working app (nothing to seed);
- "Reset to default" deletes the row rather than writing values back, so there
  is always a known-good state to return to;
- a new editable surface is a small job, not a new subsystem.

## Done

| Surface | Where |
| --- | --- |
| **Home banners** — headline and sub-line in both languages, button text, link, photo, on/off, order | Admin → 🖼️ Content |
| **Offers & promo codes** — code, flat ₹ or capped %, minimum spend, start/end dates, which services, on/off | Admin → 🖼️ Content |

The offers editor validates before it will publish: a duplicate code, a
percentage over 100, a zero discount or an end date before the start date all
block the Publish button with the reason spelled out. Switching an offer off
stops it working immediately and keeps the code for next year.

## Next, in the order I'd build them

**1. The festival strip** — the seasonal ribbon on the home screen (`seasonal.ts`).
Onam, Vishu, Ramadan, Christmas: dates, message, discount, which services.

**2. Home promo cards** — the "Refer & earn", "NRI family", "Every worker
verified" cards. Text, icon, link, order, on/off.

**3. Service catalogue** — category names in both languages, icons, base price,
sub-services, and whether a category is live at all. Price is money, so this
one needs the audit trail below.

**4. Cities and districts** — where KAAM operates. Launching a new district
should be a toggle, not a deploy.

**5. Push and notification copy** — "your worker is on the way", reminder
wording, the review nudge. Marketing text that currently lives in components.

**6. Help, FAQ, Terms, Privacy** — long-form pages. These change when a lawyer
says so, and you shouldn't need me for that.

**7. KAAM Plus** — price, perks list, discount percentage. Money: needs audit.

**8. Referral and cashback amounts** — currently ₹100 each way. Money: needs audit.

**9. Support canned replies** — already a list in code; belongs with the
support desk so agents can add their own.

## Money settings need one more thing first

Category prices, commission percentage, Plus pricing, referral amounts and
surge multiplier are all reasonable things for an owner to change — but a typo
in a commission field is a very different event from a typo in a headline.
Before any of those go in the console they need:

- **an audit trail** — who changed what, from what to what, when;
- **a confirmation step** showing the before and after;
- **a sane range check** — commission can't be 150%, a price can't be ₹0;
- **no retrospective effect** — a price change must never alter a booking that
  already exists. Every booking already freezes its own quote, so this holds
  today, but it's the thing to re-check when prices become editable.

## Never in the console

- **GST 18%, TDS 1% under Section 194-O, the Kerala welfare cess.** These are
  set by law, not by you. They change in code when the law changes.
- **The fair-billing algorithm** — base hour, grace period, per-minute
  overtime. This is the promise the whole product rests on.
- **Payout maths and the settlement rules.**
- **Security rules, RLS policies, admin roles.**

Being unable to change these from a web form is a feature. It's also what you
want to be able to tell a regulator.

## Adding a new editable surface

1. Give it a key: `home.banners`, `offers.coupons`, `catalogue.categories`.
2. Keep the current hard-coded value and export it as the default.
3. Read it with `useContent(key, DEFAULT)`.
4. Add an editor section in Admin → Content.

The reading side is one line. The editor is the only real work, and it's the
part that should be tailored — a coupon editor should validate a discount, not
present raw JSON.
