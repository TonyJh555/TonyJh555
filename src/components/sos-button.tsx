"use client";

import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

/**
 * SOS safety button shown during an active booking — Urban Company's key
 * trust feature, especially for women and elderly customers. Opens a sheet
 * to share live location, call emergency services, or reach the KAAM safety
 * team. In production this pings the safety desk and shares live GPS.
 */
export function SosButton({ workerName }: { workerName: string }) {
  const { lang } = useLanguage();
  const ml = lang === "ml";
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const shareLocation = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => setShared(true), () => setShared(true));
      } else {
        setShared(true);
      }
    } catch {
      setShared(true);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-kaam-mid bg-kaam-light py-2.5 text-xs font-bold text-kaam"
      >
        🛡️ {ml ? "സുരക്ഷയും SOS-ഉം" : "Safety & SOS"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 className="font-display text-lg font-extrabold text-kaam">🛡️ {ml ? "സേഫ്റ്റി സെന്റർ" : "Safety Center"}</h2>
            <p className="mt-1 mb-4 text-xs text-mid">
              {ml ? "നിങ്ങളെ സഹായിക്കുന്നത് " : "You're served by "}
              <strong>{workerName}</strong>
              {ml
                ? ". നിങ്ങളുടെ ജോലി സംരക്ഷിതമാണ്. സുരക്ഷിതമല്ലെന്ന് തോന്നിയാൽ ഉടൻ സഹായം തേടൂ."
                : ". Your trip is protected. Reach help instantly if you feel unsafe."}
            </p>

            <div className="flex flex-col gap-2.5">
              <a
                href="tel:112"
                className="flex items-center gap-3 rounded-2xl bg-kaam p-4 text-white shadow-kaam"
              >
                <span className="text-2xl">🚨</span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">{ml ? "അടിയന്തര നമ്പർ വിളിക്കൂ (112)" : "Call Emergency (112)"}</span>
                  <span className="block text-[11px] text-white/80">{ml ? "പോലീസ് / ആംബുലൻസ് / ഫയർ" : "Police / Ambulance / Fire"}</span>
                </span>
              </a>

              <button
                onClick={shareLocation}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surf p-4 text-left"
              >
                <span className="text-2xl">📍</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">
                    {shared ? (ml ? "✓ ലൊക്കേഷൻ ഷെയർ ചെയ്തു" : "✓ Live location shared") : ml ? "തത്സമയ ലൊക്കേഷൻ ഷെയർ ചെയ്യൂ" : "Share live location"}
                  </span>
                  <span className="block text-[11px] text-mid">
                    {shared ? (ml ? "നിങ്ങളുടെ കുടുംബത്തിനും കാം സേഫ്റ്റി ടീമിനും കാണാം" : "Your family & KAAM safety team can see you") : ml ? "വിശ്വസ്ത കോൺടാക്ടിനും കാം സേഫ്റ്റി ഡെസ്കിനും" : "With a trusted contact + KAAM safety desk"}
                  </span>
                </span>
              </button>

              <a
                href="tel:18004250000"
                className="flex items-center gap-3 rounded-2xl border border-line bg-surf p-4"
              >
                <span className="text-2xl">☎️</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">{ml ? "കാം സേഫ്റ്റി ടീമിനെ വിളിക്കൂ" : "Call KAAM Safety Team"}</span>
                  <span className="block text-[11px] text-mid">{ml ? "24×7 പിന്തുണ · ടോൾ ഫ്രീ" : "24×7 support · toll-free"}</span>
                </span>
              </a>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-line py-3 text-sm font-bold text-mid"
            >
              {ml ? "ഞാൻ സുരക്ഷിതനാണ് — അടയ്ക്കൂ" : "I'm safe — close"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
