"use client";

import Link from "next/link";
import { BackLink, Card } from "@/components/ui";

/**
 * The KAAM Promise — the service guarantee that makes trust a moat. Five
 * commitments KAAM stands behind on every single job. Every promise links to
 * where it's actually delivered in the app, so it's a real guarantee, not a
 * marketing page.
 */
const PROMISES: { icon: string; title: string; body: string; href?: string; cta?: string }[] = [
  {
    icon: "✅",
    title: "Verified workers, every time",
    body: "Every worker is KYC-verified (Aadhaar), experience-checked, and reviewed by our team before their first job.",
  },
  {
    icon: "⭐",
    title: "Satisfaction guaranteed",
    body: "Not happy with the work? Tell us — we'll get it redone or refund you. No arguments at your doorstep.",
    href: "/app/support?category=quality",
    cta: "Report an issue",
  },
  {
    icon: "⏱️",
    title: "Fair pricing, always",
    body: "You pay only for the minutes actually worked, GST shown upfront, and nothing extra to hand the worker.",
    href: "/app/pricing",
    cta: "How you pay",
  },
  {
    icon: "🛡️",
    title: "Safe & protected",
    body: "OTP-started jobs, live tracking, one-tap SOS, and trusted-contact sharing keep every visit safe.",
    href: "/app/safety",
    cta: "Safety Center",
  },
  {
    icon: "💸",
    title: "Refunds without the runaround",
    body: "A cancelled or unsatisfactory job is refunded to KAAM Cash quickly — our support team settles it, no chasing.",
    href: "/app/support?category=refund",
    cta: "Request a refund",
  },
];

export default function PromisePage() {
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">The KAAM Promise</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-3xl">🤝</p>
        <p className="mt-2 font-display text-xl font-extrabold">We stand behind every job.</p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          Booking a stranger into your home takes trust. These five promises are how we earn it —
          on every single booking, or we make it right.
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {PROMISES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-extrabold">{p.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-mid">{p.body}</p>
                {p.href && (
                  <Link href={p.href} className="mt-2 inline-block text-[11px] font-bold text-kaam">
                    {p.cta} →
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/app/search"
        className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-kaam py-3.5 text-sm font-bold text-white shadow-kaam"
      >
        🔍 Book with confidence
      </Link>
    </main>
  );
}
