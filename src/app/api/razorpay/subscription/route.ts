/**
 * KAAM recurring billing — Razorpay subscription creation.
 *
 * POST { months, monthlyAmount, service, customerName?, customerEmail?, customerPhone? }
 *   → { provider, subscriptionId, shortUrl? }
 *
 * When RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set (Vercel → Settings →
 * Environment Variables), this creates a real Razorpay Plan + Subscription so
 * the customer is billed automatically each term. Without keys — or if the API
 * call fails — it returns a simulated reference so the Care Plan flow still
 * works end-to-end in demo mode. The app never breaks on a missing key.
 *
 * Razorpay keys are SECRET — never commit them, never expose them to the
 * client. This route runs server-side only.
 */

interface Body {
  months: number;
  monthlyAmount: number; // ₹ per month, tax-inclusive
  service: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

const RZP_API = "https://api.razorpay.com/v1";

/** Razorpay bills in native periods; we charge monthly at the plan's rate. */
function billingPeriod(): { period: "monthly"; interval: number } {
  return { period: "monthly", interval: 1 };
}

function simulatedRef(): string {
  return `sub_sim_${Math.random().toString(36).slice(2, 12)}`;
}

async function createRazorpaySubscription(body: Body, keyId: string, keySecret: string) {
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const headers = { Authorization: auth, "Content-Type": "application/json" };
  const { period, interval } = billingPeriod();

  // 1) Create a Plan billed monthly at the discounted per-month rate.
  const planRes = await fetch(`${RZP_API}/plans`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      period,
      interval,
      item: {
        name: `KAAM · ${body.service}`,
        amount: Math.round(body.monthlyAmount * 100), // paise
        currency: "INR",
        description: `${body.months}-month Care Plan on KAAM`,
      },
    }),
  });
  if (!planRes.ok) throw new Error(`Razorpay plan create failed: ${planRes.status}`);
  const plan = (await planRes.json()) as { id: string };

  // 2) Create the Subscription running for `months` billing cycles.
  const subRes = await fetch(`${RZP_API}/subscriptions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      plan_id: plan.id,
      total_count: Math.max(1, Math.round(body.months)),
      customer_notify: 1,
      notes: {
        service: body.service,
        customer: body.customerName ?? "",
        phone: body.customerPhone ?? "",
      },
    }),
  });
  if (!subRes.ok) throw new Error(`Razorpay subscription create failed: ${subRes.status}`);
  const sub = (await subRes.json()) as { id: string; short_url?: string };
  return { subscriptionId: sub.id, shortUrl: sub.short_url };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.months || body.months <= 0 || !body.monthlyAmount || body.monthlyAmount <= 0) {
    return Response.json({ error: "months and monthlyAmount are required" }, { status: 400 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    try {
      const { subscriptionId, shortUrl } = await createRazorpaySubscription(body, keyId, keySecret);
      return Response.json({ provider: "razorpay", subscriptionId, shortUrl });
    } catch (error) {
      console.error("Razorpay subscription failed, falling back to simulated", error);
    }
  }

  // Demo / no-keys fallback — the Care Plan is recorded and shown; live
  // auto-charging begins once Razorpay keys are added in Vercel.
  return Response.json({ provider: "simulated", subscriptionId: simulatedRef() });
}
