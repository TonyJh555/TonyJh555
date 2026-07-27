"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";

/**
 * Home-screen promo carousel (Swiggy/Zomato offer-strip pattern).
 * Warm, Kerala-rooted, emotionally resonant messaging — not discounts.
 * Original copy + gradients + emoji motifs (no third-party imagery).
 */

interface Banner {
  href: string;
  gradient: string;
  motif: string;
  /** Headline — Malayalam always leads, it is the mother tongue here. */
  ml: string;
  en: string;
  /** Supporting line, in both languages. */
  subEn: string;
  subMl: string;
  cta: string;
  ctaMl: string;
  dark?: boolean; // dark text on light (gold) card
}

const BANNERS: Banner[] = [
  {
    // The Kerala NRI reality: children in the Gulf, parents home alone.
    href: "/app/search?cat=eldercare",
    gradient: "linear-gradient(135deg,#0f6e4f 0%,#0a4d37 100%)",
    motif: "👵🌴",
    ml: "ദൂരെയാണെങ്കിലും, കരുതൽ അടുത്തുണ്ട്",
    en: "Far away, but care is close by",
    subEn: "Working abroad? Book an ID-verified nurse or caretaker for your parents back home.",
    subMl: "ഗൾഫിലാണോ? വീട്ടിലെ അച്ഛനമ്മമാർക്ക് ഐഡി പരിശോധിച്ച നഴ്‌സിനെയോ കെയർടേക്കറെയോ ബുക്ക് ചെയ്യൂ.",
    cta: "Book care",
    ctaMl: "കെയർ ബുക്ക് ചെയ്യൂ",
  },
  {
    href: "/app/account",
    gradient: "linear-gradient(135deg,#e8b923 0%,#c99700 100%)",
    motif: "🎁",
    ml: "സുഹൃത്തിനെ ചേർക്കൂ · ₹100 വീതം",
    en: "Refer a friend · ₹100 each",
    subEn: "You both get ₹100 KAAM Cash. Kindness that pays.",
    subMl: "രണ്ടുപേർക്കും ₹100 കാം ക്യാഷ്. നന്മയ്ക്ക് പ്രതിഫലം.",
    cta: "Share & earn",
    ctaMl: "ഷെയർ ചെയ്ത് നേടൂ",
    dark: true,
  },
  {
    href: "/worker/signup",
    gradient: "linear-gradient(135deg,#C41E3A 0%,#FF4D6D 100%)",
    motif: "🤝",
    ml: "ഓരോ ബുക്കിംഗും ഒരു കുടുംബത്തെ പോറ്റുന്നു",
    en: "Every booking feeds a family",
    subEn: "85% of every rupee goes straight to the worker. Dignity in every job.",
    subMl: "ഓരോ രൂപയുടെയും 85% തൊഴിലാളിക്ക് നേരിട്ട്. ഓരോ ജോലിയിലും അന്തസ്സ്.",
    cta: "Meet our workers",
    ctaMl: "ഞങ്ങളുടെ തൊഴിലാളികളെ കാണൂ",
  },
  {
    href: "/app/bookings",
    gradient: "linear-gradient(135deg,#1D4ED8 0%,#0C0F1A 100%)",
    motif: "🛡️",
    ml: "നിങ്ങൾ തിരഞ്ഞെടുക്കുന്നു · സ്വീകരിച്ചാൽ മാത്രം പണം",
    en: "You choose · pay only when they accept",
    subEn: "Pick your own worker from their ratings. Live tracking and SOS on every booking.",
    subMl: "റേറ്റിംഗ് നോക്കി നിങ്ങൾ തന്നെ തൊഴിലാളിയെ തിരഞ്ഞെടുക്കൂ. എല്ലാ ബുക്കിംഗിലും ലൈവ് ട്രാക്കിംഗും SOS-ഉം.",
    cta: "Why KAAM is safe",
    ctaMl: "കാം എന്തുകൊണ്ട് സുരക്ഷിതം",
  },
];

export function PromoBanners() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  return (
    <div className="mb-6 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {BANNERS.map((b) => (
        <Link
          key={b.href + b.ml}
          href={b.href}
          className="relative flex min-w-[85%] snap-start flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-pop"
          style={{ background: b.gradient, minHeight: 132 }}
        >
          <span
            className="pointer-events-none absolute -right-2 -bottom-3 select-none text-[76px] leading-none opacity-20"
            aria-hidden
          >
            {b.motif}
          </span>
          <div className={`relative ${b.dark ? "text-ink" : "text-white"}`}>
            <p className="font-display text-sm font-extrabold leading-snug">
              {ml ? b.ml : b.en}
            </p>
            <p className={`mt-1 max-w-[85%] text-[11px] leading-relaxed ${b.dark ? "text-ink/70" : "text-white/85"}`}>
              {ml ? b.subMl : b.subEn}
            </p>
          </div>
          <span
            className={`relative mt-2 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
              b.dark ? "bg-ink text-white" : "bg-white/20 text-white"
            }`}
          >
            {ml ? b.ctaMl : b.cta} →
          </span>
        </Link>
      ))}
    </div>
  );
}
