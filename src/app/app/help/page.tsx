"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";

/**
 * In-app Help & Support centre — FAQ, safety, and contact routes. The staple
 * "Help" surface every world-class app ships (Uber/Swiggy/Zomato) so a customer
 * never has to leave the app to get unstuck.
 */

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I book a worker?",
    a: "Open Home or Search, pick a service, choose a verified worker, select date & time (or ‘as soon as possible’), and pay. The worker confirms your slot and you can track them live.",
  },
  {
    q: "When can I chat with the worker?",
    a: "Chat opens right after you book, from My Bookings → Chat. You can share photos or videos of the problem, and the worker can share their work. For your safety, keep all conversation inside KAAM.",
  },
  {
    q: "What is the start code / OTP?",
    a: "When the worker arrives, share the 4-digit start code shown on your booking. The job only begins once they enter it — so no one can start work on your behalf.",
  },
  {
    q: "How are prices calculated?",
    a: "You pay one all-inclusive price: the service amount plus GST (and any state cess). There are no hidden charges and nothing extra to pay the worker directly. You can download a GST invoice after the job.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes. Go to My Bookings and tap Cancel. Cancelling before the worker accepts is free and fully refunded to KAAM Cash. After acceptance a small convenience fee may apply.",
  },
  {
    q: "What is KAAM Cash?",
    a: "Your in-app wallet. Earn it from welcome and referral bonuses and refunds, and use it at checkout. Refer a friend with your code and you both get ₹100.",
  },
  {
    q: "How do you verify workers?",
    a: "Every worker submits KYC (Aadhaar), experience proof and, where relevant, certificates. Our team reviews each application within 24 hours before they can take jobs.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full rounded-xl border border-line bg-white p-3.5 text-left"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold">{q}</span>
        <span className="text-mid">{open ? "▲" : "▼"}</span>
      </div>
      {open && <p className="mt-2 text-xs leading-relaxed text-mid">{a}</p>}
    </button>
  );
}

export default function HelpPage() {
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">Help &amp; Support</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-sm font-bold">👋 We&apos;re here to help</p>
        <p className="mt-1 text-xs text-white/80">
          Most answers are below. Still stuck? Ask KAAM Assist any time, in any language.
        </p>
        <Link
          href="/app/advisor"
          className="mt-3 inline-block rounded-xl bg-white/15 px-4 py-2 text-xs font-bold"
        >
          🤖 Chat with KAAM Assist →
        </Link>
      </Card>

      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Frequently asked</h2>
      <div className="mb-5 flex flex-col gap-2">
        {FAQS.map((f) => (
          <FaqItem key={f.q} {...f} />
        ))}
      </div>

      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">Safety &amp; contact</h2>
      <div className="flex flex-col gap-2">
        <a
          href="tel:112"
          className="flex items-center gap-3 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          🆘 Emergency — call 112
        </a>
        <a
          href="tel:+914842000000"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          📞 KAAM support helpline
        </a>
        <a
          href="mailto:support@kaam.app"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          ✉️ support@kaam.app
        </a>
      </div>

      <p className="mt-6 text-center text-[10px] leading-relaxed text-dim">
        KAAM Technologies Pvt. Ltd. · Kochi, Kerala
        <br />
        Available in English &amp; മലയാളം · more languages coming soon.
      </p>
    </main>
  );
}
