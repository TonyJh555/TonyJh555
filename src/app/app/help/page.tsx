"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink, Card } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

/**
 * In-app Help & Support centre — FAQ, safety, and contact routes. The staple
 * "Help" surface every world-class app ships (Uber/Swiggy/Zomato) so a customer
 * never has to leave the app to get unstuck. Bilingual (EN/ML).
 */

const FAQS: { q: string; qMl: string; a: string; aMl: string }[] = [
  {
    q: "How do I book a worker?",
    qMl: "എങ്ങനെ ഒരു തൊഴിലാളിയെ ബുക്ക് ചെയ്യാം?",
    a: "Open Home or Search, pick a service, choose a verified worker, select date & time (or ‘as soon as possible’), and pay. The worker confirms your slot and you can track them live.",
    aMl: "ഹോം അല്ലെങ്കിൽ സെർച്ച് തുറക്കൂ, ഒരു സേവനം തിരഞ്ഞെടുക്കൂ, വെരിഫൈഡ് തൊഴിലാളിയെ തിരഞ്ഞെടുക്കൂ, തീയതി & സമയം (അല്ലെങ്കിൽ 'എത്രയും വേഗം') തിരഞ്ഞെടുത്ത് പണമടയ്ക്കൂ. തൊഴിലാളി സ്ഥിരീകരിക്കും, നിങ്ങൾക്ക് തത്സമയം ട്രാക്ക് ചെയ്യാം.",
  },
  {
    q: "When can I chat with the worker?",
    qMl: "തൊഴിലാളിയുമായി എപ്പോൾ ചാറ്റ് ചെയ്യാം?",
    a: "Chat opens right after you book, from My Bookings → Chat. You can share photos or videos of the problem, and the worker can share their work. For your safety, keep all conversation inside KAAM.",
    aMl: "ബുക്ക് ചെയ്ത ഉടൻ ചാറ്റ് തുറക്കും — എന്റെ ബുക്കിംഗുകൾ → ചാറ്റ്. പ്രശ്നത്തിന്റെ ഫോട്ടോ/വീഡിയോ ഷെയർ ചെയ്യാം. സുരക്ഷയ്ക്കായി എല്ലാ സംഭാഷണവും കാമിനുള്ളിൽ സൂക്ഷിക്കൂ.",
  },
  {
    q: "What is the start code / OTP?",
    qMl: "സ്റ്റാർട്ട് കോഡ് / OTP എന്താണ്?",
    a: "When the worker arrives, share the 4-digit start code shown on your booking. The job only begins once they enter it — so no one can start work on your behalf.",
    aMl: "തൊഴിലാളി എത്തുമ്പോൾ, ബുക്കിംഗിൽ കാണിക്കുന്ന 4-അക്ക സ്റ്റാർട്ട് കോഡ് നൽകൂ. അവർ അത് നൽകുമ്പോൾ മാത്രമേ ജോലി തുടങ്ങൂ — നിങ്ങളറിയാതെ ആരും ജോലി തുടങ്ങില്ല.",
  },
  {
    q: "How are prices calculated?",
    qMl: "വില എങ്ങനെ കണക്കാക്കുന്നു?",
    a: "Every price is all-inclusive — service amount plus GST, shown upfront, with nothing extra to hand the worker. For repairs the base hour covers the worker's time & travel, and past a 5-minute grace you pay only for the extra minutes actually worked (1h 08m bills 68 minutes, never a rounded-up second hour). Events take a small advance with the balance after; fixed visits and care plans are prepaid. See Account → How you pay for the full breakdown.",
    aMl: "ഓരോ വിലയും എല്ലാം ഉൾപ്പെട്ടത് — സേവന തുകയും GST-യും, മുൻകൂട്ടി കാണിക്കും, തൊഴിലാളിക്ക് അധികമായി ഒന്നും നൽകേണ്ട. അറ്റകുറ്റപ്പണിക്ക് ബേസ് അവർ സമയവും യാത്രയും മൂടും, 5 മിനിറ്റ് ഗ്രേസിന് ശേഷം ജോലി ചെയ്ത അധിക മിനിറ്റുകൾക്ക് മാത്രം പണം. ഇവന്റുകൾക്ക് ചെറിയ അഡ്വാൻസ്; സ്ഥിര സന്ദർശനങ്ങളും കെയർ പ്ലാനുകളും മുൻകൂർ. കൂടുതൽ വിവരം: അക്കൗണ്ട് → എങ്ങനെ പണമടയ്ക്കും.",
  },
  {
    q: "Can I cancel a booking?",
    qMl: "ബുക്കിംഗ് റദ്ദാക്കാമോ?",
    a: "Yes. Go to My Bookings and tap Cancel. Cancelling before the worker accepts is free and fully refunded to KAAM Cash. After acceptance a small convenience fee may apply.",
    aMl: "അതെ. എന്റെ ബുക്കിംഗുകളിൽ പോയി റദ്ദാക്കൂ. തൊഴിലാളി സ്വീകരിക്കുന്നതിന് മുൻപ് സൗജന്യമായി റദ്ദാക്കാം, മുഴുവൻ കാം ക്യാഷിലേക്ക്. സ്വീകരിച്ച ശേഷം ചെറിയ ഫീസ് ബാധകമായേക്കാം.",
  },
  {
    q: "What is KAAM Cash?",
    qMl: "കാം ക്യാഷ് എന്താണ്?",
    a: "Your in-app wallet. Earn it from welcome and referral bonuses and refunds, and use it at checkout. Refer a friend with your code and you both get ₹100.",
    aMl: "നിങ്ങളുടെ ആപ്പ് വാലറ്റ്. വെൽക്കം/റഫറൽ ബോണസുകൾ, റീഫണ്ട് എന്നിവയിലൂടെ നേടൂ, ചെക്ക്ഔട്ടിൽ ഉപയോഗിക്കൂ. കോഡ് ഉപയോഗിച്ച് സുഹൃത്തിനെ ചേർത്താൽ രണ്ടു പേർക്കും ₹100.",
  },
  {
    q: "How do you verify workers?",
    qMl: "തൊഴിലാളികളെ എങ്ങനെ വെരിഫൈ ചെയ്യുന്നു?",
    a: "Every worker submits KYC (Aadhaar), experience proof and, where relevant, certificates. Our team reviews each application within 24 hours before they can take jobs.",
    aMl: "ഓരോ തൊഴിലാളിയും KYC (ആധാർ), പരിചയ തെളിവ്, ആവശ്യമെങ്കിൽ സർട്ടിഫിക്കറ്റുകൾ സമർപ്പിക്കുന്നു. ജോലി എടുക്കുന്നതിന് മുൻപ് ഞങ്ങളുടെ ടീം 24 മണിക്കൂറിനുള്ളിൽ ഓരോ അപേക്ഷയും അവലോകനം ചെയ്യുന്നു.",
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
  const { lang } = useLanguage();
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
        {FAQS.map((f) => (
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
