"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useCustomer } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";

/**
 * KAAM's signature home hero — a living Kerala-backwater card that leads with
 * the app's edge over Swiggy/Zomato/Uber: you don't hunt through menus, you
 * just say what you need, in your language, and feel looked after.
 */

const noop = () => () => {};

function useHour(): number {
  // SSR-safe: server renders a neutral morning hour, client swaps to real time
  // without a hydration mismatch.
  return useSyncExternalStore(noop, () => new Date().getHours(), () => 9);
}

function greeting(hour: number): { en: string; ml: string; emoji: string } {
  if (hour >= 5 && hour < 12) return { en: "Good morning", ml: "സുപ്രഭാതം", emoji: "🌅" };
  if (hour >= 12 && hour < 17) return { en: "Good afternoon", ml: "ഉച്ചവണക്കം", emoji: "☀️" };
  if (hour >= 17 && hour < 21) return { en: "Good evening", ml: "ശുഭ സന്ധ്യ", emoji: "🌆" };
  return { en: "Good night", ml: "ശുഭരാത്രി", emoji: "🌙" };
}

export function HomeHero() {
  const customer = useCustomer();
  const { lang } = useLanguage();
  const g = greeting(useHour());
  const name = customer?.name.split(" ")[0];
  const ml = lang === "ml";

  return (
    <section className="relative mb-5 overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#0a4d37_0%,#0f6e4f_55%,#0c5a41_100%)] p-5 pt-6 text-white shadow-[0_16px_40px_rgba(10,77,55,0.35)]">
      {/* Ambient aurora blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-aurora absolute -top-16 -left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,#e8b923_0%,transparent_70%)] opacity-30 blur-2xl" />
        <div className="animate-aurora absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,#ff4d6d_0%,transparent_70%)] opacity-25 blur-2xl [animation-delay:-5s]" />
      </div>
      {/* Kasavu gold hairline, like the border of a Kerala sari */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,transparent,#e8b923,transparent)]" />
      {/* Floating coconut palm */}
      <span className="animate-float-soft pointer-events-none absolute -top-1 right-3 text-4xl opacity-25 select-none">
        🌴
      </span>
      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-shine absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]" />
      </div>

      <div className="relative">
        <p className="text-[11px] font-semibold tracking-wide text-white/70">
          {g.emoji} {ml ? g.ml : g.en}
          {name ? `, ${name}` : ""}
        </p>
        <h1 className="mt-1 font-display text-[22px] leading-tight font-extrabold text-white">
          {ml ? "എന്ത് സഹായം വേണം? 💚" : "What do you need help with today? 💚"}
        </h1>

        {/* AI-first entry — say it, don't hunt for it */}
        <Link
          href="/app/advisor"
          className="mt-4 flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-ink shadow-lg backdrop-blur transition-transform active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#0f6e4f,#c41e3a)] text-lg text-white">
            🎤
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {ml ? "നിങ്ങളുടെ വാക്കുകളിൽ പറയൂ…" : "Tell us in your own words…"}
            </span>
            <span className="block truncate text-[11px] text-mid">
              {ml
                ? "“എന്റെ ഫാൻ ശബ്ദമുണ്ടാക്കുന്നു” · “അമ്മയ്ക്ക് ഒരു നഴ്സ്”"
                : "“my fan is making noise” · “need a nurse for amma”"}
            </span>
          </span>
          <span className="text-lg text-kerala-green">→</span>
        </Link>

        {/* Trust row — the reason to choose KAAM over a stranger */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-white/85">
          <span>✅ ID-verified</span>
          <span className="text-white/30">•</span>
          <span>👤 You pick the worker</span>
          <span className="text-white/30">•</span>
          <span>💳 Pay only after they accept</span>
        </div>
      </div>
    </section>
  );
}
