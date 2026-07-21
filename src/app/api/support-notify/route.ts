/**
 * Support ticket notifications.
 *
 * On a new ticket we (1) acknowledge the customer/worker by email with the
 * SLA response time, and (2) escalate SERIOUS tickets (safety / refund /
 * payment) to the internal support inbox so nothing urgent is missed.
 *
 * Uses Resend when RESEND_API_KEY is set (Vercel → Settings → Environment
 * Variables). Without a key it no-ops gracefully — the ticket still appears
 * live in the admin Support desk with its SLA. Set RESEND_FROM to a verified
 * sender and SUPPORT_INBOX to your team address.
 */

interface Body {
  email?: string;
  name?: string;
  raisedBy?: "customer" | "worker";
  category?: string;
  subject?: string;
  serious?: boolean;
  targetHours?: number;
}

async function sendEmail(key: string, from: string, to: string, subject: string, html: string) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const { email, name = "there", subject = "your request", serious, targetHours = 24 } = body;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("support-notify: RESEND_API_KEY not set — skipping email", { email, subject, serious });
    return Response.json({ ok: false, reason: "not-configured" });
  }
  const from = process.env.RESEND_FROM || "KAAM Support <onboarding@resend.dev>";
  const inbox = process.env.SUPPORT_INBOX || from;

  const results: string[] = [];

  // 1) Acknowledge the raiser.
  if (email) {
    const ack =
      `<div style="font-family:sans-serif;line-height:1.6">` +
      `<h2>We've got your request 🛠️</h2>` +
      `<p>Hi ${name}, thanks for reaching out to KAAM Support about "<b>${subject}</b>".</p>` +
      `<p>Our team will respond within <b>${targetHours} hour${targetHours === 1 ? "" : "s"}</b>. ` +
      `You can also follow the conversation live in the app.</p>` +
      `<p>— Team KAAM 💚</p></div>`;
    try {
      await sendEmail(key, from, email, `We've received: ${subject}`, ack);
      results.push("acknowledged");
    } catch {
      /* best-effort */
    }
  }

  // 2) Escalate serious tickets internally.
  if (serious) {
    const alert =
      `<div style="font-family:sans-serif;line-height:1.6">` +
      `<h2>🔴 Serious support ticket</h2>` +
      `<p><b>${subject}</b> — raised by a ${body.raisedBy ?? "user"} (${name}).</p>` +
      `<p>SLA: respond within <b>${targetHours}h</b>. Open the admin Support desk to action it.</p></div>`;
    try {
      await sendEmail(key, from, inbox, `🔴 Serious ticket: ${subject}`, alert);
      results.push("escalated");
    } catch {
      /* best-effort */
    }
  }

  return Response.json({ ok: true, did: results });
}
