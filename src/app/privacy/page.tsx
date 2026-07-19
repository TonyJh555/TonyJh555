import type { Metadata } from "next";
import Link from "next/link";
import { KaamWordmark } from "@/components/logo";

export const metadata: Metadata = { title: "Privacy Policy" };

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "1. What we collect",
    body: [
      "Account details: your name and mobile number or email. Booking details: the service, address/location you choose, schedule and payment status. Location: only when you use \"current location\" for nearest-first search or live tracking — never in the background. Workers additionally provide KYC documents (Aadhaar, certificates) and work photos for verification.",
    ],
  },
  {
    h: "2. How we use it",
    body: [
      "To match you with nearby verified workers, process bookings and payments, keep both sides safe (two-way ratings, SOS, support), send booking updates, and improve the service. If you chat with the AI Advisor, your message is processed to recommend the right service.",
    ],
  },
  {
    h: "3. What we share",
    body: [
      "The worker sees your first name, the service, schedule and the address you provide for the job — never your payment details. Payment processing is handled by Razorpay. We never sell your personal data.",
    ],
  },
  {
    h: "4. KYC documents",
    body: [
      "Worker KYC documents are used solely for identity verification by KAAM's verification team, stored securely, and are not visible to customers or other workers.",
    ],
  },
  {
    h: "5. Your controls",
    body: [
      "You can edit your addresses, clear recent searches, switch off notifications, and log out at any time in the app. To delete your account and data, raise a request in Help & Support — we complete deletion within 30 days, keeping only what tax law requires (invoices).",
    ],
  },
  {
    h: "6. Security",
    body: [
      "Traffic is encrypted (HTTPS with HSTS). Admin access is credential-gated. We continuously harden data access controls; see SECURITY.md in our repository for the current posture.",
    ],
  },
  {
    h: "7. Contact",
    body: [
      "Privacy questions or requests: raise a ticket in Help & Support in the app. We reply within 48 hours.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="mb-6 inline-block">
        <KaamWordmark size={28} />
      </Link>
      <h1 className="font-display text-2xl font-extrabold text-ink">Privacy Policy</h1>
      <p className="mt-1 text-xs text-dim">Last updated: July 2026</p>
      {SECTIONS.map((s) => (
        <section key={s.h} className="mt-6">
          <h2 className="font-display text-base font-bold text-ink">{s.h}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-mid">
              {p}
            </p>
          ))}
        </section>
      ))}
      <p className="mt-8 text-xs text-dim">
        See also our{" "}
        <Link href="/terms" className="font-bold text-kaam">
          Terms of Service
        </Link>
        .
      </p>
    </main>
  );
}
