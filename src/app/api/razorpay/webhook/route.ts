import crypto from "node:crypto";

/**
 * KAAM recurring billing — Razorpay webhook receiver.
 *
 * Razorpay calls this when a subscription is charged, cancelled or completed.
 * We verify the signature, then reflect the event onto the subscription row in
 * Supabase so the customer's "My Plans" screen updates in real time:
 *   - subscription.charged   → roll the term forward, append a charge
 *   - subscription.cancelled → mark cancelled
 *   - subscription.completed → mark expired (term finished, no more renewals)
 *
 * Set RAZORPAY_WEBHOOK_SECRET (Vercel → Settings → Environment Variables) to
 * the secret you configure on the Razorpay webhook. Without it we skip
 * verification and no-op, so nothing breaks in demo mode.
 */

const SB_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://gdhmyjrkpkysxnibaxqy.supabase.co";
const SB_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_4qDLLe1uCiYGIaAzRXmf3A_OLJd79dD";

function verify(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

type Row = {
  id: string;
  months: number;
  renews_on: string;
  term_amount: number;
  history: { date: string; amount: number; ref: string }[];
};

function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months, 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

async function findByRef(paymentRef: string): Promise<Row | null> {
  const res = await fetch(
    `${SB_URL}/rest/v1/subscriptions?payment_ref=eq.${encodeURIComponent(paymentRef)}&select=id,months,renews_on,term_amount,history`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

async function patch(id: string, body: Record<string, unknown>) {
  await fetch(`${SB_URL}/rest/v1/subscriptions?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
}

export async function POST(request: Request) {
  const raw = await request.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // In demo mode (no secret) we acknowledge without acting.
  if (!secret) return Response.json({ ok: true, mode: "demo" });

  if (!verify(raw, request.headers.get("x-razorpay-signature"), secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: { subscription?: { entity?: { id?: string } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ref = event.payload?.subscription?.entity?.id;
  if (!ref) return Response.json({ ok: true }); // not a subscription event

  try {
    const row = await findByRef(ref);
    if (!row) return Response.json({ ok: true });

    switch (event.event) {
      case "subscription.charged": {
        const charge = { date: new Date().toISOString(), amount: row.term_amount, ref };
        await patch(row.id, {
          status: "active",
          renews_on: addMonths(row.renews_on, row.months),
          history: [...(row.history ?? []), charge],
        });
        break;
      }
      case "subscription.cancelled":
        await patch(row.id, { status: "cancelled", auto_renew: false });
        break;
      case "subscription.completed":
        await patch(row.id, { status: "expired", auto_renew: false });
        break;
    }
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    // Still 200 so Razorpay doesn't hammer retries on a transient DB blip.
  }

  return Response.json({ ok: true });
}
