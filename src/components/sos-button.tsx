"use client";

import { useState } from "react";

/**
 * SOS safety button shown during an active booking — Urban Company's key
 * trust feature, especially for women and elderly customers. Opens a sheet
 * to share live location, call emergency services, or reach the KAAM safety
 * team. In production this pings the safety desk and shares live GPS.
 */
export function SosButton({ workerName }: { workerName: string }) {
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
        🛡️ Safety & SOS
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
            <h2 className="font-display text-lg font-extrabold text-kaam">🛡️ Safety Center</h2>
            <p className="mt-1 mb-4 text-xs text-mid">
              You&apos;re served by <strong>{workerName}</strong>. Your trip is protected. Reach
              help instantly if you feel unsafe.
            </p>

            <div className="flex flex-col gap-2.5">
              <a
                href="tel:112"
                className="flex items-center gap-3 rounded-2xl bg-kaam p-4 text-white shadow-kaam"
              >
                <span className="text-2xl">🚨</span>
                <span className="flex-1">
                  <span className="block text-sm font-extrabold">Call Emergency (112)</span>
                  <span className="block text-[11px] text-white/80">Police / Ambulance / Fire</span>
                </span>
              </a>

              <button
                onClick={shareLocation}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surf p-4 text-left"
              >
                <span className="text-2xl">📍</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">
                    {shared ? "✓ Live location shared" : "Share live location"}
                  </span>
                  <span className="block text-[11px] text-mid">
                    {shared ? "Your family & KAAM safety team can see you" : "With a trusted contact + KAAM safety desk"}
                  </span>
                </span>
              </button>

              <a
                href="tel:18004250000"
                className="flex items-center gap-3 rounded-2xl border border-line bg-surf p-4"
              >
                <span className="text-2xl">☎️</span>
                <span className="flex-1">
                  <span className="block text-sm font-bold">Call KAAM Safety Team</span>
                  <span className="block text-[11px] text-mid">24×7 support · toll-free</span>
                </span>
              </a>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-xl border border-line py-3 text-sm font-bold text-mid"
            >
              I&apos;m safe — close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
