import type { Metadata } from "next";
import Link from "next/link";
import { KaamWordmark } from "@/components/logo";

export const metadata: Metadata = { title: "Terms of Service" };

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "1. About KAAM",
    body: [
      "KAAM is a marketplace that connects customers in Kerala with independent, KYC-verified service professionals (\"workers\") — electricians, plumbers, nurses, cooks, tutors, artists and more. KAAM facilitates discovery, booking, communication and payment; the services themselves are performed by independent workers.",
    ],
  },
  {
    h: "2. Accounts",
    body: [
      "You must provide accurate details (name, mobile or email) to create an account. You are responsible for activity under your account. Workers must additionally complete KYC verification before accepting jobs; providing false documents leads to permanent removal.",
    ],
  },
  {
    h: "3. Bookings, pricing & payment",
    body: [
      "Prices shown at checkout are all-inclusive: the service amount plus GST at 18%. There are no hidden charges, and nothing extra is payable to the worker directly.",
      "Care Plans (monthly / 3-month / 6-month packages) are billed upfront for the term at the shown discount and auto-renew unless cancelled with at least 7 days' notice. Payments are processed by our payment partner (Razorpay); KAAM does not store card details.",
    ],
  },
  {
    h: "4. Cancellations & refunds",
    body: [
      "Cancellation is free before a worker accepts your booking. After acceptance, a small convenience fee applies. Refunds for online payments are credited as KAAM Cash immediately, or to the original payment method on request via Help & Support within 5–7 working days.",
    ],
  },
  {
    h: "5. Conduct & safety",
    body: [
      "Treat workers and customers with respect. Harassment, discrimination or unsafe behaviour leads to suspension. Both sides rate each other after every job. Use the in-app SOS and Help & Support for any safety concern — serious reports are reviewed within 24 hours.",
    ],
  },
  {
    h: "6. Workers' earnings",
    body: [
      "Workers receive the service amount minus KAAM's 15% platform fee and 1% TDS (Section 194-O). Settlements are weekly and free; instant payout is available for a small fee. KAAM issues the customer invoice; workers are independent contractors responsible for their own taxes.",
    ],
  },
  {
    h: "7. Liability",
    body: [
      "KAAM verifies workers' identity and takes safety seriously, but services are provided by independent professionals. To the extent permitted by law, KAAM's liability for any booking is limited to the amount paid for that booking. Disputes are handled first through in-app support; these terms are governed by the laws of India with courts at Kochi, Kerala having jurisdiction.",
    ],
  },
  {
    h: "8. Changes",
    body: [
      "We may update these terms as KAAM evolves; material changes will be announced in the app. Continued use after changes means acceptance.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/" className="mb-6 inline-block">
        <KaamWordmark size={28} />
      </Link>
      <h1 className="font-display text-2xl font-extrabold text-ink">Terms of Service</h1>
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
        Questions? Reach us via{" "}
        <Link href="/app/support" className="font-bold text-kaam">
          Help &amp; Support
        </Link>{" "}
        · See also our{" "}
        <Link href="/privacy" className="font-bold text-kaam">
          Privacy Policy
        </Link>
        .
      </p>
    </main>
  );
}
