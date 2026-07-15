"use client";

import Link from "next/link";

/**
 * Home-screen promo carousel (Swiggy/Zomato offer-strip pattern).
 * Warm, Kerala-rooted, emotionally resonant messaging — not discounts.
 * Original copy + gradients + emoji motifs (no third-party imagery).
 */

interface Banner {
  href: string;
  gradient: string;
  motif: string;
  ml: string; // Malayalam headline
  en: string; // English subline
  cta: string;
  dark?: boolean; // dark text on light (gold) card
}

const BANNERS: Banner[] = [
  {
    // The Kerala NRI reality: children in the Gulf, parents home alone.
    href: "/app/search?cat=eldercare",
    gradient: "linear-gradient(135deg,#0f6e4f 0%,#0a4d37 100%)",
    motif: "👵🌴",
    ml: "ദൂരെയാണെങ്കിലും, കരുതൽ അടുത്തുണ്ട്",
    en: "Away for work? Book a verified nurse or caretaker for your parents back home.",
    cta: "Book care",
  },
  {
    href: "/app/account",
    gradient: "linear-gradient(135deg,#e8b923 0%,#c99700 100%)",
    motif: "🎁",
    ml: "സുഹൃത്തിനെ ചേർക്കൂ · ₹100 വീതം",
    en: "Refer a friend — you both get ₹100 KAAM Cash. Kindness that pays.",
    cta: "Share & earn",
    dark: true,
  },
  {
    href: "/worker/signup",
    gradient: "linear-gradient(135deg,#C41E3A 0%,#FF4D6D 100%)",
    motif: "🤝",
    ml: "ഓരോ ബുക്കിംഗും ഒരു കുടുംബത്തെ പോറ്റുന്നു",
    en: "85% of every rupee goes straight to the worker. Dignity in every job.",
    cta: "Meet our workers",
  },
  {
    href: "/app/bookings",
    gradient: "linear-gradient(135deg,#1D4ED8 0%,#0C0F1A 100%)",
    motif: "🛡️",
    ml: "പോലീസ് വെരിഫൈഡ് · എപ്പോഴും സുരക്ഷിതം",
    en: "Every worker verified. Live tracking + SOS on every booking.",
    cta: "Why KAAM is safe",
  },
];

export function PromoBanners() {
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
            <p className="font-display text-sm font-extrabold leading-snug">{b.ml}</p>
            <p className={`mt-1 max-w-[85%] text-[11px] leading-relaxed ${b.dark ? "text-ink/70" : "text-white/85"}`}>
              {b.en}
            </p>
          </div>
          <span
            className={`relative mt-2 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
              b.dark ? "bg-ink text-white" : "bg-white/20 text-white"
            }`}
          >
            {b.cta} →
          </span>
        </Link>
      ))}
    </div>
  );
}
