"use client";

import { useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/components/language-provider";

/**
 * First-launch welcome tour — three quick slides shown once (Uber/Swiggy
 * standard). Dismissal is remembered; never blocks returning users.
 */

const KEY = "kaam.tour.done";
const noopSub = () => () => {};

function useTourPending(): boolean {
  return useSyncExternalStore(
    noopSub,
    () => {
      try {
        return !window.localStorage.getItem(KEY);
      } catch {
        return false;
      }
    },
    () => false, // never on the server
  );
}

const SLIDES = [
  {
    emoji: "🗣️",
    title: "പറഞ്ഞാൽ മതി — just say it",
    titleMl: "പറഞ്ഞാൽ മതി",
    text: "Tell KAAM what you need in Malayalam or English — typed or spoken. The AI finds the right worker.",
    textMl: "എന്ത് വേണമെന്ന് മലയാളത്തിലോ ഇംഗ്ലീഷിലോ പറയൂ — ടൈപ്പ് ചെയ്തോ സംസാരിച്ചോ. ശരിയായ തൊഴിലാളിയെ AI കണ്ടെത്തും.",
  },
  {
    emoji: "🛡️",
    title: "Verified, nearby, on time",
    titleMl: "വെരിഫൈഡ്, അടുത്ത്, സമയത്ത്",
    text: "Every worker is KYC-verified. We show the nearest available pros first — across all 14 districts.",
    textMl: "ഓരോ തൊഴിലാളിയും KYC വെരിഫൈഡ്. അടുത്തുള്ളവരെ ആദ്യം കാണിക്കും — 14 ജില്ലകളിലും.",
  },
  {
    emoji: "💚",
    title: "Fair for everyone",
    titleMl: "എല്ലാവർക്കും ന്യായം",
    text: "Transparent prices with GST upfront. Workers keep 85% of every rupee. Kerala's own app.",
    textMl: "സുതാര്യമായ വില, GST മുൻകൂട്ടി. ഓരോ രൂപയുടെയും 85% തൊഴിലാളിക്ക്. കേരളത്തിന്റെ സ്വന്തം ആപ്പ്.",
  },
];

export function OnboardingTour() {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const pending = useTourPending();
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);

  if (!pending || dismissed) return null;

  const finish = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60">
      <div className="w-full max-w-[430px] rounded-t-3xl bg-page p-6 pb-8 text-center">
        <p className="text-6xl">{slide.emoji}</p>
        <h2 className="mt-3 font-display text-xl font-extrabold text-ink">{ml ? slide.titleMl : slide.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-mid">{ml ? slide.textMl : slide.text}</p>

        <div className="mt-4 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-kaam" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={finish} className="flex-1 rounded-xl border border-line bg-white py-3 text-sm font-bold text-mid">
            {ml ? "ഒഴിവാക്കൂ" : "Skip"}
          </button>
          <button
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="flex-[2] rounded-xl bg-kaam py-3 text-sm font-bold text-white shadow-kaam"
          >
            {last ? (ml ? "തുടങ്ങാം →" : "Start exploring →") : ml ? "അടുത്തത്" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
