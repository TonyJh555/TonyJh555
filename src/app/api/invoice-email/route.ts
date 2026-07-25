/**
 * Job-completion invoice email — the receipt every serious app sends the
 * moment a job ends (Uber, Ola, Urban Company all do this).
 *
 * Two audiences, two documents:
 *  - the customer gets a GST tax invoice: what they paid and why, including
 *    the fair-billing line when a metered job ran past the base hour;
 *  - the worker gets an earnings statement: job value minus platform fee and
 *    TDS, so their payout is never a mystery.
 *
 * Uses Resend when RESEND_API_KEY is set (Vercel → Settings → Environment
 * Variables). Without a key it no-ops gracefully — the in-app invoice at
 * /app/receipt/[id] is always available regardless. Set RESEND_FROM to a
 * verified sender.
 */

interface Body {
  bookingId?: string;
  service?: string;
  workerName?: string;
  /** ISO timestamps for the record. */
  startedAt?: string;
  completedAt?: string;
  /** Minutes actually worked / billed, when the job was metered. */
  actualMinutes?: number;
  billedMinutes?: number;
  /** Money, in ₹. */
  serviceAmount?: number;
  gst?: number;
  cess?: number;
  memberDiscount?: number;
  couponCode?: string;
  couponDiscount?: number;
  walletApplied?: number;
  total?: number;
  platformFee?: number;
  tds?: number;
  workerPayout?: number;
  paymentMethod?: string;
  /** Recipients — either may be absent (e.g. a phone-only customer). */
  customerEmail?: string;
  customerName?: string;
  workerEmail?: string;
  appUrl?: string;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function clock(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function sendEmail(key: string, from: string, to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

const wrap = (inner: string) =>
  `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#14201b;max-width:560px">` +
  `<div style="background:linear-gradient(135deg,#0f6e4f,#0a4d37);color:#fff;padding:20px 24px;border-radius:16px 16px 0 0">` +
  `<div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">KAAM</div>` +
  `<div style="font-size:12px;opacity:.8">Kerala's own services marketplace</div></div>` +
  `<div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 16px 16px;padding:24px">${inner}` +
  `<p style="font-size:11px;color:#8a978f;margin-top:24px">` +
  `All-inclusive pricing — GST shown upfront, nothing extra paid directly to the worker.<br/>` +
  `This is a computer-generated document. KAAM Technologies Pvt. Ltd. · Kochi, Kerala.</p></div></div>`;

const row = (label: string, value: string, bold = false) =>
  `<tr><td style="padding:6px 0;color:${bold ? "#14201b" : "#5b6b64"};font-weight:${bold ? 700 : 400}">${label}</td>` +
  `<td style="padding:6px 0;text-align:right;font-weight:${bold ? 800 : 600}">${value}</td></tr>`;

export async function POST(request: Request) {
  let b: Body;
  try {
    b = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("invoice-email: RESEND_API_KEY not set — skipping", { bookingId: b.bookingId });
    return Response.json({ ok: false, reason: "not-configured" });
  }
  const from = process.env.RESEND_FROM || "KAAM <onboarding@resend.dev>";

  const service = b.service ?? "Service";
  const invoiceNo = `KAAM-${(b.bookingId ?? "").slice(-8).toUpperCase()}`;
  const sent: string[] = [];

  // Fair-billing note only when a metered job actually ran past the base hour.
  const extra = (b.billedMinutes ?? 0) - 60;
  const meterLine =
    b.billedMinutes && extra > 0
      ? `<p style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px;font-size:12px;color:#9a3412">` +
        `⏱ <b>Fair billing:</b> the job ran ${b.actualMinutes} min. You were charged the base hour plus ` +
        `${extra} extra minute${extra === 1 ? "" : "s"} at the per-minute rate — never rounded up to a second hour.</p>`
      : b.billedMinutes
        ? `<p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px;font-size:12px;color:#166534">` +
          `⏱ <b>Fair billing:</b> the job took ${b.actualMinutes} min — fully covered by the base hour, nothing extra charged.</p>`
        : "";

  // 1) Customer tax invoice.
  if (b.customerEmail) {
    const html = wrap(
      `<h2 style="margin:0 0 4px">Tax invoice</h2>` +
        `<p style="color:#5b6b64;font-size:13px;margin:0 0 16px">${invoiceNo} · ${clock(b.completedAt)}</p>` +
        `<p style="margin:0 0 12px">Hi ${b.customerName ?? "there"}, thanks for booking with KAAM. Here's your invoice for <b>${service}</b> by ${b.workerName ?? "your worker"}.</p>` +
        `<table style="width:100%;border-collapse:collapse;font-size:14px">` +
        row("Started", clock(b.startedAt)) +
        row("Completed", clock(b.completedAt)) +
        (b.billedMinutes ? row("Time billed", `${b.billedMinutes} min`) : "") +
        `<tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:8px"></td></tr>` +
        row("Service amount", inr(b.serviceAmount ?? 0)) +
        row("GST @18%", `+ ${inr(b.gst ?? 0)}`) +
        ((b.cess ?? 0) > 0 ? row("State welfare cess", `+ ${inr(b.cess ?? 0)}`) : "") +
        ((b.memberDiscount ?? 0) > 0 ? row("KAAM Plus member discount", `− ${inr(b.memberDiscount ?? 0)}`) : "") +
        ((b.couponDiscount ?? 0) > 0
          ? row(`Coupon ${b.couponCode ?? ""}`.trim(), `− ${inr(b.couponDiscount ?? 0)}`)
          : "") +
        ((b.walletApplied ?? 0) > 0 ? row("KAAM Cash applied", `− ${inr(b.walletApplied ?? 0)}`) : "") +
        `<tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:8px"></td></tr>` +
        row("Total paid", inr(b.total ?? 0), true) +
        `</table>${meterLine}` +
        (b.appUrl
          ? `<p style="margin-top:18px"><a href="${b.appUrl}/app/receipt/${b.bookingId}" style="background:#0f6e4f;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:14px">View invoice in app →</a></p>`
          : "") +
        `<p style="margin-top:16px">Something not right? Reply here or raise a request in the app — our team responds fast. 💚</p>`,
    );
    try {
      await sendEmail(key, from, b.customerEmail, `Your KAAM invoice · ${service} · ${inr(b.total ?? 0)}`, html);
      sent.push("customer");
    } catch {
      /* best-effort */
    }
  }

  // 2) Worker earnings statement.
  if (b.workerEmail) {
    const html = wrap(
      `<h2 style="margin:0 0 4px">Earnings statement</h2>` +
        `<p style="color:#5b6b64;font-size:13px;margin:0 0 16px">${invoiceNo} · ${clock(b.completedAt)}</p>` +
        `<p style="margin:0 0 12px">Great work, ${b.workerName ?? "there"}! Here's what you earned on <b>${service}</b>.</p>` +
        `<table style="width:100%;border-collapse:collapse;font-size:14px">` +
        (b.billedMinutes ? row("Time billed", `${b.billedMinutes} min`) : "") +
        row("Job value", inr(b.serviceAmount ?? 0)) +
        row("KAAM platform fee (15%)", `− ${inr(b.platformFee ?? 0)}`) +
        row("TDS @1% (Sec 194-O)", `− ${inr(b.tds ?? 0)}`) +
        `<tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:8px"></td></tr>` +
        row("You receive", inr(b.workerPayout ?? 0), true) +
        `</table>` +
        `<p style="margin-top:16px">Payouts reach your account fast — track them in the Earnings tab. 💚</p>`,
    );
    try {
      await sendEmail(key, from, b.workerEmail, `You earned ${inr(b.workerPayout ?? 0)} · ${service}`, html);
      sent.push("worker");
    } catch {
      /* best-effort */
    }
  }

  return Response.json({ ok: true, sent });
}
