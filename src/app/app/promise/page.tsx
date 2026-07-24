"use client";

"use client";

import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * The KAAM Promise — the service guarantee that makes trust a moat. Five
 * commitments KAAM stands behind on every single job. Every promise links to
 * where it's actually delivered in the app, so it's a real guarantee, not a
 * marketing page. Fully bilingual (EN/ML).
 */
const PROMISES: { icon: string; title: string; titleMl: string; body: string; bodyMl: string; href?: string; cta?: string; ctaMl?: string }[] = [
  {
    icon: "✅",
    title: "Verified workers, every time",
    titleMl: "എപ്പോഴും വെരിഫൈഡ് തൊഴിലാളികൾ",
    body: "Every worker is KYC-verified (Aadhaar), experience-checked, and reviewed by our team before their first job.",
    bodyMl: "ഓരോ തൊഴിലാളിയും ആധാർ വെരിഫൈഡ്, പരിചയം പരിശോധിച്ചത്, ആദ്യ ജോലിക്ക് മുൻപ് ഞങ്ങളുടെ ടീം അവലോകനം ചെയ്തത്.",
  },
  {
    icon: "⭐",
    title: "Satisfaction guaranteed",
    titleMl: "സംതൃപ്തി ഉറപ്പ്",
    body: "Not happy with the work? Tell us — we'll get it redone or refund you. No arguments at your doorstep.",
    bodyMl: "ജോലിയിൽ തൃപ്തിയില്ലേ? ഞങ്ങളോട് പറയൂ — വീണ്ടും ചെയ്യിക്കും അല്ലെങ്കിൽ പണം തിരികെ നൽകും. വീട്ടുപടിക്കൽ തർക്കമില്ല.",
    href: "/app/support?category=quality",
    cta: "Report an issue",
    ctaMl: "പ്രശ്നം അറിയിക്കൂ",
  },
  {
    icon: "⏱️",
    title: "Fair pricing, always",
    titleMl: "എപ്പോഴും ന്യായമായ വില",
    body: "You pay only for the minutes actually worked, GST shown upfront, and nothing extra to hand the worker.",
    bodyMl: "ജോലി ചെയ്ത മിനിറ്റുകൾക്ക് മാത്രം പണം, GST മുൻകൂട്ടി കാണിക്കും, തൊഴിലാളിക്ക് അധികമായി ഒന്നും നൽകേണ്ട.",
    href: "/app/pricing",
    cta: "How you pay",
    ctaMl: "എങ്ങനെ പണമടയ്ക്കും",
  },
  {
    icon: "🛡️",
    title: "Safe & protected",
    titleMl: "സുരക്ഷിതം",
    body: "OTP-started jobs, live tracking, one-tap SOS, and trusted-contact sharing keep every visit safe.",
    bodyMl: "OTP ഉപയോഗിച്ച് തുടങ്ങുന്ന ജോലികൾ, തത്സമയ ട്രാക്കിംഗ്, ഒറ്റ ടാപ്പ് SOS, വിശ്വസ്ത കോൺടാക്ട് ഷെയറിംഗ് — ഓരോ സന്ദർശനവും സുരക്ഷിതം.",
    href: "/app/safety",
    cta: "Safety Center",
    ctaMl: "സേഫ്റ്റി സെന്റർ",
  },
  {
    icon: "💸",
    title: "Refunds without the runaround",
    titleMl: "ബുദ്ധിമുട്ടില്ലാത്ത റീഫണ്ട്",
    body: "A cancelled or unsatisfactory job is refunded to KAAM Cash quickly — our support team settles it, no chasing.",
    bodyMl: "റദ്ദാക്കിയതോ തൃപ്തികരമല്ലാത്തതോ ആയ ജോലി വേഗത്തിൽ കാം ക്യാഷിലേക്ക് റീഫണ്ട് — ഞങ്ങളുടെ സപ്പോർട്ട് ടീം തീർക്കും, പിന്നാലെ നടക്കേണ്ട.",
    href: "/app/support?category=refund",
    cta: "Request a refund",
    ctaMl: "റീഫണ്ട് ആവശ്യപ്പെടൂ",
  },
];

export default function PromisePage() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">{ml ? "കാം വാഗ്ദാനം" : "The KAAM Promise"}</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-3xl">🤝</p>
        <p className="mt-2 font-display text-xl font-extrabold">
          {ml ? "ഓരോ ജോലിക്കും ഞങ്ങൾ ഉത്തരവാദി." : "We stand behind every job."}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-white/85">
          {ml
            ? "ഒരു അപരിചിതനെ വീട്ടിലേക്ക് വിളിക്കാൻ വിശ്വാസം വേണം. ഈ അഞ്ച് വാഗ്ദാനങ്ങളിലൂടെയാണ് ഞങ്ങൾ അത് നേടുന്നത് — ഓരോ ബുക്കിംഗിലും, അല്ലെങ്കിൽ ഞങ്ങൾ ശരിയാക്കും."
            : "Booking a stranger into your home takes trust. These five promises are how we earn it — on every single booking, or we make it right."}
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {PROMISES.map((p) => (
          <div key={p.title} className="rounded-2xl border border-line bg-white p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-extrabold">{ml ? p.titleMl : p.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-mid">{ml ? p.bodyMl : p.body}</p>
                {p.href && (
                  <Link href={p.href} className="mt-2 inline-block text-[11px] font-bold text-kaam">
                    {ml ? p.ctaMl : p.cta} →
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
        {ml ? "🔍 ഉറപ്പോടെ ബുക്ക് ചെയ്യൂ" : "🔍 Book with confidence"}
      </Link>
    </main>
  );
}
