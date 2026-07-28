"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import { useFaqs } from "@/lib/faqs";

/**
 * In-app Help & Support centre — FAQ, safety, and contact routes. The staple
 * "Help" surface every world-class app ships (Uber/Swiggy/Zomato) so a customer
 * never has to leave the app to get unstuck. Bilingual (EN/ML).
 */


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
  const { lang } = useLanguage();
  const faqs = useFaqs();
  const ml = lang === "ml";
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="mb-4 flex items-center gap-3">
        <BackLink href="/app/account" />
        <h1 className="font-display text-lg font-bold">{ml ? "സഹായം & പിന്തുണ" : "Help & Support"}</h1>
      </header>

      <Card className="mb-4 bg-[linear-gradient(135deg,#0f6e4f,#0a4d37)] text-white">
        <p className="text-sm font-bold">{ml ? "👋 ഞങ്ങൾ സഹായിക്കാൻ ഇവിടെയുണ്ട്" : "👋 We're here to help"}</p>
        <p className="mt-1 text-xs text-white/80">
          {ml
            ? "മിക്ക ഉത്തരങ്ങളും താഴെയുണ്ട്. ഇനിയും സംശയമുണ്ടോ? കാം അസിസ്റ്റിനോട് ഏത് ഭാഷയിലും എപ്പോൾ വേണമെങ്കിലും ചോദിക്കൂ."
            : "Most answers are below. Still stuck? Ask KAAM Assist any time, in any language."}
        </p>
        <Link
          href="/app/advisor"
          className="mt-3 inline-block rounded-xl bg-white/15 px-4 py-2 text-xs font-bold"
        >
          🤖 {ml ? "കാം അസിസ്റ്റുമായി ചാറ്റ് ചെയ്യൂ →" : "Chat with KAAM Assist →"}
        </Link>
      </Card>

      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "പതിവ് ചോദ്യങ്ങൾ" : "Frequently asked"}</h2>
      <div className="mb-5 flex flex-col gap-2">
        {faqs.map((f) => (
          <FaqItem key={f.q} q={ml ? f.qMl : f.q} a={ml ? f.aMl : f.a} />
        ))}
      </div>

      <h2 className="mb-2 text-xs font-bold tracking-wide text-dim uppercase">{ml ? "സുരക്ഷയും ബന്ധപ്പെടലും" : "Safety & contact"}</h2>
      <div className="flex flex-col gap-2">
        <Link
          href="/app/support"
          className="flex items-center gap-3 rounded-xl bg-kaam px-4 py-3.5 text-sm font-bold text-white shadow-kaam"
        >
          🎧 {ml ? "അഭ്യർത്ഥന നൽകൂ — റീഫണ്ട്, പേയ്മെന്റ്, പ്രശ്നങ്ങൾ" : "Raise a request — refunds, payments, issues"}
        </Link>
        <Link
          href="/app/safety"
          className="flex items-center gap-3 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          🛡️ {ml ? "സേഫ്റ്റി സെന്റർ — വിശ്വസ്ത കോൺടാക്ടുകൾ & SOS" : "Safety Center — trusted contacts & SOS"}
        </Link>
        <Link
          href="/app/pricing"
          className="flex items-center gap-3 rounded-xl border border-good-mid bg-good-light px-4 py-3.5 text-sm font-bold text-good"
        >
          ⚖️ {ml ? "എങ്ങനെ പണമടയ്ക്കും — ന്യായമായ വില" : "How you pay — fair pricing explained"}
        </Link>
        <a
          href="tel:112"
          className="flex items-center gap-3 rounded-xl border border-kaam-mid bg-kaam-light px-4 py-3.5 text-sm font-bold text-kaam"
        >
          🆘 {ml ? "അടിയന്തരം — 112 വിളിക്കൂ" : "Emergency — call 112"}
        </a>
        <a
          href="tel:+914842000000"
          className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-sm font-semibold shadow-card"
        >
          📞 {ml ? "കാം സപ്പോർട്ട് ഹെൽപ്‌ലൈൻ" : "KAAM support helpline"}
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
        {ml ? "ഇംഗ്ലീഷിലും മലയാളത്തിലും ലഭ്യം · കൂടുതൽ ഭാഷകൾ ഉടൻ." : "Available in English & മലയാളം · more languages coming soon."}
      </p>
    </main>
  );
}
