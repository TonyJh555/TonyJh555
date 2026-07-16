/**
 * Emails a worker when their KYC application is approved or rejected.
 *
 * Uses Resend when RESEND_API_KEY is set (add it in Vercel → Settings →
 * Environment Variables). Without a key it no-ops gracefully — the worker still
 * sees the decision live in the app's Status tab. Set RESEND_FROM to a verified
 * sender; defaults to Resend's shared test sender.
 */

interface Body {
  email?: string;
  name?: string;
  decision?: "approved" | "rejected";
  reason?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }

  const { email, name = "there", decision, reason } = body;
  if (!email || (decision !== "approved" && decision !== "rejected")) {
    return Response.json({ ok: false, reason: "missing-fields" }, { status: 400 });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("notify-worker: RESEND_API_KEY not set — skipping email", { email, decision });
    return Response.json({ ok: false, reason: "not-configured" });
  }

  const approved = decision === "approved";
  const subject = approved
    ? "🎉 You're approved to work with KAAM!"
    : "Update on your KAAM application";
  const html = approved
    ? `<div style="font-family:sans-serif;max-width:480px">
         <h2 style="color:#0f6e4f">Welcome to KAAM, ${escapeHtml(name)}! 🎉</h2>
         <p>Your documents have been verified and your account is <b>approved</b>.
         Open the KAAM worker app, go online, and start accepting jobs near you.</p>
         <p style="color:#667">— Team KAAM · Kerala</p>
       </div>`
    : `<div style="font-family:sans-serif;max-width:480px">
         <h2 style="color:#C41E3A">Hi ${escapeHtml(name)}, an update on your application</h2>
         <p>Unfortunately we couldn't approve your application yet.</p>
         ${reason ? `<p><b>Reason:</b> ${escapeHtml(reason)}</p>` : ""}
         <p>You can fix the issue and re-apply anytime from the KAAM worker app.</p>
         <p style="color:#667">— Team KAAM · Kerala</p>
       </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "KAAM <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });
    return Response.json({ ok: res.ok });
  } catch (error) {
    console.error("notify-worker: send failed", error);
    return Response.json({ ok: false, reason: "send-failed" }, { status: 502 });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
